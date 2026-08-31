export type ProjectBudgetSummary = {
  projectId: string;
  projectName: string;
  projectType: string;
  totalBudget: number;
  totalApprovedUnderProject: number;
  remainingFund: number;
  remainingFundBefore: number;
  remainingFundAfter: number;
  currentReportAmount?: number;
  isOverBudget?: boolean;
};

export type CaseDataSummary = {
  id: string;
  title: string;
  project: string;
  owner: string;
  ownerIc: string;
  landTitleNumber: string;
  registrationDate: string;
  status: string;
  statusClass: string;
  projectBudgetSummary?: ProjectBudgetSummary;
};

export type ValuationBenchmark = {
  reportId?: string;
  valuationMethod: string;
  marketValue: number;
  recommendedCompensation: number;
  landValue: number;
  buildingValue: number;
  cropValue: number;
};

export type CompensationFormData = {
  landValue: string;
  buildingValue: string;
  cropValue: string;
  businessDisruption: string;
  disturbanceCompensation: string;
  relocationAllowance: string;
  otherEligible: string;
  remarks: string;
};

export type SavedCompensationReport = {
  reportId: string;
  totalCompensation: number;
  status: string;
  offerId?: string;
  offerReferenceNo?: string;
  requiresApproval?: boolean;
};

export type CompensationReportItem = {
  id: string;
  caseId: string;
  caseTitle: string;
  caseCreatedById?: string;
  owner: string;
  totalAmount: number;
  status: string;
  statusClass: string;
  generatedDate: string;
  offerLetterGenerated: boolean;
};
