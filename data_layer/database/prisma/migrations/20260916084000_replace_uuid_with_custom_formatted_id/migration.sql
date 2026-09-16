-- DropForeignKey
ALTER TABLE "account_activation" DROP CONSTRAINT "account_activation_user_id_fkey";

-- DropForeignKey
ALTER TABLE "acquisition_case" DROP CONSTRAINT "acquisition_case_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "alert_rule" DROP CONSTRAINT "alert_rule_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "alert_rule" DROP CONSTRAINT "alert_rule_target_user_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_user_id_fkey";

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
ALTER TABLE "email_template" DROP CONSTRAINT "email_template_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "land_owner" DROP CONSTRAINT "land_owner_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "land_ownership" DROP CONSTRAINT "land_ownership_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "land_parcel" DROP CONSTRAINT "land_parcel_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "member_payout_detail" DROP CONSTRAINT "member_payout_detail_user_id_fkey";

-- DropForeignKey
ALTER TABLE "objection" DROP CONSTRAINT "objection_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "objection" DROP CONSTRAINT "objection_reviewed_by_id_fkey";

-- DropForeignKey
ALTER TABLE "objection_document" DROP CONSTRAINT "objection_document_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "offer_letter" DROP CONSTRAINT "offer_letter_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "password_reset" DROP CONSTRAINT "password_reset_user_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_authorisation" DROP CONSTRAINT "payment_authorisation_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "system_alert" DROP CONSTRAINT "system_alert_recipient_id_fkey";

-- DropForeignKey
ALTER TABLE "user_session" DROP CONSTRAINT "user_session_user_id_fkey";

-- DropForeignKey
ALTER TABLE "valuation_report" DROP CONSTRAINT "valuation_report_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "valuation_report" DROP CONSTRAINT "valuation_report_valuer_id_fkey";

-- DropIndex
DROP INDEX "account_activation_custom_id_key";

-- DropIndex
DROP INDEX "alert_rule_custom_id_key";

-- DropIndex
DROP INDEX "audit_log_custom_id_key";

-- DropIndex
DROP INDEX "compliance_backup_log_custom_id_key";

-- DropIndex
DROP INDEX "email_template_custom_id_key";

-- DropIndex
DROP INDEX "password_reset_custom_id_key";

-- DropIndex
DROP INDEX "process_deadline_custom_id_key";

-- DropIndex
DROP INDEX "role_permission_custom_id_key";

-- DropIndex
DROP INDEX "system_alert_custom_id_key";

-- DropIndex
DROP INDEX "system_metric_custom_id_key";

-- DropIndex
DROP INDEX "user_custom_id_key";

-- DropIndex
DROP INDEX "user_session_custom_id_key";

-- AlterTable
ALTER TABLE "account_activation" DROP CONSTRAINT "account_activation_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "activation_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "account_activation_pkey" PRIMARY KEY ("activation_id");

-- AlterTable
ALTER TABLE "acquisition_case" ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "alert_rule" DROP CONSTRAINT "alert_rule_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "rule_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "target_user_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "alert_rule_pkey" PRIMARY KEY ("rule_id");

-- AlterTable
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "log_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("log_id");

-- AlterTable
ALTER TABLE "case_assignment" ALTER COLUMN "assigned_to_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "case_document" ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "compensation_report" ALTER COLUMN "reviewed_by_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "approved_by_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "compliance_backup_log" DROP CONSTRAINT "compliance_backup_log_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "log_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "compliance_backup_log_pkey" PRIMARY KEY ("log_id");

-- AlterTable
ALTER TABLE "email_template" DROP CONSTRAINT "email_template_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "template_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "email_template_pkey" PRIMARY KEY ("template_id");

-- AlterTable
ALTER TABLE "land_owner" ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "land_ownership" ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "land_parcel" ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "member_payout_detail" ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "objection" ALTER COLUMN "reviewed_by_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "objection_document" ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "offer_letter" ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "password_reset" DROP CONSTRAINT "password_reset_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "reset_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "password_reset_pkey" PRIMARY KEY ("reset_id");

-- AlterTable
ALTER TABLE "payment_authorisation" ALTER COLUMN "admin_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "process_deadline" DROP CONSTRAINT "process_deadline_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "deadline_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "process_deadline_pkey" PRIMARY KEY ("deadline_id");

-- AlterTable
ALTER TABLE "project" ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "role_permission" DROP CONSTRAINT "role_permission_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "system_alert" DROP CONSTRAINT "system_alert_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "alert_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "recipient_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "system_alert_pkey" PRIMARY KEY ("alert_id");

-- AlterTable
ALTER TABLE "system_metric" DROP CONSTRAINT "system_metric_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "metric_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "system_metric_pkey" PRIMARY KEY ("metric_id");

-- AlterTable
ALTER TABLE "user" DROP CONSTRAINT "user_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "user_pkey" PRIMARY KEY ("user_id");

-- AlterTable
ALTER TABLE "user_session" DROP CONSTRAINT "user_session_pkey",
DROP COLUMN "custom_id",
ALTER COLUMN "session_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "user_id" SET DATA TYPE VARCHAR(50),
ADD CONSTRAINT "user_session_pkey" PRIMARY KEY ("session_id");

-- AlterTable
ALTER TABLE "valuation_report" ALTER COLUMN "valuer_id" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "created_by_id" SET DATA TYPE VARCHAR(50);

-- AddForeignKey
ALTER TABLE "payment_authorisation" ADD CONSTRAINT "payment_authorisation_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_payout_detail" ADD CONSTRAINT "member_payout_detail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "account_activation" ADD CONSTRAINT "account_activation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_alert" ADD CONSTRAINT "system_alert_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rule" ADD CONSTRAINT "alert_rule_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rule" ADD CONSTRAINT "alert_rule_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

