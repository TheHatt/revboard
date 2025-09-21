-- CreateIndex
CREATE INDEX "Review_tenantId_locationId_publishedAt_idx" ON "public"."Review"("tenantId", "locationId", "publishedAt");
