-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "Listing"
ADD COLUMN     "status" "ListingStatus" NOT NULL DEFAULT 'PENDING';

-- Backfill existing listings so they remain visible after the moderation rollout.
UPDATE "Listing"
SET "status" = 'ACTIVE'
WHERE "status" = 'PENDING';
