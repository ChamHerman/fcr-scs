import type { SelectOption } from "../components/ui/Select";

// --- Project Types & Funding Sources ---
export const PROJECT_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select type" },
  { value: "Public Amenities", label: "Public Amenities" },
  { value: "Transportation Development", label: "Transportation Development" },
  { value: "Urban Redevelopment", label: "Urban Redevelopment" },
  { value: "Tourism Development", label: "Tourism Development" },
  { value: "Others", label: "Others" },
];

export const FUNDING_SOURCE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select funding source" },
  { value: "Government", label: "Government" },
  { value: "Private", label: "Private" },
  { value: "Others", label: "Others" },
];

export const STANDARD_PROJECT_PURPOSES: string[] = [
  "Public Infrastructure",
  "Public Facilities",
  "Recreational and Environmental Use",
];

export const PROJECT_PURPOSE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select project purpose" },
  { value: "Public Infrastructure", label: "Public Infrastructure" },
  { value: "Public Facilities", label: "Public Facilities" },
  { value: "Recreational and Environmental Use", label: "Recreational and Environmental Use" },
  { value: "Others", label: "Others" },
];

// --- Land Parcel & Documents ---
export const MANDATORY_DOCUMENT_TYPES = [
  {
    type: "Acquisition Plan",
    label: "Acquisition Plan *",
    description: "Detailed layout showing the land boundary, acquisition perimeter, and project scope.",
  },
  {
    type: "Official Title Search",
    label: "Official Title Search *",
    description: "Certified true copy of land title search issued by the Land Registry / Pejabat Tanah.",
  },
  {
    type: "Proof of Financial Allocation",
    label: "Proof of Financial Allocation *",
    description: "Official warrant, treasury approval, or fund allocation confirmation letter.",
  },
  {
    type: "Project Proposal",
    label: "Project Proposal *",
    description: "Cabinet approval, gazette notification, or executive project proposal brief.",
  },
] as const;

export const DOCUMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select type" },
  { value: "Acquisition Plan", label: "Acquisition Plan" },
  { value: "Official Title Search", label: "Official Title Search" },
  { value: "Proof of Financial Allocation", label: "Proof of Financial Allocation" },
  { value: "Project Proposal", label: "Project Proposal" },
];

export const LAND_CATEGORY_OPTIONS: SelectOption[] = [
  { value: "", label: "Select category" },
  { value: "Agriculture", label: "Agriculture" },
  { value: "Building", label: "Building" },
  { value: "Industry", label: "Industry" },
];

export const TENURE_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select tenure type" },
  { value: "Freehold", label: "Freehold" },
  { value: "Leasehold", label: "Leasehold" },
  { value: "Malay Reserve", label: "Malay Reserve" },
];

export const OWNERSHIP_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select ownership type" },
  { value: "Individual Citizen", label: "Individual Citizen" },
  { value: "Joint Ownership", label: "Joint Ownership" },
  { value: "Corporate Entity", label: "Corporate Entity" },
  { value: "Estate of Deceased", label: "Estate of Deceased" },
  { value: "Trustee", label: "Trustee" },
];

// --- Case Status Mapping ---
export const CASE_STATUS_CLASS_MAP: Record<string, string> = {
  CASE_REGISTERED: "status-case-registered",
  VALUER_ASSIGNED: "status-valuer-assigned",
  VALUATION_IN_PROGRESS: "status-valuation-progress",
  VALUATION_SUBMITTED: "status-valuation-submitted",
  PENDING_VALUATION_APPROVAL: "status-pending-valuation",
  VALUATION_APPROVED: "status-valuation-approved",
  VALUATION_REJECTED: "status-valuation-rejected",
  PENDING_COMPENSATION_APPROVAL: "status-pending-comp",
  COMPENSATION_APPROVED: "status-comp-approved",
  COMPENSATION_REJECTED: "status-comp-rejected",
  COMPENSATION_DETERMINED: "status-compensation-determined",
  OFFER_ISSUED: "status-offer-issued",
  OFFER_ACCEPTED: "status-offer-accepted",
  OFFER_REJECTED: "status-offer-rejected",
  OBJECTION_FILED: "status-objection-filed",
  OBJECTION_RESOLVED: "status-objection-resolved",
  PAYMENT_IN_PROGRESS: "status-payment-progress",
  PAYMENT_PROCESSING: "status-payment-processing",
  PAYMENT_COMPLETED: "status-payment-completed",
  LAND_POSSESSED: "status-land-possessed",
  CASE_CLOSED: "status-case-closed",
};

export const CASE_STATUS_LABEL_MAP: Record<string, string> = {
  CASE_REGISTERED: "Case Registered",
  VALUER_ASSIGNED: "Valuer Assigned",
  VALUATION_IN_PROGRESS: "Valuation In Progress",
  VALUATION_SUBMITTED: "Valuation Submitted",
  PENDING_VALUATION_APPROVAL: "Pending Valuation Approval",
  VALUATION_APPROVED: "Valuation Approved",
  VALUATION_REJECTED: "Valuation Rejected",
  PENDING_COMPENSATION_APPROVAL: "Pending Compensation Approval",
  COMPENSATION_APPROVED: "Compensation Approved",
  COMPENSATION_REJECTED: "Compensation Rejected",
  COMPENSATION_DETERMINED: "Compensation Determined",
  OFFER_ISSUED: "Offer Issued",
  OFFER_ACCEPTED: "Offer Accepted",
  OFFER_REJECTED: "Offer Rejected",
  OBJECTION_FILED: "Objection Filed",
  OBJECTION_RESOLVED: "Objection Resolved",
  PAYMENT_IN_PROGRESS: "Payment In Progress",
  PAYMENT_PROCESSING: "Payment Processing",
  PAYMENT_COMPLETED: "Payment Completed",
  LAND_POSSESSED: "Land Possessed",
  CASE_CLOSED: "Case Closed",
};

/**
 * Filter options mirror the CaseStatus enum exactly — every value here is one
 * the acquisition_case table can actually hold. Statuses that only exist as
 * display concepts belong in the label/class maps below, not in this list.
 */
export const CASE_STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Status" },
  { value: "CASE_REGISTERED", label: "Case Registered" },
  { value: "VALUER_ASSIGNED", label: "Valuer Assigned" },
  { value: "VALUATION_IN_PROGRESS", label: "Valuation In Progress" },
  { value: "PENDING_VALUATION_APPROVAL", label: "Pending Valuation Approval" },
  { value: "VALUATION_APPROVED", label: "Valuation Approved" },
  { value: "VALUATION_REJECTED", label: "Valuation Rejected" },
  { value: "PENDING_COMPENSATION_APPROVAL", label: "Pending Compensation Approval" },
  { value: "COMPENSATION_APPROVED", label: "Compensation Approved" },
  { value: "COMPENSATION_REJECTED", label: "Compensation Rejected" },
  { value: "OFFER_ISSUED", label: "Offer Issued" },
  { value: "OFFER_ACCEPTED", label: "Offer Accepted" },
  { value: "OFFER_REJECTED", label: "Offer Rejected" },
  { value: "PAYMENT_IN_PROGRESS", label: "Payment In Progress" },
  { value: "PAYMENT_COMPLETED", label: "Payment Completed" },
  { value: "CASE_CLOSED", label: "Case Closed" },
];

// --- Valuation Enums & Options ---
export const VALUATION_METHOD_OPTIONS: SelectOption[] = [
  { value: "", label: "Select method" },
  { value: "Sales Comparison Method", label: "Sales Comparison Method" },
  { value: "Residual Land Value Method", label: "Residual Land Value Method" },
  { value: "Extraction Method", label: "Extraction Method" },
  { value: "Allocation Method", label: "Allocation Method" },
  { value: "Income Capitalization Method", label: "Income Capitalization Method" },
];

export const LOCATION_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "Select location type" },
  { value: "Urban", label: "Urban" },
  { value: "Suburban", label: "Suburban" },
  { value: "Rural", label: "Rural" },
];

export const VALUATION_STATUS_CLASS_MAP: Record<string, string> = {
  PENDING: "status-pending-valuation",
  APPROVED: "status-valuation-approved",
  REJECTED: "status-valuation-rejected",
};

export const VALUATION_STATUS_LABEL_MAP: Record<string, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const VALUATION_STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];
