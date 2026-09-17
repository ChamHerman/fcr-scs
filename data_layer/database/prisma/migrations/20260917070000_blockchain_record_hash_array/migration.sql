-- FCRSCSLedger anchors every owner's document hashes for a case in ONE record
-- via publishRecord(string, bytes32[]). The database previously stored only a
-- single documentHash, so the extra on-chain hashes were unreadable from the app.

-- AlterTable
ALTER TABLE "blockchain_record" ADD COLUMN "document_hashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill: seed the array from the single existing hash so every current record
-- keeps verifying and the array is a faithful mirror of what is on chain.
UPDATE "blockchain_record"
SET "document_hashes" = ARRAY["document_hash"]
WHERE "document_hash" IS NOT NULL
  AND (cardinality("document_hashes") IS NULL OR cardinality("document_hashes") = 0);
