-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExtractedItemType" ADD VALUE 'BUSINESS_CASE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'COST_PER_CASE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'PEAK_PERIODS';
ALTER TYPE "ExtractedItemType" ADD VALUE 'CASE_TYPE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'DOCUMENT_TYPE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'CHANNEL';
ALTER TYPE "ExtractedItemType" ADD VALUE 'CHANNEL_VOLUME';
ALTER TYPE "ExtractedItemType" ADD VALUE 'CHANNEL_SLA';
ALTER TYPE "ExtractedItemType" ADD VALUE 'CHANNEL_RULE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'SKILL_ANSWER';
ALTER TYPE "ExtractedItemType" ADD VALUE 'SKILL_ROUTE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'SKILL_APPROVE_REJECT';
ALTER TYPE "ExtractedItemType" ADD VALUE 'SKILL_REQUEST_INFO';
ALTER TYPE "ExtractedItemType" ADD VALUE 'SKILL_NOTIFY';
ALTER TYPE "ExtractedItemType" ADD VALUE 'SKILL_OTHER';
ALTER TYPE "ExtractedItemType" ADD VALUE 'KNOWLEDGE_SOURCE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'BRAND_TONE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'COMMUNICATION_STYLE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'RESPONSE_TEMPLATE';
ALTER TYPE "ExtractedItemType" ADD VALUE 'GUARDRAIL_NEVER';
ALTER TYPE "ExtractedItemType" ADD VALUE 'GUARDRAIL_ALWAYS';
ALTER TYPE "ExtractedItemType" ADD VALUE 'FINANCIAL_LIMIT';
ALTER TYPE "ExtractedItemType" ADD VALUE 'LEGAL_RESTRICTION';
ALTER TYPE "ExtractedItemType" ADD VALUE 'COMPLIANCE_REQUIREMENT';
ALTER TYPE "ExtractedItemType" ADD VALUE 'TECHNICAL_CONTACT';
