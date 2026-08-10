-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('CASE_REGISTERED', 'VALUER_ASSIGNED', 'VALUATION_IN_PROGRESS', 'PENDING_VALUATION_APPROVAL', 'VALUATION_APPROVED', 'VALUATION_REJECTED', 'PENDING_COMPENSATION_APPROVAL', 'COMPENSATION_APPROVED', 'COMPENSATION_REJECTED', 'OFFER_ISSUED', 'OFFER_REJECTED', 'PAYMENT_IN_PROGRESS', 'PAYMENT_COMPLETED', 'CASE_CLOSED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('EXPIRED', 'PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ObjectionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('ACCEPTED', 'REJECTED', 'REVISED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'GOVERNMENT_OFFICER', 'LAND_VALUER', 'LAND_OWNER', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "AreaUnit" AS ENUM ('SQUARE_METER', 'ACRE', 'HECTARE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'SUCCESSFUL', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ReceiverBankDetails" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "myKadNumber" TEXT NOT NULL,
    "encryptedBankDetails" TEXT NOT NULL,
    "paymentCaseId" TEXT NOT NULL,

    CONSTRAINT "ReceiverBankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "project_id" UUID NOT NULL,
    "project_name" VARCHAR(255) NOT NULL,
    "project_type" VARCHAR(100) NOT NULL,
    "purpose" TEXT NOT NULL,
    "budget" DECIMAL(20,2) NOT NULL,
    "funding_source" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "acquisition_case" (
    "case_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "case_title" VARCHAR(255) NOT NULL,
    "status" "CaseStatus" NOT NULL,
    "registration_date" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "acquisition_case_pkey" PRIMARY KEY ("case_id")
);

-- CreateTable
CREATE TABLE "land_parcel" (
    "land_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "land_title_no" VARCHAR(255) NOT NULL,
    "lot_no" VARCHAR(100) NOT NULL,
    "mukim" VARCHAR(255) NOT NULL,
    "district" VARCHAR(255) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "area" DECIMAL(12,2) NOT NULL,
    "area_unit" "AreaUnit" NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "land_parcel_pkey" PRIMARY KEY ("land_id")
);

-- CreateTable
CREATE TABLE "land_owner" (
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "nric" VARCHAR(100) NOT NULL,
    "address" TEXT NOT NULL,
    "contact" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "land_owner_pkey" PRIMARY KEY ("owner_id")
);

-- CreateTable
CREATE TABLE "land_ownership" (
    "ownership_id" UUID NOT NULL,
    "land_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "ownership_type" VARCHAR(100) NOT NULL,
    "ownership_start" TIMESTAMP(3),
    "ownership_end" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "land_ownership_pkey" PRIMARY KEY ("ownership_id")
);

-- CreateTable
CREATE TABLE "case_document" (
    "document_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "checksum" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "case_document_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "valuation_report" (
    "report_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "valuer_id" UUID NOT NULL,
    "valuation_date" TIMESTAMP(3),
    "valuation_method" VARCHAR(100),
    "market_value" DECIMAL(20,2),
    "recommended_compensation" DECIMAL(20,2),
    "remarks" TEXT,
    "report_status" "ReportStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "valuation_report_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "case_assignment" (
    "assignment_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "assigned_to_id" UUID NOT NULL,
    "assignment_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "valuation_report_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "case_assignment_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "compensation_report" (
    "compensation_report_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "valuation_report_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "total_compensation" DECIMAL(20,2),
    "remarks" TEXT,
    "status" "ReportStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "compensation_report_pkey" PRIMARY KEY ("compensation_report_id")
);

-- CreateTable
CREATE TABLE "offer_letter" (
    "offer_id" UUID NOT NULL,
    "compensation_report_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "ownership_id" UUID NOT NULL,
    "offer_reference_no" VARCHAR(255) NOT NULL,
    "offer_type" VARCHAR(100) NOT NULL,
    "offer_amount" DECIMAL(20,2) NOT NULL,
    "offer_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "acceptance_period_days" INTEGER NOT NULL,
    "status" "OfferStatus" NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "signed_document" TEXT,
    "blockchain_hash" VARCHAR(255),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "offer_letter_pkey" PRIMARY KEY ("offer_id")
);

-- CreateTable
CREATE TABLE "objection" (
    "objection_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "objection_reason" TEXT NOT NULL,
    "requested_amount" DECIMAL(20,2) NOT NULL,
    "status" "ObjectionStatus" NOT NULL,
    "reviewed_by_id" UUID,
    "review_date" TIMESTAMP(3),
    "review_remarks" TEXT,
    "decision" "Decision",
    "revised_compensation" DECIMAL(20,2),
    "resolution_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "objection_pkey" PRIMARY KEY ("objection_id")
);

-- CreateTable
CREATE TABLE "objection_document" (
    "document_id" UUID NOT NULL,
    "objection_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "checksum" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "objection_document_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "User" (
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiverBankDetails_paymentCaseId_key" ON "ReceiverBankDetails"("paymentCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "project_project_name_key" ON "project"("project_name");

-- CreateIndex
CREATE INDEX "acquisition_case_project_id_idx" ON "acquisition_case"("project_id");

-- CreateIndex
CREATE INDEX "acquisition_case_status_idx" ON "acquisition_case"("status");

-- CreateIndex
CREATE UNIQUE INDEX "land_parcel_case_id_key" ON "land_parcel"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "land_parcel_land_title_no_key" ON "land_parcel"("land_title_no");

-- CreateIndex
CREATE INDEX "land_parcel_case_id_idx" ON "land_parcel"("case_id");

-- CreateIndex
CREATE INDEX "land_parcel_district_idx" ON "land_parcel"("district");

-- CreateIndex
CREATE INDEX "land_parcel_state_idx" ON "land_parcel"("state");

-- CreateIndex
CREATE INDEX "land_ownership_land_id_idx" ON "land_ownership"("land_id");

-- CreateIndex
CREATE INDEX "land_ownership_owner_id_idx" ON "land_ownership"("owner_id");

-- CreateIndex
CREATE INDEX "case_document_case_id_idx" ON "case_document"("case_id");

-- CreateIndex
CREATE INDEX "valuation_report_case_id_idx" ON "valuation_report"("case_id");

-- CreateIndex
CREATE INDEX "valuation_report_valuer_id_idx" ON "valuation_report"("valuer_id");

-- CreateIndex
CREATE INDEX "valuation_report_report_status_idx" ON "valuation_report"("report_status");

-- CreateIndex
CREATE UNIQUE INDEX "case_assignment_valuation_report_id_key" ON "case_assignment"("valuation_report_id");

-- CreateIndex
CREATE INDEX "compensation_report_case_id_idx" ON "compensation_report"("case_id");

-- CreateIndex
CREATE INDEX "compensation_report_status_idx" ON "compensation_report"("status");

-- CreateIndex
CREATE UNIQUE INDEX "offer_letter_offer_reference_no_key" ON "offer_letter"("offer_reference_no");

-- CreateIndex
CREATE INDEX "offer_letter_case_id_idx" ON "offer_letter"("case_id");

-- CreateIndex
CREATE INDEX "offer_letter_ownership_id_idx" ON "offer_letter"("ownership_id");

-- CreateIndex
CREATE INDEX "offer_letter_status_idx" ON "offer_letter"("status");

-- CreateIndex
CREATE INDEX "objection_case_id_idx" ON "objection"("case_id");

-- CreateIndex
CREATE INDEX "objection_status_idx" ON "objection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "ReceiverBankDetails" ADD CONSTRAINT "ReceiverBankDetails_paymentCaseId_fkey" FOREIGN KEY ("paymentCaseId") REFERENCES "PaymentCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquisition_case" ADD CONSTRAINT "acquisition_case_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquisition_case" ADD CONSTRAINT "acquisition_case_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_parcel" ADD CONSTRAINT "land_parcel_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_parcel" ADD CONSTRAINT "land_parcel_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_owner" ADD CONSTRAINT "land_owner_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_ownership" ADD CONSTRAINT "land_ownership_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "land_parcel"("land_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_ownership" ADD CONSTRAINT "land_ownership_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "land_owner"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_ownership" ADD CONSTRAINT "land_ownership_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_report" ADD CONSTRAINT "valuation_report_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_report" ADD CONSTRAINT "valuation_report_valuer_id_fkey" FOREIGN KEY ("valuer_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_report" ADD CONSTRAINT "valuation_report_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_valuation_report_id_fkey" FOREIGN KEY ("valuation_report_id") REFERENCES "valuation_report"("report_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_valuation_report_id_fkey" FOREIGN KEY ("valuation_report_id") REFERENCES "valuation_report"("report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_compensation_report_id_fkey" FOREIGN KEY ("compensation_report_id") REFERENCES "compensation_report"("compensation_report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_ownership_id_fkey" FOREIGN KEY ("ownership_id") REFERENCES "land_ownership"("ownership_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer_letter"("offer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection_document" ADD CONSTRAINT "objection_document_objection_id_fkey" FOREIGN KEY ("objection_id") REFERENCES "objection"("objection_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection_document" ADD CONSTRAINT "objection_document_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
