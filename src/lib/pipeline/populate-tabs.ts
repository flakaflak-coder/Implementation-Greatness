import { prisma } from '@/lib/db'
import { ExtractedItemType } from '@prisma/client'
import type { ClassificationResult, SpecializedItem, PopulationResult } from './types'
import { mapToExtractedItemType } from './extract-specialized'

/**
 * Stage 4: Populate profile tabs with extracted items
 *
 * Maps specialized extraction results to database records:
 * - ExtractedItems for the profile tabs
 * - (Future: Integrations, BusinessRules, TestCases)
 */
export async function populateTabs(
  designWeekId: string,
  items: SpecializedItem[],
  classification: ClassificationResult
): Promise<PopulationResult> {
  const warnings: string[] = []
  let extractedItemCount = 0
  let integrationCount = 0
  let businessRuleCount = 0
  let testCaseCount = 0

  // Get the design week to find its sessions
  const designWeek = await prisma.designWeek.findUnique({
    where: { id: designWeekId },
    include: { sessions: { orderBy: { sessionNumber: 'desc' }, take: 1 } },
  })

  if (!designWeek) {
    throw new Error('Design week not found')
  }

  // Use the most recent session, or create one if none exists
  let sessionId: string

  if (designWeek.sessions.length > 0) {
    sessionId = designWeek.sessions[0].id
  } else {
    // Create a session for this upload
    const session = await prisma.session.create({
      data: {
        designWeekId,
        phase: mapClassificationToPhase(classification.type),
        sessionNumber: 1,
        date: new Date(),
        processingStatus: 'COMPLETE',
      },
    })
    sessionId = session.id
  }

  console.log(`[Tab Population] Processing ${items.length} items`)

  // Process each extracted item
  for (const item of items) {
    try {
      const itemType = mapToExtractedItemType(item.type)

      // Check if this is a valid ExtractedItemType
      const validTypes = Object.values(ExtractedItemType)
      if (!validTypes.includes(itemType as ExtractedItemType)) {
        console.log(`[Tab Population] Skipping invalid type: ${item.type} -> ${itemType}`)
        warnings.push(`Unknown item type: ${item.type} (mapped to ${itemType})`)
        continue
      }

      // Determine the profile type based on the item type
      const profileType = getProfileTypeForItem(itemType)

      // Create the extracted item
      await prisma.extractedItem.create({
        data: {
          sessionId,
          type: itemType as ExtractedItemType,
          content: item.content,
          confidence: item.confidence || 0.8,
          sourceQuote: item.sourceQuote || '',
          sourceSpeaker: item.sourceSpeaker,
          sourceTimestamp: item.sourceTimestamp,
          status: item.confidence >= 0.8 ? 'APPROVED' : 'PENDING',
          structuredData: item.structuredData ? (item.structuredData as object) : undefined,
        },
      })

      extractedItemCount++

      // Track specific entity types for structured entities
      if (itemType === 'SYSTEM_INTEGRATION') {
        integrationCount++
      }
      if (itemType === 'GUARDRAIL_NEVER' || itemType === 'GUARDRAIL_ALWAYS') {
        businessRuleCount++
      }
      if (itemType === 'HAPPY_PATH_STEP' || itemType === 'EXCEPTION_CASE') {
        testCaseCount++
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      warnings.push(`Failed to create item ${item.type}: ${message}`)
    }
  }

  console.log(`[Tab Population] Created ${extractedItemCount} items, ${warnings.length} warnings`)

  return {
    extractedItems: extractedItemCount,
    integrations: integrationCount,
    businessRules: businessRuleCount,
    testCases: testCaseCount,
    warnings,
  }
}

/**
 * Map classification type to session phase number
 * Phase 1: Kickoff
 * Phase 2-3: Process Design
 * Phase 4-5: Technical
 * Phase 6: Sign-off
 */
function mapClassificationToPhase(type: string): number {
  switch (type) {
    case 'KICKOFF_SESSION':
      return 1
    case 'PROCESS_DESIGN_SESSION':
      return 2
    case 'SKILLS_GUARDRAILS_SESSION':
      return 3
    case 'TECHNICAL_SESSION':
      return 4
    case 'SIGNOFF_SESSION':
      return 6
    default:
      return 2
  }
}

/**
 * Determine which profile tab an item belongs to
 */
function getProfileTypeForItem(itemType: string): 'business' | 'technical' {
  const technicalTypes = [
    'SYSTEM_INTEGRATION',
    'DATA_FIELD',
    'API_ENDPOINT',
    'AUTH_REQUIREMENT',
    'SECURITY_REQUIREMENT',
    'COMPLIANCE_REQUIREMENT',
    'DATA_HANDLING',
  ]

  return technicalTypes.includes(itemType) ? 'technical' : 'business'
}

/**
 * Create scope items from extraction
 */
export async function createScopeItems(
  designWeekId: string,
  items: SpecializedItem[]
): Promise<number> {
  const scopeTypes = ['IN_SCOPE', 'OUT_OF_SCOPE', 'AMBIGUOUS']
  const scopeItems = items.filter(item => scopeTypes.includes(item.type))

  let created = 0

  for (const item of scopeItems) {
    try {
      await prisma.scopeItem.create({
        data: {
          designWeekId,
          statement: item.content,
          classification: item.type === 'AMBIGUOUS' ? 'AMBIGUOUS' : item.type === 'IN_SCOPE' ? 'IN_SCOPE' : 'OUT_OF_SCOPE',
          notes: item.sourceQuote ? `Source: "${item.sourceQuote}"` : undefined,
        },
      })
      created++
    } catch {
      // Skip duplicates
    }
  }

  return created
}

/**
 * Map item type to its profile section
 */
export function getProfileSection(itemType: string): string {
  const sectionMapping: Record<string, string> = {
    // Business Profile - Identity
    DE_NAME: 'identity',
    BUSINESS_CONTEXT: 'identity',
    GOAL: 'identity',
    PROBLEM: 'identity',

    // Business Profile - Business Context
    VOLUME: 'businessContext',
    COST: 'businessContext',
    STAKEHOLDER: 'businessContext',

    // Business Profile - Channels
    CHANNEL: 'channels',
    CHANNEL_RULE: 'channels',
    SLA: 'channels',

    // Business Profile - Skills
    SKILL: 'skills',
    KNOWLEDGE_SOURCE: 'skills',
    TEMPLATE: 'skills',

    // Business Profile - Process
    HAPPY_PATH_STEP: 'process',
    EXCEPTION_CASE: 'process',
    CASE_TYPE: 'process',
    DECISION_POINT: 'process',
    ESCALATION_RULE: 'process',

    // Business Profile - Guardrails
    GUARDRAIL_NEVER: 'guardrails',
    GUARDRAIL_ALWAYS: 'guardrails',
    FINANCIAL_LIMIT: 'guardrails',
    LEGAL_RESTRICTION: 'guardrails',
    BRAND_TONE: 'guardrails',
    FORMALITY: 'guardrails',
    COMMUNICATION_GUIDELINE: 'guardrails',

    // Business Profile - KPIs
    KPI: 'kpis',

    // Technical Profile - Integrations
    SYSTEM_INTEGRATION: 'integrations',
    API_ENDPOINT: 'integrations',
    AUTH_REQUIREMENT: 'integrations',

    // Technical Profile - Data
    DATA_FIELD: 'dataFields',
    DATA_HANDLING: 'dataFields',

    // Technical Profile - Security
    SECURITY_REQUIREMENT: 'security',
    COMPLIANCE_REQUIREMENT: 'security',
  }

  return sectionMapping[itemType] || 'other'
}
