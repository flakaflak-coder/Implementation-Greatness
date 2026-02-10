// Types for the DE Workspace - Profile Builder

import type {
  ExtractedItem,
  ExtractedItemType,
  Session,
} from '@prisma/client'
import type { BusinessProfile, TechnicalProfile } from './profile-types'

// Profile section definitions
export type BusinessProfileSection =
  | 'identity'
  | 'businessContext'
  | 'channels'
  | 'skills'
  | 'process'
  | 'guardrails'
  | 'kpis'

export type TechnicalProfileSection =
  | 'integrations'
  | 'dataFields'
  | 'security'
  | 'apis'
  | 'credentials'

export type ProfileSection = BusinessProfileSection | TechnicalProfileSection

// Mapping from ExtractedItemType to profile sections
export const BUSINESS_PROFILE_MAPPING: Record<BusinessProfileSection, ExtractedItemType[]> = {
  identity: ['STAKEHOLDER', 'GOAL', 'BUSINESS_CASE'],
  businessContext: ['GOAL', 'KPI_TARGET', 'VOLUME_EXPECTATION', 'COST_PER_CASE', 'PEAK_PERIODS'],
  channels: ['CHANNEL', 'CHANNEL_VOLUME', 'CHANNEL_SLA', 'CHANNEL_RULE'],
  skills: [
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
  ],
  process: ['HAPPY_PATH_STEP', 'EXCEPTION_CASE', 'CASE_TYPE', 'DOCUMENT_TYPE', 'BUSINESS_RULE', 'ESCALATION_TRIGGER'],
  guardrails: ['GUARDRAIL_NEVER', 'GUARDRAIL_ALWAYS', 'FINANCIAL_LIMIT', 'LEGAL_RESTRICTION'],
  kpis: ['KPI_TARGET', 'TIMELINE_CONSTRAINT'],
}

export const TECHNICAL_PROFILE_MAPPING: Record<TechnicalProfileSection, ExtractedItemType[]> = {
  integrations: ['SYSTEM_INTEGRATION'],
  dataFields: ['DATA_FIELD'],
  security: ['SECURITY_REQUIREMENT', 'COMPLIANCE_REQUIREMENT'],
  apis: ['API_ENDPOINT', 'ERROR_HANDLING'],
  credentials: ['TECHNICAL_CONTACT'],
}

// Helper function to get covered types from Business Profile manual entries
export function getProfileCoveredTypes(
  profile: BusinessProfile | null,
  technicalProfile: TechnicalProfile | null
): {
  business: Record<BusinessProfileSection, Set<ExtractedItemType>>
  technical: Record<TechnicalProfileSection, Set<ExtractedItemType>>
} {
  const business: Record<BusinessProfileSection, Set<ExtractedItemType>> = {
    identity: new Set(),
    businessContext: new Set(),
    channels: new Set(),
    skills: new Set(),
    process: new Set(),
    guardrails: new Set(),
    kpis: new Set(),
  }

  const technical: Record<TechnicalProfileSection, Set<ExtractedItemType>> = {
    integrations: new Set(),
    dataFields: new Set(),
    security: new Set(),
    apis: new Set(),
    credentials: new Set(),
  }

  if (profile) {
    // Identity section
    if (profile.identity.stakeholders.length > 0) {
      business.identity.add('STAKEHOLDER')
    }
    if (profile.identity.description) {
      business.identity.add('GOAL')
      business.identity.add('BUSINESS_CASE')
    }

    // Business Context section
    if (profile.businessContext.problemStatement) {
      business.businessContext.add('GOAL')
    }
    if (profile.businessContext.volumePerMonth !== null) {
      business.businessContext.add('VOLUME_EXPECTATION')
    }
    if (profile.businessContext.costPerCase !== null) {
      business.businessContext.add('COST_PER_CASE')
    }
    if (profile.businessContext.peakPeriods.length > 0) {
      business.businessContext.add('PEAK_PERIODS')
    }

    // KPIs section
    if (profile.kpis.length > 0) {
      business.kpis.add('KPI_TARGET')
      business.kpis.add('TIMELINE_CONSTRAINT')
    }

    // Channels section
    if (profile.channels.length > 0) {
      business.channels.add('CHANNEL')
      business.channels.add('CHANNEL_VOLUME')
      business.channels.add('CHANNEL_SLA')
      business.channels.add('CHANNEL_RULE')
    }

    // Skills section
    if (profile.skills.skills.length > 0) {
      // Map skill types to ExtractedItemTypes
      for (const skill of profile.skills.skills) {
        switch (skill.type) {
          case 'answer':
            business.skills.add('SKILL_ANSWER')
            break
          case 'route':
            business.skills.add('SKILL_ROUTE')
            break
          case 'approve_reject':
            business.skills.add('SKILL_APPROVE_REJECT')
            break
          case 'request_info':
            business.skills.add('SKILL_REQUEST_INFO')
            break
          case 'notify':
            business.skills.add('SKILL_NOTIFY')
            break
          default:
            business.skills.add('SKILL_OTHER')
        }
      }
    }
    if (profile.skills.communicationStyle.tone.length > 0) {
      business.skills.add('BRAND_TONE')
      business.skills.add('COMMUNICATION_STYLE')
    }

    // Process section
    if (profile.process.happyPathSteps.length > 0) {
      business.process.add('HAPPY_PATH_STEP')
    }
    if (profile.process.exceptions.length > 0) {
      business.process.add('EXCEPTION_CASE')
    }
    if (profile.process.escalationRules.length > 0) {
      business.process.add('ESCALATION_TRIGGER')
    }
    if (profile.process.caseTypes.length > 0) {
      business.process.add('CASE_TYPE')
    }

    // Guardrails section
    if (profile.guardrails.never.length > 0) {
      business.guardrails.add('GUARDRAIL_NEVER')
    }
    if (profile.guardrails.always.length > 0) {
      business.guardrails.add('GUARDRAIL_ALWAYS')
    }
    if (profile.guardrails.financialLimits.length > 0) {
      business.guardrails.add('FINANCIAL_LIMIT')
    }
    if (profile.guardrails.legalRestrictions.length > 0) {
      business.guardrails.add('LEGAL_RESTRICTION')
    }
  }

  if (technicalProfile) {
    // Integrations section
    if (technicalProfile.integrations.length > 0) {
      technical.integrations.add('SYSTEM_INTEGRATION')
    }

    // Data Fields section
    if (technicalProfile.dataFields.length > 0) {
      technical.dataFields.add('DATA_FIELD')
    }

    // Security section
    if (technicalProfile.securityRequirements.length > 0) {
      // Check categories to map to specific types
      for (const req of technicalProfile.securityRequirements) {
        if (req.category === 'compliance') {
          technical.security.add('COMPLIANCE_REQUIREMENT')
        } else {
          technical.security.add('SECURITY_REQUIREMENT')
        }
      }
    }

    // APIs section
    if (technicalProfile.apiEndpoints.length > 0) {
      technical.apis.add('API_ENDPOINT')
    }

    // Credentials/Contacts section
    if (technicalProfile.technicalContacts.length > 0) {
      technical.credentials.add('TECHNICAL_CONTACT')
    }
  }

  return { business, technical }
}

// Section metadata for display
export interface SectionMetadata {
  title: string
  description: string
  icon: string // Lucide icon name
  requiredCount: number // Minimum items required for 100%
  color: string // Tailwind color class
}

export const BUSINESS_SECTION_METADATA: Record<BusinessProfileSection, SectionMetadata> = {
  identity: {
    title: 'Identity',
    description: 'Who is this Digital Employee? Name, role, and stakeholders',
    icon: 'Bot',
    requiredCount: 3,
    color: 'sienna',
  },
  businessContext: {
    title: 'Business Context',
    description: 'Problem being solved, volumes, costs, and success metrics',
    icon: 'Target',
    requiredCount: 3,
    color: 'blue',
  },
  channels: {
    title: 'Channels',
    description: 'Input channels with volume distribution and SLAs',
    icon: 'MessageSquare',
    requiredCount: 1,
    color: 'cyan',
  },
  skills: {
    title: 'Skills',
    description: 'What the DE can do, knowledge sources, and tone',
    icon: 'Sparkles',
    requiredCount: 3,
    color: 'sienna',
  },
  process: {
    title: 'Process',
    description: 'Happy path steps, exceptions, and case types',
    icon: 'GitBranch',
    requiredCount: 3,
    color: 'emerald',
  },
  guardrails: {
    title: 'Guardrails',
    description: 'What the DE must never/always do, limits and restrictions',
    icon: 'Shield',
    requiredCount: 2,
    color: 'amber',
  },
  kpis: {
    title: 'KPIs',
    description: 'Success metrics and timeline targets',
    icon: 'TrendingUp',
    requiredCount: 2,
    color: 'rose',
  },
}

export const TECHNICAL_SECTION_METADATA: Record<TechnicalProfileSection, SectionMetadata> = {
  integrations: {
    title: 'Integrations',
    description: 'Systems the DE connects to with purpose and access type',
    icon: 'Plug',
    requiredCount: 1,
    color: 'blue',
  },
  dataFields: {
    title: 'Data Fields',
    description: 'Specific fields needed from each system',
    icon: 'Database',
    requiredCount: 3,
    color: 'sienna',
  },
  security: {
    title: 'Security & Compliance',
    description: 'Authentication, encryption, and compliance requirements',
    icon: 'Lock',
    requiredCount: 1,
    color: 'red',
  },
  apis: {
    title: 'APIs & Endpoints',
    description: 'API endpoints, error handling, and webhooks',
    icon: 'Code',
    requiredCount: 1,
    color: 'emerald',
  },
  credentials: {
    title: 'Credentials & Contacts',
    description: 'Technical contacts and credential owners',
    icon: 'Users',
    requiredCount: 1,
    color: 'orange',
  },
}

// Extended ExtractedItem with session info for evidence display
export interface ExtractedItemWithSession extends ExtractedItem {
  session: Pick<Session, 'id' | 'phase' | 'sessionNumber' | 'date'>
}

// Grouped items by section
export interface GroupedProfileItems {
  business: Record<BusinessProfileSection, ExtractedItemWithSession[]>
  technical: Record<TechnicalProfileSection, ExtractedItemWithSession[]>
}

// Section completeness calculation
export interface SectionCompleteness {
  section: ProfileSection
  percentage: number
  approvedCount: number
  pendingCount: number
  requiredCount: number
  missingTypes: ExtractedItemType[]
  // Breakdown of what's affecting completeness
  itemCountScore: number // How many approved items vs required
  typeCoverageScore: number // How many expected types are covered
  coveredTypesCount: number // Number of distinct types covered
  totalTypesCount: number // Total number of expected types
}

// Overall profile completeness
export interface ProfileCompleteness {
  business: {
    overall: number
    sections: Record<BusinessProfileSection, SectionCompleteness>
  }
  technical: {
    overall: number
    sections: Record<TechnicalProfileSection, SectionCompleteness>
  }
}

// Test case types for Test Plan tab
export type TestCaseType = 'happy_path' | 'exception' | 'guardrail' | 'scope' | 'boundary'

export interface TestCase {
  id: string
  type: TestCaseType
  title: string
  description: string
  steps: string[]
  expectedOutcome: string
  sourceType: 'extracted' | 'scope_item' | 'manual'
  sourceId?: string
  sourceContent?: string
  coverage: 'covered' | 'partial' | 'gap'
}

export interface TestPlanSummary {
  totalTests: number
  byType: Record<TestCaseType, number>
  coverageGaps: string[]
  generatedAt?: Date
}

// Simplified types for component props to avoid strict Prisma type requirements
export interface DEWorkspaceDigitalEmployee {
  id: string
  name: string
  description: string | null
  status: string
  company: {
    id: string
    name: string
  }
}

export interface DEWorkspaceSession {
  id: string
  phase: number
  sessionNumber: number
  date: Date
  recordingUrl?: string | null
  processingStatus: string
  topicsCovered: string[]
  extractedItems?: ExtractedItem[]
}

export interface DEWorkspaceScopeItemEvidence {
  id: string
  sourceType: string
  timestampStart?: number | null
  timestampEnd?: number | null
  page?: number | null
  quote: string
  sessionNumber?: number
}

export interface DEWorkspaceScopeItem {
  id: string
  statement: string
  classification: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS'
  skill?: string | null
  conditions?: string | null
  notes?: string | null
  status: string
  excludeFromDocument: boolean
  evidence?: DEWorkspaceScopeItemEvidence[]
}

export interface DEWorkspaceUploadJob {
  id: string
  filename: string
  mimeType: string
  fileUrl: string
  fileSize: number
  status: 'QUEUED' | 'CLASSIFYING' | 'EXTRACTING_GENERAL' | 'EXTRACTING_SPECIALIZED' | 'POPULATING_TABS' | 'COMPLETE' | 'FAILED'
  currentStage: string
  classificationResult?: {
    type: string
    confidence: number
    missingQuestions?: string[]
  } | null
  populationResult?: {
    extractedItems: number
    integrations: number
    businessRules: number
    testCases: number
  } | null
  error?: string | null
  createdAt: Date
  completedAt?: Date | null
}

export interface DEWorkspaceDesignWeek {
  id: string
  status: string
  currentPhase: number
  sessions: DEWorkspaceSession[]
  scopeItems: DEWorkspaceScopeItem[]
  uploadJobs?: DEWorkspaceUploadJob[]
}

// Props for workspace components
export interface DEWorkspaceProps {
  digitalEmployee: DEWorkspaceDigitalEmployee
  designWeek: DEWorkspaceDesignWeek
  onUploadSession: (phase: number) => void
  onExtractSession?: (sessionId: string) => void
  onRefresh: () => void
  // Optional: controlled tab state (for integration with AI assistant)
  activeTab?: WorkspaceTab
  onTabChange?: (tab: WorkspaceTab) => void
}

// Tab state
export type WorkspaceTab = 'handover' | 'progress' | 'scope' | 'business' | 'technical' | 'testplan'

// Helper function to group items by profile section
export function groupItemsByProfile(items: ExtractedItemWithSession[]): GroupedProfileItems {
  const result: GroupedProfileItems = {
    business: {
      identity: [],
      businessContext: [],
      channels: [],
      skills: [],
      process: [],
      guardrails: [],
      kpis: [],
    },
    technical: {
      integrations: [],
      dataFields: [],
      security: [],
      apis: [],
      credentials: [],
    },
  }

  for (const item of items) {
    // Check business sections
    for (const [section, types] of Object.entries(BUSINESS_PROFILE_MAPPING)) {
      if (types.includes(item.type)) {
        result.business[section as BusinessProfileSection].push(item)
      }
    }

    // Check technical sections
    for (const [section, types] of Object.entries(TECHNICAL_PROFILE_MAPPING)) {
      if (types.includes(item.type)) {
        result.technical[section as TechnicalProfileSection].push(item)
      }
    }
  }

  return result
}

// Helper to calculate section completeness
// Now accepts optional profileCoveredTypes to include manually-entered profile data
export function calculateSectionCompleteness(
  items: ExtractedItemWithSession[],
  metadata: SectionMetadata,
  mappedTypes: ExtractedItemType[],
  profileCoveredTypes?: Set<ExtractedItemType>
): SectionCompleteness {
  const approvedItems = items.filter((i) => i.status === 'APPROVED')
  const pendingItems = items.filter((i) => i.status === 'PENDING' || i.status === 'NEEDS_CLARIFICATION')

  // Find which types are covered (by approved extracted items)
  const coveredTypes = new Set(approvedItems.map((i) => i.type))

  // Merge with types covered by manual profile entries
  if (profileCoveredTypes) {
    for (const type of profileCoveredTypes) {
      coveredTypes.add(type)
    }
  }

  const missingTypes = mappedTypes.filter((t) => !coveredTypes.has(t))

  // Calculate completeness using TWO factors:
  // 1. Item count coverage: approved items vs required count (now considers profile as adding "virtual items")
  // 2. Type coverage: covered types vs total expected types

  // For item count, if profile contributes types, count them as if we had items
  // This allows reaching 100% via either extraction OR manual entry
  const effectiveItemCount = Math.max(approvedItems.length, profileCoveredTypes?.size ?? 0)
  const itemCountScore = Math.min(100, Math.round((effectiveItemCount / metadata.requiredCount) * 100))

  // Type coverage score (0-100): What percentage of expected types are covered?
  // This now includes types covered by profile data
  const typeCoverageScore = mappedTypes.length > 0
    ? Math.round((coveredTypes.size / mappedTypes.length) * 100)
    : 100 // If no types mapped, don't penalize

  // Combined percentage: Take the LOWER of the two scores
  // This ensures 100% only when BOTH conditions are met:
  // - We have enough approved items OR profile data
  // - We have coverage of all expected types
  let percentage = Math.min(itemCountScore, typeCoverageScore)

  // Further reduce if there are pending items that could affect the section
  // (Pending items indicate work in progress, not yet complete)
  if (pendingItems.length > 0 && percentage >= 80) {
    // Cap at 90% if there are pending items awaiting review
    percentage = Math.min(percentage, 90)
  }

  return {
    section: '' as ProfileSection, // Will be set by caller
    percentage,
    approvedCount: approvedItems.length,
    pendingCount: pendingItems.length,
    requiredCount: metadata.requiredCount,
    missingTypes,
    // Breakdown details
    itemCountScore,
    typeCoverageScore,
    coveredTypesCount: coveredTypes.size,
    totalTypesCount: mappedTypes.length,
  }
}

// Helper to calculate overall profile completeness
// Now accepts optional profile data to include manually-entered values in completeness calculation
export function calculateProfileCompleteness(
  grouped: GroupedProfileItems,
  businessProfile?: BusinessProfile | null,
  technicalProfile?: TechnicalProfile | null
): ProfileCompleteness {
  // Get types covered by manual profile entries
  const profileCovered = getProfileCoveredTypes(
    businessProfile ?? null,
    technicalProfile ?? null
  )

  const businessSections: Record<BusinessProfileSection, SectionCompleteness> = {} as Record<
    BusinessProfileSection,
    SectionCompleteness
  >
  let businessTotal = 0

  for (const [section, items] of Object.entries(grouped.business)) {
    const sectionKey = section as BusinessProfileSection
    const metadata = BUSINESS_SECTION_METADATA[sectionKey]
    const types = BUSINESS_PROFILE_MAPPING[sectionKey]
    const completeness = calculateSectionCompleteness(
      items,
      metadata,
      types,
      profileCovered.business[sectionKey]
    )
    completeness.section = sectionKey
    businessSections[sectionKey] = completeness
    businessTotal += completeness.percentage
  }

  const technicalSections: Record<TechnicalProfileSection, SectionCompleteness> = {} as Record<
    TechnicalProfileSection,
    SectionCompleteness
  >
  let technicalTotal = 0

  for (const [section, items] of Object.entries(grouped.technical)) {
    const sectionKey = section as TechnicalProfileSection
    const metadata = TECHNICAL_SECTION_METADATA[sectionKey]
    const types = TECHNICAL_PROFILE_MAPPING[sectionKey]
    const completeness = calculateSectionCompleteness(
      items,
      metadata,
      types,
      profileCovered.technical[sectionKey]
    )
    completeness.section = sectionKey
    technicalSections[sectionKey] = completeness
    technicalTotal += completeness.percentage
  }

  const businessSectionCount = Object.keys(BUSINESS_SECTION_METADATA).length
  const technicalSectionCount = Object.keys(TECHNICAL_SECTION_METADATA).length

  return {
    business: {
      overall: Math.round(businessTotal / businessSectionCount),
      sections: businessSections,
    },
    technical: {
      overall: Math.round(technicalTotal / technicalSectionCount),
      sections: technicalSections,
    },
  }
}

// Generate test cases from extracted items and scope items
export function generateTestCases(
  extractedItems: ExtractedItemWithSession[],
  scopeItems: DEWorkspaceScopeItem[]
): TestCase[] {
  const testCases: TestCase[] = []

  // Generate happy path tests from HAPPY_PATH_STEP items
  const happyPathItems = extractedItems.filter((i) => i.type === 'HAPPY_PATH_STEP' && i.status === 'APPROVED')
  happyPathItems.forEach((item, index) => {
    testCases.push({
      id: `hp-${item.id}`,
      type: 'happy_path',
      title: `Happy Path Step ${index + 1}: ${item.content.substring(0, 50)}...`,
      description: item.content,
      steps: [`Execute: ${item.content}`],
      expectedOutcome: 'Process completes successfully',
      sourceType: 'extracted',
      sourceId: item.id,
      sourceContent: item.sourceQuote || undefined,
      coverage: 'covered',
    })
  })

  // Generate exception tests from EXCEPTION_CASE items
  const exceptionItems = extractedItems.filter((i) => i.type === 'EXCEPTION_CASE' && i.status === 'APPROVED')
  exceptionItems.forEach((item) => {
    testCases.push({
      id: `ex-${item.id}`,
      type: 'exception',
      title: `Exception: ${item.content.substring(0, 50)}...`,
      description: item.content,
      steps: [`Trigger exception: ${item.content}`],
      expectedOutcome: 'Exception handled correctly (escalate or specific handling)',
      sourceType: 'extracted',
      sourceId: item.id,
      sourceContent: item.sourceQuote || undefined,
      coverage: 'covered',
    })
  })

  // Generate guardrail tests from GUARDRAIL_NEVER and GUARDRAIL_ALWAYS items
  const guardrailNeverItems = extractedItems.filter((i) => i.type === 'GUARDRAIL_NEVER' && i.status === 'APPROVED')
  guardrailNeverItems.forEach((item) => {
    testCases.push({
      id: `gn-${item.id}`,
      type: 'guardrail',
      title: `Guardrail (NEVER): ${item.content.substring(0, 50)}...`,
      description: `Verify DE never: ${item.content}`,
      steps: [`Attempt to trigger forbidden behavior: ${item.content}`],
      expectedOutcome: 'DE refuses or escalates - does NOT perform forbidden action',
      sourceType: 'extracted',
      sourceId: item.id,
      sourceContent: item.sourceQuote || undefined,
      coverage: 'covered',
    })
  })

  const guardrailAlwaysItems = extractedItems.filter((i) => i.type === 'GUARDRAIL_ALWAYS' && i.status === 'APPROVED')
  guardrailAlwaysItems.forEach((item) => {
    testCases.push({
      id: `ga-${item.id}`,
      type: 'guardrail',
      title: `Guardrail (ALWAYS): ${item.content.substring(0, 50)}...`,
      description: `Verify DE always: ${item.content}`,
      steps: [`Trigger scenario requiring: ${item.content}`],
      expectedOutcome: 'DE performs required action',
      sourceType: 'extracted',
      sourceId: item.id,
      sourceContent: item.sourceQuote || undefined,
      coverage: 'covered',
    })
  })

  // Generate scope tests from IN_SCOPE scope items
  const inScopeItems = scopeItems.filter((s) => s.classification === 'IN_SCOPE')
  inScopeItems.forEach((item) => {
    testCases.push({
      id: `si-${item.id}`,
      type: 'scope',
      title: `In Scope: ${item.statement.substring(0, 50)}...`,
      description: item.statement,
      steps: [`Request: ${item.statement}`],
      expectedOutcome: 'DE handles the request correctly',
      sourceType: 'scope_item',
      sourceId: item.id,
      coverage: 'covered',
    })
  })

  // Generate boundary tests from OUT_OF_SCOPE scope items
  const outOfScopeItems = scopeItems.filter((s) => s.classification === 'OUT_OF_SCOPE')
  outOfScopeItems.forEach((item) => {
    testCases.push({
      id: `so-${item.id}`,
      type: 'boundary',
      title: `Out of Scope: ${item.statement.substring(0, 50)}...`,
      description: item.statement,
      steps: [`Request: ${item.statement}`],
      expectedOutcome: 'DE declines or escalates - does NOT attempt to handle',
      sourceType: 'scope_item',
      sourceId: item.id,
      coverage: 'covered',
    })
  })

  return testCases
}
