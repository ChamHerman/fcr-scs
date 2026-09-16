-- AlterTable
ALTER TABLE "blockchain_record" ALTER COLUMN "published_at" DROP NOT NULL,
ALTER COLUMN "published_at" DROP DEFAULT;
