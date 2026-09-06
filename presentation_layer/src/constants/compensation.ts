import type { SelectOption } from "../components/ui/Select";

// --- Compensation Report Statuses ---
export const COMPENSATION_STATUS_CLASS_MAP: Record<string, string> = {
  PENDING: "status-pending-comp",
  APPROVED: "status-comp-approved",
  REJECTED: "status-comp-rejected",
};

export const COMPENSATION_STATUS_LABEL_MAP: Record<string, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const COMPENSATION_STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

// --- Form H Offer Letter Statuses ---
export const OFFER_STATUS_CLASS_MAP: Record<string, string> = {
  PENDING: "status-offer-pending",
  ACCEPTED: "status-offer-accepted",
  REJECTED: "status-offer-rejected",
  SUPERSEDED: "status-offer-superseded",
  EXPIRED: "status-expired",
};

export const OFFER_STATUS_LABEL_MAP: Record<string, string> = {
  PENDING: "Pending Response",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  SUPERSEDED: "Superseded",
  EXPIRED: "Expired",
};

export const OFFER_STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending Response" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUPERSEDED", label: "Superseded" },
  { value: "EXPIRED", label: "Expired" },
];

// --- Objection Enums & Statuses ---
export const OBJECTION_TYPE_OPTIONS: SelectOption[] = [
  { value: "Measurement", label: "Discrepancy in Land / Boundary Measurement" },
  { value: "Valuation", label: "Disagreement with Market Value & Rate Per SqM" },
  { value: "Apportionment", label: "Dispute on Award Allocation & Co-Ownership Shares" },
  { value: "Damages", label: "Omission of Severance, Injurious Affection or Disturbance" },
  { value: "Other", label: "Other Grounds" },
];

export const OBJECTION_FORM_TYPE_OPTIONS: SelectOption[] = [
  { value: "Formal Objection", label: "Formal Objection" },
  { value: "Additional Evidence", label: "Additional Supporting Evidence" },
];

export const OBJECTION_STATUS_CLASS_MAP: Record<string, string> = {
  PENDING: "status-objection-review",
  APPROVED: "status-obj-approved",
  REJECTED: "status-obj-rejected",
};

export const OBJECTION_STATUS_LABEL_MAP: Record<string, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const OBJECTION_STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];
