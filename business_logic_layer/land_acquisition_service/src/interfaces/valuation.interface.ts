export interface ValuationFiltersDTO {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  caseCreatedById?: string;
  valuerId?: string;
  userRole?: string;
  userId?: string;
}

export interface CreateValuationInputDTO {
  caseId: string;
  valuerId?: string;
  valuationMethod: string;
  locationType?: string;
  buildingAge?: number;
  landArea?: number;
  acquisitionArea?: number;
  builtUpArea?: number;
  marketRatePerSqMeter?: number;
  compensationRatePerSqMeter?: number;
  aiValuationPrice?: number;
  marketValue: number;
  recommendedCompensation: number;
  remarks?: string;
  createdById: string;
}
