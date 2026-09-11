-- CreateEnum
CREATE TYPE "FrmtCategory" AS ENUM ('MEN', 'WOMEN');

-- CreateEnum
CREATE TYPE "FrmtLinkStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateTable
CREATE TABLE "FrmtRankingEntry" (
    "id" TEXT NOT NULL,
    "category" "FrmtCategory" NOT NULL,
    "rank" INTEGER NOT NULL,
    "evolution" INTEGER,
    "fullName" TEXT NOT NULL,
    "birthYear" INTEGER,
    "club" TEXT,
    "nationality" TEXT,
    "points" DOUBLE PRECISION NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrmtRankingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrmtLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "FrmtCategory" NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthYear" INTEGER,
    "status" "FrmtLinkStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrmtLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrmtImport" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "menCount" INTEGER NOT NULL DEFAULT 0,
    "womenCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "FrmtImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FrmtRankingEntry_category_rank_idx" ON "FrmtRankingEntry"("category", "rank");

-- CreateIndex
CREATE INDEX "FrmtRankingEntry_fullName_idx" ON "FrmtRankingEntry"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "FrmtLink_userId_key" ON "FrmtLink"("userId");

-- CreateIndex
CREATE INDEX "FrmtLink_status_idx" ON "FrmtLink"("status");

-- AddForeignKey
ALTER TABLE "FrmtLink" ADD CONSTRAINT "FrmtLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
