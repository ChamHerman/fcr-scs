import { blockchainFetch, BLOCKCHAIN_BASE } from "./api";

export const blockchainApi = {
  getNetworkInfo: () => blockchainFetch("/api/smart-contract/network"),
  setNetwork: (network: string) =>
    blockchainFetch("/api/smart-contract/network", { method: "POST", body: JSON.stringify({ network }) }),
  getRecords: (status?: string) =>
    blockchainFetch("/api/smart-contract/records" + (status ? "?status=" + encodeURIComponent(status) : "")),
  getRecord: (caseId: string) =>
    blockchainFetch("/api/smart-contract/records/" + encodeURIComponent(caseId)),
  publish: (p: { caseId: string; documentHash: string; walletAddress: string; transactionHash: string }) =>
    blockchainFetch("/api/smart-contract/publish", { method: "POST", body: JSON.stringify(p) }),
  voidRecord: (p: { caseId: string; voidReason: string; walletAddress: string; transactionHash: string }) =>
    blockchainFetch("/api/smart-contract/void", { method: "POST", body: JSON.stringify(p) }),
  /**
   * Void follow-ups (PLAN_HM_1308 §5.7 / §8). Backend endpoints are a flagged
   * follow-up; for the demo these record the decision client-side and return a
   * simulated marker so the voided record's menu stays truthful.
   */
  createCorrectedCertificate: async (caseId: string, adminId: string) => {
    return { simulated: true, caseId, adminId, action: "createCorrectedCertificate", status: "Ready to Publish" };
  },
  reopenPayment: async (caseId: string, adminId: string) => {
    return { simulated: true, caseId, adminId, action: "reopenPayment", status: "READY_TO_INITIATE" };
  },
  recordVoidFollowUp: async (caseId: string, adminId: string, followUp: string) => {
    return { simulated: true, caseId, adminId, action: "recordVoidFollowUp", followUp };
  },
  verify: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(BLOCKCHAIN_BASE + "/api/smart-contract/verify", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "HTTP " + res.status);
    return data;
  },
};
