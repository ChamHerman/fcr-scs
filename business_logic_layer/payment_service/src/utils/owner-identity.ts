/**
 * Canonical identity comparison for land owners.
 *
 * A member reaches their cases through three signals that were compared ad hoc
 * in a dozen places: the owner row's id, their NRIC (which reaches the system
 * with and without punctuation), and their name. Keeping the normalisation in
 * one place means a member is recognised identically no matter which lookup
 * path — bank-details uniqueness, owned-case discovery, or payout sync — runs.
 */

/** Strips punctuation/case so "990503-22-2123" and "990503222123" compare equal. */
export function normalizeNric(value?: string | null): string {
  return String(value || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export interface OwnerIdentity {
  userId?: string | null;
  name?: string | null;
  identificationNumber?: string | null;
  myKadNumber?: string | null;
}

interface OwnerLike {
  ownerId?: string | null;
  nric?: string | null;
  icNumber?: string | null;
  name?: string | null;
}

/** True when the owner row belongs to the identity behind this request. */
export function isSameOwner(owner: OwnerLike | null | undefined, identity: OwnerIdentity): boolean {
  if (!owner) return false;
  const cleanIc = normalizeNric(identity.identificationNumber || identity.myKadNumber);
  const cleanName = String(identity.name || "").trim().toLowerCase();
  return (
    Boolean(identity.userId) && owner.ownerId === identity.userId ||
    Boolean(cleanIc) && normalizeNric(owner.icNumber || owner.nric) === cleanIc ||
    Boolean(cleanName) && String(owner.name || "").trim().toLowerCase() === cleanName
  );
}

/** True when any owner in the list belongs to this identity. */
export function isOwnedBy(owners: OwnerLike[] | null | undefined, identity: OwnerIdentity): boolean {
  return (owners || []).some((owner) => isSameOwner(owner, identity));
}

/**
 * Parses a LandOwnership share string ("30", "30%", "1/3") to a percent.
 * Falls back to an equal split when the value is missing or unparseable, so a
 * beneficiary row always carries a usable apportionment.
 */
export function parseSharePercent(ownership: { share?: string | null } | null | undefined, fallback = 100): number {
  const raw = String(ownership?.share ?? "").trim();
  if (!raw) return fallback;
  const fraction = raw.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denom = parseFloat(fraction[2]);
    if (denom > 0) return (parseFloat(fraction[1]) / denom) * 100;
  }
  const numeric = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
}

/**
 * The Prisma `OR` clause that selects acquisition cases owned by this identity.
 * Used by case-discovery queries so they agree with `isSameOwner`.
 */
export function ownerMatchOrClause(identity: OwnerIdentity): Record<string, unknown>[] {
  const cleanIc = normalizeNric(identity.identificationNumber);
  const clauses: Record<string, unknown>[] = [];
  if (identity.userId) clauses.push({ ownerId: identity.userId });
  if (identity.name) clauses.push({ name: identity.name });
  if (identity.identificationNumber) clauses.push({ nric: identity.identificationNumber });
  if (cleanIc) clauses.push({ nric: cleanIc });
  return clauses;
}