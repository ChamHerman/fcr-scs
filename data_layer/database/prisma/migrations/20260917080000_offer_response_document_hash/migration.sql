-- Milestone 1 anchors one signed Form H per owner. The offer letter stored a
-- single aggregated blockchainHash, so per-owner Form H hashes had nowhere to
-- live and a co-owned case could not be verified document-by-document.

-- AlterTable
ALTER TABLE "offer_member_response" ADD COLUMN "document_hash" TEXT;

-- Backfill: every owner who accepted the offer shares the offer's frozen Form H
-- hash today, so seed them from the parent offer. Per-owner divergence only
-- happens on offers created after this migration.
UPDATE "offer_member_response" r
SET "document_hash" = o."blockchain_hash"
FROM "offer_letter" o
WHERE r."offer_id" = o."offer_id"
  AND r."document_hash" IS NULL
  AND r."status" = 'ACCEPTED'
  AND o."blockchain_hash" IS NOT NULL;
