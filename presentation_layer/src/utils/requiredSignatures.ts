/**
 * Dynamic multi-signature threshold (statutory compensation tiers).
 *
 * Canonical frontend mirror of `calculateRequiredSignatures` in
 * `business_logic_layer/payment_service/src/services/payment.service.ts`.
 * Keep the two in lockstep — the backend computes and persists the value at
 * initiation; the UI must show the SAME number BEFORE initiation, because a
 * pre-initiation PaymentCase is created with `requiredSignatures: 0` (see
 * `getAllCases` and `seed.ts`), and rendering `0 || 1` collapses the tier to
 * "1 signature" — the bug this module exists to prevent.
 *
 *   amount < RM 1,000,000                        -> 2 signatures
 *   RM 1,000,000 <= amount < RM 5,000,000        -> 3 signatures
 *   amount >= RM 5,000,000                       -> 3 + floor(amount / 5,000,000)
 *   ... capped at the number of active Government Administrators.
 */
export function calculateRequiredSignatures(amount: number, totalActiveGAs = 5): number {
  let signatures = 2; // base (1 initiator + 1 approver)
  if (amount >= 1_000_000) {
    signatures += 1;
  }
  if (amount >= 5_000_000) {
    signatures += Math.floor(amount / 5_000_000);
  }
  return Math.min(signatures, Math.max(totalActiveGAs, 1));
}

/**
 * The threshold to DISPLAY for a payment case.
 *
 * Prefers the persisted value once the backend has computed it (initiation
 * onwards) and otherwise derives it from the amount using the statutory tiers.
 * Any falsy/zero `setReq` — the pre-initiation state — falls through to the
 * tier formula instead of collapsing to 1.
 */
export function effectiveRequiredSignatures(
  amount: string | number | null | undefined,
  setReq?: number | null,
  totalActiveGAs = 5
): number {
  if (setReq && setReq > 0) return setReq;
  const num = Number(amount);
  if (!num || num <= 0) return 2;
  return calculateRequiredSignatures(num, totalActiveGAs);
}
