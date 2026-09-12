-- CreateEnum
CREATE TYPE "MatchVisibility" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "visibility" "MatchVisibility" NOT NULL DEFAULT 'PUBLIC';
