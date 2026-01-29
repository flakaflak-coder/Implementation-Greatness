// Type definitions that extend Prisma types with computed fields

import type {
  Company,
  DigitalEmployee,
  DesignWeek,
  Session,
  ScopeItem,
  Scenario,
  KPI,
  Integration,
  EscalationRule,
  Evidence,
} from '@prisma/client'

// Extended types with relations
export type CompanyWithRelations = Company & {
  digitalEmployees: DigitalEmployeeWithRelations[]
}

export type DigitalEmployeeWithRelations = DigitalEmployee & {
  company: Company
  designWeek: DesignWeekWithRelations | null
}

export type DesignWeekWithRelations = DesignWeek & {
  digitalEmployee: DigitalEmployee & { company: Company }
  sessions: SessionWithRelations[]
  scopeItems: ScopeItemWithEvidence[]
  scenarios: ScenarioWithRelations[]
  kpis: KPIWithEvidence[]
  integrations: IntegrationWithEvidence[]
  escalationRules: EscalationRuleWithEvidence[]
}

export type SessionWithRelations = Session & {
  materials: Material[]
  extractions: Extraction[]
}

export type ScopeItemWithEvidence = ScopeItem & {
  evidence: Evidence[]
}

export type ScenarioWithRelations = Scenario & {
  steps: ScenarioStep[]
  edgeCases: EdgeCase[]
  evidence: Evidence[]
}

export type KPIWithEvidence = KPI & {
  evidence: Evidence[]
}

export type IntegrationWithEvidence = Integration & {
  evidence: Evidence[]
}

export type EscalationRuleWithEvidence = EscalationRule & {
  evidence: Evidence[]
}

// Import remaining types
import type {
  Material,
  Extraction,
  ScenarioStep,
  EdgeCase,
} from '@prisma/client'

// Completeness report
export interface CompletenessReport {
  overallScore: number
  byCategory: {
    scope: CategoryCompleteness
    scenarios: CategoryCompleteness
    kpis: CategoryCompleteness
    integrations: CategoryCompleteness
    escalation: CategoryCompleteness
  }
  blockingItems: BlockingItem[]
  warnings: string[]
  readyForSignoff: boolean
}

export interface CategoryCompleteness {
  score: number
  total: number
  confirmed: number
  ambiguous: number
  assessment: string
}

export interface BlockingItem {
  type: string
  description: string
  extractionId?: string
  suggestedResolution: string
}

// Agenda item for next session
export interface AgendaItem {
  priority: number
  topic: string
  questions: string[]
  estimatedTime?: string
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Form types
export interface CreateCompanyInput {
  name: string
  industry?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
}

export interface CreateDigitalEmployeeInput {
  companyId: string
  name: string
  description?: string
  channels: string[]
}

export interface CreateSessionInput {
  designWeekId: string
  phase: number
  date: Date
  recordingUrl?: string
}

export interface ResolveScopeItemInput {
  scopeItemId: string
  classification: 'IN_SCOPE' | 'OUT_OF_SCOPE'
  notes?: string
}
