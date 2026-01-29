/**
 * Extraction Pipeline Alignment Tests
 *
 * These tests verify that all components of the extraction pipeline are aligned:
 * 1. GENERAL_EXTRACTION_PROMPT types
 * 2. ExtractedItemType enum in Prisma
 * 3. Profile mapper (business profile)
 * 4. Technical profile mapper
 * 5. Test plan mapper
 * 6. Profile types (UI fields)
 *
 * If any of these tests fail, it means there's a gap in the pipeline
 * that will cause extracted data to not appear in the UI.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ============================================
// Extract types from source files
// ============================================

function extractTypesFromPrompt(): string[] {
  const filePath = path.join(process.cwd(), 'src/lib/pipeline/extract-general.ts')
  const content = fs.readFileSync(filePath, 'utf-8')

  // Find the types defined in the prompt (lines starting with "- TYPE_NAME:")
  const typeMatches = content.match(/^- ([A-Z_]+):/gm) || []
  return typeMatches.map(match => match.replace('- ', '').replace(':', ''))
}

function extractTypesFromPrismaEnum(): string[] {
  const filePath = path.join(process.cwd(), 'prisma/schema.prisma')
  const content = fs.readFileSync(filePath, 'utf-8')

  // Find the ExtractedItemType enum
  const enumMatch = content.match(/enum ExtractedItemType \{([^}]+)\}/s)
  if (!enumMatch) return []

  // Extract type names (skip comments)
  const enumContent = enumMatch[1]
  const lines = enumContent.split('\n')
  return lines
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
}

function extractTypesFromProfileMapper(): string[] {
  const filePath = path.join(process.cwd(), 'src/lib/profile-mapper.ts')
  const content = fs.readFileSync(filePath, 'utf-8')

  // Find case statements in the switch
  const caseMatches = content.match(/case '([A-Z_]+)':/g) || []
  return [...new Set(caseMatches.map(match => match.replace("case '", '').replace("':", '')))]
}

function extractTypesFromTechnicalProfileMapper(): string[] {
  const filePath = path.join(process.cwd(), 'src/app/api/design-weeks/[id]/technical-profile/route.ts')
  const content = fs.readFileSync(filePath, 'utf-8')

  // Find types in the 'in' array
  const inArrayMatch = content.match(/in: \[([^\]]+)\]/s)
  if (!inArrayMatch) return []

  const types = inArrayMatch[1].match(/'([A-Z_]+)'/g) || []
  return types.map(t => t.replace(/'/g, ''))
}

function extractTypesFromTestPlanMapper(): string[] {
  const filePath = path.join(process.cwd(), 'src/app/api/design-weeks/[id]/test-plan/route.ts')
  const content = fs.readFileSync(filePath, 'utf-8')

  // Find types in the 'in' array
  const inArrayMatch = content.match(/in: \[([^\]]+)\]/s)
  if (!inArrayMatch) return []

  const types = inArrayMatch[1].match(/'([A-Z_]+)'/g) || []
  return types.map(t => t.replace(/'/g, ''))
}

// ============================================
// Define expected mappings
// ============================================

// Types that should go to Business Profile
const BUSINESS_PROFILE_TYPES = [
  'STAKEHOLDER',
  'GOAL',
  'BUSINESS_CASE',
  'KPI_TARGET',
  'VOLUME_EXPECTATION',
  'COST_PER_CASE',
  'PEAK_PERIODS',
  'TIMELINE_CONSTRAINT',
  'CHANNEL',
  'CHANNEL_SLA',
  'CHANNEL_VOLUME',
  'CHANNEL_RULE',
  'SKILL_ANSWER',
  'SKILL_ROUTE',
  'SKILL_APPROVE_REJECT',
  'SKILL_REQUEST_INFO',
  'SKILL_NOTIFY',
  'SKILL_OTHER',
  'KNOWLEDGE_SOURCE',
  'BRAND_TONE',
  'COMMUNICATION_STYLE',
  'RESPONSE_TEMPLATE',
  'HAPPY_PATH_STEP',
  'EXCEPTION_CASE',
  'ESCALATION_TRIGGER',
  'CASE_TYPE',
  'SCOPE_IN',
  'SCOPE_OUT',
  'GUARDRAIL_NEVER',
  'GUARDRAIL_ALWAYS',
  'FINANCIAL_LIMIT',
  'LEGAL_RESTRICTION',
  'COMPLIANCE_REQUIREMENT',
]

// Types that should go to Technical Profile
const TECHNICAL_PROFILE_TYPES = [
  'SYSTEM_INTEGRATION',
  'DATA_FIELD',
  'API_ENDPOINT',
  'SECURITY_REQUIREMENT',
  'COMPLIANCE_REQUIREMENT',
  'ERROR_HANDLING',
  'TECHNICAL_CONTACT',
]

// Types that should generate Test Cases
const TEST_PLAN_TYPES = [
  'HAPPY_PATH_STEP',
  'EXCEPTION_CASE',
  'GUARDRAIL_NEVER',
  'GUARDRAIL_ALWAYS',
  'SCOPE_IN',
  'SCOPE_OUT',
]

// Types that are decision/tracking focused (not in profiles)
const DECISION_TYPES = [
  'OPEN_ITEM',
  'DECISION',
  'APPROVAL',
  'RISK',
]

// ============================================
// Tests
// ============================================

describe('Extraction Pipeline Alignment', () => {
  describe('Prompt types match Prisma enum', () => {
    it('should have all prompt types in Prisma enum', () => {
      const promptTypes = extractTypesFromPrompt()
      const prismaTypes = extractTypesFromPrismaEnum()

      const missingInPrisma = promptTypes.filter(t => !prismaTypes.includes(t))

      if (missingInPrisma.length > 0) {
        console.error('Types in prompt but NOT in Prisma enum:', missingInPrisma)
      }

      expect(missingInPrisma).toHaveLength(0)
    })

    it('should have all Prisma types in prompt', () => {
      const promptTypes = extractTypesFromPrompt()
      const prismaTypes = extractTypesFromPrismaEnum()

      const missingInPrompt = prismaTypes.filter(t => !promptTypes.includes(t))

      if (missingInPrompt.length > 0) {
        console.error('Types in Prisma enum but NOT in prompt:', missingInPrompt)
      }

      expect(missingInPrompt).toHaveLength(0)
    })
  })

  describe('Business profile mapper handles all business types', () => {
    it('should handle all business profile types', () => {
      const mapperTypes = extractTypesFromProfileMapper()

      const missingInMapper = BUSINESS_PROFILE_TYPES.filter(t => !mapperTypes.includes(t))

      if (missingInMapper.length > 0) {
        console.error('Business types NOT handled in profile-mapper.ts:', missingInMapper)
      }

      expect(missingInMapper).toHaveLength(0)
    })
  })

  describe('Technical profile mapper handles all technical types', () => {
    it('should query all technical types from database', () => {
      const technicalMapperTypes = extractTypesFromTechnicalProfileMapper()

      const missingInQuery = TECHNICAL_PROFILE_TYPES.filter(t => !technicalMapperTypes.includes(t))

      if (missingInQuery.length > 0) {
        console.error('Technical types NOT queried in technical-profile/route.ts:', missingInQuery)
      }

      expect(missingInQuery).toHaveLength(0)
    })
  })

  describe('Test plan mapper handles all test-relevant types', () => {
    it('should query all test plan types from database', () => {
      const testPlanTypes = extractTypesFromTestPlanMapper()

      const missingInQuery = TEST_PLAN_TYPES.filter(t => !testPlanTypes.includes(t))

      if (missingInQuery.length > 0) {
        console.error('Test plan types NOT queried in test-plan/route.ts:', missingInQuery)
      }

      expect(missingInQuery).toHaveLength(0)
    })
  })

  describe('All Prisma types are mapped somewhere', () => {
    it('should have every Prisma type mapped to a profile or tracker', () => {
      const prismaTypes = extractTypesFromPrismaEnum()
      const profileMapperTypes = extractTypesFromProfileMapper()
      const technicalMapperTypes = extractTypesFromTechnicalProfileMapper()

      // Types that appear in at least one mapper
      const allMappedTypes = [
        ...new Set([
          ...profileMapperTypes,
          ...technicalMapperTypes,
          ...DECISION_TYPES, // These are intentionally not in profiles (yet)
        ])
      ]

      const unmappedTypes = prismaTypes.filter(t => !allMappedTypes.includes(t))

      if (unmappedTypes.length > 0) {
        console.error('Prisma types NOT mapped anywhere:', unmappedTypes)
        console.error('These types will be extracted but NEVER appear in the UI!')
      }

      expect(unmappedTypes).toHaveLength(0)
    })
  })

  describe('Checklist questions alignment', () => {
    it('should have extraction types for all checklist categories', () => {
      // These are the categories from classify.ts checklists
      const expectedCategories = {
        KICKOFF: ['STAKEHOLDER', 'GOAL', 'BUSINESS_CASE', 'KPI_TARGET', 'VOLUME_EXPECTATION', 'COST_PER_CASE'],
        PROCESS: ['HAPPY_PATH_STEP', 'EXCEPTION_CASE', 'CASE_TYPE', 'CHANNEL', 'ESCALATION_TRIGGER', 'SCOPE_IN', 'SCOPE_OUT'],
        SKILLS: ['SKILL_ANSWER', 'SKILL_ROUTE', 'SKILL_OTHER', 'BRAND_TONE', 'GUARDRAIL_NEVER', 'GUARDRAIL_ALWAYS', 'FINANCIAL_LIMIT'],
        TECHNICAL: ['SYSTEM_INTEGRATION', 'DATA_FIELD', 'API_ENDPOINT', 'SECURITY_REQUIREMENT', 'TECHNICAL_CONTACT'],
        SIGNOFF: ['OPEN_ITEM', 'DECISION', 'APPROVAL', 'RISK'],
      }

      const prismaTypes = extractTypesFromPrismaEnum()

      for (const [category, types] of Object.entries(expectedCategories)) {
        const missingTypes = types.filter(t => !prismaTypes.includes(t))
        if (missingTypes.length > 0) {
          console.error(`${category} checklist types missing from Prisma:`, missingTypes)
        }
        expect(missingTypes).toHaveLength(0)
      }
    })
  })
})

describe('Profile Field Coverage', () => {
  it('should document which profile fields are filled by which extraction types', () => {
    // This is a documentation test - it prints the mapping for visibility
    const mapping = {
      'identity.stakeholders': ['STAKEHOLDER'],
      'identity.name': ['(manual or from DE)'],
      'identity.description': ['(manual or from DE)'],
      'businessContext.problemStatement': ['GOAL', 'BUSINESS_CASE'],
      'businessContext.volumePerDay': ['VOLUME_EXPECTATION'],
      'businessContext.costPerCase': ['COST_PER_CASE'],
      'businessContext.peakPeriods': ['PEAK_PERIODS'],
      'kpis': ['KPI_TARGET'],
      'channels': ['CHANNEL', 'CHANNEL_SLA', 'CHANNEL_VOLUME', 'CHANNEL_RULE'],
      'skills.skills': ['SKILL_ANSWER', 'SKILL_ROUTE', 'SKILL_APPROVE_REJECT', 'SKILL_REQUEST_INFO', 'SKILL_NOTIFY', 'SKILL_OTHER'],
      'skills.communicationStyle': ['BRAND_TONE', 'COMMUNICATION_STYLE'],
      'process.happyPathSteps': ['HAPPY_PATH_STEP'],
      'process.exceptions': ['EXCEPTION_CASE'],
      'process.escalationRules': ['ESCALATION_TRIGGER'],
      'process.caseTypes': ['CASE_TYPE'],
      'scope.inScope': ['SCOPE_IN'],
      'scope.outOfScope': ['SCOPE_OUT'],
      'guardrails.never': ['GUARDRAIL_NEVER'],
      'guardrails.always': ['GUARDRAIL_ALWAYS'],
      'guardrails.financialLimits': ['FINANCIAL_LIMIT'],
      'guardrails.legalRestrictions': ['LEGAL_RESTRICTION', 'COMPLIANCE_REQUIREMENT'],
      // Technical profile
      'integrations': ['SYSTEM_INTEGRATION'],
      'dataFields': ['DATA_FIELD'],
      'apiEndpoints': ['API_ENDPOINT'],
      'securityRequirements': ['SECURITY_REQUIREMENT', 'COMPLIANCE_REQUIREMENT'],
      'technicalContacts': ['TECHNICAL_CONTACT'],
      'notes': ['ERROR_HANDLING'],
    }

    console.log('\n📊 Profile Field → Extraction Type Mapping:')
    console.log('='.repeat(60))
    for (const [field, types] of Object.entries(mapping)) {
      console.log(`  ${field}: ${types.join(', ')}`)
    }
    console.log('='.repeat(60))

    // This test always passes - it's for documentation
    expect(true).toBe(true)
  })
})
