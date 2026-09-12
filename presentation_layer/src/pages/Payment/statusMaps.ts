/**
 * Status → badge maps for the payment + blockchain admin modules.
 * PLAN_HM_1308 §6 & DESIGN.md — 15 Unique high-contrast status mappings.
 * Canonical Title Case: 'Cancelled' replaces old 'CANCELLED'.
 */

/**
 * Authorisation audit actions are stored as free-form snake_case strings by the
 * backend (e.g. 'execute_transfer'). Map them to PAST-TENSE Title Case display
 * labels so no raw action identifier ever surfaces and the From Government
 * Admin audit list reads as a ledger of completed acts.
 */
const AUTHORISATION_ACTION_LABELS: Record<string, string> = {
  initiate: 'Initiated',
  authorise: 'Authorised',
  authorize: 'Authorized',
  execute_transfer: 'Executed Transfer',
  reject: 'Rejected',
  cancel: 'Cancelled',
  mark_resolved: 'Resolved',
  reinitiate_payment: 'Reinitiated Payment',
  resolve_dispute: 'Resolved Dispute',
};

export function formatActionLabel(action: string | null | undefined): string {
  if (!action) return '—';
  const key = action.trim().toLowerCase();
  if (AUTHORISATION_ACTION_LABELS[key]) return AUTHORISATION_ACTION_LABELS[key];
  return action
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Governance actions that read as "bad" for the GA — rendered red in every
 *  audit list; everything else renders green. */
export function isRejectionAction(action: string | null | undefined): boolean {
  const key = (action || '').trim().toLowerCase();
  return key === 'reject' || key === 'cancel';
}

/**
 * Governance approvals must never surface a raw enum key (e.g.
 * LEGAL_DISPUTE_OR_INJUNCTION). Map the locked reason codes to proper English;
 * human-readable sentences (stored by newer backend versions) pass through.
 */
const AUTHORISATION_REASON_LABELS: Record<string, string> = {
  // GA governance rejection reasons (FR-018, replaced 2026-09-12)
  BENEFICIARY_DETAILS_MISMATCH: 'Beneficiary name or bank details do not match the statutory land award records',
  AWARD_VERIFICATION_FAILED: 'Award amount or supporting documents failed pre-disbursement verification',
  DUPLICATE_DISBURSEMENT_RISK: 'Possible duplicate disbursement instruction detected for this case',
  // Legacy bank Category-A rejection codes (pre-2026-09-12 history)
  RECIPIENT_ACCOUNT_INVALID_OR_NOT_FOUND: 'Recipient account number not found or routing code invalid',
  RECIPIENT_ACCOUNT_CLOSED_OR_FROZEN: 'Recipient bank account is dormant, frozen, or closed',
  NAME_MISMATCH_OUTDATED_DETAILS: 'Beneficiary name does not match bank account records',
  // Legacy statutory cancellation / rejection codes (FR-009 history)
  LANDOWNER_REQUESTED_ACCOUNT_CHANGE: 'Landowner requested bank account change / account closed',
  LEGAL_DISPUTE_OR_INJUNCTION: 'Land parcel ownership dispute or court injunction received',
  INCORRECT_AWARD_AMOUNT: 'Statutory compensation award calculation error detected',
  SUSPECTED_FRAUD_OR_IMPERSONATION: 'Security flag raised on beneficiary identity or banking document',
  DUPLICATE_DISBURSEMENT_PREVENTION: 'Duplicate payment instruction detected across system records',
};

export function formatReasonLabel(reason: string | null | undefined): string {
  if (!reason) return '';
  const key = reason.trim();
  if (AUTHORISATION_REASON_LABELS[key]) return AUTHORISATION_REASON_LABELS[key];
  // Bare SCREAMING_SNAKE_KEY with no mapping — degrade gracefully instead of
  // showing the raw identifier.
  if (/^[A-Z0-9_]+$/.test(key) && key.includes('_')) {
    return key
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return reason;
}

export const PAYMENT_STATUSES = [
  'All',
  'Bank Details Pending',
  'Ready to Initiate',
  'Pending Approval',
  'Bank Approval Pending',
  'Transfer Succeed',
  'Transfer Rejected',
  'Transfer Failed',
  'Disputed',
  'Paid',
  'Cancelled',
  'Scheduled',
  'New Bank Details Pending',
];

/** Normalise any backend/seed variant to the canonical display name. */
export function normalizePaymentStatus(status: string): string {
  if (!status) return 'Bank Details Pending';
  if (status === 'BANK_DETAILS_PENDING' || status === 'Bank Details Pending') return 'Bank Details Pending';
  if (status === 'READY_TO_INITIATE' || status === 'Ready to Initiate') return 'Ready to Initiate';
  if (
    status === 'PENDING_APPROVAL' ||
    status === 'Pending Approval' ||
    status === 'TRANSFER_INITIATED' ||
    status === 'Transfer Initiated' ||
    status === 'AUTHORISED' ||
    status === 'Authorised'
  )
    return 'Pending Approval';
  if (
    status === 'BANK_APPROVAL_PENDING' ||
    status === 'Bank Approval Pending' ||
    status === 'WAITING_BANK_APPROVAL' ||
    status === 'Waiting Bank Approval' ||
    status === 'waiting_bank_approval'
  )
    return 'Bank Approval Pending';
  if (status === 'TRANSFER_SUCCEED' || status === 'Transfer Succeed') return 'Transfer Succeed';
  if (status === 'TRANSFER_REJECTED' || status === 'Transfer Rejected') return 'Transfer Rejected';
  if (status === 'TRANSFER_FAILED' || status === 'Transfer Failed' || status === 'Failed' || status === 'FAILED')
    return 'Transfer Failed';
  if (status === 'DISPUTED' || status === 'Disputed' || status === 'PAYMENT_DISPUTED' || status === 'Payment Disputed')
    return 'Disputed';
  if (status === 'PAID' || status === 'Paid' || status === 'Confirmed') return 'Paid';
  if (status === 'CANCELLED' || status === 'Cancelled' || status === 'CANCEL' || status === 'cancelled')
    return 'Cancelled';
  if (status === 'SCHEDULED' || status === 'Scheduled') return 'Scheduled';
  if (
    status === 'NEW_BANK_DETAILS_PENDING' ||
    status === 'New Bank Details Pending' ||
    status === 'PENDING_NEW_BANK_DETAILS' ||
    status === 'Pending New Bank Details'
  )
    return 'New Bank Details Pending';

  // Legacy fallbacks
  if (status === 'OFFER_ACCEPTED' || status === 'offer_accepted' || status === 'Offer Accepted' || status === 'Approved')
    return 'Bank Details Pending';
  if (status === 'BANK_DETAILS_SUBMITTED' || status === 'Bank Details Submitted') return 'Ready to Initiate';

  return status;
}

export const paymentStatusLabelMap: Record<string, string> = {
  'Bank Details Pending': 'Bank Details Pending',
  'BANK_DETAILS_PENDING': 'Bank Details Pending',
  'Ready to Initiate': 'Ready to Initiate',
  'READY_TO_INITIATE': 'Ready to Initiate',
  'Pending Approval': 'Pending Approval',
  'PENDING_APPROVAL': 'Pending Approval',
  'Bank Approval Pending': 'Bank Approval Pending',
  'BANK_APPROVAL_PENDING': 'Bank Approval Pending',
  'Transfer Succeed': 'Transfer Succeed',
  'TRANSFER_SUCCEED': 'Transfer Succeed',
  'Transfer Rejected': 'Transfer Rejected',
  'TRANSFER_REJECTED': 'Transfer Rejected',
  'Transfer Failed': 'Transfer Failed',
  'TRANSFER_FAILED': 'Transfer Failed',
  'Disputed': 'Disputed',
  'DISPUTED': 'Disputed',
  'Paid': 'Paid',
  'PAID': 'Paid',
  'Cancelled': 'Cancelled',
  'CANCELLED': 'Cancelled',
  'Scheduled': 'Scheduled',
  'SCHEDULED': 'Scheduled',
  'New Bank Details Pending': 'New Bank Details Pending',
  'NEW_BANK_DETAILS_PENDING': 'New Bank Details Pending',
  // Legacy mappings
  'Offer Accepted': 'Bank Details Pending',
  'offer_accepted': 'Bank Details Pending',
  'OFFER_ACCEPTED': 'Bank Details Pending',
  'Approved': 'Bank Details Pending',
  'Bank Details Submitted': 'Ready to Initiate',
  'BANK_DETAILS_SUBMITTED': 'Ready to Initiate',
  'Transfer Initiated': 'Pending Approval',
  'TRANSFER_INITIATED': 'Pending Approval',
  'Authorised': 'Pending Approval',
  'AUTHORISED': 'Pending Approval',
  'Waiting Bank Approval': 'Bank Approval Pending',
  'WAITING_BANK_APPROVAL': 'Bank Approval Pending',
  'Payment Disputed': 'Disputed',
  'PAYMENT_DISPUTED': 'Disputed',
  'Pending New Bank Details': 'New Bank Details Pending',
  'PENDING_NEW_BANK_DETAILS': 'New Bank Details Pending',
  'Confirmed': 'Paid',
  'Failed': 'Transfer Failed',
};

export const paymentStatusClassMap: Record<string, string> = {
  'Bank Details Pending': 'status-bank-details-pending',
  'BANK_DETAILS_PENDING': 'status-bank-details-pending',
  'Ready to Initiate': 'status-ready-to-initiate',
  'READY_TO_INITIATE': 'status-ready-to-initiate',
  'Pending Approval': 'status-pending-approval',
  'PENDING_APPROVAL': 'status-pending-approval',
  'Bank Approval Pending': 'status-bank-approval-pending',
  'BANK_APPROVAL_PENDING': 'status-bank-approval-pending',
  'Transfer Succeed': 'status-transfer-succeed',
  'TRANSFER_SUCCEED': 'status-transfer-succeed',
  'Transfer Rejected': 'status-transfer-rejected',
  'TRANSFER_REJECTED': 'status-transfer-rejected',
  'Transfer Failed': 'status-transfer-failed',
  'TRANSFER_FAILED': 'status-transfer-failed',
  'Disputed': 'status-disputed',
  'DISPUTED': 'status-disputed',
  'Paid': 'status-paid',
  'PAID': 'status-paid',
  'Cancelled': 'status-cancelled',
  'CANCELLED': 'status-cancelled',
  'Scheduled': 'status-scheduled',
  'SCHEDULED': 'status-scheduled',
  'New Bank Details Pending': 'status-new-bank-details-pending',
  'NEW_BANK_DETAILS_PENDING': 'status-new-bank-details-pending',
  // Legacy class mappings
  'Offer Accepted': 'status-bank-details-pending',
  'offer_accepted': 'status-bank-details-pending',
  'OFFER_ACCEPTED': 'status-bank-details-pending',
  'Approved': 'status-bank-details-pending',
  'Bank Details Submitted': 'status-ready-to-initiate',
  'BANK_DETAILS_SUBMITTED': 'status-ready-to-initiate',
  'Transfer Initiated': 'status-pending-approval',
  'TRANSFER_INITIATED': 'status-pending-approval',
  'Authorised': 'status-pending-approval',
  'AUTHORISED': 'status-pending-approval',
  'Waiting Bank Approval': 'status-bank-approval-pending',
  'WAITING_BANK_APPROVAL': 'status-bank-approval-pending',
  'Payment Disputed': 'status-disputed',
  'PAYMENT_DISPUTED': 'status-disputed',
  'Pending New Bank Details': 'status-new-bank-details-pending',
  'PENDING_NEW_BANK_DETAILS': 'status-new-bank-details-pending',
  'Confirmed': 'status-paid',
  'Failed': 'status-transfer-failed',
};

export interface DetailedPaymentStatus {
  caseStatus: string;
  paymentStatus: string;
}

/**
 * 2-tier dual status helper:
 * - caseStatus: High-level statutory milestone (e.g. 'Offer Accepted')
 * - paymentStatus: Granular operational payment readiness (e.g. 'Bank Details Pending' or 'Ready to Initiate')
 */
export function getDetailedPaymentStatus(pc: {
  status: string;
  bankName?: string | null;
  accountNumber?: string | null;
}): DetailedPaymentStatus {
  const norm = normalizePaymentStatus(pc.status);

  let paymentStatus = norm;
  if (norm === 'Bank Details Pending') {
    paymentStatus = 'Bank Details Pending';
  } else if (norm === 'Ready to Initiate') {
    paymentStatus = 'Ready to Initiate';
  }
  const caseStatus =
    paymentStatus === 'Bank Details Pending' || paymentStatus === 'Ready to Initiate'
      ? 'Offer Accepted'
      : paymentStatus;

  return { caseStatus, paymentStatus };
}

export const BLOCKCHAIN_STATUSES = ['All', 'Ready to Publish', 'Published', 'Voided', 'Replacement'];

export const blockchainStatusLabelMap: Record<string, string> = {
  'Ready to Publish': 'Ready to Publish',
  'READY_TO_PUBLISH': 'Ready to Publish',
  'Published': 'Published',
  'PUBLISHED': 'Published',
  'Voided': 'Voided',
  'VOIDED': 'Voided',
  'Replacement': 'Replacement',
  'REPLACEMENT': 'Replacement',
};

export const blockchainStatusClassMap: Record<string, string> = {
  'Ready to Publish': 'status-ready-publish',
  'READY_TO_PUBLISH': 'status-ready-publish',
  'Published': 'status-published',
  'PUBLISHED': 'status-published',
  'Voided': 'status-voided',
  'VOIDED': 'status-voided',
  'Replacement': 'status-replacement',
  'REPLACEMENT': 'status-replacement',
};

export interface MemberDisplayStatus {
  label: string;
  badgeClass: string;
  stepIndex: number;
}

/**
 * Member-Facing Status Normalizer (PLAN_HM_1308 §2).
 * Maps internal GA operational statuses to clean claimant milestone statuses.
 */
export function getMemberDisplayStatus(status: string): MemberDisplayStatus {
  if (!status) {
    return {
      label: 'Bank Details Pending',
      badgeClass: 'status-bank-details-pending',
      stepIndex: 1,
    };
  }

  const s = status.trim();

  // 1. Bank Details Pending
  if (
    s === 'BANK_DETAILS_PENDING' ||
    s === 'Bank Details Pending' ||
    s === 'Offer Accepted' ||
    s === 'offer_accepted' ||
    s === 'OFFER_ACCEPTED' ||
    s === 'Approved'
  ) {
    return {
      label: 'Bank Details Pending',
      badgeClass: 'status-bank-details-pending',
      stepIndex: 1,
    };
  }

  // 2. New Bank Details Pending
  if (
    s === 'NEW_BANK_DETAILS_PENDING' ||
    s === 'New Bank Details Pending' ||
    s === 'PENDING_NEW_BANK_DETAILS' ||
    s === 'Pending New Bank Details'
  ) {
    return {
      label: 'New Bank Details Pending',
      badgeClass: 'status-new-bank-details-pending',
      stepIndex: 1,
    };
  }

  // 3. Payment In Progress (Internal GA operational statuses mapped cleanly for claimants)
  if (
    s === 'READY_TO_INITIATE' ||
    s === 'Ready to Initiate' ||
    s === 'Ready To Initiate' ||
    s === 'BANK_DETAILS_SUBMITTED' ||
    s === 'Bank Details Submitted' ||
    s === 'PENDING_APPROVAL' ||
    s === 'Pending Approval' ||
    s === 'TRANSFER_INITIATED' ||
    s === 'Transfer Initiated' ||
    s === 'AUTHORISED' ||
    s === 'Authorised' ||
    s === 'BANK_APPROVAL_PENDING' ||
    s === 'Bank Approval Pending' ||
    s === 'WAITING_BANK_APPROVAL' ||
    s === 'Waiting Bank Approval' ||
    s === 'waiting_bank_approval' ||
    s === 'SCHEDULED' ||
    s === 'Scheduled' ||
    s === 'Payment In Progress' ||
    s === 'PAYMENT_IN_PROGRESS'
  ) {
    return {
      label: 'Payment In Progress',
      badgeClass: 'status-transfer-initiated',
      stepIndex: 3,
    };
  }

  // 4. Payment Completed (Transfer clearance succeed, awaiting member confirmation)
  if (
    s === 'TRANSFER_SUCCEED' ||
    s === 'Transfer Succeed' ||
    s === 'Payment Completed' ||
    s === 'PAYMENT_COMPLETED'
  ) {
    return {
      label: 'Payment Completed',
      badgeClass: 'status-transfer-succeed',
      stepIndex: 4,
    };
  }

  // 5. Paid (Final Confirmed)
  if (s === 'PAID' || s === 'Paid' || s === 'Confirmed') {
    return {
      label: 'Paid',
      badgeClass: 'status-paid',
      stepIndex: 5,
    };
  }

  // 6. Disputed
  if (
    s === 'DISPUTED' ||
    s === 'Disputed' ||
    s === 'PAYMENT_DISPUTED' ||
    s === 'Payment Disputed'
  ) {
    return {
      label: 'Payment Disputed',
      badgeClass: 'status-disputed',
      stepIndex: 4,
    };
  }

  // 7. Transfer Rejected
  if (s === 'TRANSFER_REJECTED' || s === 'Transfer Rejected') {
    return {
      label: 'Transfer Rejected',
      badgeClass: 'status-transfer-rejected',
      stepIndex: 1,
    };
  }

  // 8. Transfer Failed
  if (
    s === 'TRANSFER_FAILED' ||
    s === 'Transfer Failed' ||
    s === 'Failed' ||
    s === 'FAILED'
  ) {
    return {
      label: 'Transfer Failed',
      badgeClass: 'status-transfer-failed',
      stepIndex: 3,
    };
  }

  // 9. Cancelled
  if (
    s === 'CANCELLED' ||
    s === 'Cancelled' ||
    s === 'CANCEL' ||
    s === 'cancelled'
  ) {
    return {
      label: 'Cancelled',
      badgeClass: 'status-cancelled',
      stepIndex: 1,
    };
  }

  return {
    label: s,
    badgeClass: paymentStatusClassMap[s] || 'status-bank-details-pending',
    stepIndex: 1,
  };
}
