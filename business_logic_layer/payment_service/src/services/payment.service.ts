import { randomBytes, randomUUID } from "crypto";
import { prisma } from "../prisma";
import { PaymentStatus, UserRole, CaseStatus, BlockchainStatus } from "@prisma/client";
import * as bankService from "./bank.service";
import { persistCanonicalReceipt, archiveCanonicalReceipt } from "./receipt.service";
import { newRecordId } from "../../../smart_contract_service/src/services/blockchain.service";
import { isOwnedBy, isSameOwner, normalizeNric, parseSharePercent, type OwnerIdentity } from "../utils/owner-identity";

export function calculateRequiredSignatures(amount: number, totalActiveGAs = 5): number {
  let signatures = 2; // base (1 initiator + 1 approver)
  if (amount >= 1_000_000) {
    signatures += 1;
  }
  if (amount >= 5_000_000) {
    signatures += Math.floor(amount / 5_000_000);
  }
  return Math.min(signatures, Math.max(totalActiveGAs, 1));
}

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function resolveAdminUuid(adminId: string): Promise<string> {
  if (isUuid(adminId)) return adminId;

  const match = adminId.match(/\d+/);
  const index = match ? parseInt(match[0], 10) : 1;
  const targetEmail = `ga${Math.min(Math.max(index, 1), 5)}@fcrscs.gov.my`;

  const ga = await prisma.user.findFirst({
    where: { email: targetEmail },
    select: { userId: true },
  });
  if (ga) return ga.userId;

  const anyGa = await prisma.user.findFirst({
    where: { role: UserRole.GOVERNMENT_ADMINISTRATOR, isActive: true, deletedAt: null },
    select: { userId: true },
  });
  return anyGa?.userId || adminId;
}

// Crockford-style alphabet: no I, O, 0, 1 to avoid look-alikes
const SHORT_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function shortId(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SHORT_ID_ALPHABET[bytes[i] % SHORT_ID_ALPHABET.length];
  }
  return out;
}

/**
 * Short human-readable payment record id in the canonical format
 * PMT-YYYY-MM-#### (Doc 5 §1.4 / Bug Logs), assigned by the application and stored as the
 * PaymentCase primary key. Strictly sequential starting from 0001 per month without random numbers.
 */
export async function newPaymentId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `PMT-${year}-${month}-`;

  const cases = await prisma.paymentCase.findMany({
    where: { id: { startsWith: prefix } },
    select: { id: true },
  });

  let maxSeq = 0;
  for (const c of cases) {
    const seqStr = c.id.slice(prefix.length);
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
 * Delay between the final signature marking a case AUTHORISED and its automatic
 * submission to the bank queue (WAITING_BANK_APPROVAL), where only the bank
 * portal can approve/reject it.
 */
export const BANK_SUBMISSION_DELAY_MS = 5_000;

/**
 * Normalizes any contact number to local Malaysian format (e.g. "011111111"),
 * removing all "+60", "+6", or "60" prefixes and ensuring leading "0".
 */
export function normalizeLocalPhoneNumber(raw?: string | null): string {
  if (!raw) return "";
  let cleaned = String(raw).trim().replace(/[\s-]/g, "");
  if (cleaned.startsWith("+60")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("+6")) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("60")) {
    cleaned = cleaned.slice(2);
  }
  if (!cleaned.startsWith("0") && cleaned.length > 0) {
    cleaned = `0${cleaned}`;
  }
  return cleaned.replace(/\D/g, "");
}

// Prisma's `include: { authorisations: true }` carries no relation-level orderBy, so
// Postgres returns those rows in arbitrary physical order. Every GA audit trail reads
// this array as a chronological log, so normalise it once at the shared serializer.
const byCreatedAtAsc = (a: { createdAt?: Date | string }, b: { createdAt?: Date | string }) =>
  new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();

/**
 * Calculates the next bank working day in Malaysia (Monday to Friday, 09:00 AM MYT / UTC+8).
 * Saturday and Sunday roll forward to Monday 09:00 AM MYT.
 */
export function calculateNextWorkingDayMYT(fromDate: Date = new Date()): Date {
  const mytOffsetMs = 8 * 60 * 60 * 1000;
  const mytDate = new Date(fromDate.getTime() + mytOffsetMs);

  // Advance by 1 calendar day in MYT
  mytDate.setUTCDate(mytDate.getUTCDate() + 1);

  // If Saturday (6) -> skip 2 days to Monday
  // If Sunday (0) -> skip 1 day to Monday
  const day = mytDate.getUTCDay();
  if (day === 6) {
    mytDate.setUTCDate(mytDate.getUTCDate() + 2);
  } else if (day === 0) {
    mytDate.setUTCDate(mytDate.getUTCDate() + 1);
  }

  // Set time to 09:00:00.000 AM MYT (01:00:00.000 UTC)
  mytDate.setUTCHours(9, 0, 0, 0);

  return new Date(mytDate.getTime() - mytOffsetMs);
}

export function extractScheduledFor(pc: any): string | null {
  if (!pc) return null;
  const fts = Array.isArray(pc.failedTransactions) ? pc.failedTransactions : [];
  const latest = fts[fts.length - 1];
  if (latest?.resolution && latest.resolution.startsWith("schedule_next_working_day:")) {
    return latest.resolution.slice("schedule_next_working_day:".length).trim();
  }
  if (pc.status === PaymentStatus.SCHEDULED || pc.status === "SCHEDULED" || pc.status === "Scheduled") {
    const baseDate = latest?.resolvedAt || latest?.createdAt || pc.updatedAt || pc.createdAt || new Date();
    return calculateNextWorkingDayMYT(new Date(baseDate)).toISOString();
  }
  return null;
}

export function formatPaymentResponse<T extends { id: string; caseId: string }>(pc: T): T & { paymentId: string; scheduledFor?: string | null } {
  const anyPc = pc as any;
  const scheduledFor = extractScheduledFor(anyPc);
  const beneficiaries: any[] | undefined = Array.isArray(anyPc.beneficiaries) ? anyPc.beneficiaries : undefined;
  return {
    ...pc,
    paymentId: pc.id,
    ...(scheduledFor ? { scheduledFor } : {}),
    ...(anyPc.phoneNumber !== undefined ? { phoneNumber: normalizeLocalPhoneNumber(anyPc.phoneNumber) } : {}),
    ...(Array.isArray(anyPc.authorisations)
      ? { authorisations: [...anyPc.authorisations].sort(byCreatedAtAsc) }
      : {}),
    // N-of-M bank-details progress for co-owned parcels. Only meaningful once
    // beneficiaries have been seeded (i.e. the parcel has more than one owner).
    ...(beneficiaries && beneficiaries.length > 0
      ? {
          beneficiaries,
          beneficiaryTotal: beneficiaries.length,
          beneficiarySubmitted: beneficiaries.filter((b) => Boolean(b.submittedAt)).length,
        }
      : {}),
  };
}

export async function attachM1Status<T extends { caseId: string }>(cases: T[]): Promise<(T & { isM1Published: boolean })[]> {
  if (!cases || cases.length === 0) return [];
  try {
    const m1Records = await prisma.blockchainRecord.findMany({
      where: {
        caseId: { in: cases.map((c) => c.caseId) },
        milestone: "AWARD",
        status: BlockchainStatus.PUBLISHED,
      },
      select: { caseId: true },
    });
    const publishedSet = new Set(m1Records.map((r) => r.caseId));
    return cases.map((c) => ({
      ...c,
      isM1Published: publishedSet.has(c.caseId),
    }));
  } catch (err) {
    console.error("[payment_service] Error querying M1 status for cases:", err);
    return cases.map((c) => ({
      ...c,
      isM1Published: false,
    }));
  }
}
export async function enrichPaymentWithAdminNames<T extends { authorisations?: any[] }>(pc: T): Promise<T> {
  if (!pc || !pc.authorisations || !Array.isArray(pc.authorisations) || pc.authorisations.length === 0) {
    return pc;
  }
  try {
    const adminUsers = await prisma.user.findMany({
      select: { userId: true, name: true, email: true },
    });
    const userMap = new Map<string, string>();
    for (const u of adminUsers) {
      if (u.userId) userMap.set(u.userId.toLowerCase(), u.name);
      if (u.email) userMap.set(u.email.toLowerCase(), u.name);
      if (u.name) userMap.set(u.name.toLowerCase(), u.name);
    }
    const enrichedAuths = pc.authorisations.map((auth: any) => {
      const key = String(auth.adminId || "").toLowerCase();
      let adminName = userMap.get(key);
      if (!adminName) {
        const gaMatch = key.match(/^ga(\d+)/i);
        if (gaMatch) {
          adminName = `Gov Admin ${gaMatch[1]}`;
        } else {
          adminName = "Gov Admin 1";
        }
      }
      return {
        ...auth,
        adminName,
      };
    });
    return {
      ...pc,
      authorisations: enrichedAuths,
    };
  } catch {
    return pc;
  }
}

export interface SavedAccountRecord {
  userId?: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  phoneNumber: string;
  myKadNumber: string;
  verified: boolean;
}

export const profileSavedAccountsStore = new Map<string, SavedAccountRecord>();

export function isSameBankInstitution(bankA?: string | null, bankB?: string | null): boolean {
  if (!bankA || !bankB) return false;
  const cfgA = bankService.findBankConfig(bankA);
  const cfgB = bankService.findBankConfig(bankB);
  if (cfgA && cfgB) {
    return cfgA.key.toLowerCase() === cfgB.key.toLowerCase();
  }
  return bankA.trim().toLowerCase() === bankB.trim().toLowerCase();
}

export async function validateAccountNumberUniqueness(
  arg1: string,
  arg2: string,
  arg3?: string | { currentCaseId?: string; userId?: string; userName?: string; bankName?: string },
  arg4?: { currentCaseId?: string; userId?: string; userName?: string }
): Promise<void> {
  let bankName = "";
  let accountNumber = "";
  let myKadNumber = "";
  let opts: { currentCaseId?: string; userId?: string; userName?: string } | undefined;

  if (typeof arg3 === "string") {
    // 4-argument signature: (bankName, accountNumber, myKadNumber, opts)
    bankName = (arg1 || "").trim();
    accountNumber = arg2;
    myKadNumber = arg3;
    opts = arg4;
  } else {
    // 3-argument signature: (accountNumber, myKadNumber, opts)
    accountNumber = arg1;
    myKadNumber = arg2;
    opts = arg3;
    bankName = ((arg3 as any)?.bankName || "").trim();
  }

  const cleanAccount = (accountNumber || "").replace(/[\s-]/g, "");
  if (!cleanAccount) return;

  const cleanMyKad = normalizeNric(myKadNumber);
  const cleanUserName = (opts?.userName || "").trim().toLowerCase();
  const userId = opts?.userId;
  const currentCaseId = opts?.currentCaseId;
  const identity: OwnerIdentity = {
    userId,
    name: opts?.userName,
    identificationNumber: myKadNumber,
  };

  const isBankMatch = (otherBank?: string | null) => {
    if (bankName && otherBank) {
      return isSameBankInstitution(bankName, otherBank);
    }
    if (!bankName) return true;
    return false;
  };

  // 1. Check existing PaymentCases
  const existingCases = await prisma.paymentCase.findMany({
    where: {
      accountNumber: { not: null },
      ...(currentCaseId ? { caseId: { not: currentCaseId } } : {}),
    },
  });

  for (const pc of existingCases) {
    const pcAcc = (pc.accountNumber || "").replace(/[\s-]/g, "");
    if (pcAcc === cleanAccount && isBankMatch(pc.bankName)) {
      const pcMyKad = (pc.myKadNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const pcHolder = (pc.accountHolderName || "").trim().toLowerCase();
      const pcBeneficiary = pc.beneficiaryId;

      let isOwnerMatch = false;
      if (pc.caseId) {
        const ac = await prisma.acquisitionCase.findUnique({
          where: { caseId: pc.caseId },
          include: {
            landParcel: {
              include: {
                ownerships: {
                  include: { landOwner: true },
                },
              },
            },
          },
        });
        const owners = ac?.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [];
        isOwnerMatch = isOwnedBy(owners, identity);
      }

      const isSameMember =
        (cleanMyKad && pcMyKad && pcMyKad === cleanMyKad) ||
        (userId && pcBeneficiary === userId) ||
        (cleanUserName && pcHolder && pcHolder === cleanUserName) ||
        isOwnerMatch;

      if (!isSameMember) {
        throw new Error(
          "This bank account number is already registered by another beneficiary. Bank accounts must be unique to the registered MyKad holder."
        );
      }
    }
  }

  // 2. Check ReceiverBankDetails
  const existingBankDetails = await prisma.receiverBankDetails.findMany({
    where: {
      ...(currentCaseId ? { paymentCase: { caseId: { not: currentCaseId } } } : {}),
    },
    include: {
      paymentCase: true,
    },
  });

  for (const rbd of existingBankDetails) {
    const rbdAcc = (rbd.accountNumber || "").replace(/[\s-]/g, "");
    if (rbdAcc === cleanAccount && isBankMatch(rbd.bankName)) {
      const rbdMyKad = (rbd.myKadNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const rbdHolder = (rbd.accountHolderName || "").trim().toLowerCase();
      const pcBeneficiary = rbd.paymentCase?.beneficiaryId;

      let isOwnerMatch = false;
      if (rbd.paymentCase?.caseId) {
        const ac = await prisma.acquisitionCase.findUnique({
          where: { caseId: rbd.paymentCase.caseId },
          include: {
            landParcel: {
              include: {
                ownerships: {
                  include: { landOwner: true },
                },
              },
            },
          },
        });
        const owners = ac?.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [];
        isOwnerMatch = isOwnedBy(owners, identity);
      }

      const isSameMember =
        (cleanMyKad && rbdMyKad && rbdMyKad === cleanMyKad) ||
        (userId && pcBeneficiary === userId) ||
        (cleanUserName && rbdHolder && rbdHolder === cleanUserName) ||
        isOwnerMatch;

      if (!isSameMember) {
        throw new Error(
          "This bank account number is already registered by another beneficiary. Bank accounts must be unique to the registered MyKad holder."
        );
      }
    }
  }

  // 3. Check profileSavedAccountsStore
  for (const record of profileSavedAccountsStore.values()) {
    const recAcc = (record.accountNumber || "").replace(/[\s-]/g, "");
    if (recAcc === cleanAccount && isBankMatch(record.bankName)) {
      const recMyKad = (record.myKadNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const recUser = record.userId;
      const isSame =
        (cleanMyKad && recMyKad && recMyKad === cleanMyKad) ||
        (userId && recUser && recUser === userId);
      if (!isSame) {
        throw new Error(
          "This bank account number is already registered by another beneficiary. Bank accounts must be unique to the registered MyKad holder."
        );
      }
    }
  }

  // 4. Check MemberPayoutDetail
  const isUserValidUuid = Boolean(userId && isUuid(userId));
  const existingPayouts = await prisma.memberPayoutDetail.findMany({
    where: isUserValidUuid ? { userId: { not: userId } } : {},
  });

  for (const mpd of existingPayouts) {
    const mpdAcc = (mpd.accountNumber || "").replace(/[\s-]/g, "");
    if (mpdAcc === cleanAccount && isBankMatch(mpd.bankName)) {
      const mpdMyKad = (mpd.myKadNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const isSameMember =
        (cleanMyKad && mpdMyKad && mpdMyKad === cleanMyKad) ||
        (userId && mpd.userId === userId);
      if (!isSameMember) {
        throw new Error(
          "This bank account number is already registered by another beneficiary. Bank accounts must be unique to the registered MyKad holder."
        );
      }
    }
  }
}

/**
 * Creates one PaymentBeneficiary row per co-owner of the parcel so every owner
 * has an apportioned slot to submit their own bank details into. Called when a
 * payment case is first created; idempotent via the (case, owner) unique key.
 */
export async function seedPaymentBeneficiaries(
  paymentCaseId: string,
  owners: { ownerId: string; share?: string | null }[],
  totalAmount: number
): Promise<void> {
  if (!owners || owners.length === 0) return;
  for (let i = 0; i < owners.length; i++) {
    const sharePercent = parseSharePercent(owners[i]);
    try {
      await prisma.paymentBeneficiary.upsert({
        where: { paymentCaseId_ownerId: { paymentCaseId, ownerId: owners[i].ownerId } },
        update: {},
        create: {
          paymentCaseId,
          ownerId: owners[i].ownerId,
          beneficiaryIndex: i,
          sharePercent,
          amount: Number(totalAmount) * (sharePercent / 100),
        },
      });
    } catch (err) {
      console.error("[payment_service] Error seeding payment beneficiary:", err);
    }
  }
}

export async function submitBankDetails(data: {
  caseId: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  phoneNumber: string;
  myKadNumber: string;
  userId?: string;
  isAnotherAccount?: boolean;
}) {
  const cleanAccountNumber = data.accountNumber.replace(/[\s-]/g, "");
  const cleanMyKad = data.myKadNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  await bankService.validateBankAccount(data.bankName, cleanAccountNumber);

  const ac = await prisma.acquisitionCase.findUnique({
    where: { caseId: data.caseId },
    include: {
      landParcel: {
        include: {
          ownerships: {
            include: { landOwner: true },
          },
        },
      },
      compensationReports: true,
      offerLetters: true,
    },
  });
  const existingPc = await prisma.paymentCase.findUnique({
    where: { caseId: data.caseId },
    include: { beneficiary: true },
  });
  const owner =
    existingPc?.beneficiary ||
    ac?.landParcel?.ownerships?.[0]?.landOwner ||
    (await prisma.landOwner.findFirst({
      where: { ownerships: { some: { landParcel: { caseId: data.caseId } } } },
    })) ||
    (await prisma.landOwner.findFirst());
  if (!owner) throw new Error("Cannot submit bank details: No registered landowner found");
  const amount = ac?.compensationReports?.[0]?.totalCompensation
    ? Number(ac.compensationReports[0].totalCompensation)
    : ac?.offerLetters?.[0]?.offerAmount
    ? Number(ac.offerLetters[0].offerAmount)
    : 0;

  await validateAccountNumberUniqueness(data.bankName, cleanAccountNumber, cleanMyKad, {
    currentCaseId: data.caseId,
    userId: owner?.ownerId,
    userName: data.accountHolderName || owner?.name,
  });

  const m1Record = await prisma.blockchainRecord.findFirst({
    where: {
      caseId: data.caseId,
      milestone: "AWARD",
      status: BlockchainStatus.PUBLISHED,
    },
  });
  const targetInitialStatus = m1Record
    ? PaymentStatus.READY_TO_INITIATE
    : PaymentStatus.AWARD_NOTARIZATION_PENDING;

  const cleanPhone = normalizeLocalPhoneNumber(data.phoneNumber || owner?.contact);

  // Every owner of the parcel is a beneficiary of the same payment case. The
  // submitting owner's row is the one that carries this bank detail; the others
  // stay unsubmitted until they sign in and provide their own, so the case is
  // only fully banked when N-of-M owners have submitted.
  const allOwners =
    ac?.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [owner];
  const submitterIdentity: OwnerIdentity = {
    userId: data.userId,
    name: data.accountHolderName,
    identificationNumber: data.myKadNumber,
  };
  const submitterOwner =
    allOwners.find((o: any) => isSameOwner(o, submitterIdentity)) || owner;

  const pc = await prisma.paymentCase.upsert({
    where: { caseId: data.caseId },
    update: {
      bankName: data.bankName,
      accountNumber: cleanAccountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: cleanPhone,
      myKadNumber: data.myKadNumber,
      status: targetInitialStatus,
    },
    create: {
      id: await newPaymentId(),
      caseId: data.caseId,
      beneficiaryId: owner.ownerId,
      amount,
      bankName: data.bankName,
      accountNumber: cleanAccountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: cleanPhone,
      myKadNumber: data.myKadNumber,
      status: targetInitialStatus,
    },
  });

  const encryptedBankDetails = Buffer.from(cleanAccountNumber).toString("base64");
  for (let i = 0; i < allOwners.length; i++) {
    const ownerRow = allOwners[i];
    const isSubmitter = ownerRow.ownerId === submitterOwner.ownerId;
    const sharePercent = parseSharePercent(ownerRow);
    const ownerAmount = Number(amount) * (sharePercent / 100);
    await prisma.paymentBeneficiary.upsert({
      where: {
        paymentCaseId_ownerId: { paymentCaseId: pc.id, ownerId: ownerRow.ownerId },
      },
      update: isSubmitter
        ? {
            bankName: data.bankName,
            accountNumber: cleanAccountNumber,
            accountHolderName: data.accountHolderName,
            phoneNumber: cleanPhone,
            myKadNumber: data.myKadNumber,
            encryptedBankDetails,
            submittedAt: new Date(),
          }
        : {},
      create: {
        paymentCaseId: pc.id,
        ownerId: ownerRow.ownerId,
        beneficiaryIndex: i,
        sharePercent,
        amount: ownerAmount,
        ...(isSubmitter
          ? {
              bankName: data.bankName,
              accountNumber: cleanAccountNumber,
              accountHolderName: data.accountHolderName,
              phoneNumber: cleanPhone,
              myKadNumber: data.myKadNumber,
              encryptedBankDetails,
              submittedAt: new Date(),
            }
          : {}),
      },
    });
  }

  // Resolve actual User record for member payout detail
  let targetUser: { userId: string; name: string; email: string; identificationNumber: string | null; contactNumber: string | null } | null = null;
  if (data.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.userId)) {
    targetUser = await prisma.user.findUnique({
      where: { userId: data.userId },
      select: { userId: true, name: true, email: true, identificationNumber: true, contactNumber: true },
    });
  }
  if (!targetUser && cleanMyKad) {
    targetUser = await prisma.user.findFirst({
      where: { identificationNumber: { equals: cleanMyKad, mode: "insensitive" } },
      select: { userId: true, name: true, email: true, identificationNumber: true, contactNumber: true },
    });
  }
  if (!targetUser && owner?.email) {
    targetUser = await prisma.user.findUnique({
      where: { email: owner.email.toLowerCase() },
      select: { userId: true, name: true, email: true, identificationNumber: true, contactNumber: true },
    });
  }
  if (!targetUser && owner?.nric) {
    targetUser = await prisma.user.findFirst({
      where: { identificationNumber: { equals: owner.nric.replace(/[^a-zA-Z0-9]/g, ""), mode: "insensitive" } },
      select: { userId: true, name: true, email: true, identificationNumber: true, contactNumber: true },
    });
  }
  if (!targetUser && data.accountHolderName) {
    targetUser = await prisma.user.findFirst({
      where: {
        name: { equals: data.accountHolderName, mode: "insensitive" },
        role: "DISPLACED_COMMUNITY_MEMBER",
      },
      select: { userId: true, name: true, email: true, identificationNumber: true, contactNumber: true },
    });
  }

  const effectiveUserId = targetUser?.userId;

  let existingDefault: any = null;
  if (effectiveUserId) {
    try {
      existingDefault = await prisma.memberPayoutDetail.findUnique({
        where: { userId: effectiveUserId },
      });
    } catch {}
  }
  if (!existingDefault && effectiveUserId && profileSavedAccountsStore.has(`user:${effectiveUserId}`)) {
    existingDefault = profileSavedAccountsStore.get(`user:${effectiveUserId}`);
  }
  if (!existingDefault && cleanMyKad && profileSavedAccountsStore.has(`mykad:${cleanMyKad}`)) {
    existingDefault = profileSavedAccountsStore.get(`mykad:${cleanMyKad}`);
  }

  // Also check if member has ANY prior submitted PaymentCase with bank details
  if (!existingDefault && (effectiveUserId || cleanMyKad || owner)) {
    const priorCase = await prisma.paymentCase.findFirst({
      where: {
        caseId: { not: data.caseId },
        bankName: { not: null },
        accountNumber: { not: null },
        status: {
          notIn: [PaymentStatus.BANK_DETAILS_PENDING, PaymentStatus.NEW_BANK_DETAILS_PENDING],
        },
        OR: [
          ...(effectiveUserId ? [{ beneficiaryId: effectiveUserId }] : []),
          ...(cleanMyKad ? [{ myKadNumber: cleanMyKad }] : []),
          ...(targetUser?.name ? [{ accountHolderName: targetUser.name }] : []),
          ...(owner?.name ? [{ accountHolderName: owner.name }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    if (priorCase && priorCase.bankName && priorCase.accountNumber) {
      existingDefault = {
        bankName: priorCase.bankName,
        accountNumber: priorCase.accountNumber,
        accountHolderName: priorCase.accountHolderName || targetUser?.name || owner?.name || "",
        phoneNumber: normalizeLocalPhoneNumber(priorCase.phoneNumber || targetUser?.contactNumber || owner?.contact),
        myKadNumber: priorCase.myKadNumber || cleanMyKad,
      };
      if (effectiveUserId) {
        try {
          await prisma.memberPayoutDetail.upsert({
            where: { userId: effectiveUserId },
            update: {},
            create: {
              userId: effectiveUserId,
              bankName: priorCase.bankName,
              accountNumber: priorCase.accountNumber.replace(/[\s-]/g, ""),
              accountHolderName: priorCase.accountHolderName || targetUser?.name || owner?.name || "",
              phoneNumber: normalizeLocalPhoneNumber(priorCase.phoneNumber || targetUser?.contactNumber || owner?.contact),
              myKadNumber: priorCase.myKadNumber || cleanMyKad,
            },
          });
        } catch (e) {}
      }
    }
  }

  const hasSavedDefault = Boolean(existingDefault);
  const isAnother = Boolean(data.isAnotherAccount) || hasSavedDefault;

  if (isAnother && existingDefault) {
    // Under "Enter Another Bank Account", preserve the user's existing default account in memory store
    if (effectiveUserId) {
      profileSavedAccountsStore.set(`user:${effectiveUserId}`, {
        userId: effectiveUserId,
        bankName: existingDefault.bankName,
        accountNumber: (existingDefault.accountNumber || "").replace(/[\s-]/g, ""),
        accountHolderName: existingDefault.accountHolderName,
        phoneNumber: existingDefault.phoneNumber,
        myKadNumber: existingDefault.myKadNumber,
        verified: true,
      });
    }
    if (cleanMyKad) {
      profileSavedAccountsStore.set(`mykad:${cleanMyKad}`, {
        userId: effectiveUserId,
        bankName: existingDefault.bankName,
        accountNumber: (existingDefault.accountNumber || "").replace(/[\s-]/g, ""),
        accountHolderName: existingDefault.accountHolderName,
        phoneNumber: existingDefault.phoneNumber,
        myKadNumber: existingDefault.myKadNumber,
        verified: true,
      });
    }
  } else if (!hasSavedDefault && !data.isAnotherAccount) {
    // Only the FIRST per-case submission seeds the member's default payout account.
    if (effectiveUserId) {
      profileSavedAccountsStore.set(`user:${effectiveUserId}`, {
        userId: effectiveUserId,
        bankName: data.bankName,
        accountNumber: cleanAccountNumber,
        accountHolderName: data.accountHolderName,
        phoneNumber: cleanPhone,
        myKadNumber: data.myKadNumber,
        verified: true,
      });
      try {
        await prisma.memberPayoutDetail.upsert({
          where: { userId: effectiveUserId },
          update: {},
          create: {
            userId: effectiveUserId,
            bankName: data.bankName,
            accountNumber: cleanAccountNumber,
            accountHolderName: data.accountHolderName,
            phoneNumber: cleanPhone,
            myKadNumber: data.myKadNumber,
          },
        });
      } catch (e) {}
    }
    if (cleanMyKad) {
      profileSavedAccountsStore.set(`mykad:${cleanMyKad}`, {
        userId: effectiveUserId,
        bankName: data.bankName,
        accountNumber: cleanAccountNumber,
        accountHolderName: data.accountHolderName,
        phoneNumber: cleanPhone,
        myKadNumber: data.myKadNumber,
        verified: true,
      });
    }
  }

  return formatPaymentResponse(pc);
}

// Starting eligible statuses for payment initiation
export const ELIGIBLE_INITIATION_STATUSES: (PaymentStatus | string)[] = [
  PaymentStatus.READY_TO_INITIATE,
  PaymentStatus.BANK_DETAILS_PENDING,
  "Ready to Initiate",
  "Ready To Initiate",
  "READY_TO_INITIATE",
  "Bank Details Pending",
  "BANK_DETAILS_PENDING",
  "Offer Accepted",
  "offer_accepted",
  "Approved",
  "Bank Details Submitted",
  "BANK_DETAILS_SUBMITTED",
];
/**
 * Cancel is now a terminal, high-accountability action reserved ONLY for cases
 * the bank or governance has already bounced (Transfer Rejected / Transfer
 * Failed). Earlier-stage cases must go through their own non-destructive SOPs
 * (Request New Bank Details, Mark as Resolved) — never an accidental cancel.
 */
const CANCELLABLE_STATUSES: (PaymentStatus | string)[] = [
  PaymentStatus.TRANSFER_REJECTED,
  PaymentStatus.TRANSFER_FAILED,
  "Transfer Rejected",
  "Transfer Failed",
];

export async function initiateTransfer(caseId: string, rawAdminId: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");

  if (!ELIGIBLE_INITIATION_STATUSES.includes(pc.status)) {
    throw new Error(`Case cannot be initiated from status '${pc.status}'. Case must be in 'Offer Accepted' state.`);
  }
  if (!pc.bankName) {
    throw new Error(`Cannot initiate transfer without submitted bank details.`);
  }

  // FR-019 hard gate: disbursement can never outrun the statutory award —
  // Milestone 1 must be notarized on the blockchain before initiation.
  const m1 = await prisma.blockchainRecord.findUnique({
    where: { caseId_milestone: { caseId, milestone: "AWARD" } },
  });
  if (!m1 || m1.status !== BlockchainStatus.PUBLISHED) {
    throw new Error(
      "Initiation is locked: Milestone 1 (Statutory Award) must be published on the blockchain first."
    );
  }

  const adminId = await resolveAdminUuid(rawAdminId);

  const totalActiveGAs = await prisma.user.count({
    where: { role: UserRole.GOVERNMENT_ADMINISTRATOR, isActive: true, deletedAt: null },
  });
  const gaCap = totalActiveGAs > 0 ? totalActiveGAs : 5;
  const requiredSigs = calculateRequiredSignatures(Number(pc.amount), gaCap);

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "initiate",
      cycle: pc.cycle,
    },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: {
      requiredSignatures: requiredSigs,
      currentSignatures: 1,
      status: PaymentStatus.PENDING_APPROVAL,
    },
    include: { authorisations: true, receipt: true },
  });

  try {
    await prisma.acquisitionCase.updateMany({
      where: { caseId },
      data: { status: CaseStatus.PAYMENT_IN_PROGRESS },
    });
  } catch (err) {
    console.error("[payment_service] Error updating AcquisitionCase to PAYMENT_IN_PROGRESS:", err);
  }

  const enriched = await enrichPaymentWithAdminNames(updated);
  return formatPaymentResponse(enriched);
}

export async function authoriseTransfer(caseId: string, rawAdminId: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { authorisations: true },
  });
  if (!pc) throw new Error("Case not found");

  const adminId = await resolveAdminUuid(rawAdminId);

  // Segregation of duties: only the initiator and GAs who already APPROVED are
  // blocked. A GA who rejected (or resolved) the case may approve it after the
  // rejection was resolved — the resolve loop exists precisely so the approval
  // chain can continue. Both checks scope to the ACTIVE cycle (FR-020): a new
  // bank-details round legally voids prior signatures, so Cycle-1 signers are
  // NOT barred from Cycle 2.
  const priorApproval = pc.authorisations.find(
    (a) =>
      a.cycle === pc.cycle &&
      a.adminId === adminId &&
      (a.action === "initiate" || a.action === "authorise")
  );
  if (priorApproval) {
    throw new Error("Segregation of duties: Admin cannot authorise their own initiation or double-sign");
  }

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "authorise",
      cycle: pc.cycle,
    },
  });

  const newCurrentSigs = pc.currentSignatures + 1;

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: {
      currentSignatures: newCurrentSigs,
      status: PaymentStatus.PENDING_APPROVAL,
    },
    include: { authorisations: true, receipt: true },
  });

  const enriched = await enrichPaymentWithAdminNames(updated);
  return formatPaymentResponse(enriched);
}

export async function confirmExecution(caseId: string, rawAdminId: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { authorisations: true },
  });
  if (!pc) throw new Error("Case not found");

  const rawStatus = String(pc.status);
  if (
    pc.status !== PaymentStatus.PENDING_APPROVAL &&
    rawStatus !== "Authorised" &&
    rawStatus !== "AUTHORISED"
  ) {
    throw new Error(`Case cannot be executed from status '${pc.status}'. Case must be in 'Pending Approval' state.`);
  }

  if (pc.currentSignatures < pc.requiredSignatures) {
    throw new Error(`Insufficient signatures: required ${pc.requiredSignatures}, got ${pc.currentSignatures}`);
  }

  const adminId = await resolveAdminUuid(rawAdminId);

  const isAuthoriserOrInitiator = pc.authorisations.some(
    (a) => a.cycle === pc.cycle && a.adminId === adminId && (a.action === "authorise" || a.action === "initiate")
  );
  if (!isAuthoriserOrInitiator) {
    const adminUser = await prisma.user.findUnique({ where: { userId: adminId } });
    if (!adminUser || (adminUser.role !== 'GOVERNMENT_ADMINISTRATOR' && adminUser.role !== 'SYSTEM_ADMINISTRATOR')) {
      throw new Error("Only an authorized government administrator can confirm final disbursement execution");
    }
  }

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "execute_transfer",
      cycle: pc.cycle,
    },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.BANK_APPROVAL_PENDING },
    include: { authorisations: true, receipt: true },
  });
  const enriched = await enrichPaymentWithAdminNames(updated);
  return formatPaymentResponse(enriched);
}

/**
 * Cancel is terminal and irreversible: the payment becomes CANCELLED and the
 * statutory case becomes CASE_CLOSED, with the only way forward being a brand
 * new case. So the reasons are restricted to genuine "this acquisition is dead"
 * events. A landowner bank-account change goes through requestDetailsUpdate
 * (NEW_BANK_DETAILS_PENDING) instead. Keep in sync with CANCELLATION_REASONS in
 * paymentModals.tsx; the controller enforces this list as an allow-guard on
 * POST /cancel.
 */
export const CANCELLATION_REASONS = {
  COURT_ORDER_OR_INJUNCTION: "Court order or legal injunction halts the acquisition",
  AWARD_OVERTURNED_ON_APPEAL: "Compensation award overturned or revised on appeal / objection",
  BENEFICIARY_INELIGIBLE_OR_FRAUD: "Beneficiary ineligibility or fraud confirmed after verification",
  ACQUISITION_DISCONTINUED: "Land acquisition discontinued — land no longer required",
} as const;

export type CancellationReasonKey = keyof typeof CANCELLATION_REASONS;

/**
 * GA transfer-rejection reasons (FR-018, revoked & replaced 2026-09-12): these
 * are GOVERNANCE reasons a Government Administrator rejects a not-yet-executed
 * transfer. Bank-side codes (recipient account invalid/closed, name mismatch)
 * belong to the bank portal's own rejection vocabulary, not the GA's. The
 * frontend also offers "Other" — the GA must then type a compulsory free-text
 * reason, which this service stores verbatim.
 */
export const REJECTION_REASONS = {
  BENEFICIARY_DETAILS_MISMATCH:
    "Beneficiary name or bank details do not match the statutory land award records",
  AWARD_VERIFICATION_FAILED:
    "Award amount or supporting documents failed pre-disbursement verification",
  DUPLICATE_DISBURSEMENT_RISK:
    "Possible duplicate disbursement instruction detected for this case",
} as const;

export type RejectionReasonKey = keyof typeof REJECTION_REASONS;

export async function rejectTransfer(caseId: string, rawAdminId: string, reason: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { authorisations: true },
  });
  if (!pc) throw new Error("Case not found");

  const rawStatus = String(pc.status);
  if (
    ![
      PaymentStatus.PENDING_APPROVAL,
      "PENDING_APPROVAL",
      "Pending Approval",
      "Transfer Initiated",
      "Authorised",
    ].includes(rawStatus)
  ) {
    throw new Error(`Transfer cannot be rejected from status '${pc.status}'. Only pending transfers can be rejected.`);
  }

  if (!reason || !reason.trim()) {
    throw new Error("A rejection reason is required");
  }

  const adminId = await resolveAdminUuid(rawAdminId);

  const alreadyApproved = pc.authorisations.find(
    (a) =>
      a.cycle === pc.cycle &&
      a.adminId === adminId &&
      (a.action === "initiate" || a.action === "authorise")
  );
  if (alreadyApproved) {
    throw new Error("Segregation of duties: Admin cannot reject a transfer they initiated or already approved");
  }

  // Store human-readable English (never the raw enum key), mirroring cancelPayment.
  const reasonText = (REJECTION_REASONS as Record<string, string>)[reason] || reason.trim();

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "reject",
      reason: reasonText,
      cycle: pc.cycle,
    },
  });

  // A GA rejection is a governance decision made BEFORE any bank execution —
  // it must NOT create a transfer attempt or a failed-transaction row. The
  // case simply waits in Transfer Rejected for a GA "Mark as Resolved".
  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.TRANSFER_REJECTED },
    include: { authorisations: true },
  });
  return formatPaymentResponse(updated);
}

/**
 * FR-018 (revoked & replaced): the ONLY SOP for a Transfer Rejected case.
 * A GA confirms the rejection reason has been addressed and returns the case
 * to Pending Approval with all previously collected signatures intact, so the
 * remaining approvals continue until final execution.
 */
export async function resolveRejectedTransfer(caseId: string, rawAdminId: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");

  const rawStatus = String(pc.status);
  if (pc.status !== PaymentStatus.TRANSFER_REJECTED && rawStatus !== "TRANSFER_REJECTED" && rawStatus !== "Transfer Rejected") {
    throw new Error(`Only a Transfer Rejected case can be marked as resolved (current: '${pc.status}')`);
  }

  const adminId = await resolveAdminUuid(rawAdminId);

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "mark_resolved",
      cycle: pc.cycle,
    },
  });

  // currentSignatures deliberately NOT reset — initiated + already approved
  // signatures stay valid for the continuing approval chain.
  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.PENDING_APPROVAL },
    include: { authorisations: true },
  });
  const enriched = await enrichPaymentWithAdminNames(updated);
  return formatPaymentResponse(enriched);
}

export async function cancelPayment(caseId: string, rawAdminId: string, reasonKeyOrText: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");
  if (!CANCELLABLE_STATUSES.includes(pc.status)) {
    throw new Error(
      "Only a Transfer Rejected or Transfer Failed case can be cancelled. Use the non-destructive SOP for this status."
    );
  }

  const adminId = await resolveAdminUuid(rawAdminId);
  const reasonText =
    (CANCELLATION_REASONS as Record<string, string>)[reasonKeyOrText] || reasonKeyOrText;

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "cancel",
      reason: reasonText,
      cycle: pc.cycle,
    },
  });

  await prisma.failedTransaction.create({
    data: {
      paymentCaseId: pc.id,
      errorLog: `CANCELLED: ${reasonText}`,
      resolution: null,
    },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.CANCELLED },
    include: { authorisations: true, failedTransactions: true },
  });

  // Cancelling is terminal: the statutory case closes. The only way to continue
  // is to open a new case and restart the process. Published blockchain
  // notarization records are deliberately left untouched (immutable award audit).
  try {
    await prisma.acquisitionCase.updateMany({
      where: { caseId },
      data: { status: CaseStatus.CASE_CLOSED },
    });
  } catch (err) {
    console.error("[payment_service] Error closing AcquisitionCase on cancel:", err);
  }

  return formatPaymentResponse(updated);
}

export async function retryPayment(caseId: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { failedTransactions: true },
  });
  if (!pc) throw new Error("Case not found");
  if (pc.status !== PaymentStatus.TRANSFER_FAILED && pc.status !== ("Transfer Failed" as any)) {
    throw new Error("Payment is not in failed state");
  }

  const latestFailed = pc.failedTransactions[pc.failedTransactions.length - 1];
  if (latestFailed) {
    await prisma.failedTransaction.update({
      where: { id: latestFailed.id },
      data: { resolution: "retry", resolvedAt: new Date() },
    });
  }

  // Already fully authorised — retry re-queues the transfer with the bank.
  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.BANK_APPROVAL_PENDING },
    include: { authorisations: true, failedTransactions: true },
  });
  return formatPaymentResponse(updated);
}

export async function requestDetailsUpdate(caseId: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { failedTransactions: true },
  });
  if (!pc) throw new Error("Case not found");

  const latestFailed = pc.failedTransactions[pc.failedTransactions.length - 1];
  if (latestFailed) {
    await prisma.failedTransaction.update({
      where: { id: latestFailed.id },
      data: { resolution: "request_details", resolvedAt: new Date() },
    });
  }

  // FR-020: a new bank-details round opens a fresh multi-sig cycle. An approval
  // authorizes payment to a SPECIFIC account — replacing the destination
  // account legally voids all prior signatures, so the count resets to 0 and
  // prior-cycle authorisations drop to history (Cycle N, superseded).
  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: {
      status: PaymentStatus.NEW_BANK_DETAILS_PENDING,
      cycle: pc.cycle + 1,
      currentSignatures: 0,
    },
    include: { authorisations: true, failedTransactions: true },
  });
  return formatPaymentResponse(updated);
}

export async function scheduleTomorrow(caseId: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { failedTransactions: true },
  });
  if (!pc) throw new Error("Case not found");

  const scheduledFor = calculateNextWorkingDayMYT();

  const latestFailed = pc.failedTransactions[pc.failedTransactions.length - 1];
  if (latestFailed) {
    await prisma.failedTransaction.update({
      where: { id: latestFailed.id },
      data: {
        resolution: `schedule_next_working_day:${scheduledFor.toISOString()}`,
        resolvedAt: new Date(),
      },
    });
  }

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.SCHEDULED },
    include: { authorisations: true, failedTransactions: true },
  });
  return formatPaymentResponse(updated);
}

export async function checkAndAutoExecuteScheduledTransfers(): Promise<number> {
  try {
    const scheduledCases = await prisma.paymentCase.findMany({
      where: {
        status: PaymentStatus.SCHEDULED,
        deletedAt: null,
      },
      include: {
        failedTransactions: true,
      },
    });

    if (!scheduledCases || scheduledCases.length === 0) return 0;

    const now = new Date();
    let executedCount = 0;

    for (const pc of scheduledCases) {
      const scheduledIso = extractScheduledFor(pc);
      const scheduledDate = scheduledIso ? new Date(scheduledIso) : null;

      if (scheduledDate && now.getTime() >= scheduledDate.getTime()) {
        const latestFailed = pc.failedTransactions[pc.failedTransactions.length - 1];
        if (latestFailed) {
          await prisma.failedTransaction.update({
            where: { id: latestFailed.id },
            data: { resolution: "auto_executed_scheduled", resolvedAt: now },
          });
        }

        await prisma.paymentCase.update({
          where: { id: pc.id },
          data: { status: PaymentStatus.BANK_APPROVAL_PENDING },
        });

        executedCount++;
      }
    }

    return executedCount;
  } catch (err) {
    console.error("[payment_service] Error auto-executing scheduled transfers:", err);
    return 0;
  }
}

export async function getPaymentStatus(caseId: string, userRole?: string, userId?: string) {
  const eligibleAc = await prisma.acquisitionCase.findFirst({
    where: {
      caseId,
      status: {
        in: [
          CaseStatus.OFFER_ACCEPTED,
          CaseStatus.PAYMENT_IN_PROGRESS,
          CaseStatus.PAYMENT_COMPLETED,
          CaseStatus.CASE_CLOSED,
        ],
      },
    },
    include: {
      landParcel: {
        include: {
          ownerships: {
            include: { landOwner: true },
          },
        },
      },
      compensationReports: true,
      offerLetters: true,
    },
  });

  if (!eligibleAc) {
    const rawCase = await prisma.acquisitionCase.findFirst({ where: { caseId } });
    if (!rawCase) {
      throw new Error(`Acquisition case not found: ${caseId}`);
    }
    throw new Error("Payment record not available: case has not reached offer accepted status.");
  }

  let pc = await prisma.paymentCase.findFirst({
    where: { caseId, deletedAt: null },
    include: {
      authorisations: true,
      receipt: true,
      receiptArchives: { orderBy: { archivedAt: "desc" } },
      failedTransactions: true,
    },
  });

  if (!pc) {
    const ac = eligibleAc;
    const primaryOwner =
      ac.landParcel?.ownerships?.[0]?.landOwner ||
      (await prisma.landOwner.findFirst({
        where: { ownerships: { some: { landParcel: { caseId: ac.caseId } } } },
      })) ||
      (await prisma.landOwner.findFirst());
    if (!primaryOwner) throw new Error(`Case ${ac.caseId} has no registered landowner`);
    const amount = ac.compensationReports?.[0]?.totalCompensation
      ? Number(ac.compensationReports[0].totalCompensation)
      : ac.offerLetters?.[0]?.offerAmount
      ? Number(ac.offerLetters[0].offerAmount)
      : 0;

    const m1 = await prisma.blockchainRecord.findFirst({
      where: { caseId: ac.caseId, milestone: "AWARD", status: BlockchainStatus.PUBLISHED },
    });
    const initialStatus = m1
      ? PaymentStatus.BANK_DETAILS_PENDING
      : PaymentStatus.BANK_DETAILS_AND_M1_PENDING;

    const pmtId = await newPaymentId();
    pc = await prisma.paymentCase.create({
      data: {
        id: pmtId,
        caseId: ac.caseId,
        beneficiaryId: primaryOwner.ownerId,
        amount,
        accountHolderName: primaryOwner?.name || null,
        phoneNumber: normalizeLocalPhoneNumber(primaryOwner?.contact) || null,
        myKadNumber: primaryOwner?.nric || null,
        status: initialStatus,
        requiredSignatures: 0,
        currentSignatures: 0,
      },
      include: {
        authorisations: true,
        receipt: true,
        receiptArchives: { orderBy: { archivedAt: "desc" } },
        failedTransactions: true,
      },
    });
    const parcelOwners = ac.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [primaryOwner];
    await seedPaymentBeneficiaries(pc.id, parcelOwners, amount);
  }

  if (!pc) throw new Error("Case not found");

  if (userRole === UserRole.DISPLACED_COMMUNITY_MEMBER || userRole === "DISPLACED_COMMUNITY_MEMBER") {
    let currentUser: { userId: string; name: string; email: string; identificationNumber: string | null } | null = null;
    if (userId) {
      currentUser = await prisma.user.findUnique({
        where: { userId },
        select: { userId: true, name: true, email: true, identificationNumber: true },
      });
    }

    if (currentUser) {
      const cleanIc = (currentUser.identificationNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const memberName = currentUser.name.toLowerCase();

      const isDirectMatch =
        (pc.accountHolderName && pc.accountHolderName.toLowerCase() === memberName) ||
        pc.beneficiaryId === currentUser.userId ||
        (pc.myKadNumber && cleanIc && pc.myKadNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanIc);

      if (!isDirectMatch) {
        const ownsCase = await prisma.acquisitionCase.findFirst({
          where: {
            caseId,
            landParcel: {
              ownerships: {
                some: {
                  landOwner: {
                    OR: [
                      { ownerId: currentUser.userId },
                      { name: currentUser.name },
                      { email: currentUser.email },
                      ...(currentUser.identificationNumber ? [{ nric: currentUser.identificationNumber }, { nric: cleanIc }] : []),
                    ],
                  },
                },
              },
            },
          },
        });

        if (!ownsCase) {
          throw new Error("Access denied: Case does not belong to your account.");
        }
      }
    }
  }

  const enriched = await enrichPaymentWithAdminNames(pc);
  const [withM1] = await attachM1Status([enriched]);
  return formatPaymentResponse(withM1);
}

export async function getPendingAuthorisations() {
  const eligibleAcquisitionCases = await prisma.acquisitionCase.findMany({
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
    select: { caseId: true, status: true },
  });
  const eligibleCaseMap = new Map(eligibleAcquisitionCases.map((c) => [c.caseId, c.status]));
  const eligibleCaseIds = Array.from(new Set(eligibleAcquisitionCases.map((c) => c.caseId)));

  const cases = await prisma.paymentCase.findMany({
    where: {
      status: PaymentStatus.PENDING_APPROVAL,
      deletedAt: null,
      caseId: { in: eligibleCaseIds },
    },
    // The receipt is loaded on every payment read: a generated receipt is a
    // historical fact about the case, so the record modal shows it at whatever
    // status the case currently sits at rather than only at Paid.
    include: { authorisations: true, receipt: true, receiptArchives: { orderBy: { archivedAt: "desc" } }, beneficiaries: { orderBy: { beneficiaryIndex: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  const enriched = await Promise.all(cases.map(enrichPaymentWithAdminNames));
  const withM1 = await attachM1Status(enriched);
  return withM1.map((c) => ({
    ...formatPaymentResponse(c),
    caseStatus: eligibleCaseMap.get(c.caseId) || "OFFER_ACCEPTED",
  }));
}

export async function getAllCases(userRole?: string, userId?: string) {
  const eligibleAcquisitionCases = await prisma.acquisitionCase.findMany({
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
    select: { caseId: true, status: true },
  });
  const eligibleCaseMap = new Map(eligibleAcquisitionCases.map((c) => [c.caseId, c.status]));
  const eligibleCaseIds = new Set(eligibleAcquisitionCases.map((c) => c.caseId));

  try {
    // Ensure any payment cases whose acquisition case is not at or after OFFER_ACCEPTED are soft-deleted
    await prisma.paymentCase.updateMany({
      where: {
        caseId: { notIn: Array.from(eligibleCaseIds) },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    const existingPaymentCases = await prisma.paymentCase.findMany({
      select: { caseId: true, id: true, deletedAt: true },
    });
    const existingCaseMap = new Map(existingPaymentCases.map((p) => [p.caseId, p]));

    const acceptedCases = await prisma.acquisitionCase.findMany({
      where: {
        status: CaseStatus.OFFER_ACCEPTED,
      },
      include: {
        landParcel: {
          include: {
            ownerships: {
              include: { landOwner: true },
            },
          },
        },
        compensationReports: true,
        offerLetters: true,
      },
      orderBy: { caseId: "asc" },
    });

    for (const ac of acceptedCases) {
      const existing = existingCaseMap.get(ac.caseId);
      if (existing) {
        if (existing.deletedAt != null) {
          // Restore previously soft-deleted PaymentCase upon re-acceptance
          await prisma.paymentCase.update({
            where: { id: existing.id },
            data: { deletedAt: null },
          });
        }
      } else {
        const primaryOwner =
          ac.landParcel?.ownerships?.[0]?.landOwner ||
          (await prisma.landOwner.findFirst({
            where: { ownerships: { some: { landParcel: { caseId: ac.caseId } } } },
          })) ||
          (await prisma.landOwner.findFirst());
        if (!primaryOwner) continue;
        const amount = ac.compensationReports?.[0]?.totalCompensation
          ? Number(ac.compensationReports[0].totalCompensation)
          : ac.offerLetters?.[0]?.offerAmount
          ? Number(ac.offerLetters[0].offerAmount)
          : 0;

        const m1 = await prisma.blockchainRecord.findFirst({
          where: { caseId: ac.caseId, milestone: "AWARD", status: BlockchainStatus.PUBLISHED },
        });
        const initialStatus = m1
          ? PaymentStatus.BANK_DETAILS_PENDING
          : PaymentStatus.BANK_DETAILS_AND_M1_PENDING;

        const pmtId = await newPaymentId();
        const created = await prisma.paymentCase.create({
          data: {
            id: pmtId,
            caseId: ac.caseId,
            beneficiaryId: primaryOwner.ownerId,
            amount,
            accountHolderName: primaryOwner?.name || null,
            phoneNumber: normalizeLocalPhoneNumber(primaryOwner?.contact) || null,
            myKadNumber: primaryOwner?.nric || null,
            status: initialStatus,
            requiredSignatures: 0,
            currentSignatures: 0,
          },
        });
        const parcelOwners = ac.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [primaryOwner];
        await seedPaymentBeneficiaries(created.id, parcelOwners, amount);
      }

      // Also ensure blockchainRecord exists for Milestone 1 (AWARD)
      const existingBcn = await prisma.blockchainRecord.findUnique({
        where: { caseId_milestone: { caseId: ac.caseId, milestone: "AWARD" } },
      });
      if (!existingBcn) {
        const formHHash = ac.offerLetters?.[0]?.blockchainHash || "0x0000000000000000000000000000000000000000000000000000000000000000";
        const bcnId = await newRecordId();
        await prisma.blockchainRecord.create({
          data: {
            id: bcnId,
            caseId: ac.caseId,
            milestone: "AWARD",
            onChainKey: `${ac.caseId}#M1`,
            documentHash: formHHash,
            status: BlockchainStatus.READY_TO_PUBLISH,
            createdAt: new Date(),
          },
        });
      } else if (existingBcn.deletedAt != null) {
        await prisma.blockchainRecord.update({
          where: { id: existingBcn.id },
          data: { deletedAt: null },
        });
      }
    }
  } catch (err) {
    console.error("[payment_service] Error syncing accepted cases to payment cases:", err);
  }

  await checkAndAutoExecuteScheduledTransfers();

  const cases = await prisma.paymentCase.findMany({
    where: {
      deletedAt: null,
      caseId: { in: Array.from(eligibleCaseIds) },
    },
    include: {
      authorisations: { orderBy: { createdAt: "asc" } },
      receipt: true,
      receiptArchives: { orderBy: { archivedAt: "desc" } },
      failedTransactions: true,
    },
    orderBy: { id: "asc" },
  });

  if (userRole === UserRole.DISPLACED_COMMUNITY_MEMBER || userRole === "DISPLACED_COMMUNITY_MEMBER") {
    let currentUser: { userId: string; name: string; email: string; identificationNumber: string | null } | null = null;
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      currentUser = await prisma.user.findUnique({
        where: { userId },
        select: { userId: true, name: true, email: true, identificationNumber: true },
      });
    }

    if (currentUser) {
      const cleanIc = (currentUser.identificationNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const memberName = currentUser.name.toLowerCase();
      const memberEmail = currentUser.email.toLowerCase();

      const ownedAcquisitions = await prisma.acquisitionCase.findMany({
        where: {
          landParcel: {
            ownerships: {
              some: {
                landOwner: {
                  OR: [
                    { ownerId: currentUser.userId },
                    { name: currentUser.name },
                    { email: memberEmail },
                    ...(currentUser.identificationNumber ? [{ nric: currentUser.identificationNumber }, { nric: cleanIc }] : []),
                  ],
                },
              },
            },
          },
        },
        select: { caseId: true },
      });
      const ownedCaseIds = new Set(ownedAcquisitions.map((a) => a.caseId));

      const filtered = cases.filter((pc) => {
        if (ownedCaseIds.has(pc.caseId)) return true;
        if (pc.accountHolderName && pc.accountHolderName.toLowerCase() === memberName) return true;
        if (pc.beneficiaryId === currentUser.userId) return true;
        if (pc.myKadNumber && cleanIc && pc.myKadNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanIc) return true;
        return false;
      });

      const enriched = await Promise.all(filtered.map(enrichPaymentWithAdminNames));
      const withM1 = await attachM1Status(enriched);
      return withM1.map(formatPaymentResponse);
    }
  }

  const syncStatuses = async (casesList: (any & { isM1Published: boolean })[]) => {
    const preInitStatuses: PaymentStatus[] = [
      PaymentStatus.BANK_DETAILS_PENDING,
      PaymentStatus.READY_TO_INITIATE,
      PaymentStatus.AWARD_NOTARIZATION_PENDING,
      PaymentStatus.BANK_DETAILS_AND_M1_PENDING,
    ];
    for (const pc of casesList) {
      if (preInitStatuses.includes(pc.status)) {
        const hasBank = Boolean(pc.bankName && pc.accountNumber);
        const hasM1 = Boolean(pc.isM1Published);
        let expected: PaymentStatus = PaymentStatus.BANK_DETAILS_AND_M1_PENDING;
        if (hasBank && hasM1) expected = PaymentStatus.READY_TO_INITIATE;
        else if (!hasBank && hasM1) expected = PaymentStatus.BANK_DETAILS_PENDING;
        else if (hasBank && !hasM1) expected = PaymentStatus.AWARD_NOTARIZATION_PENDING;

        if (pc.status !== expected) {
          pc.status = expected;
          try {
            await prisma.paymentCase.update({
              where: { id: pc.id },
              data: { status: expected },
            });
          } catch (err) {
            console.warn('[payment_service] Status sync err:', err);
          }
        }
      }
    }
  };

  const enriched = await Promise.all(cases.map(enrichPaymentWithAdminNames));
  const withM1 = await attachM1Status(enriched);
  await syncStatuses(withM1);
  return withM1.map((c) => ({
    ...formatPaymentResponse(c),
    caseStatus: eligibleCaseMap.get(c.caseId) || "OFFER_ACCEPTED",
  }));
}

export async function getSavedBankDetails(userId?: string, myKadNumber?: string, userName?: string) {
  let currentUser: { userId: string; name: string; email: string; identificationNumber: string | null } | null = null;
  if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    currentUser = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true, name: true, email: true, identificationNumber: true },
    });
  }

  const cleanIc = normalizeNric(currentUser?.identificationNumber || myKadNumber);
  const name = (currentUser?.name || userName || "").toLowerCase();

  if (!currentUser && cleanIc) {
    currentUser = await prisma.user.findFirst({
      where: { identificationNumber: { equals: cleanIc, mode: "insensitive" } },
      select: { userId: true, name: true, email: true, identificationNumber: true },
    });
  }
  if (!currentUser && name) {
    currentUser = await prisma.user.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, role: "DISPLACED_COMMUNITY_MEMBER" },
      select: { userId: true, name: true, email: true, identificationNumber: true },
    });
  }

  const seen = new Set<string>();
  const savedAccounts: Array<{
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    phoneNumber: string;
    myKadNumber: string;
    verified: boolean;
  }> = [];

  // 0. Persisted default payout account (FR-016) — survives backend restarts.
  if (currentUser) {
    try {
      const payout = await prisma.memberPayoutDetail.findUnique({
        where: { userId: currentUser.userId },
      });
      if (payout) {
        const cleanAcc = (payout.accountNumber || "").replace(/[\s-]/g, "");
        const key = `${payout.bankName}-${cleanAcc}`;
        if (!seen.has(key)) {
          seen.add(key);
          savedAccounts.push({
            bankName: payout.bankName,
            accountNumber: payout.accountNumber,
            accountHolderName: payout.accountHolderName,
            phoneNumber: normalizeLocalPhoneNumber(payout.phoneNumber),
            myKadNumber: payout.myKadNumber,
            verified: true,
          });
        }
      }
    } catch {}
  }

  // 1. Resolve owned cases
  let ownedCaseIds = new Set<string>();
  if (currentUser) {
    const ownedAcquisitions = await prisma.acquisitionCase.findMany({
      where: {
        landParcel: {
          ownerships: {
            some: {
              landOwner: {
                OR: [
                  { ownerId: currentUser.userId },
                  { name: currentUser.name },
                  { email: currentUser.email.toLowerCase() },
                  ...(cleanIc ? [{ nric: cleanIc }] : []),
                ],
              },
            },
          },
        },
      },
      select: { caseId: true },
    });
    ownedCaseIds = new Set(ownedAcquisitions.map((a) => a.caseId));
  }

  // If not yet in memberPayoutDetail, the earliest case submitted is the original default
  if (savedAccounts.length === 0 && currentUser) {
    const earliestCase = await prisma.paymentCase.findFirst({
      where: {
        bankName: { not: null },
        accountNumber: { not: null },
        status: {
          notIn: [PaymentStatus.BANK_DETAILS_PENDING, PaymentStatus.NEW_BANK_DETAILS_PENDING],
        },
        OR: [
          ...(ownedCaseIds.size > 0 ? [{ caseId: { in: Array.from(ownedCaseIds) } }] : []),
          { beneficiaryId: currentUser.userId },
          ...(cleanIc ? [{ myKadNumber: cleanIc }] : []),
          { accountHolderName: { equals: currentUser.name, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    if (earliestCase && earliestCase.bankName && earliestCase.accountNumber) {
      const cleanAcc = (earliestCase.accountNumber || "").replace(/[\s-]/g, "");
      const key = `${earliestCase.bankName}-${cleanAcc}`;
      if (!seen.has(key)) {
        seen.add(key);
        savedAccounts.push({
          bankName: earliestCase.bankName,
          accountNumber: earliestCase.accountNumber,
          accountHolderName: earliestCase.accountHolderName || currentUser.name,
          phoneNumber: normalizeLocalPhoneNumber(earliestCase.phoneNumber),
          myKadNumber: earliestCase.myKadNumber || currentUser.identificationNumber || cleanIc,
          verified: earliestCase.status !== PaymentStatus.TRANSFER_FAILED && earliestCase.status !== PaymentStatus.TRANSFER_REJECTED,
        });
      }
      try {
        await prisma.memberPayoutDetail.upsert({
          where: { userId: currentUser.userId },
          update: {},
          create: {
            userId: currentUser.userId,
            bankName: earliestCase.bankName,
            accountNumber: cleanAcc,
            accountHolderName: earliestCase.accountHolderName || currentUser.name,
            phoneNumber: normalizeLocalPhoneNumber(earliestCase.phoneNumber),
            myKadNumber: earliestCase.myKadNumber || currentUser.identificationNumber || cleanIc,
          },
        });
      } catch {}
    }
  }

  // 2. Profile store lookup
  const profileRecords: SavedAccountRecord[] = [];
  if (userId && profileSavedAccountsStore.has(`user:${userId}`)) {
    profileRecords.push(profileSavedAccountsStore.get(`user:${userId}`)!);
  }
  if (cleanIc && profileSavedAccountsStore.has(`mykad:${cleanIc}`)) {
    profileRecords.push(profileSavedAccountsStore.get(`mykad:${cleanIc}`)!);
  }

  for (const rec of profileRecords) {
    const cleanAcc = (rec.accountNumber || "").replace(/[\s-]/g, "");
    const key = `${rec.bankName}-${cleanAcc}`;
    if (!seen.has(key)) {
      seen.add(key);
      savedAccounts.push({
        bankName: rec.bankName,
        accountNumber: rec.accountNumber,
        accountHolderName: rec.accountHolderName,
        phoneNumber: normalizeLocalPhoneNumber(rec.phoneNumber),
        myKadNumber: rec.myKadNumber,
        verified: rec.verified,
      });
    }
  }

  // 3. Query submitted PaymentCases
  const paymentCasesWithBank = await prisma.paymentCase.findMany({
    where: {
      bankName: { not: null },
      accountNumber: { not: null },
      // status is a Prisma enum column — only enum values are valid here
      // (legacy display-string variants never exist in the column).
      status: {
        notIn: [PaymentStatus.BANK_DETAILS_PENDING, PaymentStatus.NEW_BANK_DETAILS_PENDING],
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const matchingCases = paymentCasesWithBank.filter((pc) => {
    if (ownedCaseIds.has(pc.caseId)) return true;
    if (pc.accountHolderName && pc.accountHolderName.toLowerCase() === name) return true;
    if (pc.beneficiaryId === userId) return true;
    if (pc.myKadNumber && cleanIc && pc.myKadNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanIc) return true;
    return false;
  });

  for (const pc of matchingCases) {
    if (pc.bankName && pc.accountNumber) {
      const cleanAcc = pc.accountNumber.replace(/[\s-]/g, "");
      const key = `${pc.bankName}-${cleanAcc}`;
      if (!seen.has(key)) {
        seen.add(key);
        savedAccounts.push({
          bankName: pc.bankName,
          accountNumber: pc.accountNumber,
          accountHolderName: pc.accountHolderName || currentUser?.name || name,
          phoneNumber: normalizeLocalPhoneNumber(pc.phoneNumber),
          myKadNumber: pc.myKadNumber || currentUser?.identificationNumber || myKadNumber || "",
          verified: pc.status !== PaymentStatus.TRANSFER_FAILED && pc.status !== PaymentStatus.TRANSFER_REJECTED,
        });
      }
    }
  }

  return savedAccounts;
}

export async function saveMemberBankDetails(
  userId: string,
  data: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    phoneNumber: string;
    myKadNumber: string;
  }
) {
  const cleanAccountNumber = data.accountNumber.replace(/[\s-]/g, "");
  await bankService.validateBankAccount(data.bankName, cleanAccountNumber);

  const user = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    ? await prisma.user.findUnique({ where: { userId } })
    : null;
  const cleanIc = normalizeNric(user?.identificationNumber || data.myKadNumber);
  const userName = (user?.name || data.accountHolderName || "").trim();
  const identity: OwnerIdentity = {
    userId,
    name: user?.name || data.accountHolderName,
    identificationNumber: user?.identificationNumber || data.myKadNumber,
  };

  await validateAccountNumberUniqueness(data.bankName, cleanAccountNumber, cleanIc, {
    userId,
    userName,
  });

  const cleanPhone = normalizeLocalPhoneNumber(data.phoneNumber || user?.contactNumber || "");

  const record: SavedAccountRecord = {
    userId,
    bankName: data.bankName,
    accountNumber: cleanAccountNumber,
    accountHolderName: userName || data.accountHolderName,
    phoneNumber: cleanPhone,
    myKadNumber: user?.identificationNumber || data.myKadNumber || "",
    verified: true,
  };

  profileSavedAccountsStore.set(`user:${userId}`, record);
  if (cleanIc) {
    profileSavedAccountsStore.set(`mykad:${cleanIc}`, record);
  }

  // FR-016 flow 2: persist the default payout account so it survives restarts.
  if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    try {
      await prisma.memberPayoutDetail.upsert({
        where: { userId },
        update: {
          bankName: data.bankName,
          accountNumber: cleanAccountNumber,
          accountHolderName: record.accountHolderName,
          phoneNumber: record.phoneNumber,
          myKadNumber: record.myKadNumber,
        },
        create: {
          userId,
          bankName: data.bankName,
          accountNumber: cleanAccountNumber,
          accountHolderName: record.accountHolderName,
          phoneNumber: record.phoneNumber,
          myKadNumber: record.myKadNumber,
        },
      });
    } catch {}
  }

  // If the user has any ALREADY SUBMITTED payment case (not in BANK_DETAILS_PENDING), sync receiverBankDetails
  const submittedCases = await prisma.paymentCase.findMany({
    where: {
      status: {
        notIn: [PaymentStatus.BANK_DETAILS_PENDING, PaymentStatus.NEW_BANK_DETAILS_PENDING],
      },
      bankName: { not: null },
    },
  });

  for (const pc of submittedCases) {
    let isOwner = false;
    if (pc.caseId) {
      const ac = await prisma.acquisitionCase.findUnique({
        where: { caseId: pc.caseId },
        include: {
          landParcel: {
            include: {
              ownerships: {
                include: { landOwner: true },
              },
            },
          },
        },
      });
      const owners = ac?.landParcel?.ownerships?.map((o: any) => o.landOwner).filter(Boolean) || [];
      isOwner = isOwnedBy(owners, identity);
    }
    if (isOwner || pc.beneficiaryId === userId) {
      try {
        const encryptedBankDetails = Buffer.from(cleanAccountNumber).toString("base64");
        await prisma.receiverBankDetails.upsert({
          where: { paymentCaseId: pc.id },
          update: {
            bankName: data.bankName,
            accountNumber: cleanAccountNumber,
            accountHolderName: data.accountHolderName,
            phoneNumber: cleanPhone,
            myKadNumber: data.myKadNumber,
            encryptedBankDetails,
          },
          create: {
            bankName: data.bankName,
            accountNumber: cleanAccountNumber,
            accountHolderName: data.accountHolderName,
            phoneNumber: cleanPhone,
            myKadNumber: data.myKadNumber,
            encryptedBankDetails,
            paymentCaseId: pc.id,
          },
        });
      } catch {}
    }
  }

  return {
    bankName: data.bankName,
    accountNumber: cleanAccountNumber,
    accountHolderName: record.accountHolderName,
    phoneNumber: record.phoneNumber,
    myKadNumber: record.myKadNumber,
    verified: true,
  };
}

export async function getFailedTransactions() {
  const eligibleAcquisitionCases = await prisma.acquisitionCase.findMany({
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
    select: { caseId: true, status: true },
  });
  const eligibleCaseMap = new Map(eligibleAcquisitionCases.map((c) => [c.caseId, c.status]));
  const eligibleCaseIds = Array.from(new Set(eligibleAcquisitionCases.map((c) => c.caseId)));

  await checkAndAutoExecuteScheduledTransfers();

  // Membership is the case's CURRENT status, not whether it ever failed. Keying
  // on the failedTransactions relation kept resolved cases in the register — a
  // dispute resolved to Pending Approval, or a failure rescheduled to Scheduled,
  // is no longer open work. GA-rejected transfers (FR-018) carry no failure row
  // at all, which is why the status list, not the relation, defines this page.
  const cases = await prisma.paymentCase.findMany({
    where: {
      deletedAt: null,
      caseId: { in: eligibleCaseIds },
      status: {
        in: [
          PaymentStatus.TRANSFER_FAILED,
          PaymentStatus.TRANSFER_REJECTED,
          PaymentStatus.DISPUTED,
          PaymentStatus.CANCELLED,
        ],
      },
    },
    // receipt: a failed attempt does not un-generate an earlier receipt, so the
    // modal must still be able to show the one that was issued for this case.
    include: { failedTransactions: true, authorisations: true, receipt: true, receiptArchives: { orderBy: { archivedAt: "desc" } }, beneficiaries: { orderBy: { beneficiaryIndex: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  const enriched = await Promise.all(cases.map(enrichPaymentWithAdminNames));
  return enriched.map((c) => ({
    ...formatPaymentResponse(c),
    caseStatus: eligibleCaseMap.get(c.caseId) || "OFFER_ACCEPTED",
  }));
}

export async function disputePayment(
  caseId: string,
  reason: string,
  document?: { storagePath: string; fileName: string }
) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");

  // FR-013: the member choice point is strictly TRANSFER_SUCCEED — Confirm
  // Received (-> PAID) or Not Received (-> DISPUTED). PAID is terminal and can
  // no longer be disputed.
  if (pc.status !== PaymentStatus.TRANSFER_SUCCEED) {
    throw new Error(`Payment can only be disputed from 'TRANSFER_SUCCEED' (current: '${pc.status}')`);
  }

  await prisma.failedTransaction.create({
    data: {
      paymentCaseId: pc.id,
      errorLog: `DISPUTE: ${reason}`,
    },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: {
      status: PaymentStatus.DISPUTED,
      // FR-015: latest statement only — a new dispute upload replaces the
      // previous document on the case.
      ...(document
        ? {
            disputeDocumentPath: document.storagePath,
            disputeDocumentName: document.fileName,
            disputeUploadedAt: new Date(),
          }
        : {}),
    },
    include: { authorisations: true, receipt: true, failedTransactions: true },
  });
  return formatPaymentResponse(updated);
}

/** FR-014 GA dispute resolutions. */
export const DISPUTE_RESOLUTIONS = {
  MARK_AS_RESOLVED: "MARK_AS_RESOLVED",
  REINITIATE_PAYMENT: "REINITIATE_PAYMENT",
  REQUEST_NEW_BANK_DETAILS: "REQUEST_NEW_BANK_DETAILS",
} as const;

export type DisputeResolution = keyof typeof DISPUTE_RESOLUTIONS;

// Human/audit labels per resolution. The action string is what the governance
// ledger renders, so it must read as a completed act.
const DISPUTE_RESOLUTION_META: Record<
  DisputeResolution,
  { action: string; failureResolution: string; archiveReason: string }
> = {
  MARK_AS_RESOLVED: {
    action: "mark_resolved",
    failureResolution: "mark_resolved",
    archiveReason: "dispute_marked_resolved",
  },
  REINITIATE_PAYMENT: {
    action: "reinitiate_payment",
    failureResolution: "reinitiate_payment",
    archiveReason: "dispute_reinitiate_payment",
  },
  REQUEST_NEW_BANK_DETAILS: {
    action: "request_new_bank_details",
    failureResolution: "request_new_bank_details",
    archiveReason: "dispute_request_new_bank_details",
  },
};

/**
 * FR-014: A GA cross-checks with the bank whether a DISPUTED transfer actually
 * settled, then picks the verified outcome:
 *  - MARK_AS_RESOLVED        funds settled  -> back to TRANSFER_SUCCEED
 *  - REINITIATE_PAYMENT      funds missing  -> re-queue to the bank gateway
 *  - REQUEST_NEW_BANK_DETAILS bad details   -> fresh bank-details + multi-sig cycle
 *
 * The latter two void the frozen settlement receipt of the disputed cycle: it is
 * archived (bytes preserved, original SHA-256 intact) and the active receipt row
 * is cleared so the next successful cycle generates a fresh one.
 */
export async function resolveDispute(caseId: string, rawAdminId: string, resolution: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { authorisations: true, failedTransactions: true, receipt: true },
  });
  if (!pc) throw new Error("Case not found");

  if (pc.status !== PaymentStatus.DISPUTED) {
    throw new Error(`Dispute can only be resolved from 'DISPUTED' (current: '${pc.status}')`);
  }

  if (!Object.prototype.hasOwnProperty.call(DISPUTE_RESOLUTIONS, resolution)) {
    throw new Error(
      `Unknown dispute resolution '${resolution}' (expected one of: ${Object.keys(DISPUTE_RESOLUTIONS).join(", ")})`
    );
  }
  const res = resolution as DisputeResolution;
  const meta = DISPUTE_RESOLUTION_META[res];

  const adminId = await resolveAdminUuid(rawAdminId);

  // Close out the latest DISPUTE failure log with the chosen resolution.
  const latestDispute = [...pc.failedTransactions]
    .reverse()
    .find((ft) => typeof ft.errorLog === "string" && ft.errorLog.startsWith("DISPUTE"));
  if (latestDispute) {
    await prisma.failedTransaction.update({
      where: { id: latestDispute.id },
      data: { resolution: meta.failureResolution, resolvedAt: new Date() },
    });
  }

  // The two outcomes that discard the disputed settlement void the cycle's
  // canonical receipt — archive it before the case leaves DISPUTED.
  if (res !== DISPUTE_RESOLUTIONS.MARK_AS_RESOLVED) {
    await archiveCanonicalReceipt(caseId, meta.archiveReason);
  }

  await prisma.paymentAuthorisation.create({
    data: { paymentCaseId: pc.id, adminId, action: meta.action },
  });

  const data: {
    status: PaymentStatus;
    cycle?: number;
    currentSignatures?: number;
  } = { status: PaymentStatus.BANK_APPROVAL_PENDING };

  if (res === DISPUTE_RESOLUTIONS.MARK_AS_RESOLVED) {
    data.status = PaymentStatus.TRANSFER_SUCCEED;
  } else if (res === DISPUTE_RESOLUTIONS.REQUEST_NEW_BANK_DETAILS) {
    // FR-020: a new bank-details round opens a fresh multi-sig cycle.
    data.status = PaymentStatus.NEW_BANK_DETAILS_PENDING;
    data.cycle = pc.cycle + 1;
    data.currentSignatures = 0;
  }

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data,
    include: { authorisations: true, receipt: true, failedTransactions: true },
  });
  return formatPaymentResponse(updated);
}

// -------------------------------------------------------------
// Bank Clearance Simulator Endpoints (Demo Portal /bank-portal)
// -------------------------------------------------------------

export async function getBankPendingTransfers() {
  await checkAndAutoExecuteScheduledTransfers();
  const cases = await prisma.paymentCase.findMany({
    where: { status: PaymentStatus.BANK_APPROVAL_PENDING },
    include: { authorisations: true, failedTransactions: true, receipt: true },
    orderBy: { updatedAt: "desc" },
  });
  return cases.map(formatPaymentResponse);
}

export async function approveBankTransfer(caseId: string, bankReferenceNumber?: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");
  const rawStatus = String(pc.status);
  if (
    pc.status !== PaymentStatus.BANK_APPROVAL_PENDING &&
    rawStatus !== "WAITING_BANK_APPROVAL"
  ) {
    throw new Error(`Transfer is not awaiting bank approval (current status '${pc.status}')`);
  }

  const bankRef = bankReferenceNumber || `BNK-${Date.now()}-${caseId}`;
  await prisma.paymentReceipt.upsert({
    where: { paymentCaseId: pc.id },
    // generatedAt is deliberately NOT touched on update: the canonical receipt
    // (and therefore its binary SHA-256, FR-019) must stay byte-identical.
    update: { bankReferenceNumber: bankRef },
    create: { paymentCaseId: pc.id, bankReferenceNumber: bankRef },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.TRANSFER_SUCCEED },
    include: { authorisations: true, receipt: true },
  });

  // FR-019: freeze the canonical receipt at TRANSFER_SUCCEED — render the PDF
  // once, write it to disk, and store the binary SHA-256 the member can later
  // verify byte-for-byte against the Etherscan-anchored hash (M2).
  try {
    await persistCanonicalReceipt(caseId);
  } catch (err) {
    console.error(`[WARN] [payment.service] Canonical receipt persistence failed for ${caseId}:`, (err as Error).message);
  }

  try {
    await prisma.acquisitionCase.updateMany({
      where: { caseId },
      data: { status: CaseStatus.PAYMENT_COMPLETED },
    });
  } catch (err) {
    console.error("[payment_service] Error updating AcquisitionCase to PAYMENT_COMPLETED on TRANSFER_SUCCEED:", err);
  }

  return formatPaymentResponse(updated);
}

export async function rejectBankTransfer(caseId: string, errorReason: string, isRejectedCategory = false) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");
  const rawStatus = String(pc.status);
  if (
    pc.status !== PaymentStatus.BANK_APPROVAL_PENDING &&
    rawStatus !== "WAITING_BANK_APPROVAL"
  ) {
    throw new Error(`Transfer is not awaiting bank approval (current status '${pc.status}')`);
  }

  // The bank gateway prefixes machine codes (e.g. "RECIPIENT_ACCOUNT_...").
  // Raw identifiers must never surface in the UI — keep the human sentence only.
  const sanitizedLog =
    (errorReason || "Bank clearance rejected by commercial gateway").replace(
      /^\s*[A-Z0-9_]{6,}\s*:\s*/,
      ""
    ) || "Bank clearance rejected by commercial gateway";

  await prisma.failedTransaction.create({
    data: {
      paymentCaseId: pc.id,
      errorLog: sanitizedLog,
    },
  });

  // All rejections from commercial bank gateway result in TRANSFER_FAILED.
  // TRANSFER_REJECTED is reserved strictly for GA multi-signature rejections.
  const targetStatus = PaymentStatus.TRANSFER_FAILED;

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: targetStatus },
    include: { authorisations: true, failedTransactions: true },
  });
  return formatPaymentResponse(updated);
}

export async function getBankHistory() {
  const eligibleAcquisitionCases = await prisma.acquisitionCase.findMany({
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
    select: { caseId: true, status: true },
  });
  const eligibleCaseMap = new Map(eligibleAcquisitionCases.map((c) => [c.caseId, c.status]));
  const eligibleCaseIds = Array.from(new Set(eligibleAcquisitionCases.map((c) => c.caseId)));

  const cases = await prisma.paymentCase.findMany({
    where: {
      deletedAt: null,
      caseId: { in: eligibleCaseIds },
      status: { in: [PaymentStatus.TRANSFER_SUCCEED, PaymentStatus.PAID, PaymentStatus.TRANSFER_FAILED, PaymentStatus.TRANSFER_REJECTED] },
    },
    include: { receipt: true, failedTransactions: true, authorisations: true },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  return cases.map((c) => ({
    ...formatPaymentResponse(c),
    caseStatus: eligibleCaseMap.get(c.caseId) || "OFFER_ACCEPTED",
  }));
}

export async function confirmPaymentReceipt(
  caseId: string,
  confirmedByRole = "GOVERNMENT_ADMINISTRATOR",
  isAutoOrAdminOverride = false
) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { receipt: true },
  });
  if (!pc) throw new Error("Case not found");

  if (pc.status !== PaymentStatus.TRANSFER_SUCCEED) {
    throw new Error(
      `Payment receipt cannot be confirmed from status '${pc.status}'. Status must be 'TRANSFER_SUCCEED'.`
    );
  }

  // 7-day rule for Government Administrator
  if (confirmedByRole === UserRole.GOVERNMENT_ADMINISTRATOR || confirmedByRole === "GOVERNMENT_ADMINISTRATOR") {
    if (!isAutoOrAdminOverride) {
      const transferDate = pc.receipt?.generatedAt || pc.updatedAt;
      const elapsedDays = (Date.now() - new Date(transferDate).getTime()) / (1000 * 60 * 60 * 24);
      if (elapsedDays < 7) {
        throw new Error(
          `7-day rule active: Government Administrator can only manually confirm receipt after 7 days have elapsed. (${Math.ceil(7 - elapsedDays)} day(s) remaining)`
        );
      }
    }
  }

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.PAID },
    include: { authorisations: true, receipt: true },
  });

  try {
    await prisma.acquisitionCase.updateMany({
      where: { caseId },
      data: { status: CaseStatus.PAYMENT_COMPLETED },
    });
  } catch (err) {
    console.error("[payment_service] Error updating AcquisitionCase to PAYMENT_COMPLETED on PAID:", err);
  }

  return formatPaymentResponse(updated);
}
