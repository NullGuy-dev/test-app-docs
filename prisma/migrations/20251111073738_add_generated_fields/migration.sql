-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "longText" TEXT,
ADD COLUMN     "previewImageUrl" TEXT,
ADD COLUMN     "shortText" TEXT,
ADD COLUMN     "userImageFile" TEXT;
