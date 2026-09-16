/*
  Warnings:

  - You are about to drop the column `mfa_secret` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "mfa_secret";
