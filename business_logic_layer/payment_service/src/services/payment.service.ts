import { randomBytes } from "crypto";
import { prisma } from "../prisma";
import { PaymentStatus } from "@prisma/client";
import * as bankService from "./bank.service";

export function calculateRequiredSignatures(amount: number): number {
  return 1 + Math.floor(amount / 1_000_000);
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

/** Short human-readable payment record id, stored as the PaymentCase primary key. */
export function newPaymentId(): string {
  return `PMT-${shortId()}`;
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

export async function submitBankDetails(data: {
  caseId: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  phoneNumber: string;
  myKadNumber: string;
}) {
  await bankService.validateBankAccount(data.bankName, data.accountNumber);

  const pc = await prisma.paymentCase.upsert({
    where: { caseId: data.caseId },
    update: {
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: data.phoneNumber,
      myKadNumber: data.myKadNumber,
      status: PaymentStatus.BANK_DETAILS_SUBMITTED,
    },
    create: {
      id: newPaymentId(),
      caseId: data.caseId,
      beneficiaryId: "BEN-" + data.caseId,
      amount: 0,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: data.phoneNumber,
      myKadNumber: data.myKadNumber,
      status: PaymentStatus.BANK_DETAILS_SUBMITTED,
    },
  });
  return formatPaymentResponse(pc);
}

// Starting eligible statuses for payment initiation
export const ELIGIBLE_INITIATION_STATUSES: (PaymentStatus | string)[] = [
  PaymentStatus.OFFER_ACCEPTED,
  PaymentStatus.BANK_DETAILS_SUBMITTED,
  "Offer Accepted",
  "offer_accepted",
  "Approved",
  "Bank Details Submitted",
];

// Cancel (new) → Approval(CANCEL, reason) + CANCELLED; only pre-transfer.
const PRE_TRANSFER_STATUSES: (PaymentStatus | string)[] = [
  PaymentStatus.OFFER_ACCEPTED,
  PaymentStatus.BANK_DETAILS_SUBMITTED,
  PaymentStatus.TRANSFER_INITIATED,
  PaymentStatus.AUTHORISED,
  PaymentStatus.SCHEDULED,
  "Offer Accepted",
  "offer_accepted",
  "Approved",
  "Bank Details Submitted",
  "Transfer Initiated",
  "Authorised",
  "Scheduled",
];

export async function initiateTransfer(caseId: string, adminId: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");

  if (!ELIGIBLE_INITIATION_STATUSES.includes(pc.status)) {
    throw new Error(`Case cannot be initiated from status '${pc.status}'. Case must be in 'Offer Accepted' state.`);
  }

  const approvalQuota = calculateRequiredSignatures(Number(pc.amount));
  const requiredSigs = 1 + approvalQuota;

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "initiate",
    },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: {
      requiredSignatures: requiredSigs,
      currentSignatures: 1,
      status: PaymentStatus.TRANSFER_INITIATED,
    },
    include: { authorisations: true, receipt: true },
  });
  return formatPaymentResponse(updated);
}

export async function authoriseTransfer(caseId: string, adminId: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { authorisations: true },
  });
  if (!pc) throw new Error("Case not found");

  const existingAuth = pc.authorisations.find((a) => a.adminId === adminId);
  if (existingAuth) {
    throw new Error("Segregation of duties: Admin cannot authorise their own initiation or double-sign");
  }

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "authorise",
    },
  });

  const newCurrentSigs = pc.currentSignatures + 1;
  const reachesThreshold = newCurrentSigs >= pc.requiredSignatures;

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: {
      currentSignatures: newCurrentSigs,
      // Partial signatures stay at TRANSFER_INITIATED; only the final
      // signature moves the case to AUTHORISED (and schedules bank submission).
      ...(reachesThreshold ? { status: PaymentStatus.AUTHORISED } : {}),
    },
    include: { authorisations: true, receipt: true },
  });

  if (reachesThreshold) {
    scheduleBankSubmission(caseId);
  }
  return formatPaymentResponse(updated);
}

/**
 * Auto-submit an AUTHORISED case to the bank queue after BANK_SUBMISSION_DELAY_MS.
 * The status guard means a cancel/reject that lands inside the window wins the
 * race; if the process dies before the timer fires, the sweeper in
 * getBankPendingTransfers() recovers the case on the next bank-queue read.
 */
function scheduleBankSubmission(caseId: string) {
  const timer = setTimeout(async () => {
    try {
      await prisma.paymentCase.updateMany({
        where: { caseId, status: PaymentStatus.AUTHORISED },
        data: { status: PaymentStatus.WAITING_BANK_APPROVAL },
      });
    } catch (err) {
      console.error(`[payment_service] bank submission for ${caseId} failed:`, err);
    }
  }, BANK_SUBMISSION_DELAY_MS);
  timer.unref?.();
}

/** Promotes AUTHORISED cases whose submission window has elapsed (restart recovery). */
async function sweepStaleAuthorisedToBank() {
  await prisma.paymentCase.updateMany({
    where: {
      status: PaymentStatus.AUTHORISED,
      updatedAt: { lte: new Date(Date.now() - BANK_SUBMISSION_DELAY_MS) },
    },
    data: { status: PaymentStatus.WAITING_BANK_APPROVAL },
  });
}

export async function rejectTransfer(caseId: string, adminId: string, reason: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { authorisations: true },
  });
  if (!pc) throw new Error("Case not found");

  // Once the case is with the bank (WAITING_BANK_APPROVAL), only the bank
  // portal can approve/reject the transfer.
  if (
    ![
      PaymentStatus.TRANSFER_INITIATED,
      PaymentStatus.AUTHORISED,
      "Transfer Initiated",
      "Authorised",
    ].includes(pc.status as PaymentStatus | string)
  ) {
    throw new Error(`Transfer cannot be rejected from status '${pc.status}'. Only pending transfers can be rejected.`);
  }

  // SoD: an admin who initiated or already signed the transfer has approved it
  // and cannot reject it afterwards.
  const alreadyApproved = pc.authorisations.find(
    (a) => a.adminId === adminId && (a.action === "initiate" || a.action === "authorise")
  );
  if (alreadyApproved) {
    throw new Error("Segregation of duties: Admin cannot reject a transfer they initiated or already approved");
  }

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "reject",
      reason,
    },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.TRANSFER_REJECTED },
    include: { authorisations: true },
  });
  return formatPaymentResponse(updated);
}

export async function cancelPayment(caseId: string, adminId: string, reason: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");
  if (!PRE_TRANSFER_STATUSES.includes(pc.status)) {
    throw new Error("Only pre-transfer payments can be cancelled");
  }

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "cancel",
      reason,
    },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.CANCELLED },
    include: { authorisations: true },
  });
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
    data: { status: PaymentStatus.WAITING_BANK_APPROVAL },
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

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.PENDING_NEW_BANK_DETAILS },
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

export async function getPaymentStatus(caseId: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { authorisations: true, receipt: true, failedTransactions: true },
  });
  if (!pc) throw new Error("Case not found");
  return formatPaymentResponse(pc);
}

export async function getPendingAuthorisations() {
  const cases = await prisma.paymentCase.findMany({
    where: {
      status: {
        in: [PaymentStatus.TRANSFER_INITIATED, PaymentStatus.AUTHORISED],
      },
    },
    include: { authorisations: true },
    orderBy: { updatedAt: "desc" },
  });
  return cases.map(formatPaymentResponse);
}

export async function getAllCases() {
  const cases = await prisma.paymentCase.findMany({
    include: { authorisations: true, receipt: true, failedTransactions: true },
    orderBy: { updatedAt: "desc" },
  });
  return cases.map(formatPaymentResponse);
}

export async function getFailedTransactions() {
  const cases = await prisma.paymentCase.findMany({
    where: { failedTransactions: { some: {} } },
    include: { failedTransactions: true, authorisations: true },
    orderBy: { updatedAt: "desc" },
  });
  return cases.map(formatPaymentResponse);
}

export async function disputePayment(caseId: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.PAYMENT_DISPUTED },
    include: { authorisations: true, receipt: true },
  });
  return formatPaymentResponse(updated);
}

// -------------------------------------------------------------
// Bank Clearance Simulator Endpoints (Demo Portal /bank-portal)
// -------------------------------------------------------------

export async function getBankPendingTransfers() {
  await sweepStaleAuthorisedToBank();
  const cases = await prisma.paymentCase.findMany({
    where: { status: PaymentStatus.WAITING_BANK_APPROVAL },
    include: { authorisations: true, failedTransactions: true },
    orderBy: { updatedAt: "desc" },
  });
  return cases.map(formatPaymentResponse);
}

export async function approveBankTransfer(caseId: string, bankReferenceNumber?: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");
  if (pc.status !== PaymentStatus.WAITING_BANK_APPROVAL) {
    throw new Error(`Transfer is not awaiting bank approval (current status '${pc.status}')`);
  }

  const bankRef = bankReferenceNumber || `BNK-${Date.now()}-${caseId}`;
  await prisma.paymentReceipt.upsert({
    where: { paymentCaseId: pc.id },
    update: { bankReferenceNumber: bankRef, generatedAt: new Date() },
    create: { paymentCaseId: pc.id, bankReferenceNumber: bankRef },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.PAID },
    include: { authorisations: true, receipt: true },
  });
  return formatPaymentResponse(updated);
}

export async function rejectBankTransfer(caseId: string, errorReason: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");
  if (pc.status !== PaymentStatus.WAITING_BANK_APPROVAL) {
    throw new Error(`Transfer is not awaiting bank approval (current status '${pc.status}')`);
  }

  await prisma.failedTransaction.create({
    data: {
      paymentCaseId: pc.id,
      errorLog: errorReason || "Bank clearance rejected by commercial gateway",
    },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.TRANSFER_FAILED },
    include: { authorisations: true, failedTransactions: true },
  });
  return formatPaymentResponse(updated);
}

export async function getBankHistory() {
  const cases = await prisma.paymentCase.findMany({
    where: {
      status: { in: [PaymentStatus.PAID, PaymentStatus.TRANSFER_FAILED] },
    },
    include: { receipt: true, failedTransactions: true, authorisations: true },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  return cases.map(formatPaymentResponse);
}
