/*
  Warnings:

  - You are about to drop the column `cmsCredentials` on the `Brand` table. All the data in the column will be lost.
  - You are about to drop the column `cmsLanguages` on the `Brand` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "cmsCredentials",
DROP COLUMN "cmsLanguages",
ADD COLUMN     "wordpressCredentials" JSONB,
ADD COLUMN     "wordpressLanguages" TEXT[];
