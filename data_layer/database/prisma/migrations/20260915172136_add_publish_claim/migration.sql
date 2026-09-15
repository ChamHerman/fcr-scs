-- CreateTable
CREATE TABLE "publish_claim" (
    "case_id" VARCHAR(255) NOT NULL,
    "milestone" TEXT NOT NULL,
    "admin_id" UUID NOT NULL,
    "adminName" TEXT NOT NULL,
    "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_claim_pkey" PRIMARY KEY ("case_id","milestone")
);
