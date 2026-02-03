-- CreateEnum
CREATE TYPE "PrerequisiteCategory" AS ENUM ('API_CREDENTIALS', 'SYSTEM_ACCESS', 'DOCUMENTATION', 'TEST_DATA', 'SECURITY_APPROVAL', 'LEGAL_APPROVAL', 'INFRASTRUCTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "PrerequisiteOwner" AS ENUM ('CLIENT', 'FREEDAY', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "PrerequisiteStatus" AS ENUM ('PENDING', 'REQUESTED', 'IN_PROGRESS', 'RECEIVED', 'BLOCKED', 'NOT_NEEDED');

-- CreateTable
CREATE TABLE "prerequisites" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "PrerequisiteCategory" NOT NULL,
    "ownerType" "PrerequisiteOwner" NOT NULL,
    "ownerName" TEXT,
    "ownerEmail" TEXT,
    "status" "PrerequisiteStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "blocksPhase" "JourneyPhaseType",
    "integrationId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prerequisites_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "prerequisites" ADD CONSTRAINT "prerequisites_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prerequisites" ADD CONSTRAINT "prerequisites_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
