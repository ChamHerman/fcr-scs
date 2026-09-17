-- Per-owner receipts (LHDN: a receipt is strictly 1-to-1 with its recipient).
-- A multi-owner case now issues one PaymentReceipt per PaymentBeneficiary, plus
-- a combined PaymentSettlementSummary that is admin/audit-only.

-- DropIndex: the old one-receipt-per-case guarantee is replaced by a
-- one-receipt-per-beneficiary guarantee below.
DROP INDEX "payment_receipt_payment_case_id_key";

-- AlterTable
ALTER TABLE "payment_receipt" ADD COLUMN     "payment_beneficiary_id" TEXT;

-- Backfill: attach every existing receipt to that case's first beneficiary so
-- the new unique key holds and legacy receipts stay downloadable. Cases with no
-- beneficiary rows (created before multi-owner support) keep a NULL here.
UPDATE "payment_receipt" r
SET "payment_beneficiary_id" = b.id
FROM (
  SELECT DISTINCT ON ("payment_case_id") "payment_case_id", id
  FROM "payment_beneficiary"
  ORDER BY "payment_case_id", "beneficiary_index" ASC
) b
WHERE r."payment_case_id" = b."payment_case_id"
  AND r."payment_beneficiary_id" IS NULL;

-- CreateTable
CREATE TABLE "payment_settlement_summary" (
    "id" TEXT NOT NULL,
    "payment_case_id" TEXT NOT NULL,
    "bank_reference_number" TEXT NOT NULL,
    "document_hash" TEXT,
    "document_path" TEXT,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "beneficiary_count" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_settlement_summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_settlement_summary_payment_case_id_key" ON "payment_settlement_summary"("payment_case_id");

-- CreateIndex
CREATE INDEX "payment_receipt_payment_case_id_idx" ON "payment_receipt"("payment_case_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receipt_payment_case_id_payment_beneficiary_id_key" ON "payment_receipt"("payment_case_id", "payment_beneficiary_id");

-- AddForeignKey
ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_payment_beneficiary_id_fkey" FOREIGN KEY ("payment_beneficiary_id") REFERENCES "payment_beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_settlement_summary" ADD CONSTRAINT "payment_settlement_summary_payment_case_id_fkey" FOREIGN KEY ("payment_case_id") REFERENCES "payment_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
