-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('CASE_REGISTERED', 'VALUER_ASSIGNED', 'VALUATION_IN_PROGRESS', 'PENDING_VALUATION_APPROVAL', 'VALUATION_APPROVED', 'VALUATION_REJECTED', 'PENDING_COMPENSATION_APPROVAL', 'COMPENSATION_APPROVED', 'COMPENSATION_REJECTED', 'OFFER_ISSUED', 'OFFER_REJECTED', 'OFFER_ACCEPTED', 'PAYMENT_IN_PROGRESS', 'PAYMENT_COMPLETED', 'CASE_CLOSED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('EXPIRED', 'PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ObjectionStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('ACCEPTED', 'REJECTED', 'REVISED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SYSTEM_ADMINISTRATOR', 'GOVERNMENT_ADMINISTRATOR', 'GOVERNMENT_OFFICER', 'LAND_VALUER', 'DISPLACED_COMMUNITY_MEMBER');

-- CreateEnum
CREATE TYPE "AreaUnit" AS ENUM ('SQUARE_METER', 'ACRE', 'HECTARE');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('IN_APP', 'EMAIL', 'DASHBOARD');

-- CreateEnum
CREATE TYPE "AlertUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('PENDING', 'APPROACHING', 'EXCEEDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('COMPLIANCE', 'BACKUP');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('BANK_DETAILS_PENDING', 'READY_TO_INITIATE', 'PENDING_APPROVAL', 'BANK_APPROVAL_PENDING', 'TRANSFER_SUCCEED', 'TRANSFER_REJECTED', 'TRANSFER_FAILED', 'DISPUTED', 'PAID', 'CANCELLED', 'SCHEDULED', 'NEW_BANK_DETAILS_PENDING', 'AWARD_NOTARIZATION_PENDING', 'BANK_DETAILS_AND_M1_PENDING');

-- CreateEnum
CREATE TYPE "BlockchainStatus" AS ENUM ('READY_TO_PUBLISH', 'PUBLISHED', 'VOID_PENDING', 'VOIDED', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "FundingSource" AS ENUM ('GOVERNMENT', 'PRIVATE', 'OTHERS');

-- CreateEnum
CREATE TYPE "LandCategory" AS ENUM ('AGRICULTURE', 'BUILDING', 'INDUSTRY');

-- CreateEnum
CREATE TYPE "TenureType" AS ENUM ('FREEHOLD', 'LEASEHOLD', 'MALAY_RESERVE');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('INDIVIDUAL_CITIZEN', 'JOINT_OWNERSHIP', 'CORPORATE_ENTITY', 'ESTATE_OF_DECEASED', 'TRUSTEE');

-- CreateTable
CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "page_path" TEXT NOT NULL,
    "can_access" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_record" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "milestone" TEXT NOT NULL DEFAULT 'AWARD',
    "onChainKey" TEXT,
    "transactionHash" TEXT,
    "documentHash" TEXT NOT NULL,
    "status" "BlockchainStatus" NOT NULL DEFAULT 'PUBLISHED',
    "voidReason" TEXT,
    "voidTransactionHash" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "blockchain_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_case" (
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
    "status" "PaymentStatus" NOT NULL DEFAULT 'BANK_DETAILS_PENDING',
    "requiredSignatures" INTEGER NOT NULL DEFAULT 1,
    "currentSignatures" INTEGER NOT NULL DEFAULT 0,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "dispute_document_path" TEXT,
    "dispute_document_name" TEXT,
    "dispute_uploaded_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payment_case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_authorisation" (
    "id" TEXT NOT NULL,
    "paymentCaseId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payment_authorisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_receipt" (
    "id" TEXT NOT NULL,
    "paymentCaseId" TEXT NOT NULL,
    "bankReferenceNumber" TEXT NOT NULL,
    "documentHash" TEXT,
    "documentPath" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payment_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_transaction" (
    "id" TEXT NOT NULL,
    "paymentCaseId" TEXT NOT NULL,
    "errorLog" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "failed_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receiver_bank_details" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "myKadNumber" TEXT NOT NULL,
    "encryptedBankDetails" TEXT NOT NULL,
    "paymentCaseId" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "receiver_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_payout_detail" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "myKadNumber" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_payout_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "project_id" UUID NOT NULL,
    "project_name" VARCHAR(255) NOT NULL,
    "project_type" VARCHAR(100) NOT NULL,
    "purpose" TEXT NOT NULL,
    "budget" DECIMAL(20,2) NOT NULL,
    "funding_source" "FundingSource" NOT NULL DEFAULT 'GOVERNMENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "acquisition_case" (
    "case_id" VARCHAR(255) NOT NULL,
    "project_id" UUID NOT NULL,
    "case_title" VARCHAR(255) NOT NULL,
    "status" "CaseStatus" NOT NULL,
    "registration_date" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "acquisition_case_pkey" PRIMARY KEY ("case_id")
);

-- CreateTable
CREATE TABLE "land_parcel" (
    "land_id" UUID NOT NULL,
    "case_id" VARCHAR(255) NOT NULL,
    "land_title_no" VARCHAR(255) NOT NULL,
    "lot_no" VARCHAR(100) NOT NULL,
    "tempat" VARCHAR(255),
    "mukim" VARCHAR(255) NOT NULL,
    "district" VARCHAR(255) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "area" DECIMAL(12,2) NOT NULL,
    "area_unit" "AreaUnit" NOT NULL,
    "category" "LandCategory" NOT NULL DEFAULT 'AGRICULTURE',
    "tenure_type" "TenureType" NOT NULL DEFAULT 'FREEHOLD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
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
    "email" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "land_owner_pkey" PRIMARY KEY ("owner_id")
);

-- CreateTable
CREATE TABLE "land_ownership" (
    "ownership_id" UUID NOT NULL,
    "land_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "ownership_type" "OwnershipType" NOT NULL DEFAULT 'INDIVIDUAL_CITIZEN',
    "share" VARCHAR(50),
    "ownership_start" TIMESTAMP(3),
    "ownership_end" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "land_ownership_pkey" PRIMARY KEY ("ownership_id")
);

-- CreateTable
CREATE TABLE "case_document" (
    "document_id" UUID NOT NULL,
    "case_id" VARCHAR(255) NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "checksum" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "case_document_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "valuation_report" (
    "report_id" UUID NOT NULL,
    "case_id" VARCHAR(255) NOT NULL,
    "valuer_id" UUID NOT NULL,
    "valuation_date" TIMESTAMP(3),
    "valuation_method" VARCHAR(100),
    "location_type" VARCHAR(100),
    "building_age" INTEGER,
    "land_area" DECIMAL(12,2),
    "acquisition_area" DECIMAL(12,2),
    "built_up_area" DECIMAL(12,2),
    "market_rate_per_sqm" DECIMAL(20,2),
    "compensation_rate_per_sqm" DECIMAL(20,2),
    "ai_valuation_price" DECIMAL(20,2),
    "market_value" DECIMAL(20,2),
    "recommended_compensation" DECIMAL(20,2),
    "remarks" TEXT,
    "report_status" "ReportStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "valuation_report_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "case_assignment" (
    "assignment_id" UUID NOT NULL,
    "case_id" VARCHAR(255) NOT NULL,
    "assigned_to_id" UUID NOT NULL,
    "assignment_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "valuation_report_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "case_assignment_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "compensation_report" (
    "compensation_report_id" UUID NOT NULL,
    "case_id" VARCHAR(255) NOT NULL,
    "valuation_report_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "land_value" DECIMAL(20,2),
    "building_value" DECIMAL(20,2),
    "crop_value" DECIMAL(20,2),
    "business_disruption" DECIMAL(20,2),
    "disturbance_compensation" DECIMAL(20,2),
    "relocation_allowance" DECIMAL(20,2),
    "other_eligible" DECIMAL(20,2),
    "total_compensation" DECIMAL(20,2),
    "remarks" TEXT,
    "status" "ReportStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "compensation_report_pkey" PRIMARY KEY ("compensation_report_id")
);

-- CreateTable
CREATE TABLE "offer_letter" (
    "offer_id" UUID NOT NULL,
    "compensation_report_id" UUID NOT NULL,
    "case_id" VARCHAR(255) NOT NULL,
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
    "deleted_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "offer_letter_pkey" PRIMARY KEY ("offer_id")
);

-- CreateTable
CREATE TABLE "offer_member_response" (
    "response_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "status" "OfferStatus" NOT NULL,
    "remarks" TEXT,
    "signed_document" TEXT,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_member_response_pkey" PRIMARY KEY ("response_id")
);

-- CreateTable
CREATE TABLE "objection" (
    "objection_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "case_id" VARCHAR(255) NOT NULL,
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
    "deleted_at" TIMESTAMP(3),
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
    "deleted_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "objection_document_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "user" (
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "contact_number" VARCHAR(100) NOT NULL,
    "identification_number" VARCHAR(100) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "profile_picture_url" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_session" (
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_token" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "device_info" TEXT,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "password_reset" (
    "reset_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reset_token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_pkey" PRIMARY KEY ("reset_id")
);

-- CreateTable
CREATE TABLE "account_activation" (
    "activation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_activation_pkey" PRIMARY KEY ("activation_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "log_id" UUID NOT NULL,
    "user_id" UUID,
    "user_role" VARCHAR(100),
    "activity_type" VARCHAR(100) NOT NULL,
    "module_name" VARCHAR(100) NOT NULL,
    "case_reference" VARCHAR(255),
    "ip_address" VARCHAR(45) NOT NULL,
    "device_info" TEXT,
    "activity_details" TEXT,
    "system_response" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "system_alert" (
    "alert_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "alert_type" VARCHAR(100) NOT NULL,
    "channel" "AlertChannel" NOT NULL,
    "urgency_level" "AlertUrgency" NOT NULL DEFAULT 'MEDIUM',
    "case_reference" VARCHAR(255),
    "message" TEXT NOT NULL,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_alert_pkey" PRIMARY KEY ("alert_id")
);

-- CreateTable
CREATE TABLE "process_deadline" (
    "deadline_id" UUID NOT NULL,
    "case_reference" VARCHAR(255) NOT NULL,
    "process_type" VARCHAR(100) NOT NULL,
    "issuance_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_deadline_pkey" PRIMARY KEY ("deadline_id")
);

-- CreateTable
CREATE TABLE "email_template" (
    "template_id" UUID NOT NULL,
    "template_name" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "body_content" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_template_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "system_metric" (
    "metric_id" UUID NOT NULL,
    "uptime_seconds" BIGINT NOT NULL,
    "average_response_time" DECIMAL(10,2) NOT NULL,
    "peak_usage_period" VARCHAR(100),
    "transaction_volume" INTEGER NOT NULL,
    "error_rate" DECIMAL(5,2) NOT NULL,
    "resource_utilisation" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metric_pkey" PRIMARY KEY ("metric_id")
);

-- CreateTable
CREATE TABLE "compliance_backup_log" (
    "log_id" UUID NOT NULL,
    "log_type" "LogType" NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "details" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_backup_log_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_role_page_path_key" ON "role_permission"("role", "page_path");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_record_onChainKey_key" ON "blockchain_record"("onChainKey");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_record_caseId_milestone_key" ON "blockchain_record"("caseId", "milestone");

-- CreateIndex
CREATE UNIQUE INDEX "payment_case_caseId_key" ON "payment_case"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receipt_paymentCaseId_key" ON "payment_receipt"("paymentCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "receiver_bank_details_paymentCaseId_key" ON "receiver_bank_details"("paymentCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "member_payout_detail_user_id_key" ON "member_payout_detail"("user_id");

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
CREATE UNIQUE INDEX "offer_member_response_offer_id_owner_id_key" ON "offer_member_response"("offer_id", "owner_id");

-- CreateIndex
CREATE INDEX "objection_case_id_idx" ON "objection"("case_id");

-- CreateIndex
CREATE INDEX "objection_status_idx" ON "objection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_contact_number_role_key" ON "user"("contact_number", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_identification_number_role_key" ON "user"("identification_number", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_session_session_token_key" ON "user_session"("session_token");

-- CreateIndex
CREATE INDEX "user_session_user_id_idx" ON "user_session"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_reset_token_key" ON "password_reset"("reset_token");

-- CreateIndex
CREATE INDEX "password_reset_user_id_idx" ON "password_reset"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_activation_token_key" ON "account_activation"("token");

-- CreateIndex
CREATE INDEX "account_activation_user_id_idx" ON "account_activation"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_activity_type_idx" ON "audit_log"("activity_type");

-- CreateIndex
CREATE INDEX "audit_log_module_name_idx" ON "audit_log"("module_name");

-- CreateIndex
CREATE INDEX "audit_log_case_reference_idx" ON "audit_log"("case_reference");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "system_alert_recipient_id_idx" ON "system_alert"("recipient_id");

-- CreateIndex
CREATE INDEX "system_alert_is_acknowledged_idx" ON "system_alert"("is_acknowledged");

-- CreateIndex
CREATE INDEX "process_deadline_case_reference_idx" ON "process_deadline"("case_reference");

-- CreateIndex
CREATE INDEX "process_deadline_status_idx" ON "process_deadline"("status");

-- CreateIndex
CREATE UNIQUE INDEX "email_template_template_name_key" ON "email_template"("template_name");

-- CreateIndex
CREATE INDEX "system_metric_recorded_at_idx" ON "system_metric"("recorded_at");

-- CreateIndex
CREATE INDEX "compliance_backup_log_log_type_idx" ON "compliance_backup_log"("log_type");

-- AddForeignKey
ALTER TABLE "payment_authorisation" ADD CONSTRAINT "payment_authorisation_paymentCaseId_fkey" FOREIGN KEY ("paymentCaseId") REFERENCES "payment_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_receipt" ADD CONSTRAINT "payment_receipt_paymentCaseId_fkey" FOREIGN KEY ("paymentCaseId") REFERENCES "payment_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_transaction" ADD CONSTRAINT "failed_transaction_paymentCaseId_fkey" FOREIGN KEY ("paymentCaseId") REFERENCES "payment_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiver_bank_details" ADD CONSTRAINT "receiver_bank_details_paymentCaseId_fkey" FOREIGN KEY ("paymentCaseId") REFERENCES "payment_case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payout_detail" ADD CONSTRAINT "member_payout_detail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquisition_case" ADD CONSTRAINT "acquisition_case_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquisition_case" ADD CONSTRAINT "acquisition_case_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_parcel" ADD CONSTRAINT "land_parcel_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_parcel" ADD CONSTRAINT "land_parcel_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_owner" ADD CONSTRAINT "land_owner_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_ownership" ADD CONSTRAINT "land_ownership_land_id_fkey" FOREIGN KEY ("land_id") REFERENCES "land_parcel"("land_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_ownership" ADD CONSTRAINT "land_ownership_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "land_owner"("owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_ownership" ADD CONSTRAINT "land_ownership_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_report" ADD CONSTRAINT "valuation_report_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_report" ADD CONSTRAINT "valuation_report_valuer_id_fkey" FOREIGN KEY ("valuer_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_report" ADD CONSTRAINT "valuation_report_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_valuation_report_id_fkey" FOREIGN KEY ("valuation_report_id") REFERENCES "valuation_report"("report_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_valuation_report_id_fkey" FOREIGN KEY ("valuation_report_id") REFERENCES "valuation_report"("report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_compensation_report_id_fkey" FOREIGN KEY ("compensation_report_id") REFERENCES "compensation_report"("compensation_report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_ownership_id_fkey" FOREIGN KEY ("ownership_id") REFERENCES "land_ownership"("ownership_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_member_response" ADD CONSTRAINT "offer_member_response_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer_letter"("offer_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_member_response" ADD CONSTRAINT "offer_member_response_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "land_owner"("owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer_letter"("offer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection_document" ADD CONSTRAINT "objection_document_objection_id_fkey" FOREIGN KEY ("objection_id") REFERENCES "objection"("objection_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection_document" ADD CONSTRAINT "objection_document_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset" ADD CONSTRAINT "password_reset_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_activation" ADD CONSTRAINT "account_activation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_alert" ADD CONSTRAINT "system_alert_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

