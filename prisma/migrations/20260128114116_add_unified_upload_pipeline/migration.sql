-- CreateEnum
CREATE TYPE "ContentClassification" AS ENUM ('KICKOFF_SESSION', 'PROCESS_DESIGN_SESSION', 'SKILLS_GUARDRAILS_SESSION', 'TECHNICAL_SESSION', 'SIGNOFF_SESSION', 'REQUIREMENTS_DOCUMENT', 'TECHNICAL_SPEC', 'PROCESS_DOCUMENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "UploadJobStatus" AS ENUM ('QUEUED', 'CLASSIFYING', 'EXTRACTING_GENERAL', 'EXTRACTING_SPECIALIZED', 'POPULATING_TABS', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('CLASSIFICATION', 'GENERAL_EXTRACTION', 'SPECIALIZED_EXTRACTION', 'TAB_POPULATION', 'COMPLETE');

-- CreateTable
CREATE TABLE "raw_extractions" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "sessionId" TEXT,
    "contentType" "ContentClassification" NOT NULL,
    "sourceFileName" TEXT,
    "sourceMimeType" TEXT,
    "rawJson" JSONB NOT NULL,
    "extractionVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_jobs" (
    "id" TEXT NOT NULL,
    "designWeekId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "UploadJobStatus" NOT NULL DEFAULT 'QUEUED',
    "currentStage" "PipelineStage" NOT NULL DEFAULT 'CLASSIFICATION',
    "classificationResult" JSONB,
    "rawExtractionId" TEXT,
    "populationResult" JSONB,
    "stageProgress" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "raw_extractions_designWeekId_idx" ON "raw_extractions"("designWeekId");

-- CreateIndex
CREATE INDEX "raw_extractions_contentType_idx" ON "raw_extractions"("contentType");

-- CreateIndex
CREATE INDEX "upload_jobs_designWeekId_status_idx" ON "upload_jobs"("designWeekId", "status");

-- AddForeignKey
ALTER TABLE "raw_extractions" ADD CONSTRAINT "raw_extractions_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_extractions" ADD CONSTRAINT "raw_extractions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_designWeekId_fkey" FOREIGN KEY ("designWeekId") REFERENCES "design_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_rawExtractionId_fkey" FOREIGN KEY ("rawExtractionId") REFERENCES "raw_extractions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
