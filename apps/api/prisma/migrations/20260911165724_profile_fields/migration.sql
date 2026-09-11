-- CreateEnum
CREATE TYPE "CourtSide" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "PlayerLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "Hand" AS ENUM ('RIGHT', 'LEFT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dominantHand" "Hand",
ADD COLUMN     "homeClubId" TEXT,
ADD COLUMN     "level" "PlayerLevel",
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "preferredSide" "CourtSide";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;
