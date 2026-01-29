-- CreateEnum
CREATE TYPE "JourneyPhaseType" AS ENUM ('SALES_HANDOVER', 'KICKOFF', 'DESIGN_WEEK', 'ONBOARDING', 'UAT', 'GO_LIVE', 'HYPERCARE', 'HANDOVER_TO_SUPPORT');

-- CreateEnum
CREATE TYPE "JourneyPhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETE', 'SKIPPED');

-- AlterTable
ALTER TABLE "digital_employees" ADD COLUMN     "currentJourneyPhase" "JourneyPhaseType" NOT NULL DEFAULT 'SALES_HANDOVER';

-- CreateTable
CREATE TABLE "journey_phases" (
    "id" TEXT NOT NULL,
    "digitalEmployeeId" TEXT NOT NULL,
    "phaseType" "JourneyPhaseType" NOT NULL,
    "status" "JourneyPhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "order" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "notes" TEXT,
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journey_checklist_items" (
    "id" TEXT NOT NULL,
    "journeyPhaseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journey_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "journey_phases_digitalEmployeeId_phaseType_key" ON "journey_phases"("digitalEmployeeId", "phaseType");

-- AddForeignKey
ALTER TABLE "journey_phases" ADD CONSTRAINT "journey_phases_digitalEmployeeId_fkey" FOREIGN KEY ("digitalEmployeeId") REFERENCES "digital_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_checklist_items" ADD CONSTRAINT "journey_checklist_items_journeyPhaseId_fkey" FOREIGN KEY ("journeyPhaseId") REFERENCES "journey_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
