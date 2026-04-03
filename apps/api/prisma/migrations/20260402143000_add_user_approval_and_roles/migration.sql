-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- Backfill existing users so current accounts keep access
UPDATE "User"
SET "approvalStatus" = 'APPROVED',
    "approvedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP);

-- Bootstrap the oldest existing user as admin
UPDATE "User"
SET "role" = 'ADMIN'
WHERE "id" = (
    SELECT "id"
    FROM "User"
    ORDER BY "createdAt" ASC, "id" ASC
    LIMIT 1
);
