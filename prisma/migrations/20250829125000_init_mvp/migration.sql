-- CreateEnum
CREATE TYPE "public"."UserGlobalRole" AS ENUM ('SUPERADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."PlanType" AS ENUM ('BASIC', 'PRO');

-- CreateEnum
CREATE TYPE "public"."TenantRole" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "public"."ReviewSource" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "public"."ReplyType" AS ENUM ('MANUAL', 'AUTO_AI');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "globalRole" "public"."UserGlobalRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "public"."PlanType" NOT NULL DEFAULT 'BASIC',
    "aiMonthlyLimit" INTEGER,
    "stripeCustomerId" TEXT,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoReplyDelayHours" INTEGER NOT NULL DEFAULT 24,
    "autoReplyMinStars" INTEGER NOT NULL DEFAULT 3,
    "reviewRetentionDays" INTEGER NOT NULL DEFAULT 365,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "public"."TenantRole" NOT NULL DEFAULT 'EDITOR',

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "googlePlaceId" TEXT,
    "googleLbcId" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LocationAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "LocationAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "source" "public"."ReviewSource" NOT NULL DEFAULT 'GOOGLE',
    "externalId" TEXT,
    "authorName" TEXT,
    "rating" INTEGER NOT NULL,
    "language" TEXT,
    "text" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "sourceupdatedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "autoReplyLockedAt" TIMESTAMP(3),
    "autoReplyLastTried" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reply" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "postedByUserId" TEXT,
    "type" "public"."ReplyType" NOT NULL DEFAULT 'MANUAL',
    "text" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "replies" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Membership_tenantId_role_idx" ON "public"."Membership"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "public"."Membership"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "Location_tenantId_idx" ON "public"."Location"("tenantId");

-- CreateIndex
CREATE INDEX "LocationAccess_locationId_idx" ON "public"."LocationAccess"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationAccess_userId_locationId_key" ON "public"."LocationAccess"("userId", "locationId");

-- CreateIndex
CREATE INDEX "Review_tenantId_publishedAt_idx" ON "public"."Review"("tenantId", "publishedAt");

-- CreateIndex
CREATE INDEX "Review_locationId_publishedAt_idx" ON "public"."Review"("locationId", "publishedAt");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "public"."Review"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "review_source_extId_unique" ON "public"."Review"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Reply_reviewId_key" ON "public"."Reply"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_tenantId_yearMonth_key" ON "public"."AiUsage"("tenantId", "yearMonth");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocationAccess" ADD CONSTRAINT "LocationAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocationAccess" ADD CONSTRAINT "LocationAccess_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reply" ADD CONSTRAINT "Reply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "public"."Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reply" ADD CONSTRAINT "Reply_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiUsage" ADD CONSTRAINT "AiUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
