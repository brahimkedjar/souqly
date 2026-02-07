-- CreateEnum
CREATE TYPE "ListingIntent" AS ENUM ('SELL', 'EXCHANGE');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "conditionScore" INTEGER,
ADD COLUMN     "exchangeCategoryId" TEXT,
ADD COLUMN     "exchangeWanted" TEXT,
ADD COLUMN     "intent" "ListingIntent",
ADD COLUMN     "isUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceOverride" DECIMAL(12,2),
ADD COLUMN     "remark" TEXT;

-- CreateIndex
CREATE INDEX "Listing_isUsed_intent_idx" ON "Listing"("isUsed", "intent");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_exchangeCategoryId_fkey" FOREIGN KEY ("exchangeCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
