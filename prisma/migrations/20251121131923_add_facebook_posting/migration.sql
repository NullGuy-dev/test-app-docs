/*
  Warnings:

  - You are about to drop the `instagram_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "facebookCredentials" JSONB,
ADD COLUMN     "facebookLanguages" TEXT[];

-- DropTable
DROP TABLE "instagram_tokens";

-- CreateTable
CREATE TABLE "instagramFacebook_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagramFacebook_tokens_pkey" PRIMARY KEY ("id")
);
