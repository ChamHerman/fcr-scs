-- CreateTable
CREATE TABLE "payment_beneficiary" (
    "id" TEXT NOT NULL,
    "payment_case_id" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "beneficiary_index" INTEGER NOT NULL,
    "share_percent" DECIMAL(65,30) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "bank_name" TEXT,
    "account_number" TEXT,
    "account_holder_name" TEXT,
    "phone_number" TEXT,
    "my_kad_number" TEXT,
    "encrypted_bank_details" TEXT,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_beneficiary_owner_id_idx" ON "payment_beneficiary"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_beneficiary_payment_case_id_beneficiary_index_key" ON "payment_beneficiary"("payment_case_id", "beneficiary_index");

-- CreateIndex
CREATE UNIQUE INDEX "payment_beneficiary_payment_case_id_owner_id_key" ON "payment_beneficiary"("payment_case_id", "owner_id");

-- AddForeignKey
ALTER TABLE "payment_beneficiary" ADD CONSTRAINT "payment_beneficiary_payment_case_id_fkey" FOREIGN KEY ("payment_case_id") REFERENCES "payment_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_beneficiary" ADD CONSTRAINT "payment_beneficiary_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "land_owner"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;
