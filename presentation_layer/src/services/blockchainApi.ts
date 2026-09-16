import { blockchainFetch, BLOCKCHAIN_BASE } from "./api";

export interface PublishClaim {
  caseId: string;
  milestone: string;
  adminId: string;
  adminName: string;
  claimedAt: string;
}

/** Raised when another Government Admin already holds the publish lock. */
export class PublishClaimHeldError extends Error {
  readonly claim: PublishClaim | null;
  constructor(message: string, claim: PublishClaim | null) {
    super(message);
    this.name = "PublishClaimHeldError";
    this.claim = claim;
  }
}

export const blockchainApi = {
  getNetworkInfo: () => blockchainFetch("/api/smart-contract/network"),
  setNetwork: (network: string) =>
    blockchainFetch("/api/smart-contract/network", { method: "POST", body: JSON.stringify({ network }) }),
  getRecords: (status?: string) =>
    blockchainFetch("/api/smart-contract/records" + (status ? "?status=" + encodeURIComponent(status) : "")),
  getRecord: (caseId: string, milestone?: string) =>
    blockchainFetch(
      "/api/smart-contract/records/" + encodeURIComponent(caseId) + (milestone ? "?milestone=" + encodeURIComponent(milestone) : "")
    ),
  publish: (p: { caseId: string; milestone?: string; documentHash: string; walletAddress: string; transactionHash: string; onChainKey?: string }) =>
    blockchainFetch("/api/smart-contract/publish", { method: "POST", body: JSON.stringify(p) }),
  /** Live publish locks held by any admin, for the 5s poll. */
  getPublishClaims: async (): Promise<PublishClaim[]> => {
    const data = await blockchainFetch("/api/smart-contract/publish-claims");
    return (data?.claims ?? []) as PublishClaim[];
  },

  /**
   * Take the lock BEFORE opening MetaMask. Uses a raw fetch rather than
   * blockchainFetch so a 409 can carry the holder's identity and start time
   * instead of being flattened into a message string.
   */
  claimPublish: async (p: { caseId: string; milestone: string }): Promise<PublishClaim> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const res = await fetch(BLOCKCHAIN_BASE + "/api/smart-contract/publish-claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(p),
    });
    const data = await res.json().catch(() => null);
    if (res.status === 409) {
      throw new PublishClaimHeldError(
        data?.error || "Another administrator is currently publishing this record.",
        (data?.claimedBy ? {
          caseId: p.caseId,
          milestone: p.milestone,
          adminId: data.claimedBy,
          adminName: data.claimedByName || "Gov Admin",
          claimedAt: data.claimedAt || new Date().toISOString(),
        } : null) as PublishClaim | null
      );
    }
    if (!res.ok) {
      throw new Error(data?.error || `Publish claim failed (${res.status})`);
    }
    return data.claim as PublishClaim;
  },

  /**
   * Give the lock back after a failed or cancelled publish. Best-effort: an
   * expired claim is ignored by the server anyway, so a lost request here is
   * covered by the TTL rather than stranding the record.
   */
  releasePublishClaim: (p: { caseId: string; milestone: string }): Promise<unknown> =>
    blockchainFetch("/api/smart-contract/publish-claim", { method: "DELETE", body: JSON.stringify(p) }),

  /**
   * Same release, but survives the tab closing: a plain async call is aborted
   * mid-unload. sendBeacon cannot carry the Authorization header, so this uses
   * fetch(keepalive) instead. Still best-effort — the TTL is the guarantee.
   */
  releasePublishClaimOnUnload: (p: { caseId: string; milestone: string }): void => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    fetch(BLOCKCHAIN_BASE + "/api/smart-contract/publish-claim", {
      method: "DELETE",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(p),
    }).catch(() => {});
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
