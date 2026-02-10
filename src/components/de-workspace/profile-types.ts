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
  owner?: string
  alertThreshold?: string
  actionTrigger?: string
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
  automationFeasibility?: 'full' | 'partial' | 'never'
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
// Persona & Conversational Design Section
// ============================================
export interface PersonaTrait {
  id: string
  name: string // e.g., "Helpful", "Clear", "Patient", "Honest", "Empathetic"
  description: string
  examplePhrase: string // e.g., "Let me see what I can find for you"
}

export interface ToneRule {
  id: string
  rule: string // e.g., "Max 15-20 words per sentence"
  category: 'reading_level' | 'formality' | 'sentence_structure' | 'vocabulary' | 'other'
  examples?: string
}

export interface DosAndDonts {
  id: string
  wrong: string // What NOT to say
  right: string // What to say instead
  category?: string // e.g., "tone", "clarity", "empathy"
}

export interface ExampleDialogue {
  id: string
  scenario: string // e.g., "Happy path: Simple question"
  category: 'happy_path' | 'clarification' | 'edge_case' | 'angry_customer' | 'complex'
  messages: DialogueMessage[]
}

export interface DialogueMessage {
  speaker: 'user' | 'de'
  text: string
}

export interface EscalationScript {
  id: string
  context: 'office_hours' | 'after_hours' | 'unknown_topic' | 'emotional' | 'other'
  label: string // Human-readable label
  script: string // Exact language to use
  includesContext: boolean // Whether conversation history is passed to agent
}

export interface PersonaSection {
  traits: PersonaTrait[]
  toneRules: ToneRule[]
  dosAndDonts: DosAndDonts[]
  openingMessage: string
  aiDisclaimer: string
  conversationStructure: string[] // Ordered steps: "Acknowledge", "Understand", etc.
  exampleDialogues: ExampleDialogue[]
  escalationScripts: EscalationScript[]
  edgeCaseResponses: EdgeCaseResponse[]
  feedbackMechanism: FeedbackMechanism
}

export interface EdgeCaseResponse {
  id: string
  trigger: string // e.g., "Profanity", "Spam", "Legal question", "Timeout"
  response: string // Exact response to use
}

export interface FeedbackMechanism {
  enabled: boolean
  methods: string[] // e.g., ["thumbs_up_down", "csat_1_5", "comment_field"]
  improvementCycle: string // e.g., "Weekly top-5 improvements reviewed by project team"
  owner?: string
}

// ============================================
// Monitoring & Launch Section
// ============================================
export interface MonitoringMetric {
  id: string
  name: string
  target: string
  perspective: 'user_experience' | 'operational' | 'knowledge_quality' | 'financial'
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  owner: string
  alertThreshold: string
  actionTrigger: string
  dataSource: string
}

export interface LaunchCriterion {
  id: string
  criterion: string
  phase: 'soft_launch' | 'full_launch' | 'hypercare'
  category: 'technical' | 'quality' | 'process' | 'stakeholder'
  owner: string
  status: 'pending' | 'met' | 'not_met' | 'waived'
  softTarget?: string // Lower threshold for soft launch
  fullTarget?: string // Full launch threshold
}

export interface DecisionTreeNode {
  id: string
  questionType: string // e.g., "Information request", "Status inquiry", "Complaint"
  volumePercent: number
  automationFeasibility: 'full' | 'partial' | 'never'
  action: string // What the DE should do
  escalate: boolean
  reason?: string // Why this routing decision
}

export interface MonitoringSection {
  metrics: MonitoringMetric[]
  dashboardViews: string[] // Who sees what
  reportingCycle: {
    daily: string
    weekly: string
    monthly: string
    quarterly: string
  }
}

export interface LaunchSection {
  criteria: LaunchCriterion[]
  decisionTree: DecisionTreeNode[]
  hypercare: {
    duration: string // e.g., "4 weeks"
    activities: string[]
    escalationSLAs: { priority: string; response: string; resolution: string }[]
  }
  killSwitch: string // Description of how to disable
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
  persona?: PersonaSection
  monitoring?: MonitoringSection
  launch?: LaunchSection
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
    color: 'sienna',
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
    color: 'sienna',
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
  persona: {
    title: 'Persona & Conversational Design',
    icon: 'MessageCircle',
    color: 'pink',
    description: 'Personality, tone, do\'s/don\'ts, escalation scripts',
  },
  monitoring: {
    title: 'Monitoring Framework',
    icon: 'BarChart3',
    color: 'orange',
    description: 'KPIs with owners, alerts, and reporting cycles',
  },
  launch: {
    title: 'Launch Readiness',
    icon: 'Rocket',
    color: 'green',
    description: 'Go/no-go criteria, soft launch, and hypercare',
  },
} as const

// ============================================
// SALES HANDOVER PROFILE TYPES
// ============================================

export interface SalesWatchOut {
  id: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  category: 'political' | 'technical' | 'timeline' | 'scope' | 'other'
}

export interface SalesDeadline {
  id: string
  date: string // ISO date string
  description: string
  type: 'contract' | 'go_live' | 'milestone' | 'review' | 'other'
  isHard: boolean // hard deadline vs aspirational
}

export interface PromisedCapability {
  id: string
  description: string
  source: string // where this was promised (proposal, meeting, etc.)
  priority: 'must_have' | 'should_have' | 'nice_to_have'
}

export interface SalesHandoverContext {
  dealSummary: string
  clientMotivation: string
  contractType: string
  contractValue: string
  salesOwner: string
}

export interface SalesSpecialNotes {
  clientPreferences: string[]
  internalNotes: string
  promisedCapabilities: PromisedCapability[]
  knownConstraints: string[]
}

export type HandoverStatus = 'draft' | 'submitted' | 'accepted' | 'changes_requested'

export interface SalesHandoverProfile {
  context: SalesHandoverContext
  watchOuts: SalesWatchOut[]
  deadlines: SalesDeadline[]
  specialNotes: SalesSpecialNotes
  stakeholders: Stakeholder[] // reuse existing Stakeholder type
  submittedBy: string
  submittedAt: string
  lastUpdatedAt: string
  // Handover status flow
  handoverStatus: HandoverStatus
  reviewedBy: string
  reviewedAt: string
  reviewComment: string
}

export const SALES_HANDOVER_SECTION_CONFIG = {
  context: {
    title: 'Context & Deal Summary',
    icon: 'FileSignature',
    color: 'blue',
    description: 'What is this implementation about?',
  },
  watchOuts: {
    title: 'Watch-Outs',
    icon: 'AlertTriangle',
    color: 'amber',
    description: 'What should we look out for?',
  },
  deadlines: {
    title: 'Deadlines',
    icon: 'Calendar',
    color: 'rose',
    description: 'Are there specific deadlines or contractual dates?',
  },
  specialNotes: {
    title: 'Special Notes & Promises',
    icon: 'Star',
    color: 'sienna',
    description: 'Anything else we should know?',
  },
  stakeholders: {
    title: 'Key Contacts',
    icon: 'Users',
    color: 'emerald',
    description: 'Who are the key people from the client side?',
  },
} as const

export function createEmptySalesHandoverProfile(): SalesHandoverProfile {
  return {
    context: {
      dealSummary: '',
      clientMotivation: '',
      contractType: '',
      contractValue: '',
      salesOwner: '',
    },
    watchOuts: [],
    deadlines: [],
    specialNotes: {
      clientPreferences: [],
      internalNotes: '',
      promisedCapabilities: [],
      knownConstraints: [],
    },
    stakeholders: [],
    submittedBy: '',
    submittedAt: '',
    lastUpdatedAt: '',
    handoverStatus: 'draft',
    reviewedBy: '',
    reviewedAt: '',
    reviewComment: '',
  }
}

// ============================================
// HANDOVER COMPLETENESS CALCULATION
// ============================================

export interface HandoverSectionScore {
  section: string
  label: string
  percentage: number
  maxWeight: number
  weightedScore: number
}

export interface HandoverCompleteness {
  overall: number // 0-100
  sections: HandoverSectionScore[]
}

export interface QualityCheckResult {
  rating: 'excellent' | 'good' | 'needs_work' | 'insufficient'
  summary: string
  missingItems: string[]
  suggestions: string[]
}

export function calculateHandoverCompleteness(
  profile: SalesHandoverProfile,
  checklistItems?: { isCompleted: boolean }[]
): HandoverCompleteness {
  const sections: HandoverSectionScore[] = []

  // Context section (25%): 5 fields × 5% each
  const contextFields = [
    profile.context.dealSummary,
    profile.context.clientMotivation,
    profile.context.contractType,
    profile.context.contractValue,
    profile.context.salesOwner,
  ]
  const contextFilled = contextFields.filter((f) => f && f.trim().length > 0).length
  const contextPct = Math.round((contextFilled / 5) * 100)
  sections.push({
    section: 'context',
    label: 'Context & Deal',
    percentage: contextPct,
    maxWeight: 25,
    weightedScore: Math.round(contextPct * 0.25),
  })

  // Watch-Outs (15%): 50% for ≥1 item, 50% if all have descriptions
  let watchOutPct = 0
  if (profile.watchOuts.length > 0) {
    watchOutPct += 50
    const allDescribed = profile.watchOuts.every((w) => w.description && w.description.trim().length > 0)
    if (allDescribed) watchOutPct += 50
  }
  sections.push({
    section: 'watchOuts',
    label: 'Watch-Outs',
    percentage: watchOutPct,
    maxWeight: 15,
    weightedScore: Math.round(watchOutPct * 0.15),
  })

  // Deadlines (15%): 50% for ≥1 deadline, 50% if a go_live or contract deadline exists
  let deadlinePct = 0
  if (profile.deadlines.length > 0) {
    deadlinePct += 50
    const hasKeyDeadline = profile.deadlines.some((d) => d.type === 'go_live' || d.type === 'contract')
    if (hasKeyDeadline) deadlinePct += 50
  }
  sections.push({
    section: 'deadlines',
    label: 'Deadlines',
    percentage: deadlinePct,
    maxWeight: 15,
    weightedScore: Math.round(deadlinePct * 0.15),
  })

  // Special Notes (20%): 25% each for the 4 sub-fields having data
  const specialParts = [
    profile.specialNotes.clientPreferences.length > 0,
    profile.specialNotes.internalNotes.trim().length > 0,
    profile.specialNotes.promisedCapabilities.length > 0,
    profile.specialNotes.knownConstraints.length > 0,
  ]
  const specialFilled = specialParts.filter(Boolean).length
  const specialPct = Math.round((specialFilled / 4) * 100)
  sections.push({
    section: 'specialNotes',
    label: 'Special Notes',
    percentage: specialPct,
    maxWeight: 20,
    weightedScore: Math.round(specialPct * 0.2),
  })

  // Stakeholders (15%): 50% for ≥1, 50% if at least one isDecisionMaker
  let stakeholderPct = 0
  if (profile.stakeholders.length > 0) {
    stakeholderPct += 50
    if (profile.stakeholders.some((s) => s.isDecisionMaker)) stakeholderPct += 50
  }
  sections.push({
    section: 'stakeholders',
    label: 'Key Contacts',
    percentage: stakeholderPct,
    maxWeight: 15,
    weightedScore: Math.round(stakeholderPct * 0.15),
  })

  // Checklist (10%): proportional to completed/total
  let checklistPct = 0
  if (checklistItems && checklistItems.length > 0) {
    const completed = checklistItems.filter((c) => c.isCompleted).length
    checklistPct = Math.round((completed / checklistItems.length) * 100)
  }
  sections.push({
    section: 'checklist',
    label: 'Checklist',
    percentage: checklistPct,
    maxWeight: 10,
    weightedScore: Math.round(checklistPct * 0.1),
  })

  const overall = Math.min(100, sections.reduce((sum, s) => sum + s.weightedScore, 0))

  return { overall, sections }
}

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
  fallbackBehavior?: string // What happens when system is down
  retryStrategy?: string // e.g., "Exponential backoff, 3 attempts, max 30s"
  dataFreshness?: string // e.g., "Daily sync + event-driven"
  dataResidency?: string // e.g., "EU-West private cloud"
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
  monitoringMetrics: MonitoringMetric[]
  notes: string[]
}

// Technical Section Config
export const TECHNICAL_SECTION_CONFIG = {
  integrations: {
    title: 'System Integrations',
    icon: 'Plug',
    color: 'sienna',
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
  monitoringMetrics: {
    title: 'Monitoring Metrics',
    icon: 'BarChart3',
    color: 'orange',
    description: 'KPIs with owners, thresholds, and alert triggers',
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
    monitoringMetrics: [],
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
    color: 'sienna',
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
    persona: {
      traits: [],
      toneRules: [],
      dosAndDonts: [],
      openingMessage: '',
      aiDisclaimer: '',
      conversationStructure: ['Acknowledge', 'Understand', 'Clarify', 'Answer', 'Proactive next', 'Close'],
      exampleDialogues: [],
      escalationScripts: [],
      edgeCaseResponses: [],
      feedbackMechanism: {
        enabled: false,
        methods: [],
        improvementCycle: '',
      },
    },
    monitoring: {
      metrics: [],
      dashboardViews: [],
      reportingCycle: {
        daily: '',
        weekly: '',
        monthly: '',
        quarterly: '',
      },
    },
    launch: {
      criteria: [],
      decisionTree: [],
      hypercare: {
        duration: '4 weeks',
        activities: [],
        escalationSLAs: [],
      },
      killSwitch: '',
    },
  }
}
