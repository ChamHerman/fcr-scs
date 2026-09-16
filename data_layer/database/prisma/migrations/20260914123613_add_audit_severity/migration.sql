-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN     "severity" VARCHAR(50) NOT NULL DEFAULT 'INFO';

-- CreateIndex
CREATE INDEX "audit_log_severity_idx" ON "audit_log"("severity");
