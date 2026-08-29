import { fetchJSON, BASE_URL } from "./api";

export const LAND_ACQUISITION_BASE = BASE_URL;

export interface CaseFilterParams {
  search?: string;
  status?: string;
  projectType?: string;
  page?: number;
  limit?: number;
  createdById?: string;
  assignedToId?: string;
  userRole?: string;
  userId?: string;
  ownerNric?: string;
}

export interface ValuationFilterParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  caseCreatedById?: string;
  valuerId?: string;
  userRole?: string;
  userId?: string;
}

export const landAcquisitionApi = {
  // ─── Case APIs (Phase 1 & 2) ────────────────────────────────────────────────
  getAllCases: async (params?: CaseFilterParams) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.status) query.append("status", params.status);
    if (params?.projectType) query.append("projectType", params.projectType);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.createdById) query.append("createdById", params.createdById);
    if (params?.assignedToId) query.append("assignedToId", params.assignedToId);
    if (params?.userRole) query.append("userRole", params.userRole);
    if (params?.userId) query.append("userId", params.userId);
    if (params?.ownerNric) query.append("ownerNric", params.ownerNric);

    const queryString = query.toString();
    const url = `/api/land-acquisition/cases${queryString ? `?${queryString}` : ""}`;
    return fetchJSON(LAND_ACQUISITION_BASE + url);
  },

  getCaseStats: async (params?: { createdById?: string; assignedToId?: string; userRole?: string; userId?: string; ownerNric?: string }) => {
    const query = new URLSearchParams();
    if (params?.createdById) query.append("createdById", params.createdById);
    if (params?.assignedToId) query.append("assignedToId", params.assignedToId);
    if (params?.userRole) query.append("userRole", params.userRole);
    if (params?.userId) query.append("userId", params.userId);
    if (params?.ownerNric) query.append("ownerNric", params.ownerNric);

    const queryString = query.toString();
    const url = `/api/land-acquisition/cases/stats${queryString ? `?${queryString}` : ""}`;
    return fetchJSON(LAND_ACQUISITION_BASE + url);
  },

  getAllProjects: async () => {
    return fetchJSON(LAND_ACQUISITION_BASE + "/api/land-acquisition/projects");
  },

  getUnassignedCases: async () => {
    return fetchJSON(LAND_ACQUISITION_BASE + "/api/land-acquisition/cases/unassigned");
  },

  getNextCaseId: async () => {
    return fetchJSON(LAND_ACQUISITION_BASE + "/api/land-acquisition/cases/next-id");
  },

  getCaseById: async (caseId: string) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/cases/${encodeURIComponent(caseId)}`);
  },

  createCase: async (caseData: any) => {
    return fetchJSON(LAND_ACQUISITION_BASE + "/api/land-acquisition/cases", {
      method: "POST",
      body: JSON.stringify(caseData),
    });
  },

  // ── Whole-case update (all sections at once) ──────────────────────────────
  updateCase: async (caseId: string, updateData: any) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/cases/${encodeURIComponent(caseId)}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
  },

  // ── Section-specific update: Case Title ──────────────────────────────────
  updateCaseTitle: async (caseId: string, caseTitle: string) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/cases/${encodeURIComponent(caseId)}/title`, {
      method: "PUT",
      body: JSON.stringify({ caseTitle }),
    });
  },

  // ── Section-specific update: Project ─────────────────────────────────────
  updateProjectInfo: async (caseId: string, projectData: any) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/cases/${encodeURIComponent(caseId)}/project`, {
      method: "PUT",
      body: JSON.stringify(projectData),
    });
  },

  // ── Section-specific update: Land ─────────────────────────────────────────
  updateLandInfo: async (caseId: string, landData: any) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/cases/${encodeURIComponent(caseId)}/land`, {
      method: "PUT",
      body: JSON.stringify(landData),
    });
  },

  // ── Section-specific update: Owners ───────────────────────────────────────
  updateOwnerInfo: async (caseId: string, ownersData: any) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/cases/${encodeURIComponent(caseId)}/owners`, {
      method: "PUT",
      body: JSON.stringify(ownersData),
    });
  },

  deleteCase: async (caseId: string) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/cases/${encodeURIComponent(caseId)}/delete`, {
      method: "POST",
    });
  },

  uploadDocument: async (caseId: string, file: File, documentType?: string, createdById?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (documentType) form.append("documentType", documentType);
    if (createdById) form.append("createdById", createdById);

    let res: Response;
    try {
      res = await fetch(LAND_ACQUISITION_BASE + `/api/land-acquisition/cases/${encodeURIComponent(caseId)}/documents`, {
        method: "POST",
        body: form,
      });
    } catch (networkErr: any) {
      throw new Error("Network Error: Cannot connect to backend. Is the service running?");
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server Error (${res.status}): Unexpected non-JSON response from document upload endpoint`);
    }

    if (!res.ok) throw new Error(data.error ?? data.message ?? `Upload failed with status ${res.status}`);
    return data;
  },

  deleteDocument: async (documentId: string) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/documents/${encodeURIComponent(documentId)}/delete`, {
      method: "POST",
    });
  },

  // ─── Valuer & Assignment APIs (Phase 3) ──────────────────────────────────────
  getAvailableValuers: async () => {
    return fetchJSON(LAND_ACQUISITION_BASE + "/api/land-acquisition/valuers");
  },

  getAllAssignments: async () => {
    return fetchJSON(LAND_ACQUISITION_BASE + "/api/land-acquisition/assignments");
  },

  assignValuer: async (payload: { caseId: string; valuerId: string; acceptancePeriodDays?: number; remarks?: string; assignedById?: string }) => {
    return fetchJSON(LAND_ACQUISITION_BASE + "/api/land-acquisition/assignments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ─── Valuation Report APIs (Phase 4) ─────────────────────────────────────────
  getAllValuationReports: async (params?: ValuationFilterParams) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.caseCreatedById) query.append("caseCreatedById", params.caseCreatedById);
    if (params?.valuerId) query.append("valuerId", params.valuerId);
    if (params?.userRole) query.append("userRole", params.userRole);
    if (params?.userId) query.append("userId", params.userId);

    const queryString = query.toString();
    const url = `/api/land-acquisition/valuation-reports${queryString ? `?${queryString}` : ""}`;
    return fetchJSON(LAND_ACQUISITION_BASE + url);
  },

  getValuationReportById: async (reportId: string) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/valuation-reports/${encodeURIComponent(reportId)}`);
  },

  createValuationReport: async (reportData: {
    caseId: string;
    valuationMethod: string;
    marketValue: number;
    recommendedCompensation: number;
    remarks: string;
    createdById?: string;
    valuerId?: string;
  }) => {
    return fetchJSON(LAND_ACQUISITION_BASE + "/api/land-acquisition/valuation-reports", {
      method: "POST",
      body: JSON.stringify(reportData),
    });
  },

  approveValuationReport: async (reportId: string, reviewerId?: string) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/valuation-reports/${encodeURIComponent(reportId)}/approve`, {
      method: "POST",
      body: JSON.stringify({ reviewerId }),
    });
  },

  rejectValuationReport: async (reportId: string, reason: string, acceptancePeriodDays?: number, reviewerId?: string) => {
    return fetchJSON(LAND_ACQUISITION_BASE + `/api/land-acquisition/valuation-reports/${encodeURIComponent(reportId)}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, acceptancePeriodDays, reviewerId }),
    });
  },
};
