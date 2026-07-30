import { blockchainFetch, BLOCKCHAIN_BASE } from "./api";

export const blockchainApi = {
  getNetworkInfo: () => blockchainFetch("/api/smart-contract/network"),
  getRecords: (status?: string) =>
    blockchainFetch("/api/smart-contract/records" + (status ? "?status=" + encodeURIComponent(status) : "")),
  getRecord: (caseId: string) =>
    blockchainFetch("/api/smart-contract/records/" + encodeURIComponent(caseId)),
  publish: (p: { caseId: string; documentHash: string; walletAddress: string }) =>
    blockchainFetch("/api/smart-contract/publish", { method: "POST", body: JSON.stringify(p) }),
  voidRecord: (p: { caseId: string; voidReason: string; walletAddress: string }) =>
    blockchainFetch("/api/smart-contract/void", { method: "POST", body: JSON.stringify(p) }),
  verify: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(BLOCKCHAIN_BASE + "/api/smart-contract/verify", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "HTTP " + res.status);
    return data;
  },
  verifyDocument: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(BLOCKCHAIN_BASE + "/api/smart-contract/verify", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "HTTP " + res.status);
    return data;
  }
};
