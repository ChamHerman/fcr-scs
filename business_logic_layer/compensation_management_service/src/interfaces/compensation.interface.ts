import { ReportStatus, OfferStatus, ObjectionStatus, Decision } from "@prisma/client";

export interface CompensationFiltersDTO {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  caseCreatedById?: string;
  userRole?: string;
  userId?: string;
}

export interface CompensationComponentsDTO {
  landValue: number;
  buildingValue: number;
  cropValue: number;
  businessDisruption: number;
  disturbanceCompensation: number;
  relocationAllowance: number;
  otherEligible: number;
}

export interface CreateCompensationReportInputDTO {
  caseId: string;
  valuationReportId: string;
  components: CompensationComponentsDTO;
  remarks?: string;
  createdById: string;
}

export interface CreateOfferLetterInputDTO {
  compensationReportId: string;
  caseId: string;
  ownershipId: string;
  offerType: string;
  offerAmount: number;
  acceptancePeriodDays?: number;
  remarks?: string;
  createdById: string;
}

export interface CreateObjectionInputDTO {
  offerId: string;
  caseId: string;
  objectionReason: string;
  requestedAmount: number;
  createdById: string;
}

export interface ReviewObjectionInputDTO {
  objectionId: string;
  decision: "ACCEPTED" | "REJECTED" | "REVISED";
  revisedCompensation?: number;
  reviewRemarks: string;
  reviewedById: string;
}
