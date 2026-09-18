import { PrismaClient, BlockchainStatus, CaseStatus, PaymentStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import * as ethereum from "./ethereum.service";
import { claimCutoff, isClaimLive } from "../utils/publish-claim";

if (!process.env.DATABASE_URL) {
  if (process.env.ALLOW_DEV_DB_FALLBACK === "true") {
    console.warn(
      "[WARN] [blockchain.service] DATABASE_URL is missing. Using dev fallback database URL because ALLOW_DEV_DB_FALLBACK=true is set."
    );
    process.env.DATABASE_URL = "postgresql://fcr_app:postgres@127.0.0.1:5432/fcr_scs?schema=public";
  } else if (process.env.NODE_ENV !== "test") {
    throw new Error("DATABASE_URL environment variable is missing in blockchain.service");
  }
}

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Short human-readable notarization record id in the canonical format
 * BCN-YYYY-MM-#### (Doc 5 §1.4 / Bug Logs), assigned by the application when the record
 * row is created on publish. Strictly sequential starting from 0001 per month without random numbers.
 */
export async function newRecordId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `BCN-${year}-${month}-`;

  const records = await prisma.blockchainRecord.findMany({
    where: { id: { startsWith: prefix } },
    select: { id: true },
  });

  let maxSeq = 0;
  for (const r of records) {
    const seqStr = r.id.slice(prefix.length);
    if (/^\d{4}$/.test(seqStr)) {
      const num = parseInt(seqStr, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

/**
 * Publication transactions are signed by the ADMIN WALLET in MetaMask (the
 * frontend sends them via eth_sendTransaction). The backend never signs: it
 * verifies the supplied transaction hash on the active network (mined,
 * successful, targeted the CompensationLedger contract) and only then records
 * it in the database.
 */
async function assertRecordedOnChain(transactionHash: string) {
  const contractAddress = ethereum.getActiveContractAddress();
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not set for the active network — cannot verify the transaction");
  }
  const verification = await ethereum.verifyTransactionReceipt(transactionHash);
  if (!verification.found) {
    throw new Error("Transaction receipt not found on the active network — it may not be mined yet");
  }
  if (!verification.success) {
    throw new Error("Transaction reverted on chain — nothing was recorded");
  }
  if (verification.to !== contractAddress.toLowerCase()) {
    throw new Error("Transaction did not target the CompensationLedger contract");
  }
}

// ---------------------------------------------------------------------------
// FR-019 dual-milestone keying
// ---------------------------------------------------------------------------
// One case carries up to two on-chain anchors, keyed on CompensationLedger as
// `${caseId}#M1` (Statutory Award / Form H hash) and `${caseId}#M2`
// (Settlement / receipt hash). The database stores the milestone separately so
// per-milestone records remain queryable by case.

export const MILESTONES = ["AWARD", "SETTLEMENT"] as const;
export type Milestone = (typeof MILESTONES)[number];

export function normalizeMilestone(milestone?: string | null): Milestone {
  const m = String(milestone || "AWARD").toUpperCase();
  if (m === "M1" || m === "AWARD") return "AWARD";
  if (m === "M2" || m === "SETTLEMENT") return "SETTLEMENT";
  throw new Error(`Unknown milestone "${milestone}". Valid: AWARD, SETTLEMENT`);
}

/** On-chain mapping key: LAC-2026-03-0001#M1-1726309800 / LAC-2026-03-0001#M2-1726309800 */
export function toOnChainKey(caseId: string, milestone: Milestone, timestamp?: number | Date): string {
  const m = milestone === "AWARD" ? "M1" : "M2";
  const sec = Math.floor((timestamp ? new Date(timestamp).getTime() : Date.now()) / 1000);
  return `${caseId}#${m}-${sec}`;
}

/** FR-012 grace policy: a member may withdraw acceptance within 24 hours, so
 *  the statutory award cannot be notarized until the window has elapsed. */
export const ACCEPTANCE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export async function assertM1GracePeriodElapsed(caseId: string) {
  const offer = await prisma.offerLetter.findFirst({
    where: { caseId, status: "ACCEPTED" },
    orderBy: { createdAt: "desc" },
  });
  if (!offer?.acceptedAt) return;
  const graceEndsAt = new Date(offer.acceptedAt).getTime() + ACCEPTANCE_GRACE_PERIOD_MS;
  if (Date.now() < graceEndsAt) {
    const msLeft = graceEndsAt - Date.now();
    const secondsLeft = Math.max(1, Math.ceil(msLeft / 1000));
    const minutesLeft = Math.ceil(secondsLeft / 60);
    const timeLeftStr = secondsLeft < 60 ? `${secondsLeft} second(s)` : `${minutesLeft} minute(s)`;
    throw new Error(
      `Milestone 1 publication is locked: the 24-hour acceptance grace period for ${caseId} ends in ${timeLeftStr}.`
    );
  }
}

/**
 * FR-005 / FR-019: the settlement is only notarized once the funds are confirmed
 * received (PAID). Publishing at TRANSFER_SUCCEED would anchor a settlement the
 * member has not accepted, and the SETTLEMENT side effect below closes the
 * acquisition case — so this must be a hard gate, not a UI-only one.
 *
 * Fails closed: a case with no payment case cannot prove receipt, so it is blocked.
 */
export async function assertSettlementPaid(caseId: string) {
  const pCase = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pCase || pCase.status !== PaymentStatus.PAID) {
    const state = pCase ? pCase.status : "no payment case";
    throw new Error(
      `Milestone 2 publication is locked: the case must reach PAID before the settlement can be notarized (current payment status: ${state}). The member confirms receipt, or a Government Administrator confirms after the 7-day window.`
    );
  }
}

// ---------------------------------------------------------------------------
// Cross-admin publish claim
// ---------------------------------------------------------------------------
// The minutes a publish takes are spent in the clicking admin's browser
// (MetaMask approval + mining), before POST /publish ever fires. A mutex inside
// that request would therefore cover nothing, so the lock is a row keyed by
// (caseId, milestone) that outlives the request and expires lazily.

export class PublishClaimHeldByError extends Error {
  readonly holderAdminId: string;
  readonly holderAdminName: string;
  readonly holderClaimedAt: Date;

  constructor(holderAdminId: string, holderAdminName: string, holderClaimedAt: Date) {
    super(
      `${holderAdminName || "Another government administrator"} is currently publishing this record. Try again once they finish.`
    );
    this.name = "PublishClaimHeldByError";
    this.holderAdminId = holderAdminId;
    this.holderAdminName = holderAdminName;
    this.holderClaimedAt = holderClaimedAt;
  }
}

/**
 * Take the publish lock for one (caseId, milestone). Throws
 * PublishClaimHeldByError when another admin holds a live claim.
 *
 * The stale sweep and the insert are two statements, which is safe: the
 * composite primary key is the arbiter, so concurrent claims cannot both
 * succeed — the loser hits P2002 and is reported the winner's identity.
 */
export async function claimPublish(params: {
  caseId: string;
  milestone?: string | null;
  adminId: string;
  adminName: string;
}) {
  const milestone = normalizeMilestone(params.milestone);
  const now = Date.now();

  // Free an expired claim, or this admin's own leftover row after a reload.
  await prisma.publishClaim.deleteMany({
    where: {
      caseId: params.caseId,
      milestone,
      OR: [{ claimedAt: { lt: claimCutoff(now) } }, { adminId: params.adminId }],
    },
  });

  try {
    return await prisma.publishClaim.create({
      data: {
        caseId: params.caseId,
        milestone,
        adminId: params.adminId,
        adminName: params.adminName,
        claimedAt: new Date(now),
      },
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      const holder = await prisma.publishClaim.findUnique({
        where: { caseId_milestone: { caseId: params.caseId, milestone } },
      });
      if (holder) {
        throw new PublishClaimHeldByError(holder.adminId, holder.adminName, holder.claimedAt);
      }
    }
    throw e;
  }
}

/**
 * Release a claim. Scoped to the holder so one admin can never unlock a record
 * another is mid-way through publishing. Idempotent — returns rows deleted.
 */
export async function releasePublishClaim(params: {
  caseId: string;
  milestone?: string | null;
  adminId: string;
}): Promise<number> {
  const milestone = normalizeMilestone(params.milestone);
  const res = await prisma.publishClaim.deleteMany({
    where: { caseId: params.caseId, milestone, adminId: params.adminId },
  });
  return res.count;
}

/** Live claims only. Doubles as the stale sweep, since nothing else reaps them. */
export async function getPublishClaims() {
  const now = Date.now();
  await prisma.publishClaim.deleteMany({ where: { claimedAt: { lt: claimCutoff(now) } } });
  const claims = await prisma.publishClaim.findMany({ orderBy: { claimedAt: "asc" } });
  return claims.filter((c) => isClaimLive(c.claimedAt, now));
}

/** Throws when a live claim is held by someone other than `adminId`. */
export async function assertNotClaimedByOther(
  caseId: string,
  milestone: Milestone,
  adminId?: string
) {
  if (!adminId) return;
  const claim = await prisma.publishClaim.findUnique({
    where: { caseId_milestone: { caseId, milestone } },
  });
  if (!claim || !isClaimLive(claim.claimedAt)) return;
  if (claim.adminId === adminId) return;
  throw new PublishClaimHeldByError(claim.adminId, claim.adminName, claim.claimedAt);
}

export async function publishRecord(params: {
  caseId: string;
  milestone?: string;
  documentHash: string;
  transactionHash: string;
  onChainKey?: string;
  adminId?: string;
}) {
  const { caseId, documentHash, transactionHash } = params;
  const milestone = normalizeMilestone(params.milestone);

  if (milestone === "AWARD") {
    await assertM1GracePeriodElapsed(caseId);
  } else {
    await assertSettlementPaid(caseId);
  }

  const existing = await prisma.blockchainRecord.findUnique({
    where: { caseId_milestone: { caseId, milestone } },
  });
  const onChainKey = params.onChainKey || existing?.onChainKey || toOnChainKey(caseId, milestone);
  let record;
  if (existing) {
    // Idempotent: re-submitting the same mined transaction (e.g. after a
    // network blip between on-chain confirmation and this call) returns the
    // stored record instead of failing.
    if (existing.transactionHash?.toLowerCase() === transactionHash.toLowerCase()) {
      return existing;
    }
    if (existing.status === BlockchainStatus.READY_TO_PUBLISH) {
      await assertRecordedOnChain(transactionHash);
      // First-write-wins: the status is re-checked inside the UPDATE itself, so
      // two admins who both read READY_TO_PUBLISH cannot both record. A plain
      // update-by-id let the later request silently overwrite the earlier
      // transactionHash and orphan its on-chain anchor.
      const updated = await prisma.blockchainRecord.updateMany({
        where: { id: existing.id, status: BlockchainStatus.READY_TO_PUBLISH },
        data: {
          status: BlockchainStatus.PUBLISHED,
          transactionHash,
          documentHash,
          onChainKey,
          publishedAt: new Date(),
          deletedAt: null,
        },
      });
      if (updated.count === 0) {
        throw new Error(
          `Record already published for this case (${milestone === "AWARD" ? "Milestone 1 Award" : "Milestone 2 Settlement"})`
        );
      }
      const persisted = await prisma.blockchainRecord.findUnique({ where: { id: existing.id } });
      if (!persisted) {
        throw new Error("Published record could not be re-read after the atomic update");
      }
      record = persisted;
    } else {
      throw new Error(
        `Record already published for this case (${milestone === "AWARD" ? "Milestone 1 Award" : "Milestone 2 Settlement"})`
      );
    }
  } else {
    await assertRecordedOnChain(transactionHash);
    record = await prisma.blockchainRecord.create({
      data: {
        id: await newRecordId(),
        caseId,
        milestone,
        onChainKey,
        documentHash,
        transactionHash,
        status: BlockchainStatus.PUBLISHED,
      },
    });
  }

  if (milestone === "AWARD") {
    try {
      const pCase = await prisma.paymentCase.findFirst({ where: { caseId } });
      if (pCase) {
        if (pCase.status === PaymentStatus.AWARD_NOTARIZATION_PENDING) {
          await prisma.paymentCase.update({
            where: { id: pCase.id },
            data: { status: PaymentStatus.READY_TO_INITIATE },
          });
        } else if (pCase.status === PaymentStatus.BANK_DETAILS_AND_M1_PENDING) {
          await prisma.paymentCase.update({
            where: { id: pCase.id },
            data: { status: PaymentStatus.BANK_DETAILS_PENDING },
          });
        }
      }
    } catch (err) {
      console.error("[blockchain_service] Error advancing payment status on M1 publish:", err);
    }
  }

  if (milestone === "SETTLEMENT") {
    try {
      await prisma.acquisitionCase.updateMany({
        where: { caseId },
        data: { status: CaseStatus.CASE_CLOSED },
      });
    } catch (err) {
      console.error("[blockchain_service] Error closing acquisition case on M2 publish:", err);
    }
  }

  // The publish succeeded, so this admin no longer needs the lock. Best-effort:
  // a failed release is covered by the TTL rather than failing the publish.
  if (params.adminId) {
    try {
      await releasePublishClaim({ caseId, milestone, adminId: params.adminId });
    } catch (err) {
      console.error("[blockchain_service] Error releasing publish claim:", err);
    }
  }

  return record;
}

export async function getRecords(status?: string) {
  let enumStatus: BlockchainStatus | undefined;
  if (status) {
    const s = status.toUpperCase().replace(/\s+/g, "_");
    if (s in BlockchainStatus) {
      enumStatus = s as BlockchainStatus;
    }
  }

  // Only return records for cases whose statutory status is at or after OFFER_ACCEPTED
  const eligibleCases = await prisma.acquisitionCase.findMany({
    where: {
      status: {
        in: [
          CaseStatus.OFFER_ACCEPTED,
          CaseStatus.PAYMENT_IN_PROGRESS,
          CaseStatus.PAYMENT_COMPLETED,
          CaseStatus.CASE_CLOSED,
        ],
      },
    },
    select: { caseId: true },
  });
  const eligibleCaseIds = Array.from(new Set(eligibleCases.map((c) => c.caseId)));

  return prisma.blockchainRecord.findMany({
    where: {
      deletedAt: null,
      caseId: { in: eligibleCaseIds },
      ...(enumStatus ? { status: enumStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecord(caseId: string, milestone?: string) {
  if (milestone === undefined) {
    // Backward compatibility: no milestone specified returns the award (M1)
    // record, falling back to settlement for legacy settlement-only rows.
    return (
      (await prisma.blockchainRecord.findFirst({
        where: { caseId, milestone: "AWARD", deletedAt: null },
      })) ??
      (await prisma.blockchainRecord.findFirst({
        where: { caseId, milestone: "SETTLEMENT", deletedAt: null },
      }))
    );
  }
  const m = normalizeMilestone(milestone);
  return prisma.blockchainRecord.findFirst({
    where: { caseId, milestone: m, deletedAt: null },
  });
}

function getDocumentStorageDirs(): string[] {
  return [
    path.resolve(process.cwd(), "data_layer/document_storage"),
    path.resolve(process.cwd(), "../data_layer/document_storage"),
    path.resolve(process.cwd(), "../../data_layer/document_storage"),
    path.resolve(__dirname, "../../../../data_layer/document_storage"),
    path.resolve(__dirname, "../../../data_layer/document_storage"),
  ].filter((d) => fs.existsSync(d));
}

function extractPdfTextAndMetadata(buf: Buffer): string {
  const parts: string[] = [buf.toString("utf-8"), buf.toString("latin1")];
  let pos = 0;
  while (pos < buf.length) {
    const sIdx = buf.indexOf("stream", pos);
    if (sIdx === -1) break;
    let dataStart = sIdx + 6;
    if (buf[dataStart] === 0x0d && buf[dataStart + 1] === 0x0a) dataStart += 2;
    else if (buf[dataStart] === 0x0a || buf[dataStart] === 0x0d) dataStart += 1;
    const eIdx = buf.indexOf("endstream", dataStart);
    if (eIdx === -1) break;
    const streamData = buf.slice(dataStart, eIdx);
    try {
      const unzipped = zlib.inflateSync(streamData);
      const latin = unzipped.toString("latin1");
      parts.push(latin);
      parts.push(unzipped.toString("utf-8"));
      // Decode hex strings like <4643522d534353>
      const hexMatches = latin.match(/<([0-9a-fA-F]{4,})>/g);
      if (hexMatches) {
        for (const hm of hexMatches) {
          const hex = hm.slice(1, -1);
          let str = "";
          for (let i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
          }
          parts.push(str);
        }
      }
    } catch {}
    pos = eIdx + 9;
  }
  return parts.join("\n");
}

function getPdfTrailerId(buf: Buffer): string | null {
  const str = buf.toString("latin1");
  const m = str.match(/\/ID\s*\[\s*<([0-9a-fA-F]+)>/i);
  return m ? m[1].toUpperCase() : null;
}

function computeBufferSimilarity(a: Buffer, b: Buffer): number {
  if (Math.abs(a.length - b.length) > Math.max(a.length, b.length) * 0.15) return 0;
  let matches = 0;
  const samples = 20;
  const step = Math.floor(Math.min(a.length, b.length) / samples);
  for (let i = 0; i < samples; i++) {
    const offset = i * step;
    if (a.slice(offset, offset + 64).equals(b.slice(offset, offset + 64))) {
      matches++;
    }
  }
  return matches / samples;
}

function findStoredDocMatch(fileBuffer: Buffer): { caseId: string; milestone: "M1" | "M2"; filePath: string } | null {
  const targetId = getPdfTrailerId(fileBuffer);
  const dirs = getDocumentStorageDirs();
  if (dirs.length === 0) return null;

  let bestMatch: { caseId: string; milestone: "M1" | "M2"; filePath: string; score: number } | null = null;

  for (const baseDir of dirs) {
    const categories: Array<{ dirName: string; milestone: "M1" | "M2" }> = [
      { dirName: "offer_letter", milestone: "M1" },
      { dirName: "payment_receipt", milestone: "M2" },
      { dirName: "case_document", milestone: "M1" },
    ];

    for (const cat of categories) {
      const catDir = path.join(baseDir, cat.dirName);
      if (!fs.existsSync(catDir)) continue;

      let caseFolders: string[] = [];
      try {
        caseFolders = fs.readdirSync(catDir);
      } catch {
        continue;
      }

      for (const caseFolder of caseFolders) {
        const caseFolderPath = path.join(catDir, caseFolder);
        try {
          if (!fs.statSync(caseFolderPath).isDirectory()) continue;
        } catch {
          continue;
        }
        const caseIdMatch = caseFolder.match(/LAC-\d{4}-\d{2}-\d{4}/);
        const folderCaseId = caseIdMatch ? caseIdMatch[0] : "";

        let files: string[] = [];
        try {
          files = fs.readdirSync(caseFolderPath);
        } catch {
          continue;
        }

        for (const fileName of files) {
          if (!fileName.toLowerCase().endsWith(".pdf")) continue;
          const fullPath = path.join(caseFolderPath, fileName);
          try {
            const storedBuf = fs.readFileSync(fullPath);
            // 1. PDF ID match
            if (targetId) {
              const storedId = getPdfTrailerId(storedBuf);
              if (storedId && storedId === targetId) {
                const resolvedCase = folderCaseId || (fileName.match(/LAC-\d{4}-\d{2}-\d{4}/)?.[0] ?? "");
                if (resolvedCase) {
                  return { caseId: resolvedCase, milestone: cat.milestone, filePath: fullPath };
                }
              }
            }

            // 2. Sample similarity match
            const sim = computeBufferSimilarity(fileBuffer, storedBuf);
            if (sim > 0.6 && (!bestMatch || sim > bestMatch.score)) {
              const resolvedCase = folderCaseId || (fileName.match(/LAC-\d{4}-\d{2}-\d{4}/)?.[0] ?? "");
              if (resolvedCase) {
                bestMatch = { caseId: resolvedCase, milestone: cat.milestone, filePath: fullPath, score: sim };
              }
            }
          } catch {}
        }
      }
    }
  }

  if (bestMatch && bestMatch.score >= 0.7) {
    return { caseId: bestMatch.caseId, milestone: bestMatch.milestone, filePath: bestMatch.filePath };
  }

  return null;
}

export async function verifyDocument(fileBuffer: Buffer, fileName?: string) {
  const localHash = "0x" + crypto.createHash("sha256").update(fileBuffer).digest("hex");
  let record = await prisma.blockchainRecord.findFirst({ where: { documentHash: localHash } });
  let matchedReceipt: any = null;
  let matchedOffer: any = null;

  if (!record) {
    matchedReceipt = await prisma.paymentReceipt.findFirst({
      where: { documentHash: localHash },
      include: { paymentCase: true },
    });
    if (matchedReceipt?.paymentCase?.caseId) {
      record = await prisma.blockchainRecord.findUnique({
        where: {
          caseId_milestone: {
            caseId: matchedReceipt.paymentCase.caseId,
            milestone: "SETTLEMENT",
          },
        },
      });
    }
  }

  if (!record) {
    matchedOffer = await prisma.offerLetter.findFirst({
      where: { blockchainHash: localHash },
    });
    if (matchedOffer?.caseId) {
      record = await prisma.blockchainRecord.findUnique({
        where: {
          caseId_milestone: {
            caseId: matchedOffer.caseId,
            milestone: "AWARD",
          },
        },
      });
    }
  }

  if (!record) {
    const extractedText = extractPdfTextAndMetadata(fileBuffer);
    let detectedCaseId: string | null = null;
    let detectedMilestone: "M1" | "M2" | null = null;

    // 1. Text extraction matches
    const textCaseMatch = extractedText.match(/LAC-\d{4}-\d{2}-\d{4}/);
    if (textCaseMatch) {
      detectedCaseId = textCaseMatch[0];
    }

    // 2. Check offer reference in text
    if (!detectedCaseId) {
      const offerRefMatch = extractedText.match(/(?:FORM-H|OFFER)-[\w-]+/i);
      if (offerRefMatch) {
        const dbOfferByRef = await prisma.offerLetter.findFirst({
          where: { offerReferenceNo: { equals: offerRefMatch[0], mode: "insensitive" } },
        });
        if (dbOfferByRef?.caseId) {
          detectedCaseId = dbOfferByRef.caseId;
          detectedMilestone = "M1";
        }
      }
    }

    // 3. Check bank reference in text
    if (!detectedCaseId) {
      const bnkMatch = extractedText.match(/BNK-[\w-]+/i);
      if (bnkMatch) {
        const dbRcptByBnk = await prisma.paymentReceipt.findFirst({
          where: { bankReferenceNumber: { equals: bnkMatch[0], mode: "insensitive" } },
          include: { paymentCase: true },
        });
        if (dbRcptByBnk?.paymentCase?.caseId) {
          detectedCaseId = dbRcptByBnk.paymentCase.caseId;
          detectedMilestone = "M2";
        }
      }
    }

    // 4. Filename hints
    const cleanFileName = fileName ? path.basename(fileName) : "";
    if (cleanFileName) {
      if (!detectedCaseId) {
        const fileCaseMatch = cleanFileName.match(/LAC-\d{4}-\d{2}-\d{4}/);
        if (fileCaseMatch) {
          detectedCaseId = fileCaseMatch[0];
        }
      }

      if (!detectedCaseId) {
        const fileOfferMatch = cleanFileName.match(/(?:FORM-H|OFFER)-[\w-]+/i);
        if (fileOfferMatch) {
          const dbOfferByName = await prisma.offerLetter.findFirst({
            where: { offerReferenceNo: { equals: fileOfferMatch[0], mode: "insensitive" } },
          });
          if (dbOfferByName?.caseId) {
            detectedCaseId = dbOfferByName.caseId;
            detectedMilestone = "M1";
          }
        }
      }

      if (!detectedCaseId) {
        const matchOfferDoc = await prisma.offerLetter.findFirst({
          where: { signedDocument: { contains: cleanFileName } },
        });
        if (matchOfferDoc?.caseId) {
          detectedCaseId = matchOfferDoc.caseId;
          detectedMilestone = "M1";
        }
      }

      if (!detectedCaseId) {
        const matchRcptDoc = await prisma.paymentReceipt.findFirst({
          where: { documentPath: { contains: cleanFileName } },
          include: { paymentCase: true },
        });
        if (matchRcptDoc?.paymentCase?.caseId) {
          detectedCaseId = matchRcptDoc.paymentCase.caseId;
          detectedMilestone = "M2";
        }
      }
    }

    // 5. Stored document ID / sample similarity matching
    if (!detectedCaseId || !detectedMilestone) {
      const storedMatch = findStoredDocMatch(fileBuffer);
      if (storedMatch) {
        if (!detectedCaseId) detectedCaseId = storedMatch.caseId;
        if (!detectedMilestone) detectedMilestone = storedMatch.milestone;
      }
    }

    // 6. If detectedCaseId is known, but milestone not yet resolved, classify milestone
    if (detectedCaseId && !detectedMilestone) {
      const isReceipt =
        /RENTAS|RECEIPT|SETTLEMENT|BNM-CLEARED|TOTAL STATUTORY COMPENSATION|PAID & DISBURSED|Statutory Settlement Particulars/i.test(
          extractedText
        ) ||
        (cleanFileName && /receipt|settlement/i.test(cleanFileName));

      const isFormH =
        /FORM\s*H|BORANG\s*H|Notice of Award|Compensation Offer/i.test(extractedText) ||
        (cleanFileName && /form_h|offer/i.test(cleanFileName));

      if (isReceipt && !isFormH) {
        detectedMilestone = "M2";
      } else if (isFormH && !isReceipt) {
        detectedMilestone = "M1";
      } else {
        // Size / type heuristics:
        // Receipts generated with PDFKit in this system are ~4KB single-page documents.
        // Form H signed documents are ~500KB+ multi-page raster documents.
        if (fileBuffer.length > 50000) {
          detectedMilestone = "M1";
        } else {
          // Check if published settlement exists vs published award
          const pubM2 = await prisma.blockchainRecord.findFirst({
            where: { caseId: detectedCaseId, milestone: "SETTLEMENT", status: BlockchainStatus.PUBLISHED },
          });
          const pubM1 = await prisma.blockchainRecord.findFirst({
            where: { caseId: detectedCaseId, milestone: "AWARD", status: BlockchainStatus.PUBLISHED },
          });
          if (pubM2 && !pubM1) {
            detectedMilestone = "M2";
          } else if (pubM1 && !pubM2) {
            detectedMilestone = "M1";
          } else {
            detectedMilestone = isReceipt ? "M2" : "M1";
          }
        }
      }
    }

    if (detectedCaseId) {
      // If milestone is M2
      if (detectedMilestone === "M2") {
        const publishedSettlement = await prisma.blockchainRecord.findFirst({
          where: { caseId: detectedCaseId, milestone: "SETTLEMENT", status: BlockchainStatus.PUBLISHED },
        });
        if (publishedSettlement?.documentHash) {
          return {
            verified: false,
            status: "Altered",
            message: `Verification Failed: Document has been altered. SHA-256 fingerprint does not match the immutable on-chain record published on Sepolia for case ${detectedCaseId}.`,
            localHash,
            onChainHash: publishedSettlement.documentHash,
            caseId: detectedCaseId,
            milestone: "M2",
            onChainKey: publishedSettlement.onChainKey || `${detectedCaseId}#M2`,
            transactionHash: publishedSettlement.transactionHash,
            isPublished: true,
            expectedSource: "Ethereum Sepolia On-Chain Record",
          };
        }

        const dbReceipt = await prisma.paymentReceipt.findFirst({
          where: { paymentCase: { caseId: detectedCaseId } },
        });
        if (dbReceipt?.documentHash) {
          return {
            verified: false,
            status: "Altered",
            message: `Verification Failed: Document has been altered. SHA-256 fingerprint does not match the canonical payment receipt stored in the settlement database for case ${detectedCaseId}.`,
            localHash,
            onChainHash: dbReceipt.documentHash,
            caseId: detectedCaseId,
            milestone: "M2",
            isPublished: false,
            expectedSource: "Settlement Payment Receipt Registry",
          };
        }
      }

      // If milestone is M1 (or fallback)
      const publishedAward = await prisma.blockchainRecord.findFirst({
        where: { caseId: detectedCaseId, milestone: "AWARD", status: BlockchainStatus.PUBLISHED },
      });
      if (publishedAward?.documentHash) {
        return {
          verified: false,
          status: "Altered",
          message: `Verification Failed: Document has been altered. SHA-256 fingerprint does not match the immutable on-chain record published on Sepolia for case ${detectedCaseId}.`,
          localHash,
          onChainHash: publishedAward.documentHash,
          caseId: detectedCaseId,
          milestone: "M1",
          onChainKey: publishedAward.onChainKey || `${detectedCaseId}#M1`,
          transactionHash: publishedAward.transactionHash,
          isPublished: true,
          expectedSource: "Ethereum Sepolia On-Chain Record",
        };
      }

      const dbOffer = await prisma.offerLetter.findFirst({
        where: { caseId: detectedCaseId },
      });
      if (dbOffer?.blockchainHash) {
        return {
          verified: false,
          status: "Altered",
          message: `Verification Failed: Document has been altered. SHA-256 fingerprint does not match the official signed Form H stored in the statutory database registry for case ${detectedCaseId} (awaiting on-chain publication after statutory 24-hour grace period).`,
          localHash,
          onChainHash: dbOffer.blockchainHash,
          caseId: detectedCaseId,
          milestone: "M1",
          isPublished: false,
          expectedSource: "Statutory Case Registry (Pre-Notarized / Grace Period)",
        };
      }

      // If M2 was not explicitly set but M2 published record exists and M1 had neither
      const publishedSettlementFallback = await prisma.blockchainRecord.findFirst({
        where: { caseId: detectedCaseId, milestone: "SETTLEMENT", status: BlockchainStatus.PUBLISHED },
      });
      if (publishedSettlementFallback?.documentHash) {
        return {
          verified: false,
          status: "Altered",
          message: `Verification Failed: Document has been altered. SHA-256 fingerprint does not match the immutable on-chain record published on Sepolia for case ${detectedCaseId}.`,
          localHash,
          onChainHash: publishedSettlementFallback.documentHash,
          caseId: detectedCaseId,
          milestone: "M2",
          onChainKey: publishedSettlementFallback.onChainKey || `${detectedCaseId}#M2`,
          transactionHash: publishedSettlementFallback.transactionHash,
          isPublished: true,
          expectedSource: "Ethereum Sepolia On-Chain Record",
        };
      }
    }

    return {
      verified: false,
      status: "Not Found",
      message: "Record Not Found. This document has not been published to the blockchain ledger yet.",
      localHash,
    };
  }

  // If the record in the current database is NOT published yet, it cannot be verified on-chain
  if (record.status !== BlockchainStatus.PUBLISHED) {
    return {
      verified: false,
      status: "Not Found",
      message: "Record Not Found. This document has not been published to the blockchain ledger yet.",
      localHash,
      caseId: record.caseId,
      milestone: record.milestone === "SETTLEMENT" ? "M2" : "M1",
      onChainKey: record.onChainKey || record.caseId,
    };
  }

  const onChainKey = record.onChainKey || record.caseId;
  const chain = await ethereum.getRecordFromBlockchain(onChainKey);
  const net = ethereum.getActiveNetwork();
  const contractAddress = net.contractAddress;
  const etherscanBase = net.chainId === 11155111 ? "https://sepolia.etherscan.io" : "https://etherscan.io";

  // If the on-chain contract has not recorded this key (publishedAt == 0)
  if (!chain.publishedAt || chain.publishedAt === 0) {
    return {
      verified: false,
      status: "Not Found",
      message: "Record Not Found. This document has not been published to the blockchain ledger yet.",
      localHash,
      caseId: record.caseId,
      milestone: record.milestone === "SETTLEMENT" ? "M2" : "M1",
      onChainKey,
    };
  }

  const isDirectMatch = localHash.toLowerCase() === chain.documentHash.toLowerCase();
  const isLinkedReceiptMatch = Boolean(
    matchedReceipt && record.documentHash.toLowerCase() === chain.documentHash.toLowerCase()
  );
  const isLinkedOfferMatch = Boolean(
    matchedOffer && record.documentHash.toLowerCase() === chain.documentHash.toLowerCase()
  );

  if (!isDirectMatch && !isLinkedReceiptMatch && !isLinkedOfferMatch) {
    return {
      verified: false,
      status: "Altered",
      message: "Verification Failed: Document has been altered. SHA-256 fingerprint does not match the on-chain anchor.",
      localHash,
      onChainHash: chain.documentHash,
      caseId: record.caseId,
      milestone: record.milestone === "SETTLEMENT" ? "M2" : "M1",
      onChainKey,
      transactionHash: record.transactionHash,
      contractAddress,
      network: net.label,
      chainId: net.chainId,
      etherscanUrl: record.transactionHash ? `${etherscanBase}/tx/${record.transactionHash}` : null,
      contractUrl: contractAddress ? `${etherscanBase}/address/${contractAddress}` : null,
    };
  }

  return {
    verified: true,
    status: "Authentic",
    message: isLinkedReceiptMatch
      ? "Verification Successful: Official RENTAS payment receipt cryptographically verified against immutable on-chain settlement record."
      : "Verification Successful: Document cryptographically matches the immutable on-chain record.",
    timestamp: chain.publishedAt,
    caseId: record.caseId,
    milestone: record.milestone === "SETTLEMENT" ? "M2" : "M1",
    onChainKey,
    localHash,
    onChainHash: chain.documentHash,
    transactionHash: record.transactionHash,
    contractAddress,
    network: net.label,
    chainId: net.chainId,
    etherscanUrl: record.transactionHash ? `${etherscanBase}/tx/${record.transactionHash}` : null,
    contractUrl: contractAddress ? `${etherscanBase}/address/${contractAddress}` : null,
  };
}
