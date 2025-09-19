/*
  Warnings:

  - Added the required column `updatedAt` to the `AiUsage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AiUsage" ADD COLUMN     "costMicros" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tokensIn" INTEGER,
ADD COLUMN     "tokensOut" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "AiUsage_tenantId_yearMonth_idx" ON "public"."AiUsage"("tenantId", "yearMonth");
