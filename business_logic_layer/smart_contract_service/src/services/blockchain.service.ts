import { PrismaClient, BlockchainStatus, CaseStatus, PaymentStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as crypto from "crypto";
import * as ethereum from "./ethereum.service";

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
 * Publish/void transactions are signed by the ADMIN WALLET in MetaMask (the
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

/** On-chain mapping key: LAC-2026-03-0001#M1 / LAC-2026-03-0001#M2 */
export function toOnChainKey(caseId: string, milestone: Milestone): string {
  return `${caseId}#${milestone === "AWARD" ? "M1" : "M2"}`;
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
    const minutesLeft = Math.ceil((graceEndsAt - Date.now()) / 60_000);
    throw new Error(
      `Milestone 1 publication is locked: the 24-hour acceptance grace period for ${caseId} ends in ${minutesLeft} minute(s).`
    );
  }
}

export async function publishRecord(params: {
  caseId: string;
  milestone?: string;
  documentHash: string;
  transactionHash: string;
  onChainKey?: string;
}) {
  const { caseId, documentHash, transactionHash } = params;
  const milestone = normalizeMilestone(params.milestone);
  const onChainKey = params.onChainKey || toOnChainKey(caseId, milestone);

  if (milestone === "AWARD") {
    await assertM1GracePeriodElapsed(caseId);
  }

  const existing = await prisma.blockchainRecord.findUnique({
    where: { caseId_milestone: { caseId, milestone } },
  });
  if (existing) {
    // Idempotent: re-submitting the same mined transaction (e.g. after a
    // network blip between on-chain confirmation and this call) returns the
    // stored record instead of failing.
    if (existing.transactionHash?.toLowerCase() === transactionHash.toLowerCase()) {
      return existing;
    }
    throw new Error(
      `Record already published for this case (${milestone === "AWARD" ? "Milestone 1 Award" : "Milestone 2 Settlement"})`
    );
  }

  await assertRecordedOnChain(transactionHash);

  const record = await prisma.blockchainRecord.create({
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

  return record;
}

export async function voidRecord(params: {
  caseId: string;
  milestone?: string;
  voidReason: string;
  transactionHash: string;
}) {
  const { caseId, voidReason, transactionHash } = params;
  const milestone = normalizeMilestone(params.milestone);

  const r = await prisma.blockchainRecord.findUnique({
    where: { caseId_milestone: { caseId, milestone } },
  });
  if (!r) throw new Error("Record not found");
  if (r.status === BlockchainStatus.VOIDED) throw new Error("Record already voided");

  await assertRecordedOnChain(transactionHash);

  return prisma.blockchainRecord.update({
    where: { id: r.id },
    data: {
      status: BlockchainStatus.VOIDED,
      voidReason,
      voidTransactionHash: transactionHash,
      voidedAt: new Date(),
    },
  });
}

export async function getRecords(status?: string) {
  let enumStatus: BlockchainStatus | undefined;
  if (status) {
    const s = status.toUpperCase().replace(/\s+/g, "_");
    if (s in BlockchainStatus) {
      enumStatus = s as BlockchainStatus;
    }
  }
  return prisma.blockchainRecord.findMany({
    where: enumStatus ? { status: enumStatus } : {},
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecord(caseId: string, milestone?: string) {
  if (milestone === undefined) {
    // Backward compatibility: no milestone specified returns the award (M1)
    // record, falling back to settlement for legacy settlement-only rows.
    return (
      (await prisma.blockchainRecord.findUnique({
        where: { caseId_milestone: { caseId, milestone: "AWARD" } },
      })) ??
      (await prisma.blockchainRecord.findUnique({
        where: { caseId_milestone: { caseId, milestone: "SETTLEMENT" } },
      }))
    );
  }
  const m = normalizeMilestone(milestone);
  return prisma.blockchainRecord.findUnique({
    where: { caseId_milestone: { caseId, milestone: m } },
  });
}

export async function verifyDocument(fileBuffer: Buffer) {
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
    return {
      verified: false,
      status: "Not Found",
      message: "Record Not Found. This document has not been published to the blockchain ledger yet.",
    };
  }

  const onChainKey = record.onChainKey || record.caseId;
  const chain = await ethereum.getRecordFromBlockchain(onChainKey);
  const net = ethereum.getActiveNetwork();
  const contractAddress = net.contractAddress;
  const etherscanBase = net.chainId === 11155111 ? "https://sepolia.etherscan.io" : "https://etherscan.io";

  if (chain.isVoided) {
    return {
      verified: false,
      status: "Voided",
      message: "Warning: This settlement record was legally voided on-chain. Reason: " + chain.voidReason,
      voidReason: chain.voidReason,
      timestamp: chain.publishedAt,
      localHash,
      onChainHash: chain.documentHash,
      caseId: record.caseId,
      milestone: record.milestone === "SETTLEMENT" ? "M2" : "M1",
      onChainKey,
      transactionHash: record.voidTransactionHash || record.transactionHash,
      contractAddress,
      network: net.label,
      chainId: net.chainId,
      etherscanUrl: (record.voidTransactionHash || record.transactionHash) ? `${etherscanBase}/tx/${record.voidTransactionHash || record.transactionHash}` : null,
      contractUrl: contractAddress ? `${etherscanBase}/address/${contractAddress}` : null,
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
