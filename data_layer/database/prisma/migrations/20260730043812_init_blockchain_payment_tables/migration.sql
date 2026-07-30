-- CreateTable
CREATE TABLE "BlockchainRecord" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "transactionHash" TEXT,
    "documentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Published',
    "voidReason" TEXT,
    "voidTransactionHash" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockchainRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCase" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountHolderName" TEXT,
    "phoneNumber" TEXT,
    "encryptedBankDetails" TEXT,
    "myKadNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Approved',
    "requiredSignatures" INTEGER NOT NULL DEFAULT 1,
    "currentSignatures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAuthorisation" (
    "id" TEXT NOT NULL,
    "paymentCaseId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAuthorisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "paymentCaseId" TEXT NOT NULL,
    "bankReferenceNumber" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedTransaction" (
    "id" TEXT NOT NULL,
    "paymentCaseId" TEXT NOT NULL,
    "errorLog" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainRecord_caseId_key" ON "BlockchainRecord"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCase_caseId_key" ON "PaymentCase"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_paymentCaseId_key" ON "PaymentReceipt"("paymentCaseId");

-- AddForeignKey
ALTER TABLE "PaymentAuthorisation" ADD CONSTRAINT "PaymentAuthorisation_paymentCaseId_fkey" FOREIGN KEY ("paymentCaseId") REFERENCES "PaymentCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_paymentCaseId_fkey" FOREIGN KEY ("paymentCaseId") REFERENCES "PaymentCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailedTransaction" ADD CONSTRAINT "FailedTransaction_paymentCaseId_fkey" FOREIGN KEY ("paymentCaseId") REFERENCES "PaymentCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
