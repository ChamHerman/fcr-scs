/*
  Warnings:

  - The primary key for the `acquisition_case` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "case_assignment" DROP CONSTRAINT "case_assignment_case_id_fkey";

-- DropForeignKey
ALTER TABLE "case_document" DROP CONSTRAINT "case_document_case_id_fkey";

-- DropForeignKey
ALTER TABLE "compensation_report" DROP CONSTRAINT "compensation_report_case_id_fkey";

-- DropForeignKey
ALTER TABLE "land_parcel" DROP CONSTRAINT "land_parcel_case_id_fkey";

-- DropForeignKey
ALTER TABLE "objection" DROP CONSTRAINT "objection_case_id_fkey";

-- DropForeignKey
ALTER TABLE "offer_letter" DROP CONSTRAINT "offer_letter_case_id_fkey";

-- DropForeignKey
ALTER TABLE "valuation_report" DROP CONSTRAINT "valuation_report_case_id_fkey";

-- AlterTable
ALTER TABLE "acquisition_case" DROP CONSTRAINT "acquisition_case_pkey",
ALTER COLUMN "case_id" SET DATA TYPE VARCHAR(255),
ADD CONSTRAINT "acquisition_case_pkey" PRIMARY KEY ("case_id");

-- AlterTable
ALTER TABLE "case_assignment" ALTER COLUMN "case_id" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "case_document" ALTER COLUMN "case_id" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "compensation_report" ALTER COLUMN "case_id" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "land_parcel" ALTER COLUMN "case_id" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "objection" ALTER COLUMN "case_id" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "offer_letter" ALTER COLUMN "case_id" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "valuation_report" ALTER COLUMN "case_id" SET DATA TYPE VARCHAR(255);

-- AddForeignKey
ALTER TABLE "land_parcel" ADD CONSTRAINT "land_parcel_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_document" ADD CONSTRAINT "case_document_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_report" ADD CONSTRAINT "valuation_report_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignment" ADD CONSTRAINT "case_assignment_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_report" ADD CONSTRAINT "compensation_report_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_letter" ADD CONSTRAINT "offer_letter_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection" ADD CONSTRAINT "objection_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "acquisition_case"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;
