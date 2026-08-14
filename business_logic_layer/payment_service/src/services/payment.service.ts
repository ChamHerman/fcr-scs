import { prisma } from "../prisma";
import * as bankService from "./bank.service";

export function calculateRequiredSignatures(amount: number): number {
  return 1 + Math.floor(amount / 1_000_000);
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

  return prisma.paymentCase.upsert({
    where: { caseId: data.caseId },
    update: {
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: data.phoneNumber,
      myKadNumber: data.myKadNumber,
      status: "Bank Details Submitted",
    },
    create: {
      caseId: data.caseId,
      beneficiaryId: "BEN-" + data.caseId,
      amount: 0,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: data.phoneNumber,
      myKadNumber: data.myKadNumber,
      status: "Bank Details Submitted",
    },
  });
}

export async function initiateTransfer(caseId: string, adminId: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");

  // Signature model: the bank initiator always contributes 1 signature; admin
  // approvals add the rest. required = 1 + (1 + floor(amount / 1_000_000)), so
  // 1M needs 1 bank + 2 approvals = 3 total. The initiating admin's signature
  // does NOT count as an approval (SoD) — they can only initiate.
  const approvalQuota = calculateRequiredSignatures(Number(pc.amount));
  const requiredSigs = 1 + approvalQuota;

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "initiate",
    },
  });

  return prisma.paymentCase.update({
    where: { caseId },
    data: {
      requiredSignatures: requiredSigs,
      currentSignatures: 1,
      status: "Transfer Initiated",
    },
    include: { authorisations: true, receipt: true },
  });
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

  if (newCurrentSigs >= pc.requiredSignatures) {
    try {
      const bankRef = `BNK-${Date.now()}-${caseId}`;
      await prisma.paymentReceipt.create({
        data: {
          paymentCaseId: pc.id,
          bankReferenceNumber: bankRef,
        },
      });

      return prisma.paymentCase.update({
        where: { caseId },
        data: {
          currentSignatures: newCurrentSigs,
          status: "Paid",
        },
        include: { authorisations: true, receipt: true },
      });
    } catch (e: unknown) {
      await prisma.failedTransaction.create({
        data: {
          paymentCaseId: pc.id,
          errorLog: (e as Error).message || "Bank transfer failed",
        },
      });

      return prisma.paymentCase.update({
        where: { caseId },
        data: {
          currentSignatures: newCurrentSigs,
          status: "Transfer Failed",
        },
        include: { authorisations: true, failedTransactions: true },
      });
    }
  } else {
    return prisma.paymentCase.update({
      where: { caseId },
      data: {
        currentSignatures: newCurrentSigs,
        status: "Authorised",
      },
      include: { authorisations: true },
    });
  }
}

export async function rejectTransfer(caseId: string, adminId: string, reason: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "reject",
      reason,
    },
  });

  return prisma.paymentCase.update({
    where: { caseId },
    data: { status: "Transfer Rejected" },
    include: { authorisations: true },
  });
}

// PLAN_HM_1308 §7.4: Cancel (new) → Approval(CANCEL, reason) + CANCELLED; only pre-transfer.
const PRE_TRANSFER_STATUSES = ["Approved", "Bank Details Submitted", "Transfer Initiated", "Authorised", "Scheduled"];

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

  return prisma.paymentCase.update({
    where: { caseId },
    data: { status: "CANCELLED" },
    include: { authorisations: true },
  });
}

export async function retryPayment(caseId: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { failedTransactions: true },
  });
  if (!pc) throw new Error("Case not found");
  if (pc.status !== "Transfer Failed") throw new Error("Payment is not in failed state");

  const latestFailed = pc.failedTransactions[pc.failedTransactions.length - 1];
  if (latestFailed) {
    await prisma.failedTransaction.update({
      where: { id: latestFailed.id },
      data: { resolution: "retry", resolvedAt: new Date() },
    });
  }

  return prisma.paymentCase.update({
    where: { caseId },
    data: { status: "Authorised" },
    include: { authorisations: true, failedTransactions: true },
  });
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

  return prisma.paymentCase.update({
    where: { caseId },
    data: { status: "Pending New Bank Details" },
    include: { authorisations: true, failedTransactions: true },
  });
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

  return prisma.paymentCase.update({
    where: { caseId },
    data: { status: "Scheduled" },
    include: { authorisations: true, failedTransactions: true },
  });
}

export async function getPaymentStatus(caseId: string) {
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: { authorisations: true, receipt: true, failedTransactions: true },
  });
  if (!pc) throw new Error("Case not found");
  return pc;
}

export async function getPendingAuthorisations() {
  return prisma.paymentCase.findMany({
    where: { status: { in: ["Transfer Initiated", "Authorised"] } },
    include: { authorisations: true },
  });
}

export async function getAllCases() {
  return prisma.paymentCase.findMany({
    include: { authorisations: true, receipt: true, failedTransactions: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getFailedTransactions() {
  return prisma.paymentCase.findMany({
    where: { failedTransactions: { some: {} } },
    include: { failedTransactions: true, authorisations: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function disputePayment(caseId: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");

  return prisma.paymentCase.update({
    where: { caseId },
    data: { status: "Payment Disputed" },
    include: { authorisations: true, receipt: true },
  });
}
