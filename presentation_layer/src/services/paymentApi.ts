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
  cancelPayment: (d: { caseId: string; adminId?: string; reason: string }) =>
    paymentFetch("/api/payments/cancel", { method: "POST", body: JSON.stringify(d) }),
  retry: (caseId: string) =>
    paymentFetch("/api/payments/retry", { method: "POST", body: JSON.stringify({ caseId }) }),
  requestDetailsUpdate: (caseId: string) =>
    paymentFetch("/api/payments/request-details-update", { method: "POST", body: JSON.stringify({ caseId }) }),
  scheduleTomorrow: (caseId: string) =>
    paymentFetch("/api/payments/schedule-tomorrow", { method: "POST", body: JSON.stringify({ caseId }) }),
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
  dispute: async (caseId: string, file: File) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const form = new FormData();
    form.append("caseId", caseId);
    form.append("file", file);
    const res = await fetch(PAYMENT_BASE + "/api/payments/dispute", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? "HTTP " + res.status);
    return d;
  },
  // Bank Clearance Portal APIs
  getBankPending: () => paymentFetch("/api/payments/bank/pending"),
  approveBank: (d: { caseId: string; bankReferenceNumber?: string }) =>
    paymentFetch("/api/payments/bank/approve", { method: "POST", body: JSON.stringify(d) }),
  rejectBank: (d: { caseId: string; errorReason: string }) =>
    paymentFetch("/api/payments/bank/reject", { method: "POST", body: JSON.stringify(d) }),
  getBankHistory: () => paymentFetch("/api/payments/bank/history"),
};
