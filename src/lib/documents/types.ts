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
  // Comprehensive LLM-generated narrative content (optional, added when enhanced=true)
  _generated?: GeneratedDocumentContent
}

// Comprehensive generated content structure for enhanced documents
export interface GeneratedDocumentContent {
  // Executive Summary Section
  executiveSummary: {
    opening: string
    overview: string
    keyObjectives: string[]
    valueProposition: string
    expectedOutcomes: string[]
  }

  // Current State Analysis
  currentStateAnalysis: {
    introduction: string
    challenges: Array<{ challenge: string; impact: string; frequency: string }>
    inefficiencies: string
    opportunityCost: string
  }

  // Future State Vision
  futureStateVision: {
    introduction: string
    transformationNarrative: string
    dayInTheLife: string
    benefits: Array<{ benefit: string; description: string; metric?: string }>
  }

  // Detailed Process Analysis
  processAnalysis: {
    introduction: string
    processOverview: string
    stepByStepNarrative: string
    automationBenefits: string
    exceptionHandlingApproach: string
    humanMachineCollaboration: string
  }

  // Scope & Boundaries
  scopeAnalysis: {
    introduction: string
    inScopeRationale: string
    outOfScopeRationale: string
    guardrailsExplanation: string
    boundaryManagement: string
  }

  // Technical Foundation
  technicalFoundation: {
    introduction: string
    architectureOverview: string
    integrationStrategy: string
    dataFlowNarrative: string
    securityApproach: string
  }

  // Risk Assessment
  riskAssessment: {
    introduction: string
    risks: Array<{
      risk: string
      likelihood: 'Low' | 'Medium' | 'High'
      impact: 'Low' | 'Medium' | 'High'
      mitigation: string
    }>
    overallRiskPosture: string
  }

  // Implementation Approach
  implementationApproach: {
    introduction: string
    phases: Array<{ phase: string; description: string; deliverables: string[] }>
    successFactors: string[]
    changeManagement: string
    trainingPlan: {
      overview: string
      sessions: Array<{
        topic: string
        audience: string
        duration: string
        deliveryMethod: string
        keyContent: string[]
      }>
      materials: string[]
      supportPlan: string
    }
  }

  // Success Metrics
  successMetrics: {
    introduction: string
    kpiNarrative: string
    measurementApproach: string
    reportingCadence: string
  }

  // Conclusion & Next Steps
  conclusion: {
    summary: string
    callToAction: string
    nextSteps: Array<{ step: string; owner: string; timeline: string }>
    closingStatement: string
  }

  // Quick Reference Card (1-page summary for frontline teams)
  quickReference: {
    agentName: string
    purpose: string // 1-2 sentence summary
    canDo: string[] // What the agent CAN do (5-7 items)
    cannotDo: string[] // What the agent CANNOT do (5-7 items)
    escalationTriggers: Array<{
      trigger: string
      action: string
      contactMethod: string
    }>
    keyContacts: Array<{
      role: string
      name: string
      responsibility: string
    }>
    quickTips: string[] // 3-5 tips for working with the agent
  }

  // Executive One-Pager (standalone summary for leadership)
  executiveOnePager: {
    headline: string // Compelling headline
    problem: string // The problem being solved (2-3 sentences)
    solution: string // The solution (2-3 sentences)
    keyBenefits: Array<{ benefit: string; metric: string }>
    investment: string // High-level investment summary
    timeline: string // Implementation timeline summary
    bottomLine: string // "The bottom line" closing statement
  }

  // Process Flow Summary (text-based visual representation)
  processFlowSummary: {
    happyPathFlow: string // Text representation: "Step 1 → Step 2 → Step 3"
    escalationFlow: string // When and how escalation happens
    decisionPoints: Array<{
      point: string
      options: string[]
      criteria: string
    }>
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
