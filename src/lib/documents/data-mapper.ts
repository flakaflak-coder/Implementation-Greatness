/**
 * Data Mapper
 *
 * Transforms extracted items and profiles into the document structure
 */

import type {
  DEDesignDocument,
  DocumentMetadata,
  StakeholderInfo,
  GoalInfo,
  KPIInfo,
  VolumeInfo,
  ProcessStep,
  ExceptionCase,
  ScopeItem,
  GuardrailInfo,
  IntegrationInfo,
  BusinessRule,
  TestCase,
} from './types'

interface ExtractedItem {
  id: string
  type: string
  content: string
  rawJson?: Record<string, unknown> | null
  confidence?: number
  status?: string
}

interface ScopeItemData {
  id: string
  description: string
  classification: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS'
  skill?: string | null
  conditions?: string | null
  notes?: string | null
}

interface IntegrationData {
  id: string
  systemName: string
  purpose: string
  connectionType: string
  authMethod?: string | null
  notes?: string | null
}

interface BusinessRuleData {
  id: string
  name: string
  category: string
  condition: string
  action: string
  priority: string
}

interface TestCaseData {
  id: string
  name: string
  type: string
  priority: string
  preconditions?: string | null
  steps: string[]
  expectedResult: string
}

interface DesignWeekData {
  id: string
  digitalEmployee: {
    id: string
    name: string
    description?: string | null
    company: {
      name: string
    }
  }
  sessions: Array<{
    extractedItems: ExtractedItem[]
  }>
  scopeItems: ScopeItemData[]
  integrations: IntegrationData[]
  businessRules: BusinessRuleData[]
  testCases: TestCaseData[]
  businessProfile?: Record<string, unknown> | null
  technicalProfile?: Record<string, unknown> | null
}

/**
 * Map design week data to document structure
 */
export function mapToDocument(data: DesignWeekData): DEDesignDocument {
  // Flatten all extracted items from all sessions
  const allItems = data.sessions.flatMap(s => s.extractedItems || [])
  const approvedItems = allItems.filter(item => item.status === 'APPROVED' || !item.status)

  // Extract by type
  const getItemsByType = (type: string) =>
    approvedItems.filter(item => item.type === type)

  // Build metadata
  const metadata: DocumentMetadata = {
    title: `${data.digitalEmployee.name} Design Document`,
    subtitle: data.digitalEmployee.description || undefined,
    version: '1.0',
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    author: 'Freeday Implementation Team',
    company: data.digitalEmployee.company.name,
    digitalEmployeeName: data.digitalEmployee.name,
    status: 'DRAFT',
    completenessScore: calculateCompleteness(data),
  }

  // Map stakeholders
  const stakeholders: StakeholderInfo[] = getItemsByType('STAKEHOLDER').map(item => {
    const raw = item.rawJson as Record<string, string> | undefined
    return {
      name: raw?.name || item.content.split(' - ')[0] || item.content,
      role: raw?.role || item.content.split(' - ')[1] || 'Stakeholder',
      email: raw?.email,
      company: raw?.company,
      isKeyDecisionMaker: raw?.isKeyDecisionMaker === 'true' || item.content.toLowerCase().includes('decision maker'),
    }
  })

  // Map goals
  const goals: GoalInfo[] = getItemsByType('GOAL').map(item => {
    const raw = item.rawJson as Record<string, string> | undefined
    return {
      title: raw?.title || extractTitle(item.content),
      description: raw?.description || item.content,
      priority: (raw?.priority as GoalInfo['priority']) || 'medium',
    }
  })

  // Map KPIs
  const kpis: KPIInfo[] = getItemsByType('KPI_TARGET').map(item => {
    const raw = item.rawJson as Record<string, string> | undefined
    return {
      name: raw?.name || extractTitle(item.content),
      target: raw?.target || extractValue(item.content) || item.content,
      unit: raw?.unit,
      frequency: raw?.frequency,
    }
  })

  // Map volumes
  const volumes: VolumeInfo[] = getItemsByType('VOLUME_EXPECTATION').map(item => {
    const raw = item.rawJson as Record<string, string> | undefined
    return {
      metric: raw?.metric || extractTitle(item.content),
      value: raw?.value || extractValue(item.content) || item.content,
      period: raw?.period || 'monthly',
    }
  })

  // Map process steps (To-Be)
  const happyPathSteps = getItemsByType('HAPPY_PATH_STEP')
  const toBeSteps: ProcessStep[] = happyPathSteps.map((item, index) => {
    const raw = item.rawJson as Record<string, unknown> | undefined
    return {
      stepNumber: (raw?.stepNumber as number) || index + 1,
      name: (raw?.name as string) || extractTitle(item.content),
      description: (raw?.description as string) || item.content,
      owner: raw?.owner as string | undefined,
      isAutomatable: (raw?.isAutomatable as boolean) || item.content.toLowerCase().includes('automat'),
    }
  })

  // Map exceptions
  const exceptions: ExceptionCase[] = getItemsByType('EXCEPTION_CASE').map(item => {
    const raw = item.rawJson as Record<string, string> | undefined
    return {
      name: raw?.name || extractTitle(item.content),
      description: raw?.description || item.content,
      handling: raw?.handling || 'Escalate to human operator',
      frequency: raw?.frequency,
      escalationRequired: raw?.escalationRequired === 'true' || item.content.toLowerCase().includes('escalat'),
    }
  })

  // Map scope items
  const inScope: ScopeItem[] = data.scopeItems
    .filter(item => item.classification === 'IN_SCOPE')
    .map(item => ({
      id: item.id,
      description: item.description,
      classification: item.classification,
      skill: item.skill || undefined,
      conditions: item.conditions || undefined,
      notes: item.notes || undefined,
    }))

  const outOfScope: ScopeItem[] = data.scopeItems
    .filter(item => item.classification === 'OUT_OF_SCOPE')
    .map(item => ({
      id: item.id,
      description: item.description,
      classification: item.classification,
      notes: item.notes || undefined,
    }))

  const ambiguous: ScopeItem[] = data.scopeItems
    .filter(item => item.classification === 'AMBIGUOUS')
    .map(item => ({
      id: item.id,
      description: item.description,
      classification: item.classification,
      notes: item.notes || undefined,
    }))

  // Map guardrails
  const guardrails: GuardrailInfo[] = [
    ...getItemsByType('GUARDRAIL_NEVER').map(item => ({
      type: 'NEVER' as const,
      description: item.content,
    })),
    ...getItemsByType('GUARDRAIL_ALWAYS').map(item => ({
      type: 'ALWAYS' as const,
      description: item.content,
    })),
    ...getItemsByType('FINANCIAL_LIMIT').map(item => ({
      type: 'FINANCIAL_LIMIT' as const,
      description: item.content,
    })),
    ...getItemsByType('LEGAL_RESTRICTION').map(item => ({
      type: 'LEGAL' as const,
      description: item.content,
    })),
    ...getItemsByType('COMPLIANCE_REQUIREMENT').map(item => ({
      type: 'COMPLIANCE' as const,
      description: item.content,
    })),
  ]

  // Map integrations
  const integrations: IntegrationInfo[] = data.integrations.map(item => ({
    systemName: item.systemName,
    purpose: item.purpose as 'read' | 'write' | 'read_write',
    connectionType: item.connectionType,
    authMethod: item.authMethod || undefined,
    notes: item.notes || undefined,
  }))

  // Add integrations from extracted items if none in dedicated table
  if (integrations.length === 0) {
    getItemsByType('SYSTEM_INTEGRATION').forEach(item => {
      const raw = item.rawJson as Record<string, string> | undefined
      integrations.push({
        systemName: raw?.systemName || extractTitle(item.content),
        purpose: (raw?.purpose as 'read' | 'write' | 'read_write') || 'read_write',
        connectionType: raw?.connectionType || 'rest_api',
        notes: item.content,
      })
    })
  }

  // Map business rules
  const businessRules: BusinessRule[] = data.businessRules.map(item => ({
    name: item.name,
    category: item.category,
    condition: item.condition,
    action: item.action,
    priority: item.priority as 'critical' | 'high' | 'medium' | 'low',
  }))

  // Add business rules from extracted items
  getItemsByType('BUSINESS_RULE').forEach(item => {
    const raw = item.rawJson as Record<string, string> | undefined
    businessRules.push({
      name: raw?.name || extractTitle(item.content),
      category: raw?.category || 'other',
      condition: raw?.condition || item.content,
      action: raw?.action || 'Apply rule',
      priority: (raw?.priority as 'critical' | 'high' | 'medium' | 'low') || 'medium',
    })
  })

  // Map test cases
  const testCases: TestCase[] = data.testCases.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type as TestCase['type'],
    priority: item.priority as TestCase['priority'],
    preconditions: item.preconditions || undefined,
    steps: item.steps,
    expectedResult: item.expectedResult,
    coverage: 'covered' as const,
  }))

  // Build executive summary
  const painPoints = getItemsByType('BUSINESS_CASE').map(item => item.content)
  const executiveSummary = {
    overview: buildExecutiveSummary(data, goals, painPoints),
    keyObjectives: goals.slice(0, 5).map(g => g.title),
    timeline: getItemsByType('TIMELINE_CONSTRAINT')[0]?.content,
  }

  // Get security requirements
  const securityRequirements = getItemsByType('SECURITY_REQUIREMENT').map(item => item.content)

  // Get channels
  const channels = getItemsByType('CHANNEL').map(item => item.content)

  return {
    metadata,
    executiveSummary,
    stakeholders,
    businessContext: {
      goals,
      kpis,
      volumes,
      painPoints: painPoints.slice(0, 5),
    },
    processDesign: {
      toBeSteps,
      exceptions,
      decisionPoints: getItemsByType('DECISION').map(item => item.content),
    },
    scope: {
      inScope,
      outOfScope,
      ambiguous,
      guardrails,
    },
    technicalRequirements: {
      integrations,
      securityRequirements: securityRequirements.length > 0 ? securityRequirements : undefined,
      channels: channels.length > 0 ? channels : undefined,
    },
    businessRules,
    testPlan: testCases.length > 0 ? {
      testCases,
      coverageSummary: {
        total: testCases.length,
        covered: testCases.filter(tc => tc.coverage === 'covered').length,
        partial: testCases.filter(tc => tc.coverage === 'partial').length,
        missing: testCases.filter(tc => tc.coverage === 'missing').length,
      },
    } : undefined,
  }
}

/**
 * Helper: Extract title from content
 */
function extractTitle(content: string): string {
  // Try to get text before first colon, dash, or newline
  const match = content.match(/^([^:\-\n]+)/)
  if (match) {
    return match[1].trim().slice(0, 100)
  }
  return content.slice(0, 100)
}

/**
 * Helper: Extract numeric value from content
 */
function extractValue(content: string): string | undefined {
  const match = content.match(/(\d[\d,\.]*\s*%?|\d[\d,\.]*\s*\w+)/)
  return match?.[1]
}

/**
 * Helper: Calculate completeness score
 */
function calculateCompleteness(data: DesignWeekData): number {
  let score = 0
  const allItems = data.sessions.flatMap(s => s.extractedItems || [])

  // Has stakeholders (10%)
  if (allItems.some(item => item.type === 'STAKEHOLDER')) score += 10

  // Has goals (15%)
  if (allItems.some(item => item.type === 'GOAL')) score += 15

  // Has KPIs (10%)
  if (allItems.some(item => item.type === 'KPI_TARGET')) score += 10

  // Has process steps (15%)
  if (allItems.some(item => item.type === 'HAPPY_PATH_STEP')) score += 15

  // Has scope items (15%)
  if (data.scopeItems.length > 0) score += 15

  // Has integrations (10%)
  if (data.integrations.length > 0 || allItems.some(item => item.type === 'SYSTEM_INTEGRATION')) score += 10

  // Has business rules (10%)
  if (data.businessRules.length > 0 || allItems.some(item => item.type === 'BUSINESS_RULE')) score += 10

  // Has test cases (10%)
  if (data.testCases.length > 0) score += 10

  // Has guardrails (5%)
  if (allItems.some(item => item.type.startsWith('GUARDRAIL_'))) score += 5

  return score
}

/**
 * Helper: Build executive summary
 */
function buildExecutiveSummary(
  data: DesignWeekData,
  goals: GoalInfo[],
  painPoints: string[]
): string {
  const deName = data.digitalEmployee.name
  const companyName = data.digitalEmployee.company.name

  const parts: string[] = [
    `This document outlines the design specifications for ${deName}, a Digital Employee being implemented for ${companyName}.`,
  ]

  if (goals.length > 0) {
    parts.push(`The primary objective is to ${goals[0].title.toLowerCase()}.`)
  }

  if (painPoints.length > 0) {
    parts.push(`This implementation addresses key business challenges including ${painPoints.slice(0, 2).join(' and ').toLowerCase()}.`)
  }

  return parts.join(' ')
}
