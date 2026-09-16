/**
 * Report filter vocabularies.
 *
 * Every list here is derived from the module that owns the data, so report
 * filters can never drift from what the other services actually store:
 *  - locations        → constants/malaysiaLocations (used by case registration)
 *  - case statuses    → CaseStatus enum, labelled by constants/landAcquisition
 *  - payment statuses → PaymentStatus enum, labelled by pages/Payment/statusMaps
 *  - blockchain       → BlockchainStatus enum, labelled by pages/Payment/statusMaps
 *
 * The reporting API validates these values against the Prisma enums, so only
 * real enum values may appear here — display labels are resolved separately.
 */
import { MALAYSIA_DISTRICTS_MAP } from '../../constants/malaysiaLocations';
import { CASE_STATUS_LABEL_MAP } from '../../constants/landAcquisition';
import { paymentStatusLabelMap, blockchainStatusLabelMap } from '../Payment/statusMaps';

export const ALL_OPTION = 'All';

/** State → districts, taken from the canonical list the case module writes. */
export const STATES = MALAYSIA_DISTRICTS_MAP;

/** CaseStatus enum — the 15 values the reporting service accepts. */
export const CASE_STATUS_VALUES = [
  'CASE_REGISTERED',
  'VALUER_ASSIGNED',
  'VALUATION_IN_PROGRESS',
  'PENDING_VALUATION_APPROVAL',
  'VALUATION_APPROVED',
  'VALUATION_REJECTED',
  'PENDING_COMPENSATION_APPROVAL',
  'COMPENSATION_APPROVED',
  'COMPENSATION_REJECTED',
  'OFFER_ISSUED',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'PAYMENT_IN_PROGRESS',
  'PAYMENT_COMPLETED',
  'CASE_CLOSED',
];

/** PaymentStatus enum — herman's canonical lifecycle (void ledger removed). */
export const PAYMENT_STATUS_VALUES = [
  'BANK_DETAILS_PENDING',
  'READY_TO_INITIATE',
  'PENDING_APPROVAL',
  'BANK_APPROVAL_PENDING',
  'TRANSFER_SUCCEED',
  'TRANSFER_REJECTED',
  'TRANSFER_FAILED',
  'DISPUTED',
  'PAID',
  'CANCELLED',
  'SCHEDULED',
  'NEW_BANK_DETAILS_PENDING',
  'AWARD_NOTARIZATION_PENDING',
  'BANK_DETAILS_AND_M1_PENDING',
];

/** BlockchainStatus enum — publishing states only; voiding was removed. */
export const BLOCKCHAIN_STATUS_VALUES = ['READY_TO_PUBLISH', 'PUBLISHED'];

export const CASE_STATUS_OPTIONS = [ALL_OPTION, ...CASE_STATUS_VALUES];
export const PAYMENT_STATUS_OPTIONS = [ALL_OPTION, ...PAYMENT_STATUS_VALUES];
export const BLOCKCHAIN_STATUS_OPTIONS = [ALL_OPTION, ...BLOCKCHAIN_STATUS_VALUES];

const prettify = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const caseStatusLabel = (status: string): string =>
  CASE_STATUS_LABEL_MAP[status] ?? prettify(status);

export const paymentStatusLabel = (status: string): string =>
  paymentStatusLabelMap[status] ?? prettify(status);

export const blockchainStatusLabel = (status: string): string =>
  blockchainStatusLabelMap[status] ?? prettify(status);

/**
 * Resolves a display label for any status the report can render.
 *
 * Enum membership decides which vocabulary wins: OFFER_ACCEPTED is a case
 * status, even though the payment module's legacy map also knows that key.
 */
export const reportStatusLabel = (status: string): string => {
  if (CASE_STATUS_VALUES.includes(status)) return caseStatusLabel(status);
  if (PAYMENT_STATUS_VALUES.includes(status)) return paymentStatusLabel(status);
  if (BLOCKCHAIN_STATUS_VALUES.includes(status)) return blockchainStatusLabel(status);
  // Title-case / legacy display forms (e.g. labels normalised by the payment module)
  return (
    paymentStatusLabelMap[status] ??
    blockchainStatusLabelMap[status] ??
    CASE_STATUS_LABEL_MAP[status] ??
    prettify(status)
  );
};

/** Report types the reporting service actually implements. */
export const REPORT_TYPES = [
  'Case Status Report',
  'Payment Report',
  'Blockchain Audit Report',
];
