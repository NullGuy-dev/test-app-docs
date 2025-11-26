/*
  Warnings:

  - You are about to drop the column `crmCredentials` on the `Brand` table. All the data in the column will be lost.
  - You are about to drop the column `crmLanguages` on the `Brand` table. All the data in the column will be lost.
  - You are about to drop the column `platforms` on the `Post` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "crmCredentials",
DROP COLUMN "crmLanguages",
ADD COLUMN     "cmsCredentials" JSONB,
ADD COLUMN     "cmsLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "platforms",
ADD COLUMN     "language" TEXT,
ADD COLUMN     "platform" TEXT;
