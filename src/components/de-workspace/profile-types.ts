/**
 * Type definitions for the fixed-field Business Profile
 * These represent the structured profile data, separate from raw ExtractedItems
 */

// ============================================
// Identity Section
// ============================================
export interface Stakeholder {
  id: string
  name: string
  role: string
  email?: string
  isDecisionMaker?: boolean
}

export interface IdentitySection {
  name: string
  description: string
  stakeholders: Stakeholder[]
}

// ============================================
// Business Context Section
// ============================================
export interface BusinessContextSection {
  problemStatement: string
  // Volume - normalized to monthly
  volumePerMonth: number | null
  volumeOriginalValue: number | null // Original value as stated in document
  volumeOriginalUnit: string // 'cases/day' | 'cases/week' | 'cases/month' | 'cases/year'
  volumeCalculationNote: string | null // e.g., "500/day × 22 working days = 11,000/month"
  // Cost
  costPerCase: number | null
  totalMonthlyCost: number | null // costPerCase × volumePerMonth
  currency: string // 'EUR' | 'USD'
  costCalculationNote: string | null
  // Other
  peakPeriods: string[]
  painPoints: string[]
}

// ============================================
// KPIs Section
// ============================================
export interface KPI {
  id: string
  name: string
  description?: string
  targetValue: string
  currentValue?: string
  unit: string // '%' | 'minutes' | 'hours' | 'cases'
  frequency?: string // 'daily' | 'weekly' | 'monthly'
}

// ============================================
// Channels Section
// ============================================
export interface Channel {
  id: string
  name: string
  type: 'email' | 'chat' | 'phone' | 'portal' | 'api' | 'other'
  volumePercentage: number
  sla: string
  rules?: string[]
}

// ============================================
// Skills Section
// ============================================
export type SkillType =
  | 'answer'
  | 'route'
  | 'approve_reject'
  | 'request_info'
  | 'notify'
  | 'other'

export interface Skill {
  id: string
  type: SkillType
  name: string
  description: string
  knowledgeSources?: string[]
  rules?: string[]
}

export interface CommunicationStyle {
  tone: string[]
  languages: string[]
  formality: 'formal' | 'casual' | 'mixed'
}

export interface SkillsSection {
  skills: Skill[]
  communicationStyle: CommunicationStyle
}

// ============================================
// Process Section
// ============================================
export interface ProcessStep {
  id: string
  order: number
  title: string
  description: string
  isDecisionPoint?: boolean
}

export interface ExceptionCase {
  id: string
  trigger: string
  action: string
  escalateTo?: string
}

export interface CaseType {
  id: string
  name: string
  volumePercent: number
  complexity: 'LOW' | 'MEDIUM' | 'HIGH'
  automatable: boolean
  description?: string
}

export interface ProcessSection {
  happyPathSteps: ProcessStep[]
  exceptions: ExceptionCase[]
  escalationRules: string[]
  caseTypes: CaseType[]
}

// ============================================
// Scope Section
// ============================================
export interface ScopeItem {
  id: string
  statement: string
  conditions?: string
}

export interface ScopeSection {
  inScope: ScopeItem[]
  outOfScope: ScopeItem[]
}

// ============================================
// Guardrails Section
// ============================================
export interface FinancialLimit {
  id: string
  type: string // 'max_approval' | 'max_refund' | 'daily_limit'
  amount: number
  currency: string
}

export interface GuardrailsSection {
  never: string[]
  always: string[]
  financialLimits: FinancialLimit[]
  legalRestrictions: string[]
}

// ============================================
// Complete Business Profile
// ============================================
export interface BusinessProfile {
  identity: IdentitySection
  businessContext: BusinessContextSection
  kpis: KPI[]
  channels: Channel[]
  skills: SkillsSection
  process: ProcessSection
  scope: ScopeSection
  guardrails: GuardrailsSection
}

// ============================================
// Profile Field Metadata
// ============================================
export interface ProfileFieldMeta {
  label: string
  placeholder: string
  helpText?: string
  required?: boolean
  sourceType?: string // Which ExtractedItemType this maps from
}

export const PROFILE_FIELD_META: Record<string, ProfileFieldMeta> = {
  // Identity
  'identity.name': {
    label: 'DE Name',
    placeholder: 'e.g., Claims Intake Assistant',
    required: true,
  },
  'identity.description': {
    label: 'Description',
    placeholder: 'What does this Digital Employee do?',
    required: true,
  },

  // Business Context
  'businessContext.problemStatement': {
    label: 'Problem Statement',
    placeholder: 'What problem is being solved?',
    helpText: 'Describe the current pain point this DE addresses',
    sourceType: 'BUSINESS_CASE',
  },
  'businessContext.volumePerMonth': {
    label: 'Monthly Volume',
    placeholder: '11000',
    helpText: 'Normalized to cases per month',
    sourceType: 'VOLUME_EXPECTATION',
  },
  'businessContext.costPerCase': {
    label: 'Cost per Case',
    placeholder: '12.50',
    sourceType: 'COST_PER_CASE',
  },
  'businessContext.totalMonthlyCost': {
    label: 'Total Monthly Cost',
    placeholder: 'Auto-calculated',
    helpText: 'Cost per case × Monthly volume',
    sourceType: 'COST_PER_CASE',
  },
  'businessContext.peakPeriods': {
    label: 'Peak Periods',
    placeholder: 'Add peak period...',
    sourceType: 'PEAK_PERIODS',
  },
}

// ============================================
// Section Icons & Colors
// ============================================
export const PROFILE_SECTION_CONFIG = {
  identity: {
    title: 'Identity',
    icon: 'Bot',
    color: 'indigo',
    description: 'Who is this Digital Employee?',
  },
  businessContext: {
    title: 'Business Context',
    icon: 'Target',
    color: 'blue',
    description: 'Problem, volumes, and costs',
  },
  kpis: {
    title: 'Success Metrics',
    icon: 'TrendingUp',
    color: 'emerald',
    description: 'KPIs and targets',
  },
  channels: {
    title: 'Channels',
    icon: 'MessageSquare',
    color: 'cyan',
    description: 'Input channels and SLAs',
  },
  skills: {
    title: 'Skills & Capabilities',
    icon: 'Sparkles',
    color: 'violet',
    description: 'What the DE can do',
  },
  process: {
    title: 'Process Flow',
    icon: 'GitBranch',
    color: 'amber',
    description: 'Happy path, exceptions, and case types',
  },
  scope: {
    title: 'Scope',
    icon: 'CheckSquare',
    color: 'teal',
    description: 'What the DE will and will not handle',
  },
  guardrails: {
    title: 'Guardrails',
    icon: 'Shield',
    color: 'rose',
    description: 'Rules and restrictions',
  },
} as const

// ============================================
// TECHNICAL PROFILE TYPES
// ============================================

// Integration
export type IntegrationType = 'api' | 'database' | 'webhook' | 'file' | 'other'
export type AuthMethod = 'oauth' | 'api_key' | 'basic' | 'certificate' | 'none'
export type IntegrationStatus = 'identified' | 'spec_complete' | 'credentials_received' | 'tested' | 'ready'

export interface Integration {
  id: string
  systemName: string
  purpose: string
  type: IntegrationType
  endpoint?: string
  authMethod: AuthMethod
  authOwner?: string
  fieldsRead: string[]
  fieldsWrite: string[]
  rateLimits?: string
  errorHandling?: string
  status: IntegrationStatus
  technicalContact?: string
}

// Data Field
export interface DataField {
  id: string
  name: string
  source: string // Which system it comes from
  type: string // 'string' | 'number' | 'date' | 'boolean' | 'object'
  required: boolean
  description?: string
  sampleValue?: string
  validation?: string
}

// API Endpoint
export interface APIEndpoint {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  requestFormat?: string
  responseFormat?: string
  rateLimit?: string
}

// Security Requirement
export interface SecurityRequirement {
  id: string
  category: 'authentication' | 'authorization' | 'encryption' | 'compliance' | 'data_handling' | 'other'
  requirement: string
  implementation?: string
  owner?: string
  status: 'identified' | 'implemented' | 'verified'
}

// Technical Contact
export interface TechnicalContact {
  id: string
  name: string
  role: string
  system: string
  email?: string
  phone?: string
}

// Complete Technical Profile
export interface TechnicalProfile {
  integrations: Integration[]
  dataFields: DataField[]
  apiEndpoints: APIEndpoint[]
  securityRequirements: SecurityRequirement[]
  technicalContacts: TechnicalContact[]
  notes: string[]
}

// Technical Section Config
export const TECHNICAL_SECTION_CONFIG = {
  integrations: {
    title: 'System Integrations',
    icon: 'Plug',
    color: 'violet',
    description: 'Connected systems and APIs',
  },
  dataFields: {
    title: 'Data Fields',
    icon: 'Database',
    color: 'blue',
    description: 'Data elements and schemas',
  },
  apiEndpoints: {
    title: 'API Endpoints',
    icon: 'Globe',
    color: 'cyan',
    description: 'API specifications',
  },
  securityRequirements: {
    title: 'Security & Compliance',
    icon: 'ShieldCheck',
    color: 'rose',
    description: 'Security requirements and compliance',
  },
  technicalContacts: {
    title: 'Technical Contacts',
    icon: 'Users',
    color: 'emerald',
    description: 'System owners and contacts',
  },
} as const

// Empty Technical Profile Template
export function createEmptyTechnicalProfile(): TechnicalProfile {
  return {
    integrations: [],
    dataFields: [],
    apiEndpoints: [],
    securityRequirements: [],
    technicalContacts: [],
    notes: [],
  }
}

// ============================================
// TEST PLAN TYPES
// ============================================

export type TestCaseType = 'happy_path' | 'exception' | 'guardrail' | 'scope' | 'boundary'
export type TestCasePriority = 'critical' | 'high' | 'medium' | 'low'
export type TestCaseStatus = 'not_run' | 'pass' | 'fail' | 'blocked'

export interface TestCase {
  id: string
  name: string
  type: TestCaseType
  priority: TestCasePriority
  status: TestCaseStatus
  preconditions?: string
  steps: string[]
  expectedResult: string
  actualResult?: string
  notes?: string
  sourceItemId?: string // Link to extracted item if auto-generated
  testedBy?: string
  testedAt?: string
}

export interface TestPlan {
  testCases: TestCase[]
  coverageGoal: number // Target percentage (e.g., 80)
  lastUpdated?: string
  notes: string[]
}

// Test Plan Section Config
export const TEST_PLAN_SECTION_CONFIG = {
  happy_path: {
    title: 'Happy Path Tests',
    icon: 'CheckCircle',
    color: 'emerald',
    description: 'Verify standard workflows complete successfully',
  },
  exception: {
    title: 'Exception Tests',
    icon: 'AlertTriangle',
    color: 'amber',
    description: 'Verify exception scenarios are handled correctly',
  },
  guardrail: {
    title: 'Guardrail Tests',
    icon: 'Shield',
    color: 'red',
    description: 'Verify the DE respects boundaries and restrictions',
  },
  scope: {
    title: 'Scope Tests',
    icon: 'CheckSquare',
    color: 'blue',
    description: 'Verify in-scope items are handled correctly',
  },
  boundary: {
    title: 'Boundary Tests',
    icon: 'XSquare',
    color: 'violet',
    description: 'Verify out-of-scope items are rejected or escalated',
  },
} as const

export const TEST_PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
} as const

export const TEST_STATUS_CONFIG = {
  not_run: { label: 'Not Run', color: 'bg-gray-100 text-gray-600' },
  pass: { label: 'Pass', color: 'bg-emerald-100 text-emerald-700' },
  fail: { label: 'Fail', color: 'bg-red-100 text-red-700' },
  blocked: { label: 'Blocked', color: 'bg-amber-100 text-amber-700' },
} as const

// Empty Test Plan Template
export function createEmptyTestPlan(): TestPlan {
  return {
    testCases: [],
    coverageGoal: 80,
    notes: [],
  }
}

// ============================================
// Empty Business Profile Template
// ============================================
export function createEmptyProfile(): BusinessProfile {
  return {
    identity: {
      name: '',
      description: '',
      stakeholders: [],
    },
    businessContext: {
      problemStatement: '',
      volumePerMonth: null,
      volumeOriginalValue: null,
      volumeOriginalUnit: '',
      volumeCalculationNote: null,
      costPerCase: null,
      totalMonthlyCost: null,
      currency: 'EUR',
      costCalculationNote: null,
      peakPeriods: [],
      painPoints: [],
    },
    kpis: [],
    channels: [],
    skills: {
      skills: [],
      communicationStyle: {
        tone: [],
        languages: ['Dutch'],
        formality: 'formal',
      },
    },
    process: {
      happyPathSteps: [],
      exceptions: [],
      escalationRules: [],
      caseTypes: [],
    },
    scope: {
      inScope: [],
      outOfScope: [],
    },
    guardrails: {
      never: [],
      always: [],
      financialLimits: [],
      legalRestrictions: [],
    },
  }
}
