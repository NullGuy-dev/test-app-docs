/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Brand` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "createdAt",
ADD COLUMN     "tiktokCredentials" JSONB,
ADD COLUMN     "tiktokLanguages" TEXT[],
ALTER COLUMN "telegramLanguages" DROP DEFAULT,
ALTER COLUMN "linkedinLanguages" DROP DEFAULT,
ALTER COLUMN "cmsLanguages" DROP DEFAULT;
