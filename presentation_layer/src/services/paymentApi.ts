import { paymentFetch, PAYMENT_BASE } from "./api";

type BankDetails = { caseId: string; bankName: string; accountNumber: string; accountHolderName: string; phoneNumber: string; myKadNumber: string };

export const paymentApi = {
  submitBankDetails: (d: any) =>
    paymentFetch("/api/bank-details", { method: "POST", body: JSON.stringify(d) }),
  initiate: (d: { caseId: string; adminId: string }) =>
    paymentFetch("/api/payments/initiate", { method: "POST", body: JSON.stringify(d) }),
  authorise: (d: { caseId: string; adminId: string }) =>
    paymentFetch("/api/payments/authorise", { method: "POST", body: JSON.stringify(d) }),
  reject: (d: { caseId: string; adminId: string; reason: string }) =>
    paymentFetch("/api/payments/reject", { method: "POST", body: JSON.stringify(d) }),
  retry: (caseId: string) =>
    paymentFetch("/api/payments/retry", { method: "POST", body: JSON.stringify({ caseId }) }),
  requestDetailsUpdate: (caseId: string) =>
    paymentFetch("/api/payments/request-details-update", { method: "POST", body: JSON.stringify({ caseId }) }),
  scheduleTomorrow: (caseId: string) =>
    paymentFetch("/api/payments/schedule-tomorrow", { method: "POST", body: JSON.stringify({ caseId }) }),
  getStatus: (caseId: string) =>
    paymentFetch("/api/payments/status/" + encodeURIComponent(caseId)),
  getCaseStatus: (id: string) =>
    paymentFetch("/api/payments/case-status/" + encodeURIComponent(id)),
  getAllCases: () => paymentFetch("/api/payments/cases"),
  getPendingAuthorisations: () => paymentFetch("/api/payments/pending-authorisations"),
  getFailedTransactions: () => paymentFetch("/api/payments/failed"),
  downloadReceipt: async (caseId: string) => {
    const res = await fetch(PAYMENT_BASE + "/api/payments/cases/" + encodeURIComponent(caseId) + "/receipt");
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Receipt unavailable"); }
    return res.blob();
  },
  dispute: async (caseId: string, file: File) => {
    const form = new FormData();
    form.append("caseId", caseId);
    form.append("file", file);
    const res = await fetch(PAYMENT_BASE + "/api/payments/dispute", { method: "POST", body: form });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? "HTTP " + res.status);
    return d;
  },
};
