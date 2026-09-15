import { useCallback, useEffect, useRef, useState } from 'react';
import { blockchainApi, type PublishClaim } from '../services/blockchainApi';

/**
 * A publish runs for minutes inside the clicking admin's browser (MetaMask
 * approval + mining) before the record is written, so other admins need to see
 * the lock while it is held. There is no push channel in this app, so the live
 * claims are polled.
 */
const CLAIMS_POLL_MS = 5_000;

/**
 * The server keys claims on the stored milestone value (AWARD / SETTLEMENT)
 * while the ledger UI works in M1 / M2. Both spellings must resolve to one key,
 * or a claim and its publish would lock different rows and the lock would
 * silently never apply.
 */
export const milestoneClaimKey = (milestone?: string | null): 'AWARD' | 'SETTLEMENT' => {
  const m = String(milestone || 'AWARD').toUpperCase();
  return m === 'M2' || m === 'SETTLEMENT' ? 'SETTLEMENT' : 'AWARD';
};

export interface UsePublishClaims {
  /** Live claims by `${caseId}#${AWARD|SETTLEMENT}`. */
  claims: Map<string, PublishClaim>;
  /** The lock on a record, or undefined when free. */
  claimFor: (caseId?: string | null, milestone?: string | null) => PublishClaim | undefined;
  /** True when someone OTHER than `ownUserId` holds the lock. */
  claimedByOther: (caseId?: string | null, milestone?: string | null, ownUserId?: string | null) => boolean;
  /** Re-poll immediately, e.g. right after taking or releasing a claim. */
  refresh: () => void;
}

export function usePublishClaims(ownUserId?: string | null): UsePublishClaims {
  const [claims, setClaims] = useState<Map<string, PublishClaim>>(new Map());
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const list = await blockchainApi.getPublishClaims();
      if (!mountedRef.current) return;
      setClaims(
        new Map(list.map((c) => [`${c.caseId}#${milestoneClaimKey(c.milestone)}`, c]))
      );
    } catch {
      // A failed poll must not break the page; the next tick retries.
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const interval = setInterval(load, CLAIMS_POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [load]);

  const claimFor = useCallback(
    (caseId?: string | null, milestone?: string | null) =>
      caseId ? claims.get(`${caseId}#${milestoneClaimKey(milestone)}`) : undefined,
    [claims]
  );

  const claimedByOther = useCallback(
    (caseId?: string | null, milestone?: string | null, userId?: string | null) => {
      const claim = claimFor(caseId, milestone);
      if (!claim) return false;
      return Boolean(userId) && claim.adminId !== userId;
    },
    [claimFor]
  );

  return { claims, claimFor, claimedByOther, refresh: load };
}
