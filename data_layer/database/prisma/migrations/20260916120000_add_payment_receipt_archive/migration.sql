-- CreateTable
CREATE TABLE "payment_receipt_archive" (
    "id" TEXT NOT NULL,
    "payment_case_id" TEXT NOT NULL,
    "bank_reference_number" TEXT NOT NULL,
    "document_hash" TEXT,
    "document_path" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archive_reason" TEXT,

    CONSTRAINT "payment_receipt_archive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_receipt_archive_payment_case_id_idx" ON "payment_receipt_archive"("payment_case_id");

-- AddForeignKey
ALTER TABLE "payment_receipt_archive" ADD CONSTRAINT "payment_receipt_archive_payment_case_id_fkey" FOREIGN KEY ("payment_case_id") REFERENCES "payment_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;