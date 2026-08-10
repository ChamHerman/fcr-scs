import { CaseStatus } from "@prisma/client";

export interface CaseFiltersDTO {
  search?: string;
  status?: string;
  projectType?: string;
  page?: number;
  limit?: number;
}

export interface CreateCaseInputDTO {
  project: {
    projectName: string;
    projectType: string;
    purpose: string;
    budget: number;
    fundingSource: string;
  };
  land: {
    landTitleNo: string;
    lotNo: string;
    mukim: string;
    district: string;
    state: string;
    area: number;
    areaUnit: string;
    category: string;
    latitude: number;
    longitude: number;
  };
  owners: Array<{
    name: string;
    nric: string;
    address: string;
    contact: string;
    ownershipType: string;
  }>;
  caseTitle: string;
  remarks?: string;
  createdById: string;
}

export interface UpdateCaseInputDTO {
  caseTitle?: string;
  remarks?: string;
  status?: CaseStatus;
}

export interface CaseDocumentInputDTO {
  caseId: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  mimeType: string;
  checksum: string;
  createdById: string;
}

export interface ICaseService {
  getAllCases(filters: CaseFiltersDTO): Promise<{ cases: any[]; total: number; page: number; limit: number }>;
  getCaseById(caseId: string): Promise<any>;
  getCaseStats(): Promise<any>;
  getUnassignedCases(): Promise<any[]>;
  createCase(input: CreateCaseInputDTO): Promise<any>;
  updateCase(caseId: string, input: UpdateCaseInputDTO): Promise<any>;
  deleteCase(caseId: string): Promise<{ success: boolean; caseId: string }>;
  addCaseDocument(input: CaseDocumentInputDTO): Promise<any>;
  deleteCaseDocument(documentId: string): Promise<{ success: boolean; documentId: string }>;
}
