import { paymentFetch, PAYMENT_BASE } from "./api";

export type BankDetails = {
  caseId: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  phoneNumber: string;
  myKadNumber: string;
};

export const paymentApi = {
  submitBankDetails: (d: BankDetails) =>
    paymentFetch("/api/payments/bank-details", { method: "POST", body: JSON.stringify(d) }),
  initiate: (d: { caseId: string; adminId?: string }) =>
    paymentFetch("/api/payments/initiate", { method: "POST", body: JSON.stringify(d) }),
  authorise: (d: { caseId: string; adminId?: string }) =>
    paymentFetch("/api/payments/authorise", { method: "POST", body: JSON.stringify(d) }),
  confirmExecution: (d: { caseId: string; adminId?: string }) =>
    paymentFetch("/api/payments/confirm-execution", { method: "POST", body: JSON.stringify(d) }),
  reject: (d: { caseId: string; adminId?: string; reason: string }) =>
    paymentFetch("/api/payments/reject", { method: "POST", body: JSON.stringify(d) }),
  resolveRejection: (d: { caseId: string; adminId?: string }) =>
    paymentFetch("/api/payments/resolve-rejection", { method: "POST", body: JSON.stringify(d) }),
  cancelPayment: (d: { caseId: string; adminId?: string; reason: string }) =>
    paymentFetch("/api/payments/cancel", { method: "POST", body: JSON.stringify(d) }),
  retry: (caseId: string) =>
    paymentFetch("/api/payments/retry", { method: "POST", body: JSON.stringify({ caseId }) }),
  requestDetailsUpdate: (caseId: string) =>
    paymentFetch("/api/payments/request-details-update", { method: "POST", body: JSON.stringify({ caseId }) }),
  scheduleTomorrow: (caseId: string) =>
    paymentFetch("/api/payments/schedule-tomorrow", { method: "POST", body: JSON.stringify({ caseId }) }),
  resolveDispute: (d: { caseId: string; adminId?: string; resolution: "MARK_AS_RESOLVED" | "REINITIATE_PAYMENT" }) =>
    paymentFetch("/api/payments/resolve-dispute", { method: "POST", body: JSON.stringify(d) }),
  getStatus: (caseId: string) =>
    paymentFetch("/api/payments/status/" + encodeURIComponent(caseId)),
  getAllCases: () => paymentFetch("/api/payments/cases"),
  getPendingAuthorisations: () => paymentFetch("/api/payments/pending-authorisations"),
  getFailedTransactions: () => paymentFetch("/api/payments/failed"),
  downloadReceipt: async (caseId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const res = await fetch(PAYMENT_BASE + "/api/payments/cases/" + encodeURIComponent(caseId) + "/receipt", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error ?? "Receipt unavailable");
    }
    return res.blob();
  },
  dispute: async (caseId: string, file: File, reason: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const form = new FormData();
    form.append("caseId", caseId);
    form.append("file", file);
    form.append("reason", reason);
    const res = await fetch(PAYMENT_BASE + "/api/payments/dispute", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? "HTTP " + res.status);
    return d;
  },
  downloadDisputeStatement: async (caseId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const res = await fetch(PAYMENT_BASE + "/api/payments/cases/" + encodeURIComponent(caseId) + "/dispute-document", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? "Dispute statement unavailable");
    }
    return res.blob();
  },
  confirmReceipt: (d: { caseId: string; role?: string; isAutoOrAdminOverride?: boolean }) =>
    paymentFetch("/api/payments/confirm-receipt", { method: "POST", body: JSON.stringify(d) }),
  // Bank Clearance Portal APIs
  getBankPending: () => paymentFetch("/api/payments/bank/pending"),
  approveBank: (d: { caseId: string; bankReferenceNumber?: string }) =>
    paymentFetch("/api/payments/bank/approve", { method: "POST", body: JSON.stringify(d) }),
  rejectBank: (d: { caseId: string; errorReason: string; isRejectedCategory?: boolean }) =>
    paymentFetch("/api/payments/bank/reject", { method: "POST", body: JSON.stringify(d) }),
  getBankHistory: () => paymentFetch("/api/payments/bank/history"),
  getSavedBankDetails: () => paymentFetch("/api/payments/saved-bank-details"),
  saveDefaultBankDetails: (d: {
    bankName: string;
    accountNumber: string;
    accountHolderName?: string;
    phoneNumber?: string;
    myKadNumber?: string;
  }) => paymentFetch("/api/payments/saved-bank-details", { method: "POST", body: JSON.stringify(d) }),
};
