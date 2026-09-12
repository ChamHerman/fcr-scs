import { randomBytes, randomUUID } from "crypto";
import { prisma } from "../prisma";
import { PaymentStatus, UserRole, CaseStatus } from "@prisma/client";
import * as bankService from "./bank.service";

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
    },
  });
  const owner = ac?.landParcel?.ownerships?.[0]?.landOwner;

  await validateAccountNumberUniqueness(cleanAccountNumber, cleanMyKad, {
    currentCaseId: data.caseId,
    userId: owner?.ownerId,
    userName: data.accountHolderName || owner?.name,
  });

  const pc = await prisma.paymentCase.upsert({
    where: { caseId: data.caseId },
    update: {
      bankName: data.bankName,
      accountNumber: cleanAccountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: data.phoneNumber,
      myKadNumber: data.myKadNumber,
      status: PaymentStatus.READY_TO_INITIATE,
    },
    create: {
      id: newPaymentId(),
      caseId: data.caseId,
      beneficiaryId: owner?.ownerId || "BEN-" + data.caseId,
      amount: 0,
      bankName: data.bankName,
      accountNumber: cleanAccountNumber,
      accountHolderName: data.accountHolderName,
      phoneNumber: data.phoneNumber,
      myKadNumber: data.myKadNumber,
      status: PaymentStatus.READY_TO_INITIATE,
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

  const isAuthoriser = pc.authorisations.some(
    (a) => a.adminId === adminId && a.action === "authorise"
  );
  if (!isAuthoriser) {
    throw new Error("Only an authorising administrator can confirm final disbursement execution");
  }

  await prisma.paymentAuthorisation.create({
    data: {
      paymentCaseId: pc.id,
      adminId,
      action: "execute_transfer",
      reason: "Final authoriser confirmed bank fund release",
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

  const adminId = await resolveAdminUuid(rawAdminId);

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

export const CANCELLATION_REASONS = {
  LANDOWNER_REQUESTED_ACCOUNT_CHANGE: "Landowner requested bank account change / account closed",
  LEGAL_DISPUTE_OR_INJUNCTION: "Land parcel ownership dispute or court injunction received",
  INCORRECT_AWARD_AMOUNT: "Statutory compensation award calculation error detected",
  SUSPECTED_FRAUD_OR_IMPERSONATION: "Security flag raised on beneficiary identity or banking document",
  DUPLICATE_DISBURSEMENT_PREVENTION: "Duplicate payment instruction detected across system records",
} as const;

export type CancellationReasonKey = keyof typeof CANCELLATION_REASONS;

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

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.NEW_BANK_DETAILS_PENDING },
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
  const pc = await prisma.paymentCase.findUnique({
    where: { caseId },
    include: {
      authorisations: true,
      receipt: true,
      failedTransactions: true,
    },
  });
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
  return formatPaymentResponse(enriched);
}

export async function getPendingAuthorisations() {
  const cases = await prisma.paymentCase.findMany({
    where: {
      status: PaymentStatus.PENDING_APPROVAL,
    },
    include: { authorisations: true },
    orderBy: { updatedAt: "desc" },
  });
  const enriched = await Promise.all(cases.map(enrichPaymentWithAdminNames));
  return enriched.map(formatPaymentResponse);
}

export async function getAllCases(userRole?: string, userId?: string) {
  try {
    const existingPaymentCases = await prisma.paymentCase.findMany({
      select: { caseId: true },
    });
    const existingCaseIds = existingPaymentCases.map((p) => p.caseId);

    const acceptedCases = await prisma.acquisitionCase.findMany({
      where: {
        status: CaseStatus.OFFER_ACCEPTED,
        ...(existingCaseIds.length > 0 ? { caseId: { notIn: existingCaseIds } } : {}),
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

    for (const ac of acceptedCases) {
      const primaryOwner = ac.landParcel?.ownerships?.[0]?.landOwner;
      const amount = ac.compensationReports?.[0]?.totalCompensation
        ? Number(ac.compensationReports[0].totalCompensation)
        : ac.offerLetters?.[0]?.offerAmount
        ? Number(ac.offerLetters[0].offerAmount)
        : 0;

      await prisma.paymentCase.create({
        data: {
          id: newPaymentId(),
          caseId: ac.caseId,
          beneficiaryId: primaryOwner?.ownerId || `BEN-${ac.caseId}`,
          amount,
          accountHolderName: primaryOwner?.name || null,
          status: PaymentStatus.BANK_DETAILS_PENDING,
          requiredSignatures: 0,
          currentSignatures: 0,
        },
      });
    }
  } catch (err) {
    console.error("[payment_service] Error syncing accepted cases to payment cases:", err);
  }

  const cases = await prisma.paymentCase.findMany({
    include: {
      authorisations: true,
      receipt: true,
      failedTransactions: true,
    },
    orderBy: { updatedAt: "desc" },
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
      return enriched.map(formatPaymentResponse);
    }
  }

  const enriched = await Promise.all(cases.map(enrichPaymentWithAdminNames));
  return enriched.map(formatPaymentResponse);
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
      status: {
        notIn: [
          PaymentStatus.BANK_DETAILS_PENDING,
          "BANK_DETAILS_PENDING" as any,
          PaymentStatus.NEW_BANK_DETAILS_PENDING,
          "NEW_BANK_DETAILS_PENDING" as any,
          "Bank Details Pending" as any,
          "New Bank Details Pending" as any,
        ],
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

  // If the user has any ALREADY SUBMITTED payment case (not in BANK_DETAILS_PENDING), sync receiverBankDetails
  const submittedCases = await prisma.paymentCase.findMany({
    where: {
      status: {
        notIn: [
          PaymentStatus.BANK_DETAILS_PENDING,
          "BANK_DETAILS_PENDING" as any,
          PaymentStatus.NEW_BANK_DETAILS_PENDING,
          "NEW_BANK_DETAILS_PENDING" as any,
        ],
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
  const cases = await prisma.paymentCase.findMany({
    where: { failedTransactions: { some: {} } },
    include: { failedTransactions: true, authorisations: true },
    orderBy: { updatedAt: "desc" },
  });
  return cases.map(formatPaymentResponse);
}

export async function disputePayment(caseId: string, reason?: string) {
  const pc = await prisma.paymentCase.findUnique({ where: { caseId } });
  if (!pc) throw new Error("Case not found");

  if (pc.status !== PaymentStatus.TRANSFER_SUCCEED && pc.status !== PaymentStatus.PAID) {
    throw new Error(`Payment can only be disputed from 'TRANSFER_SUCCEED' or 'PAID' (current: '${pc.status}')`);
  }

  if (reason) {
    await prisma.failedTransaction.create({
      data: {
        paymentCaseId: pc.id,
        errorLog: `DISPUTE: ${reason}`,
      },
    });
  }

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.DISPUTED },
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
    update: { bankReferenceNumber: bankRef, generatedAt: new Date() },
    create: { paymentCaseId: pc.id, bankReferenceNumber: bankRef, generatedAt: new Date() },
  });

  const updated = await prisma.paymentCase.update({
    where: { caseId },
    data: { status: PaymentStatus.TRANSFER_SUCCEED },
    include: { authorisations: true, receipt: true },
  });
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

  await prisma.failedTransaction.create({
    data: {
      paymentCaseId: pc.id,
      errorLog: errorReason || "Bank clearance rejected by commercial gateway",
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
  const cases = await prisma.paymentCase.findMany({
    where: {
      status: { in: [PaymentStatus.TRANSFER_SUCCEED, PaymentStatus.PAID, PaymentStatus.TRANSFER_FAILED, PaymentStatus.TRANSFER_REJECTED] },
    },
    include: { receipt: true, failedTransactions: true, authorisations: true },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  return cases.map(formatPaymentResponse);
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
  return formatPaymentResponse(updated);
}
