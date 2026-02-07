-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE');

-- AlterTable Category
ALTER TABLE "Category" ADD COLUMN "slug" TEXT;
ALTER TABLE "Category" ADD COLUMN "nameFr" TEXT;
ALTER TABLE "Category" ADD COLUMN "nameAr" TEXT;
ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Category" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Category"
SET "nameFr" = COALESCE("nameFr", "name"),
    "nameAr" = COALESCE("nameAr", "name"),
    "slug" = COALESCE("slug", 'cat-' || substring(id, 1, 8));

ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "nameFr" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "nameAr" SET NOT NULL;

ALTER TABLE "Category" DROP COLUMN "name";

-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable ProductImage
ALTER TABLE "ProductImage" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ProductImage" ADD COLUMN "keyMain" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "keyThumb" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "urlMain" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN "urlThumb" TEXT;
ALTER TABLE "ProductImage" ALTER COLUMN "url" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_sortOrder_idx" ON "Category"("parentId", "sortOrder");
