import { randomBytes, randomUUID } from "crypto";
import { prisma } from "../prisma";
import { PaymentStatus, UserRole, CaseStatus, BlockchainStatus } from "@prisma/client";
import * as bankService from "./bank.service";
import { persistCanonicalReceipt } from "./receipt.service";
import { newRecordId } from "../../../smart_contract_service/src/services/blockchain.service";

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

export function formatPaymentResponse<T extends { id: string; caseId: string }>(pc: T): T & { paymentId: string } {
  return {
    ...pc,
    paymentId: pc.id,
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

export async function validateAccountNumberUniqueness(
  accountNumber: string,
  myKadNumber: string,
  opts?: {
    currentCaseId?: string;
    userId?: string;
    userName?: string;
  }
): Promise<void> {
  const cleanAccount = (accountNumber || "").replace(/[\s-]/g, "");
  if (!cleanAccount) return;

  const cleanMyKad = (myKadNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const cleanUserName = (opts?.userName || "").trim().toLowerCase();
  const userId = opts?.userId;
  const currentCaseId = opts?.currentCaseId;

  // 1. Check existing PaymentCases
  const existingCases = await prisma.paymentCase.findMany({
    where: {
      accountNumber: { not: null },
      ...(currentCaseId ? { caseId: { not: currentCaseId } } : {}),
    },
  });

  for (const pc of existingCases) {
    const pcAcc = (pc.accountNumber || "").replace(/[\s-]/g, "");
    if (pcAcc === cleanAccount) {
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
        isOwnerMatch = owners.some((ow: any) => {
          const owIc = (ow.icNumber || ow.nric || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          return (
            (cleanMyKad && owIc === cleanMyKad) ||
            (userId && ow.ownerId === userId) ||
            (cleanUserName && ow.name && ow.name.trim().toLowerCase() === cleanUserName)
          );
        });
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
    if (rbdAcc === cleanAccount) {
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
        isOwnerMatch = owners.some((ow: any) => {
          const owIc = (ow.icNumber || ow.nric || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          return (
            (cleanMyKad && owIc === cleanMyKad) ||
            (userId && ow.ownerId === userId) ||
            (cleanUserName && ow.name && ow.name.trim().toLowerCase() === cleanUserName)
          );
        });
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
    if (recAcc === cleanAccount) {
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
}

export async function submitBankDetails(data: {
  caseId: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  phoneNumber: string;
  myKadNumber: string;
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
  const owner = ac?.landParcel?.ownerships?.[0]?.landOwner;
  const amount = ac?.compensationReports?.[0]?.totalCompensation
    ? Number(ac.compensationReports[0].totalCompensation)
    : ac?.offerLetters?.[0]?.offerAmount
    ? Number(ac.offerLetters[0].offerAmount)
    : 0;

  await validateAccountNumberUniqueness(cleanAccountNumber, cleanMyKad, {
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

  const pc = await prisma.paymentCase.upsert({
    where: { caseId: data.caseId },
    update: {
      bankName: data.bankName,
      accountNumber: cleanAccountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: data.phoneNumber,
      myKadNumber: data.myKadNumber,
      status: targetInitialStatus,
    },
    create: {
      id: await newPaymentId(),
      caseId: data.caseId,
      beneficiaryId: owner?.ownerId || "BEN-" + data.caseId,
      amount,
      bankName: data.bankName,
      accountNumber: cleanAccountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: data.phoneNumber,
      myKadNumber: data.myKadNumber,
      status: targetInitialStatus,
    },
  });

  if (owner?.ownerId) {
    profileSavedAccountsStore.set(`user:${owner.ownerId}`, {
      userId: owner.ownerId,
      bankName: data.bankName,
      accountNumber: cleanAccountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: data.phoneNumber,
      myKadNumber: data.myKadNumber,
      verified: true,
    });
    // FR-016 flow 1: the first per-case submission also persists the member's
    // default payout bank details for reuse on future cases.
    try {
      await prisma.memberPayoutDetail.upsert({
        where: { userId: owner.ownerId },
        update: {
          bankName: data.bankName,
          accountNumber: cleanAccountNumber,
          accountHolderName: data.accountHolderName,
          phoneNumber: data.phoneNumber,
          myKadNumber: data.myKadNumber,
        },
        create: {
          userId: owner.ownerId,
          bankName: data.bankName,
          accountNumber: cleanAccountNumber,
          accountHolderName: data.accountHolderName,
          phoneNumber: data.phoneNumber,
          myKadNumber: data.myKadNumber,
        },
      });
    } catch {}
  }
  if (cleanMyKad) {
    profileSavedAccountsStore.set(`mykad:${cleanMyKad}`, {
      userId: owner?.ownerId,
      bankName: data.bankName,
      accountNumber: cleanAccountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: data.phoneNumber,
      myKadNumber: data.myKadNumber,
      verified: true,
    });
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
const PRE_TRANSFER_STATUSES: (PaymentStatus | string)[] = [
  PaymentStatus.BANK_DETAILS_PENDING,
  PaymentStatus.READY_TO_INITIATE,
  PaymentStatus.PENDING_APPROVAL,
  PaymentStatus.SCHEDULED,
  // FR-018 3-Way SOP: fatal-risk cancellation must also reach rejected and
  // bank-failed cases — a court injunction or fraud flag cannot wait for a
  // re-approval round before the disbursement is halted.
  PaymentStatus.TRANSFER_REJECTED,
  PaymentStatus.TRANSFER_FAILED,
  "Bank Details Pending",
  "Ready to Initiate",
  "Pending Approval",
  "Scheduled",
  "Offer Accepted",
  "offer_accepted",
  "Approved",
  "Bank Details Submitted",
  "Transfer Initiated",
  "Authorised",
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

export const CANCELLATION_REASONS = {
  LANDOWNER_REQUESTED_ACCOUNT_CHANGE: "Landowner requested bank account change / account closed",
  LEGAL_DISPUTE_OR_INJUNCTION: "Land parcel ownership dispute or court injunction received",
  INCORRECT_AWARD_AMOUNT: "Statutory compensation award calculation error detected",
  SUSPECTED_FRAUD_OR_IMPERSONATION: "Security flag raised on beneficiary identity or banking document",
  DUPLICATE_DISBURSEMENT_PREVENTION: "Duplicate payment instruction detected across system records",
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
  if (!PRE_TRANSFER_STATUSES.includes(pc.status)) {
    throw new Error("Only pre-transfer payments can be cancelled");
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

  // FR-019 revocation gate: if Milestone 1 was already notarized on-chain, the
  // ledger still asserts a statutory debt for a now-cancelled case. Park the
  // record in VOID_PENDING so the GA completes the on-chain revocation via
  // voidRecord (signed in MetaMask from PublishLedger).
  const m1 = await prisma.blockchainRecord.findUnique({
    where: { caseId_milestone: { caseId, milestone: "AWARD" } },
  });
  if (m1 && m1.status === BlockchainStatus.PUBLISHED) {
    await prisma.blockchainRecord.update({
      where: { id: m1.id },
      data: { status: BlockchainStatus.VOID_PENDING },
    });
  }

  try {
    await prisma.acquisitionCase.updateMany({
      where: { caseId, status: CaseStatus.PAYMENT_IN_PROGRESS },
      data: { status: CaseStatus.OFFER_ACCEPTED },
    });
  } catch (err) {
    console.error("[payment_service] Error reverting AcquisitionCase to OFFER_ACCEPTED on cancel:", err);
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

  const latestFailed = pc.failedTransactions[pc.failedTransactions.length - 1];
  if (latestFailed) {
    await prisma.failedTransaction.update({
      where: { id: latestFailed.id },
      data: { resolution: "schedule_tomorrow", resolvedAt: new Date() },
    });
  }

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.SCHEDULED },
    include: { authorisations: true, failedTransactions: true },
  });
  return formatPaymentResponse(updated);
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
    throw new Error("Payment record not available: case has not reached offer accepted status.");
  }

  let pc = await prisma.paymentCase.findFirst({
    where: { caseId, deletedAt: null },
    include: {
      authorisations: true,
      receipt: true,
      failedTransactions: true,
    },
  });

  if (!pc) {
    const ac = eligibleAc;
    const primaryOwner = ac.landParcel?.ownerships?.[0]?.landOwner;
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
        beneficiaryId: primaryOwner?.ownerId || `BEN-${ac.caseId}`,
        amount,
        accountHolderName: primaryOwner?.name || null,
        phoneNumber: primaryOwner?.contact || null,
        myKadNumber: primaryOwner?.nric || null,
        status: initialStatus,
        requiredSignatures: 0,
        currentSignatures: 0,
      },
      include: {
        authorisations: true,
        receipt: true,
        failedTransactions: true,
      },
    });
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
    include: { authorisations: true },
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
        const primaryOwner = ac.landParcel?.ownerships?.[0]?.landOwner;
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
        await prisma.paymentCase.create({
          data: {
            id: pmtId,
            caseId: ac.caseId,
            beneficiaryId: primaryOwner?.ownerId || `BEN-${ac.caseId}`,
            amount,
            accountHolderName: primaryOwner?.name || null,
            phoneNumber: primaryOwner?.contact || null,
            myKadNumber: primaryOwner?.nric || null,
            status: initialStatus,
            requiredSignatures: 0,
            currentSignatures: 0,
          },
        });
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

  const cases = await prisma.paymentCase.findMany({
    where: {
      deletedAt: null,
      caseId: { in: Array.from(eligibleCaseIds) },
    },
    include: {
      authorisations: true,
      receipt: true,
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

  const cleanIc = (currentUser?.identificationNumber || myKadNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const name = (currentUser?.name || userName || "").toLowerCase();

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
            phoneNumber: payout.phoneNumber,
            myKadNumber: payout.myKadNumber,
            verified: true,
          });
        }
      }
    } catch {}
  }

  // 1. Profile store lookup
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
        phoneNumber: rec.phoneNumber,
        myKadNumber: rec.myKadNumber,
        verified: rec.verified,
      });
    }
  }

  // 2. Query submitted PaymentCases
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
          phoneNumber: pc.phoneNumber || "",
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
  const cleanIc = (user?.identificationNumber || data.myKadNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const userName = (user?.name || data.accountHolderName || "").trim();

  await validateAccountNumberUniqueness(cleanAccountNumber, cleanIc, {
    userId,
    userName,
  });

  const record: SavedAccountRecord = {
    userId,
    bankName: data.bankName,
    accountNumber: cleanAccountNumber,
    accountHolderName: userName || data.accountHolderName,
    phoneNumber: data.phoneNumber || user?.contactNumber || "",
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
      isOwner = owners.some((ow: any) => ow.ownerId === userId || (ow.nric && ow.nric.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanIc));
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
            phoneNumber: data.phoneNumber,
            myKadNumber: data.myKadNumber,
            encryptedBankDetails,
          },
          create: {
            bankName: data.bankName,
            accountNumber: cleanAccountNumber,
            accountHolderName: data.accountHolderName,
            phoneNumber: data.phoneNumber,
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

  // GA-rejected transfers (FR-018) carry no failedTransaction row on purpose —
  // they enter this register by status instead, awaiting "Mark as Resolved".
  const cases = await prisma.paymentCase.findMany({
    where: {
      deletedAt: null,
      caseId: { in: eligibleCaseIds },
      OR: [{ failedTransactions: { some: {} } }, { status: PaymentStatus.TRANSFER_REJECTED }],
    },
    include: { failedTransactions: true, authorisations: true },
    orderBy: { updatedAt: "desc" },
  });
  return cases.map((c) => ({
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
} as const;

export type DisputeResolution = keyof typeof DISPUTE_RESOLUTIONS;

/**
 * FR-014: A GA cross-checks with the bank whether a DISPUTED transfer actually
 * settled, then either marks the dispute resolved (back to TRANSFER_SUCCEED so
 * the member can confirm or dispute again) or reinitiates the transfer because
 * the funds never arrived (re-queued to the bank gateway; multi-sig remains
 * satisfied).
 */
export async function resolveDispute(caseId: string, rawAdminId: string, resolution: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { authorisations: true, failedTransactions: true },
  });
  if (!pc) throw new Error("Case not found");

  if (pc.status !== PaymentStatus.DISPUTED) {
    throw new Error(`Dispute can only be resolved from 'DISPUTED' (current: '${pc.status}')`);
  }

  const adminId = await resolveAdminUuid(rawAdminId);

  // Close out the latest DISPUTE failure log with the chosen resolution.
  const latestDispute = [...pc.failedTransactions]
    .reverse()
    .find((ft) => typeof ft.errorLog === "string" && ft.errorLog.startsWith("DISPUTE"));
  if (latestDispute) {
    await prisma.failedTransaction.update({
      where: { id: latestDispute.id },
      data: {
        resolution: resolution === DISPUTE_RESOLUTIONS.MARK_AS_RESOLVED ? "mark_resolved" : "reinitiate_payment",
        resolvedAt: new Date(),
      },
    });
  }

  const nextStatus =
    resolution === DISPUTE_RESOLUTIONS.MARK_AS_RESOLVED
      ? PaymentStatus.TRANSFER_SUCCEED
      : PaymentStatus.BANK_APPROVAL_PENDING;

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action:
        resolution === DISPUTE_RESOLUTIONS.MARK_AS_RESOLVED ? "mark_resolved" : "reinitiate_payment",
    },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: nextStatus },
    include: { authorisations: true, receipt: true, failedTransactions: true },
  });
  return formatPaymentResponse(updated);
}

// -------------------------------------------------------------
// Bank Clearance Simulator Endpoints (Demo Portal /bank-portal)
// -------------------------------------------------------------

export async function getBankPendingTransfers() {
  const cases = await prisma.paymentCase.findMany({
    where: { status: PaymentStatus.BANK_APPROVAL_PENDING },
    include: { authorisations: true, failedTransactions: true },
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

  const targetStatus = isRejectedCategory ? PaymentStatus.TRANSFER_REJECTED : PaymentStatus.TRANSFER_FAILED;

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
