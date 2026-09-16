-- AlterTable
ALTER TABLE "account_activation" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "alert_rule" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "compliance_backup_log" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "email_template" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "password_reset" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "process_deadline" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "role_permission" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "system_alert" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "system_metric" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "custom_id" VARCHAR(50);

-- AlterTable
ALTER TABLE "user_session" ADD COLUMN     "custom_id" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "account_activation_custom_id_key" ON "account_activation"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "alert_rule_custom_id_key" ON "alert_rule"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_log_custom_id_key" ON "audit_log"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_backup_log_custom_id_key" ON "compliance_backup_log"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_template_custom_id_key" ON "email_template"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_custom_id_key" ON "password_reset"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "process_deadline_custom_id_key" ON "process_deadline"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_custom_id_key" ON "role_permission"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_alert_custom_id_key" ON "system_alert"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_metric_custom_id_key" ON "system_metric"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_custom_id_key" ON "user"("custom_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_session_custom_id_key" ON "user_session"("custom_id");
