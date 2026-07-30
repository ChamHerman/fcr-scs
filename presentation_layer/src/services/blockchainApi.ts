import { blockchainFetch, BLOCKCHAIN_BASE } from "./api";

export const blockchainApi = {
  getNetworkInfo: () => blockchainFetch("/api/blockchain/network"),
  getRecords: (status?: string) =>
    blockchainFetch("/api/blockchain/records" + (status ? "?status=" + encodeURIComponent(status) : "")),
  getRecord: (caseId: string) =>
    blockchainFetch("/api/blockchain/records/" + encodeURIComponent(caseId)),
  publish: (p: { caseId: string; documentHash: string; walletAddress: string }) =>
    blockchainFetch("/api/blockchain/publish", { method: "POST", body: JSON.stringify(p) }),
  voidRecord: (p: { caseId: string; voidReason: string; walletAddress: string }) =>
    blockchainFetch("/api/blockchain/void", { method: "POST", body: JSON.stringify(p) }),
  verify: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(BLOCKCHAIN_BASE + "/api/blockchain/verify", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "HTTP " + res.status);
    return data;
  },
};
