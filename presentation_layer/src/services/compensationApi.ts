import { fetchJSON, BASE_URL } from "./api";

export const COMPENSATION_BASE = BASE_URL;

export interface CompensationFilterParams {
  caseId?: string;
  search?: string;
  status?: string;
  ownerNric?: string;
  page?: number;
  limit?: number;
  caseCreatedById?: string;
  userRole?: string;
  userId?: string;
}

export const compensationApi = {
  // ─── Compensation Reports (Phase 5) ─────────────────────────────────────────
  getAllReports: async (params?: CompensationFilterParams) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.caseCreatedById) query.append("caseCreatedById", params.caseCreatedById);
    if (params?.userRole) query.append("userRole", params.userRole);
    if (params?.userId) query.append("userId", params.userId);

    const queryString = query.toString();
    const url = `/api/compensation/reports${queryString ? `?${queryString}` : ""}`;
    return fetchJSON(COMPENSATION_BASE + url);
  },

  getReportById: async (reportId: string) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/reports/${encodeURIComponent(reportId)}`);
  },

  createReport: async (payload: {
    caseId: string;
    valuationReportId: string;
    components: {
      landValue: number;
      buildingValue: number;
      cropValue: number;
      businessDisruption: number;
      disturbanceCompensation: number;
      relocationAllowance: number;
      otherEligible: number;
    };
    remarks?: string;
    createdById?: string;
  }) => {
    return fetchJSON(COMPENSATION_BASE + "/api/compensation/reports", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  approveReport: async (reportId: string, approvedById?: string) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/reports/${encodeURIComponent(reportId)}/approve`, {
      method: "POST",
      body: JSON.stringify({ approvedById }),
    });
  },

  rejectReport: async (reportId: string, reason: string, reviewedById?: string) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/reports/${encodeURIComponent(reportId)}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, reviewedById }),
    });
  },

  // ─── Offer Letters (Phase 6) ────────────────────────────────────────────────
  getAllOfferLetters: async (params?: CompensationFilterParams) => {
    const query = new URLSearchParams();
    if (params?.caseId) query.append("caseId", params.caseId);
    if (params?.search) query.append("search", params.search);
    if (params?.status) query.append("status", params.status);
    if (params?.ownerNric) query.append("ownerNric", params.ownerNric);
    if (params?.caseCreatedById) query.append("caseCreatedById", params.caseCreatedById);
    if (params?.userRole) query.append("userRole", params.userRole);
    if (params?.userId) query.append("userId", params.userId);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());

    const queryString = query.toString();
    const url = `/api/compensation/offer-letters${queryString ? `?${queryString}` : ""}`;
    return fetchJSON(COMPENSATION_BASE + url);
  },

  getOfferLetterById: async (offerId: string) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/offer-letters/${encodeURIComponent(offerId)}`);
  },

  createOfferLetter: async (payload: {
    compensationReportId: string;
    caseId: string;
    ownershipId: string;
    offerType: string;
    offerAmount: number;
    acceptancePeriodDays?: number;
    remarks?: string;
  }) => {
    return fetchJSON(COMPENSATION_BASE + "/api/compensation/offer-letters", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  acceptOffer: async (
    offerId: string,
    signedDocument?: string | File | null,
    forceAccept?: boolean,
    options?: { ownerNric?: string; ownerId?: string; userId?: string; clientHash?: string }
  ) => {
    if (signedDocument instanceof File) {
      const formData = new FormData();
      formData.append("signedDocument", signedDocument);
      if (forceAccept) formData.append("forceAccept", "true");
      if (options?.ownerNric) formData.append("ownerNric", options.ownerNric);
      if (options?.ownerId) formData.append("ownerId", options.ownerId);
      if (options?.userId) formData.append("userId", options.userId);
      // FR-019: browser-computed fingerprint verified server-side on arrival.
      if (options?.clientHash) formData.append("clientHash", options.clientHash);

      const url = COMPENSATION_BASE + `/api/compensation/offer-letters/${encodeURIComponent(offerId)}/accept`;
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const error: any = new Error(data.error || "Failed to accept offer");
        error.code = data.code;
        error.objection = data.activeObjection;
        throw error;
      }
      return data;
    }

    return fetchJSON(COMPENSATION_BASE + `/api/compensation/offer-letters/${encodeURIComponent(offerId)}/accept`, {
      method: "POST",
      body: JSON.stringify({ signedDocument, forceAccept, ...options }),
    });
  },

  rejectOffer: async (
    offerId: string,
    remarks?: string,
    options?: { ownerNric?: string; ownerId?: string; userId?: string }
  ) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/offer-letters/${encodeURIComponent(offerId)}/reject`, {
      method: "POST",
      body: JSON.stringify({ remarks, ...options }),
    });
  },

  cancelOfferAcceptance: async (
    offerId: string,
    options?: { ownerNric?: string; ownerId?: string; userId?: string }
  ) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/offer-letters/${encodeURIComponent(offerId)}/cancel-acceptance`, {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },

  // ─── Objections (Phase 7) ───────────────────────────────────────────────────
  getAllObjections: async (params?: CompensationFilterParams) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.status) query.append("status", params.status);
    if (params?.ownerNric) query.append("ownerNric", params.ownerNric);
    if (params?.caseCreatedById) query.append("caseCreatedById", params.caseCreatedById);
    if (params?.userRole) query.append("userRole", params.userRole);
    if (params?.userId) query.append("userId", params.userId);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());

    const queryString = query.toString();
    const url = `/api/compensation/objections${queryString ? `?${queryString}` : ""}`;
    return fetchJSON(COMPENSATION_BASE + url);
  },

  getObjectionById: async (objectionId: string) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/objections/${encodeURIComponent(objectionId)}`);
  },

  createObjection: async (payload: {
    offerId: string;
    caseId: string;
    objectionReason: string;
    requestedAmount: number;
    createdById?: string;
    files?: File[];
  }) => {
    if (payload.files && payload.files.length > 0) {
      const formData = new FormData();
      formData.append("offerId", payload.offerId);
      formData.append("caseId", payload.caseId);
      formData.append("objectionReason", payload.objectionReason);
      formData.append("requestedAmount", String(payload.requestedAmount));
      if (payload.createdById) {
        formData.append("createdById", payload.createdById);
      }
      for (const file of payload.files) {
        formData.append("documents", file);
      }
      return fetchJSON(COMPENSATION_BASE + "/api/compensation/objections", {
        method: "POST",
        body: formData,
      });
    }

    return fetchJSON(COMPENSATION_BASE + "/api/compensation/objections", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  approveObjection: async (objectionId: string, revisedCompensation?: number, reviewRemarks?: string, reviewedById?: string) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/objections/${encodeURIComponent(objectionId)}/approve`, {
      method: "POST",
      body: JSON.stringify({ revisedCompensation, reviewRemarks, reviewedById }),
    });
  },

  rejectObjection: async (objectionId: string, reviewRemarks?: string, reviewedById?: string) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/objections/${encodeURIComponent(objectionId)}/reject`, {
      method: "POST",
      body: JSON.stringify({ reviewRemarks, reviewedById }),
    });
  },

  updateObjection: async (objectionId: string, payload: { objectionReason?: string; requestedAmount?: number }) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/objections/${encodeURIComponent(objectionId)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteObjection: async (objectionId: string) => {
    return fetchJSON(COMPENSATION_BASE + `/api/compensation/objections/${encodeURIComponent(objectionId)}`, {
      method: "DELETE",
    });
  },
};
