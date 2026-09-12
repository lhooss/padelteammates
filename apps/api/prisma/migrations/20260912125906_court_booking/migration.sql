-- DropIndex
DROP INDEX "Match_clubId_date_slot_key";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "courtBookedAt" TIMESTAMP(3),
ADD COLUMN     "courtBookedById" TEXT;
