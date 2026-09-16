-- CreateTable
CREATE TABLE "alert_rule" (
    "rule_id" UUID NOT NULL,
    "rule_name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "activity_type" VARCHAR(100) NOT NULL DEFAULT '*',
    "module_name" VARCHAR(100) NOT NULL DEFAULT '*',
    "min_severity" VARCHAR(50) NOT NULL DEFAULT 'INFO',
    "trigger_in_app" BOOLEAN NOT NULL DEFAULT true,
    "trigger_email" BOOLEAN NOT NULL DEFAULT false,
    "urgency_level" "AlertUrgency" NOT NULL DEFAULT 'MEDIUM',
    "email_template_name" VARCHAR(100),
    "target_role" VARCHAR(100),
    "target_user_id" UUID,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rule_pkey" PRIMARY KEY ("rule_id")
);

-- CreateIndex
CREATE INDEX "alert_rule_is_enabled_idx" ON "alert_rule"("is_enabled");

-- CreateIndex
CREATE INDEX "alert_rule_activity_type_idx" ON "alert_rule"("activity_type");

-- AddForeignKey
ALTER TABLE "alert_rule" ADD CONSTRAINT "alert_rule_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rule" ADD CONSTRAINT "alert_rule_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
