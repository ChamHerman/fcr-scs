/**
 * Status → badge maps for the payment + blockchain admin modules.
 * PLAN_HM_1308 §6 & DESIGN.md — 15 Unique high-contrast status mappings.
 * Canonical Title Case: 'Cancelled' replaces old 'CANCELLED'.
 */

export const PAYMENT_STATUSES = [
  'All',
  'Offer Accepted',
  'Bank Details Pending',
  'Ready to Initiate',
  'Bank Details Submitted',
  'Transfer Initiated',
  'Authorised',
  'Waiting Bank Approval',
  'Paid',
  'Transfer Failed',
  'Transfer Rejected',
  'Cancelled',
  'Payment Disputed',
  'Scheduled',
  'Pending New Bank Details',
];

/** Normalise any backend/seed variant to the canonical display name. */
export function normalizePaymentStatus(status: string): string {
  if (!status) return 'Offer Accepted';
  if (status === 'Failed' || status === 'FAILED' || status === 'TRANSFER_FAILED') return 'Transfer Failed';
  if (status === 'CANCEL' || status === 'CANCELLED' || status === 'Cancelled' || status === 'cancelled') return 'Cancelled';
  if (status === 'offer_accepted' || status === 'OFFER_ACCEPTED') return 'Offer Accepted';
  if (status === 'BANK_DETAILS_SUBMITTED') return 'Bank Details Submitted';
  if (status === 'TRANSFER_INITIATED') return 'Transfer Initiated';
  if (status === 'AUTHORISED') return 'Authorised';
  if (status === 'WAITING_BANK_APPROVAL' || status === 'waiting_bank_approval') return 'Waiting Bank Approval';
  if (status === 'PAID' || status === 'Confirmed') return 'Paid';
  if (status === 'TRANSFER_REJECTED') return 'Transfer Rejected';
  if (status === 'PAYMENT_DISPUTED') return 'Payment Disputed';
  if (status === 'SCHEDULED') return 'Scheduled';
  if (status === 'PENDING_NEW_BANK_DETAILS') return 'Pending New Bank Details';
  if (status === 'Bank Details Pending') return 'Bank Details Pending';
  if (status === 'Ready to Initiate') return 'Ready to Initiate';
  if (status === 'Approved') return 'Offer Accepted';
  return status;
}
export const paymentStatusLabelMap: Record<string, string> = {
  'Bank Details Pending': 'Bank Details Pending',
  'Ready to Initiate': 'Ready to Initiate',
  'Offer Accepted': 'Offer Accepted',
  'offer_accepted': 'Offer Accepted',
  'OFFER_ACCEPTED': 'Offer Accepted',
  'Bank Details Submitted': 'Bank Details Submitted',
  'BANK_DETAILS_SUBMITTED': 'Bank Details Submitted',
  'Transfer Initiated': 'Transfer Initiated',
  'TRANSFER_INITIATED': 'Transfer Initiated',
  'Authorised': 'Authorised',
  'AUTHORISED': 'Authorised',
  'Waiting Bank Approval': 'Waiting Bank Approval',
  'WAITING_BANK_APPROVAL': 'Waiting Bank Approval',
  'Paid': 'Paid',
  'PAID': 'Paid',
  'Confirmed': 'Paid',
  'Transfer Failed': 'Transfer Failed',
  'TRANSFER_FAILED': 'Transfer Failed',
  'Failed': 'Transfer Failed',
  'Transfer Rejected': 'Transfer Rejected',
  'TRANSFER_REJECTED': 'Transfer Rejected',
  'Cancelled': 'Cancelled',
  'CANCELLED': 'Cancelled',
  'Payment Disputed': 'Payment Disputed',
  'PAYMENT_DISPUTED': 'Payment Disputed',
  'Scheduled': 'Scheduled',
  'SCHEDULED': 'Scheduled',
  'Pending New Bank Details': 'Pending New Bank Details',
  'PENDING_NEW_BANK_DETAILS': 'Pending New Bank Details',
  'Approved': 'Offer Accepted',
};
export const paymentStatusClassMap: Record<string, string> = {
  'Bank Details Pending': 'status-bank-details-pending',
  'Ready to Initiate': 'status-ready-initiate',
  'Offer Accepted': 'status-offer-accepted',
  'offer_accepted': 'status-offer-accepted',
  'OFFER_ACCEPTED': 'status-offer-accepted',
  'Approved': 'status-offer-accepted',
  'Bank Details Submitted': 'status-bank-submitted',
  'BANK_DETAILS_SUBMITTED': 'status-bank-submitted',
  'Transfer Initiated': 'status-transfer-initiated',
  'TRANSFER_INITIATED': 'status-transfer-initiated',
  'Authorised': 'status-authorised',
  'AUTHORISED': 'status-authorised',
  'Waiting Bank Approval': 'status-waiting-bank',
  'WAITING_BANK_APPROVAL': 'status-waiting-bank',
  'Paid': 'status-paid',
  'PAID': 'status-paid',
  'Confirmed': 'status-paid',
  'Transfer Failed': 'status-transfer-failed',
  'TRANSFER_FAILED': 'status-transfer-failed',
  'Failed': 'status-transfer-failed',
  'Transfer Rejected': 'status-transfer-rejected',
  'TRANSFER_REJECTED': 'status-transfer-rejected',
  'Cancelled': 'status-cancelled',
  'CANCELLED': 'status-cancelled',
  'Payment Disputed': 'status-payment-disputed',
  'PAYMENT_DISPUTED': 'status-payment-disputed',
  'Scheduled': 'status-scheduled',
  'SCHEDULED': 'status-scheduled',
  'Pending New Bank Details': 'status-pending-details',
  'PENDING_NEW_BANK_DETAILS': 'status-pending-details',
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
  const hasBank = Boolean(pc.bankName && pc.accountNumber && pc.accountNumber.trim().length > 0);

  const caseStatus =
    norm === 'Offer Accepted' || norm === 'Bank Details Submitted' || norm === 'Bank Details Pending' || norm === 'Ready to Initiate'
      ? 'Offer Accepted'
      : norm;

  let paymentStatus = norm;
  if (norm === 'Offer Accepted' || norm === 'Bank Details Submitted') {
    paymentStatus = hasBank ? 'Ready to Initiate' : 'Bank Details Pending';
  } else if (norm === 'Bank Details Pending' || norm === 'Ready to Initiate') {
    paymentStatus = norm;
  }

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
