/**
 * Status → badge maps for the payment + blockchain admin modules.
 * PLAN_HM_1308 §6 — one map per domain; the UI displays the backend status
 * names exactly as written (seed alias `Failed` normalises to `Transfer Failed`).
 *
 * Badge classes are payment/blockchain-specific (`.payment-badge …` defined in
 * payment.css) — deliberately NOT the case-management badge classes.
 */

export const PAYMENT_STATUSES = [
  'All',
  'Approved',
  'Bank Details Submitted',
  'Transfer Initiated',
  'Authorised',
  'Paid',
  'Transfer Failed',
  'Transfer Rejected',
  'Pending New Bank Details',
  'Scheduled',
  'Payment Disputed',
  'CANCELLED',
];

/** Normalise any backend/seed variant to the canonical display name. */
export function normalizePaymentStatus(status: string): string {
  if (status === 'Failed') return 'Transfer Failed';
  if (status === 'CANCEL') return 'CANCELLED';
  return status || 'Approved';
}

export const paymentStatusLabelMap: Record<string, string> = {
  'Approved': 'Approved',
  'Bank Details Submitted': 'Bank Details Submitted',
  'Transfer Initiated': 'Transfer Initiated',
  'Authorised': 'Authorised',
  'Paid': 'Paid',
  'Confirmed': 'Paid',
  'Transfer Failed': 'Transfer Failed',
  'Failed': 'Transfer Failed',
  'Transfer Rejected': 'Transfer Rejected',
  'Pending New Bank Details': 'Pending New Bank Details',
  'Scheduled': 'Scheduled',
  'Payment Disputed': 'Payment Disputed',
  'CANCELLED': 'CANCELLED',
};

export const paymentStatusClassMap: Record<string, string> = {
  'Paid': 'approved',
  'Confirmed': 'approved',
  'Transfer Failed': 'rejected',
  'Failed': 'rejected',
  'Transfer Rejected': 'rejected',
  'CANCELLED': 'cancelled',
  'Payment Disputed': 'error',
  'Approved': 'pending',
  'Bank Details Submitted': 'pending',
  'Transfer Initiated': 'pending',
  'Authorised': 'pending',
  'Scheduled': 'pending',
  'Pending New Bank Details': 'pending',
};

export const BLOCKCHAIN_STATUSES = ['All', 'Ready to Publish', 'Published', 'Voided'];

export const blockchainStatusLabelMap: Record<string, string> = {
  'Ready to Publish': 'Ready to Publish',
  'Replacement': 'Replacement',
  'Published': 'Published',
  'Voided': 'Voided',
  'FAILED': 'Failed',
};

export const blockchainStatusClassMap: Record<string, string> = {
  'Published': 'approved',
  'Voided': 'rejected',
  'Ready to Publish': 'info',
  'Replacement': 'pending',
};
