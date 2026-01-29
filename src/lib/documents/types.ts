/**
 * Document Export Types
 *
 * Structured types for generating professional PDF documents
 */

export type DocumentType = 'DE_DESIGN' | 'SOLUTION_DESIGN' | 'TEST_PLAN'

export interface DocumentMetadata {
  title: string
  subtitle?: string
  version: string
  date: string
  author: string
  company: string
  digitalEmployeeName: string
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED'
  completenessScore: number
}

export interface StakeholderInfo {
  name: string
  role: string
  email?: string
  company?: string
  isKeyDecisionMaker?: boolean
}

export interface GoalInfo {
  title: string
  description: string
  priority?: 'high' | 'medium' | 'low'
  targetDate?: string
}

export interface KPIInfo {
  name: string
  target: string
  currentValue?: string
  unit?: string
  frequency?: string
}

export interface VolumeInfo {
  metric: string
  value: string
  period: string
  peakPeriods?: string[]
}

export interface ProcessStep {
  stepNumber: number
  name: string
  description: string
  owner?: string
  systemsUsed?: string[]
  duration?: string
  isAutomatable?: boolean
}

export interface ExceptionCase {
  name: string
  description: string
  frequency?: string
  handling: string
  escalationRequired?: boolean
}

export interface ScopeItem {
  id: string
  description: string
  classification: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS'
  skill?: string
  conditions?: string
  notes?: string
}

export interface GuardrailInfo {
  type: 'NEVER' | 'ALWAYS' | 'FINANCIAL_LIMIT' | 'LEGAL' | 'COMPLIANCE'
  description: string
  consequence?: string
}

export interface IntegrationInfo {
  systemName: string
  purpose: 'read' | 'write' | 'read_write'
  connectionType: string
  authMethod?: string
  dataFields?: string[]
  notes?: string
}

export interface BusinessRule {
  name: string
  category: string
  condition: string
  action: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  exceptions?: string
}

export interface TestCase {
  id: string
  name: string
  type: 'happy_path' | 'exception' | 'guardrail' | 'scope' | 'boundary'
  priority: 'critical' | 'high' | 'medium' | 'low'
  preconditions?: string
  steps: string[]
  expectedResult: string
  coverage: 'covered' | 'partial' | 'missing'
}

// Main document structure
export interface DEDesignDocument {
  metadata: DocumentMetadata
  executiveSummary: {
    overview: string
    keyObjectives: string[]
    timeline?: string
  }
  stakeholders: StakeholderInfo[]
  businessContext: {
    goals: GoalInfo[]
    kpis: KPIInfo[]
    volumes: VolumeInfo[]
    painPoints?: string[]
  }
  processDesign: {
    asIsSteps?: ProcessStep[]
    toBeSteps: ProcessStep[]
    exceptions: ExceptionCase[]
    decisionPoints?: string[]
  }
  scope: {
    inScope: ScopeItem[]
    outOfScope: ScopeItem[]
    ambiguous: ScopeItem[]
    guardrails: GuardrailInfo[]
  }
  technicalRequirements: {
    integrations: IntegrationInfo[]
    dataFields?: string[]
    securityRequirements?: string[]
    channels?: string[]
  }
  businessRules: BusinessRule[]
  testPlan?: {
    testCases: TestCase[]
    coverageSummary: {
      total: number
      covered: number
      partial: number
      missing: number
    }
  }
  appendix?: {
    sourceDocuments?: string[]
    glossary?: Record<string, string>
    openItems?: string[]
  }
}

// Color scheme for PDF
export const DOCUMENT_COLORS = {
  primary: '#4F46E5', // Indigo-600
  secondary: '#6366F1', // Indigo-500
  success: '#10B981', // Emerald-500
  warning: '#F59E0B', // Amber-500
  danger: '#EF4444', // Red-500
  text: '#1F2937', // Gray-800
  textLight: '#6B7280', // Gray-500
  border: '#E5E7EB', // Gray-200
  background: '#F9FAFB', // Gray-50
  white: '#FFFFFF',
}

// Font sizes for PDF
export const DOCUMENT_FONTS = {
  title: 24,
  subtitle: 18,
  heading1: 16,
  heading2: 14,
  heading3: 12,
  body: 10,
  small: 9,
  tiny: 8,
}
