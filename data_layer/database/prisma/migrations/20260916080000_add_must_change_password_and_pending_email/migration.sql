-- AlterTable
ALTER TABLE "user" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "pending_email" VARCHAR(255);
ALTER TABLE "user" ADD COLUMN "email_change_token" VARCHAR(255);
ALTER TABLE "user" ADD COLUMN "email_change_expires_at" TIMESTAMP(3);
