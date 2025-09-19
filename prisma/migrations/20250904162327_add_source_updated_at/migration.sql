/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,googlePlaceId]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,googleLbcId]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[source,externalId,locationId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Review" ADD COLUMN     "sourceUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Location_tenantId_googlePlaceId_key" ON "public"."Location"("tenantId", "googlePlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_tenantId_googleLbcId_key" ON "public"."Location"("tenantId", "googleLbcId");

-- CreateIndex
CREATE INDEX "LocationAccess_userId_idx" ON "public"."LocationAccess"("userId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "public"."Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "review_source_extId_loc_unique" ON "public"."Review"("source", "externalId", "locationId");

-- migration.sql (RAW SQL innerhalb dieser Migration)
UPDATE "Review"
SET "sourceUpdatedAt" = "sourceupdatedAt"
WHERE "sourceupdatedAt" IS NOT NULL AND "sourceUpdatedAt" IS NULL;
