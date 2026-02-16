-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'ACHIEVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TrackerStatus" AS ENUM ('ON_TRACK', 'ATTENTION', 'BLOCKED', 'TO_PLAN');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EXTRACTION_COMPLETE', 'EXTRACTION_FAILED', 'HEALTH_CHANGE', 'NEW_AMBIGUOUS_ITEMS', 'PHASE_COMPLETE', 'DESIGN_WEEK_COMPLETE', 'PREREQUISITE_RECEIVED');

-- AlterEnum
ALTER TYPE "ContentClassification" ADD VALUE 'PERSONA_DESIGN_SESSION';
ALTER TYPE "ContentClassification" ADD VALUE 'SALES_HANDOVER_DOCUMENT';

-- AlterEnum
ALTER TYPE "ExtractedItemType" ADD VALUE 'EXAMPLE_DIALOGUE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'ESCALATION_SCRIPT';
ALTER TYPE "ExtractedItemType" ADD VALUE 'PERSONA_TRAIT';
ALTER TYPE "ExtractedItemType" ADD VALUE 'TONE_RULE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'DOS_AND_DONTS';
ALTER TYPE "ExtractedItemType" ADD VALUE 'MONITORING_METRIC';
ALTER TYPE "ExtractedItemType" ADD VALUE 'LAUNCH_CRITERION';
ALTER TYPE "ExtractedItemType" ADD VALUE 'DECISION_TREE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'DEAL_SUMMARY';
ALTER TYPE "ExtractedItemType" ADD VALUE 'CONTRACT_DEADLINE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'SALES_WATCH_OUT';
ALTER TYPE "ExtractedItemType" ADD VALUE 'PROMISED_CAPABILITY';
ALTER TYPE "ExtractedItemType" ADD VALUE 'CLIENT_PREFERENCE';

-- AlterEnum
ALTER TYPE "GeneratedDocType" ADD VALUE 'PERSONA_DESIGN';
ALTER TYPE "GeneratedDocType" ADD VALUE 'MONITORING';
ALTER TYPE "GeneratedDocType" ADD VALUE 'ROLLOUT_PLAN';

-- AlterEnum
ALTER TYPE "PromptType" ADD VALUE 'EXTRACT_PERSONA';
ALTER TYPE "PromptType" ADD VALUE 'GENERATE_PERSONA_DOC';
ALTER TYPE "PromptType" ADD VALUE 'GENERATE_MONITORING';
ALTER TYPE "PromptType" ADD VALUE 'GENERATE_ROLLOUT';
ALTER TYPE "PromptType" ADD VALUE 'GEMINI_EXTRACT_KICKOFF';
ALTER TYPE "PromptType" ADD VALUE 'GEMINI_EXTRACT_PROCESS';
ALTER TYPE "PromptType" ADD VALUE 'GEMINI_EXTRACT_SKILLS_GUARDRAILS';
ALTER TYPE "PromptType" ADD VALUE 'GEMINI_EXTRACT_TECHNICAL';
ALTER TYPE "PromptType" ADD VALUE 'GEMINI_EXTRACT_SIGNOFF';
ALTER TYPE "PromptType" ADD VALUE 'GEMINI_EXTRACT_PERSONA';

-- DropForeignKey
ALTER TABLE "evidence" DROP CONSTRAINT "evidence_escalationRuleId_fkey";

-- DropForeignKey
ALTER TABLE "evidence" DROP CONSTRAINT "evidence_integrationId_fkey";

-- DropForeignKey
ALTER TABLE "evidence" DROP CONSTRAINT "evidence_kpiId_fkey";

-- DropForeignKey
ALTER TABLE "evidence" DROP CONSTRAINT "evidence_scenarioId_fkey";

-- DropForeignKey
ALTER TABLE "evidence" DROP CONSTRAINT "evidence_scopeItemId_fkey";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "journeyStartDate" TIMESTAMP(3),
ADD COLUMN     "journeyTargetDate" TIMESTAMP(3),
ADD COLUMN     "vision" TEXT;

-- AlterTable
ALTER TABLE "design_weeks" ADD COLUMN     "actualDurationDays" INTEGER,
ADD COLUMN     "manualPhaseCompletions" JSONB,
ADD COLUMN     "plannedDurationDays" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "plannedEndDate" TIMESTAMP(3),
ADD COLUMN     "salesHandoverProfile" JSONB,
ADD COLUMN     "varianceNotes" TEXT;

-- AlterTable
ALTER TABLE "digital_employees" ADD COLUMN     "blocker" TEXT,
ADD COLUMN     "endWeek" INTEGER,
ADD COLUMN     "goLiveWeek" INTEGER,
ADD COLUMN     "ownerClient" TEXT,
ADD COLUMN     "ownerFreedayEngineering" TEXT,
ADD COLUMN     "ownerFreedayProject" TEXT,
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "startWeek" INTEGER,
ADD COLUMN     "thisWeekActions" TEXT,
ADD COLUMN     "trackerStatus" "TrackerStatus" NOT NULL DEFAULT 'ON_TRACK';

-- AlterTable
ALTER TABLE "journey_phases" ADD COLUMN     "actualDurationDays" INTEGER,
ADD COLUMN     "plannedDurationDays" INTEGER,
ADD COLUMN     "varianceNotes" TEXT;

-- AlterTable
ALTER TABLE "upload_jobs" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "company_milestones" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'UPCOMING',
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "gatingCriteria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_read_createdAt_idx" ON "notifications"("read", "createdAt");

-- CreateIndex
CREATE INDEX "digital_employees_companyId_idx" ON "digital_employees"("companyId");

-- CreateIndex
CREATE INDEX "digital_employees_status_idx" ON "digital_employees"("status");

-- CreateIndex
CREATE INDEX "edge_cases_scenarioId_idx" ON "edge_cases"("scenarioId");

-- CreateIndex
CREATE INDEX "journey_phases_digitalEmployeeId_idx" ON "journey_phases"("digitalEmployeeId");

-- CreateIndex
CREATE INDEX "materials_sessionId_idx" ON "materials"("sessionId");

-- CreateIndex
CREATE INDEX "prerequisites_designWeekId_idx" ON "prerequisites"("designWeekId");

-- CreateIndex
CREATE INDEX "prompt_templates_isActive_idx" ON "prompt_templates"("isActive");

-- CreateIndex
CREATE INDEX "scenario_steps_scenarioId_idx" ON "scenario_steps"("scenarioId");

-- CreateIndex
CREATE INDEX "sessions_designWeekId_idx" ON "sessions"("designWeekId");

-- CreateIndex
CREATE INDEX "transcript_segments_sessionId_idx" ON "transcript_segments"("sessionId");

-- AddForeignKey
ALTER TABLE "company_milestones" ADD CONSTRAINT "company_milestones_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_scopeItemId_fkey" FOREIGN KEY ("scopeItemId") REFERENCES "scope_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_escalationRuleId_fkey" FOREIGN KEY ("escalationRuleId") REFERENCES "escalation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
