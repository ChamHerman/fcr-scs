/**
 * Publish-claim utilities — the cross-admin lock that keeps two Government
 * Admins from publishing the same (caseId, milestone) to Sepolia at once.
 */

/**
 * How long a claim is honoured before it is treated as abandoned.
 *
 * A publish spends its time in the admin's browser: MetaMask approval, then
 * waitForLedgerReceipt (1 confirmation, 120s timeout), then the short
 * verify-and-record request. 120s is therefore the real work ceiling, and the
 * extra 60s is the same network-latency buffer the objection and offer-letter
 * services already use, so a slow request is never punished by losing its lock.
 */
export const PUBLISH_CLAIM_TTL_MS = 120_000 + 60_000;

/**
 * A claim is live while it is younger than the TTL. Expiry is evaluated lazily
 * on read — the app has no scheduler or queue to sweep stale claims.
 */
export const isClaimLive = (
  claimedAt: string | number | Date | null | undefined,
  now: number = Date.now()
): boolean => {
  if (!claimedAt) return false;
  const claimedMs = new Date(claimedAt).getTime();
  if (isNaN(claimedMs)) return false;
  return now - claimedMs < PUBLISH_CLAIM_TTL_MS;
};

/** Milliseconds before a stored claim must be considered free. */
export const claimCutoff = (now: number = Date.now()): Date =>
  new Date(now - PUBLISH_CLAIM_TTL_MS);

/**
 * Lock identity. `milestone` must already be the normalised stored value
 * (AWARD / SETTLEMENT) — never the frontend's M1 / M2 — or the claim and the
 * publish would lock two different keys and the lock would silently do nothing.
 */
export const claimKey = (caseId: string, milestone: string): string =>
  `${caseId}#${milestone}`;

/** Counts up from zero while a claim is held, e.g. "0:42". */
export const formatClaimElapsed = (msElapsed: number): string => {
  const totalSeconds = Math.max(0, Math.floor(msElapsed / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};
