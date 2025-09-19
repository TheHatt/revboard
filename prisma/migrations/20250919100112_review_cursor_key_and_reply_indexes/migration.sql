/*
  Warnings:

  - You are about to drop the column `costMicros` on the `AiUsage` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `AiUsage` table. All the data in the column will be lost.
  - You are about to drop the column `tokensIn` on the `AiUsage` table. All the data in the column will be lost.
  - You are about to drop the column `tokensOut` on the `AiUsage` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `AiUsage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publishedAt,id]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."AiUsage_tenantId_yearMonth_idx";

-- AlterTable
ALTER TABLE "public"."AiUsage" DROP COLUMN "costMicros",
DROP COLUMN "createdAt",
DROP COLUMN "tokensIn",
DROP COLUMN "tokensOut",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."Reply" ALTER COLUMN "postedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Reply_postedAt_idx" ON "public"."Reply"("postedAt");

-- CreateIndex
CREATE INDEX "Reply_postedByUserId_idx" ON "public"."Reply"("postedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_publishedAt_id_key" ON "public"."Review"("publishedAt", "id");
