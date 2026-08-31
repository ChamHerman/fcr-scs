export type LandOwner = {
  id: string;
  name: string;
  icNumber: string;
  address: string;
  phone: string;
  email: string;
  share: string;
  ownershipType: string;
};

export type CaseDocument = {
  id: string;
  type: string;
  fileName: string;
  filePath?: string;
  fileSize?: string;
};

export type CaseDetailsData = {
  id: string;
  title: string;
  status: string;
  rawStatus: string;
  createdById?: string;
  statusClass: string;
  registrationDate: string;
  projectName: string;
  projectType: string;
  projectPurpose: string;
  projectBudget: string;
  fundingSource: string;
  landTitleNumber: string;
  lotNumber: string;
  tempat: string;
  mukim: string;
  district: string;
  state: string;
  landArea: string;
  landCategory: string;
  tenureType: string;
  owners: LandOwner[];
  documents: CaseDocument[];
};

export type ValuationReportItem = {
  id: string;
  caseId: string;
  caseTitle: string;
  caseCreatedById?: string;
  valuer: string;
  valuerId?: string;
  valuationDate: string;
  method: string;
  recommendedCompensation: string;
  status: string;
  statusClass: string;
};

export type ValuationFormData = {
  landArea: string;
  acquisitionArea: string;
  builtUpArea: string;
  valuationMethod: string;
  locationType: string;
  buildingAge: string;
  marketRatePerSqMeter: string;
  compensationRatePerSqMeter: string;
  remarks: string;
  buildingAssessment: File | null;
  siteInspection: File | null;
  aiValuationPrice: string;
};

export type CaseSummaryItem = {
  id: string;
  title: string;
  status: string;
  statusClass: string;
  createdById?: string;
  projectName: string;
  projectType: string;
  ownerName: string;
  landTitleNo: string;
  registrationDate: string;
  assignedTo?: string;
};
