-- CreateEnum
CREATE TYPE "DigitalEmployeeStatus" AS ENUM ('DESIGN', 'ONBOARDING', 'LIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'WEBCHAT', 'VOICE', 'WHATSAPP', 'TEAMS', 'SLACK');

-- CreateEnum
CREATE TYPE "DesignWeekStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_SIGNOFF', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('RECORDING', 'SLIDES', 'DOCUMENT', 'NOTES');

-- CreateEnum
CREATE TYPE "ExtractionType" AS ENUM ('SCOPE', 'SCENARIO', 'KPI', 'INTEGRATION', 'ESCALATION', 'DECISION');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('CONFIRMED', 'AMBIGUOUS', 'NEEDS_DISCUSSION');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('RECORDING', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ScopeClassification" AS ENUM ('IN_SCOPE', 'OUT_OF_SCOPE', 'AMBIGUOUS');

-- CreateEnum
CREATE TYPE "StepActor" AS ENUM ('DIGITAL_EMPLOYEE', 'CUSTOMER', 'SYSTEM', 'HUMAN_AGENT');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('API', 'DATABASE', 'WEBHOOK', 'FILE', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('OAUTH', 'API_KEY', 'BASIC', 'CERTIFICATE');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('IDENTIFIED', 'SPEC_COMPLETE', 'CREDENTIALS_RECEIVED', 'TESTED', 'READY');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('KEYWORD', 'CONFIDENCE', 'SCENARIO', 'POLICY', 'TIME');

-- CreateEnum
CREATE TYPE "EscalationAction" AS ENUM ('ESCALATE_IMMEDIATE', 'ESCALATE_WITH_SUMMARY', 'SAFE_ANSWER', 'END_CONVERSATION');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('INTAKE_DOC', 'ONBOARDING_PLAN', 'JOB_DESIGN', 'SUPPORT_RUNBOOK', 'UAT_SCRIPTS', 'CUSTOMER_FAQ');

-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "SignOffStatus" AS ENUM ('PENDING', 'APPROVED', 'NEEDS_CHANGES');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('FEATURE_USAGE', 'PAGE_VIEW', 'API_CALL', 'ERROR', 'LLM_OPERATION');

-- CreateEnum
CREATE TYPE "ErrorStatus" AS ENUM ('NEW', 'INVESTIGATING', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'FEATURE_REQUEST', 'PRAISE', 'COMPLAINT', 'GENERAL');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'REVIEWED', 'ACTIONED', 'CLOSED');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_employees" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DigitalEmployeeStatus" NOT NULL DEFAULT 'DESIGN',
    "channels" "Channel"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "goLiveDate" TIMESTAMP(3),

    CONSTRAINT "digital_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_weeks" (
    "id" TEXT NOT NULL,
    "digitalEmployeeId" TEXT NOT NULL,
    "status" "DesignWeekStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recordingUrl" TEXT,
    "recordingDuration" INTEGER,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "topicsCovered" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "suggestedAgenda" JSONB,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "speaker" TEXT,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extractions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "ExtractionType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'CONFIRMED',
    "ambiguityReason" TEXT,
    "resolvedInSessionId" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "extractionId" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "timestampStart" DOUBLE PRECISION,
    "timestampEnd" DOUBLE PRECISION,
    "page" INTEGER,
    "paragraph" INTEGER,
    "quote" TEXT NOT NULL,
    "scopeItemId" TEXT,
    "scenarioId" TEXT,
    "kpiId" TEXT,
    "integrationId" TEXT,
    "escalationRuleId" TEXT,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scope_items" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "classification" "ScopeClassification" NOT NULL,
    "skill" TEXT,
    "conditions" TEXT,
    "notes" TEXT,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scope_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "expectedOutcome" TEXT,
    "successCriteria" TEXT[],
    "skill" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_steps" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "actor" "StepActor" NOT NULL,
    "action" TEXT NOT NULL,
    "systemAction" TEXT,
    "decisionPoint" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "scenario_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edge_cases" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "handling" TEXT NOT NULL,
    "escalate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "edge_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpis" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "measurementMethod" TEXT,
    "dataSource" TEXT,
    "frequency" TEXT,
    "targetValue" TEXT,
    "baselineValue" TEXT,
    "pilotTarget" TEXT,
    "scaleTarget" TEXT,
    "owner" TEXT,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "purpose" TEXT,
    "type" "IntegrationType",
    "endpoint" TEXT,
    "authMethod" "AuthMethod",
    "authOwner" TEXT,
    "fieldsRead" TEXT[],
    "fieldsWrite" TEXT[],
    "rateLimits" TEXT,
    "onTimeout" TEXT,
    "onAuthFailure" TEXT,
    "onNotFound" TEXT,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalation_rules" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "conditionType" "ConditionType" NOT NULL,
    "threshold" DOUBLE PRECISION,
    "keywords" TEXT[],
    "action" "EscalationAction" NOT NULL,
    "handoverContext" TEXT[],
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifacts" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL,
    "completenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missingFields" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact_sections" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "fieldStatus" JSONB NOT NULL,
    "signedOff" BOOLEAN NOT NULL DEFAULT false,
    "signedOffBy" TEXT,
    "signedOffAt" TIMESTAMP(3),

    CONSTRAINT "artifact_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sign_offs" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "stakeholder" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" "SignOffStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sign_offs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observatory_events" (
    "id" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "featureId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB,
    "duration" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observatory_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observatory_errors" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "featureId" TEXT,
    "userId" TEXT,
    "endpoint" TEXT,
    "metadata" JSONB,
    "count" INTEGER NOT NULL DEFAULT 1,
    "status" "ErrorStatus" NOT NULL DEFAULT 'NEW',
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observatory_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observatory_feedback" (
    "id" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "content" TEXT NOT NULL,
    "featureId" TEXT,
    "userId" TEXT,
    "npsScore" INTEGER,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observatory_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observatory_llm_operations" (
    "id" TEXT NOT NULL,
    "pipelineName" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observatory_llm_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "design_weeks_digitalEmployeeId_key" ON "design_weeks"("digitalEmployeeId");

-- CreateIndex
CREATE INDEX "observatory_events_type_timestamp_idx" ON "observatory_events"("type", "timestamp");

-- CreateIndex
CREATE INDEX "observatory_events_featureId_timestamp_idx" ON "observatory_events"("featureId", "timestamp");

-- CreateIndex
CREATE INDEX "observatory_errors_status_lastSeen_idx" ON "observatory_errors"("status", "lastSeen");

-- CreateIndex
CREATE INDEX "observatory_feedback_status_createdAt_idx" ON "observatory_feedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "observatory_llm_operations_pipelineName_timestamp_idx" ON "observatory_llm_operations"("pipelineName", "timestamp");

-- AddForeignKey
ALTER TABLE "digital_employees" ADD CONSTRAINT "digital_employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_weeks" ADD CONSTRAINT "design_weeks_digitalEmployeeId_fkey" FOREIGN KEY ("digitalEmployeeId") REFERENCES "digital_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extractions" ADD CONSTRAINT "extractions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_extractionId_fkey" FOREIGN KEY ("extractionId") REFERENCES "extractions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_scopeItemId_fkey" FOREIGN KEY ("scopeItemId") REFERENCES "scope_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "kpis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_escalationRuleId_fkey" FOREIGN KEY ("escalationRuleId") REFERENCES "escalation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scope_items" ADD CONSTRAINT "scope_items_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_steps" ADD CONSTRAINT "scenario_steps_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edge_cases" ADD CONSTRAINT "edge_cases_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact_sections" ADD CONSTRAINT "artifact_sections_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_offs" ADD CONSTRAINT "sign_offs_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
