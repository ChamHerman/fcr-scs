/**
 * FR-019 client-side document fingerprinting.
 *
 * Computes the binary SHA-256 of a selected file in the member's browser
 * (Web Crypto API) BEFORE upload. The backend recomputes the hash over the
 * received bytes and rejects the request on mismatch, so neither a corrupted
 * download nor an in-transit substitution can ever reach the statutory record.
 */
export async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
}
