-- CreateEnum
CREATE TYPE "PromptType" AS ENUM ('EXTRACT_KICKOFF', 'EXTRACT_PROCESS', 'EXTRACT_TECHNICAL', 'EXTRACT_SIGNOFF', 'GENERATE_DE_DESIGN', 'GENERATE_SOLUTION', 'GENERATE_TEST_PLAN');

-- CreateEnum
CREATE TYPE "ExtractedItemType" AS ENUM ('STAKEHOLDER', 'GOAL', 'KPI_TARGET', 'VOLUME_EXPECTATION', 'TIMELINE_CONSTRAINT', 'HAPPY_PATH_STEP', 'EXCEPTION_CASE', 'BUSINESS_RULE', 'SCOPE_IN', 'SCOPE_OUT', 'ESCALATION_TRIGGER', 'SYSTEM_INTEGRATION', 'DATA_FIELD', 'API_ENDPOINT', 'SECURITY_REQUIREMENT', 'ERROR_HANDLING', 'OPEN_ITEM', 'DECISION', 'APPROVAL', 'RISK');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CLARIFICATION');

-- CreateEnum
CREATE TYPE "GeneratedDocType" AS ENUM ('DE_DESIGN', 'SOLUTION_DESIGN', 'TEST_PLAN');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED');

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PromptType" NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_items" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "promptTemplateId" TEXT,
    "type" "ExtractedItemType" NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "structuredData" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceTimestamp" DOUBLE PRECISION,
    "sourceSpeaker" TEXT,
    "sourceQuote" TEXT,

    CONSTRAINT "extracted_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "promptTemplateId" TEXT,
    "type" "GeneratedDocType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "structuredContent" JSONB,
    "completenessScore" DOUBLE PRECISION,
    "missingFields" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_name_key" ON "prompt_templates"("name");

-- CreateIndex
CREATE INDEX "extracted_items_sessionId_type_idx" ON "extracted_items"("sessionId", "type");

-- CreateIndex
CREATE INDEX "extracted_items_status_idx" ON "extracted_items"("status");

-- CreateIndex
CREATE INDEX "generated_documents_designWeekId_type_idx" ON "generated_documents"("designWeekId", "type");

-- AddForeignKey
ALTER TABLE "extracted_items" ADD CONSTRAINT "extracted_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_items" ADD CONSTRAINT "extracted_items_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "prompt_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
