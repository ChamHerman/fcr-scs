/*
  Warnings:

  - The values [ADMIN,LAND_OWNER,DEVELOPER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
DROP TYPE IF EXISTS "AlertChannel" CASCADE;
CREATE TYPE "AlertChannel" AS ENUM ('IN_APP', 'EMAIL', 'DASHBOARD');

-- CreateEnum
DROP TYPE IF EXISTS "AlertUrgency" CASCADE;
CREATE TYPE "AlertUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
DROP TYPE IF EXISTS "DeadlineStatus" CASCADE;
CREATE TYPE "DeadlineStatus" AS ENUM ('PENDING', 'APPROACHING', 'EXCEEDED', 'COMPLETED');

-- CreateEnum
DROP TYPE IF EXISTS "LogType" CASCADE;
CREATE TYPE "LogType" AS ENUM ('COMPLIANCE', 'BACKUP');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SYSTEM_ADMINISTRATOR', 'GOVERNMENT_ADMINISTRATOR', 'GOVERNMENT_OFFICER', 'LAND_VALUER', 'DISPLACED_COMMUNITY_MEMBER');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "acquisition_case" DROP CONSTRAINT "acquisition_case_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "case_assignment" DROP CONSTRAINT "case_assignment_assigned_to_id_fkey";

-- DropForeignKey
ALTER TABLE "case_assignment" DROP CONSTRAINT "case_assignment_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "case_document" DROP CONSTRAINT "case_document_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "compensation_report" DROP CONSTRAINT "compensation_report_approved_by_id_fkey";

-- DropForeignKey
ALTER TABLE "compensation_report" DROP CONSTRAINT "compensation_report_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "compensation_report" DROP CONSTRAINT "compensation_report_reviewed_by_id_fkey";

-- DropForeignKey
ALTER TABLE "land_owner" DROP CONSTRAINT "land_owner_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "land_ownership" DROP CONSTRAINT "land_ownership_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "land_parcel" DROP CONSTRAINT "land_parcel_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "objection" DROP CONSTRAINT "objection_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "objection" DROP CONSTRAINT "objection_reviewed_by_id_fkey";

-- DropForeignKey
ALTER TABLE "objection_document" DROP CONSTRAINT "objection_document_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "offer_letter" DROP CONSTRAINT "offer_letter_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "valuation_report" DROP CONSTRAINT "valuation_report_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "valuation_report" DROP CONSTRAINT "valuation_report_valuer_id_fkey";

-- AlterTable
ALTER TABLE "BlockchainRecord" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FailedTransaction" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentAuthorisation" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentCase" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PaymentReceipt" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ReceiverBankDetails" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "acquisition_case" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "case_assignment" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "case_document" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "compensation_report" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "land_owner" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "land_ownership" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "land_parcel" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "objection" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "objection_document" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "offer_letter" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "valuation_report" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- DropTable
DROP TABLE "User";

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
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_contact_number_key" ON "user"("contact_number");

-- CreateIndex
CREATE UNIQUE INDEX "user_identification_number_key" ON "user"("identification_number");

-- CreateIndex
CREATE UNIQUE INDEX "user_session_session_token_key" ON "user_session"("session_token");

-- CreateIndex
CREATE INDEX "user_session_user_id_idx" ON "user_session"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_reset_token_key" ON "password_reset"("reset_token");

-- CreateIndex
CREATE INDEX "password_reset_user_id_idx" ON "password_reset"("user_id");

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
ALTER TABLE "project" ADD CONSTRAINT "project_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acquisition_case" ADD CONSTRAINT "acquisition_case_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_parcel" ADD CONSTRAINT "land_parcel_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_owner" ADD CONSTRAINT "land_owner_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "land_ownership" ADD CONSTRAINT "land_ownership_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_report" ADD CONSTRAINT "valuation_report_valuer_id_fkey" FOREIGN KEY ("valuer_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_report" ADD CONSTRAINT "valuation_report_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection_document" ADD CONSTRAINT "objection_document_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset" ADD CONSTRAINT "password_reset_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_alert" ADD CONSTRAINT "system_alert_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
