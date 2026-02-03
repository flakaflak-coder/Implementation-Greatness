import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK
const mockMessagesCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: (...args: unknown[]) => mockMessagesCreate(...args),
    }
  },
}))

// Mock prompt-sections module
vi.mock('./prompt-sections', () => ({
  LANGUAGE_NAMES: { en: 'English', nl: 'Dutch', de: 'German', fr: 'French', es: 'Spanish' },
  buildLanguageInstruction: vi.fn((lang) => `Write in ${lang}`),
  PERSONA_SECTION: 'You are a consultant',
  buildProjectContext: vi.fn((company, de) => `Project: ${de} for ${company}`),
  buildExtractedDataSection: vi.fn(() => 'Extracted data section'),
  JSON_SCHEMA_SECTION: 'JSON schema section',
  buildWritingGuidelines: vi.fn(() => 'Writing guidelines'),
  QUALITY_REQUIREMENTS_SECTION: 'Quality requirements',
}))

import {
  generateDocumentContent,
  buildGenerationContext,
  mergeGeneratedContent,
  type DocumentLanguage,
} from './generate-document'
import type { DEDesignDocument } from './types'

describe('generateDocumentContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates comprehensive document content from context', async () => {
    const mockGeneratedContent = {
      executiveSummary: {
        opening: 'Test opening',
        overview: 'Test overview',
        keyObjectives: ['Objective 1', 'Objective 2'],
        valueProposition: 'Test value prop',
        expectedOutcomes: ['Outcome 1'],
      },
      currentStateAnalysis: {
        introduction: 'Current state intro',
        challenges: [{ challenge: 'Challenge 1', impact: 'High', frequency: 'Daily' }],
        inefficiencies: 'Manual processes',
        opportunityCost: 'High',
      },
      futureStateVision: {
        introduction: 'Future vision intro',
        transformationNarrative: 'Transformation story',
        dayInTheLife: 'A day scenario',
        benefits: [{ benefit: 'Speed', description: 'Faster processing' }],
      },
      processAnalysis: {
        introduction: 'Process intro',
        processOverview: 'Overview',
        stepByStepNarrative: 'Steps',
        automationBenefits: 'Benefits',
        exceptionHandlingApproach: 'Handling',
        humanMachineCollaboration: 'Collaboration',
      },
      scopeAnalysis: {
        introduction: 'Scope intro',
        inScopeRationale: 'In scope reasons',
        outOfScopeRationale: 'Out of scope reasons',
        guardrailsExplanation: 'Guardrails',
        boundaryManagement: 'Boundaries',
      },
      technicalFoundation: {
        introduction: 'Tech intro',
        architectureOverview: 'Architecture',
        integrationStrategy: 'Integration',
        dataFlowNarrative: 'Data flow',
        securityApproach: 'Security',
      },
      riskAssessment: {
        introduction: 'Risk intro',
        risks: [{ risk: 'Risk 1', likelihood: 'Medium', impact: 'High', mitigation: 'Plan' }],
        overallRiskPosture: 'Moderate',
      },
      implementationApproach: {
        introduction: 'Implementation intro',
        phases: [{ phase: 'Phase 1', description: 'Setup', deliverables: ['Doc 1'] }],
        successFactors: ['Factor 1'],
        changeManagement: 'CM plan',
        trainingPlan: {
          overview: 'Training overview',
          sessions: [],
          materials: ['Quick ref'],
          supportPlan: 'Support plan',
        },
      },
      successMetrics: {
        introduction: 'Metrics intro',
        kpiNarrative: 'KPI details',
        measurementApproach: 'Measurement',
        reportingCadence: 'Weekly',
      },
      conclusion: {
        summary: 'Summary',
        callToAction: 'Next steps',
        nextSteps: [{ step: 'Step 1', owner: 'Team', timeline: 'Week 1' }],
        closingStatement: 'Closing',
      },
      quickReference: {
        agentName: 'Test Agent',
        purpose: 'Purpose',
        canDo: ['Can do 1'],
        cannotDo: ['Cannot do 1'],
        escalationTriggers: [],
        keyContacts: [],
        quickTips: [],
      },
      executiveOnePager: {
        headline: 'Headline',
        problem: 'Problem',
        solution: 'Solution',
        keyBenefits: [{ benefit: 'Benefit', metric: '50%' }],
        investment: 'Investment',
        timeline: 'Timeline',
        bottomLine: 'Bottom line',
      },
      processFlowSummary: {
        happyPathFlow: 'Flow',
        escalationFlow: 'Escalation',
        decisionPoints: [],
      },
    }

    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockGeneratedContent) }],
      usage: { input_tokens: 1000, output_tokens: 2000 },
    })

    const context = {
      companyName: 'Acme Corp',
      digitalEmployeeName: 'Claims Agent',
      deDescription: 'Handles claims intake',
      language: 'en' as DocumentLanguage,
      extractedData: {
        stakeholders: [],
        goals: [],
        kpis: [],
        volumes: [],
        processSteps: [],
        exceptions: [],
        inScope: [],
        outOfScope: [],
        guardrails: [],
        integrations: [],
        businessRules: [],
        securityRequirements: [],
        channels: [],
      },
    }

    const result = await generateDocumentContent(context)

    expect(result.executiveSummary.opening).toBe('Test opening')
    expect(result.currentStateAnalysis.challenges).toHaveLength(1)
    expect(result.quickReference.agentName).toBe('Test Agent')
  })

  it('returns fallback content when LLM fails', async () => {
    mockMessagesCreate.mockRejectedValue(new Error('API error'))

    const context = {
      companyName: 'Acme Corp',
      digitalEmployeeName: 'Claims Agent',
      language: 'en' as DocumentLanguage,
      extractedData: {
        stakeholders: [],
        goals: [{ title: 'Goal 1', description: 'Description' }],
        kpis: [],
        volumes: [],
        processSteps: [],
        exceptions: [],
        inScope: [],
        outOfScope: [],
        guardrails: [],
        integrations: [],
        businessRules: [],
        securityRequirements: [],
        channels: [],
      },
    }

    const result = await generateDocumentContent(context)

    // Should return fallback content
    expect(result.executiveSummary.opening).toContain('Claims Agent')
    expect(result.executiveSummary.opening).toContain('Acme Corp')
    expect(result.quickReference.agentName).toBe('Claims Agent')
  })

  it('handles JSON wrapped in markdown code blocks', async () => {
    const mockContent = { executiveSummary: { opening: 'Test' } }

    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(mockContent) + '\n```' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    })

    const context = {
      companyName: 'Test',
      digitalEmployeeName: 'Test Agent',
      language: 'en' as DocumentLanguage,
      extractedData: {
        stakeholders: [],
        goals: [],
        kpis: [],
        volumes: [],
        processSteps: [],
        exceptions: [],
        inScope: [],
        outOfScope: [],
        guardrails: [],
        integrations: [],
        businessRules: [],
        securityRequirements: [],
        channels: [],
      },
    }

    // This should handle the markdown wrapper
    const result = await generateDocumentContent(context)
    expect(result).toBeDefined()
  })
})

describe('buildGenerationContext', () => {
  it('transforms design week data into generation context', () => {
    const designWeekData = {
      digitalEmployee: {
        name: 'Claims Agent',
        description: 'Handles insurance claims',
        company: { name: 'Acme Insurance' },
      },
      sessions: [
        {
          extractedItems: [
            { type: 'STAKEHOLDER', content: 'John Smith - VP Operations', status: 'APPROVED', structuredData: { name: 'John Smith', role: 'VP Operations' } },
            { type: 'GOAL', content: 'Reduce processing time by 50%', status: 'APPROVED', structuredData: { title: 'Speed', description: 'Reduce time' } },
            { type: 'KPI_TARGET', content: 'Process 100 claims/day', status: 'APPROVED', structuredData: { name: 'Volume', target: '100/day' } },
            { type: 'HAPPY_PATH_STEP', content: 'Receive claim', status: 'APPROVED', structuredData: { stepNumber: 1, name: 'Intake', description: 'Receive claim' } },
            { type: 'EXCEPTION_CASE', content: 'Missing documents', status: 'APPROVED', structuredData: { name: 'Missing docs', description: 'Docs missing', handling: 'Request from customer' } },
            { type: 'GUARDRAIL_NEVER', content: 'Never share PII', status: 'APPROVED' },
            { type: 'GUARDRAIL_ALWAYS', content: 'Always verify identity', status: 'APPROVED' },
            { type: 'SECURITY_REQUIREMENT', content: 'SOC2 compliance', status: 'APPROVED' },
            { type: 'CHANNEL', content: 'Email', status: 'APPROVED' },
          ],
        },
      ],
      scopeItems: [
        { description: 'Handle simple claims', classification: 'IN_SCOPE', skill: 'claims-processing', conditions: 'Under $1000' },
        { description: 'Complex litigation', classification: 'OUT_OF_SCOPE', notes: 'Requires legal review' },
      ],
      integrations: [
        { systemName: 'Salesforce', purpose: 'CRM', connectionType: 'API' },
      ],
      businessRules: [
        { name: 'Auto-approve', condition: 'Amount < $500', action: 'Approve immediately' },
      ],
    }

    const result = buildGenerationContext(designWeekData, 'en')

    expect(result.companyName).toBe('Acme Insurance')
    expect(result.digitalEmployeeName).toBe('Claims Agent')
    expect(result.deDescription).toBe('Handles insurance claims')
    expect(result.language).toBe('en')

    // Check stakeholders
    expect(result.extractedData.stakeholders).toHaveLength(1)
    expect(result.extractedData.stakeholders[0].name).toBe('John Smith')
    expect(result.extractedData.stakeholders[0].role).toBe('VP Operations')

    // Check goals
    expect(result.extractedData.goals).toHaveLength(1)
    expect(result.extractedData.goals[0].title).toBe('Speed')

    // Check process steps
    expect(result.extractedData.processSteps).toHaveLength(1)
    expect(result.extractedData.processSteps[0].stepNumber).toBe(1)

    // Check scope items
    expect(result.extractedData.inScope).toHaveLength(1)
    expect(result.extractedData.inScope[0].skill).toBe('claims-processing')
    expect(result.extractedData.outOfScope).toHaveLength(1)

    // Check guardrails
    expect(result.extractedData.guardrails).toHaveLength(2)
    expect(result.extractedData.guardrails.some(g => g.type === 'NEVER')).toBe(true)
    expect(result.extractedData.guardrails.some(g => g.type === 'ALWAYS')).toBe(true)

    // Check integrations
    expect(result.extractedData.integrations).toHaveLength(1)
    expect(result.extractedData.integrations[0].systemName).toBe('Salesforce')

    // Check security and channels
    expect(result.extractedData.securityRequirements).toContain('SOC2 compliance')
    expect(result.extractedData.channels).toContain('Email')
  })

  it('filters only APPROVED items by default', () => {
    const designWeekData = {
      digitalEmployee: {
        name: 'Test Agent',
        description: null,
        company: { name: 'Test Corp' },
      },
      sessions: [
        {
          extractedItems: [
            { type: 'GOAL', content: 'Approved goal', status: 'APPROVED' },
            { type: 'GOAL', content: 'Pending goal', status: 'PENDING' },
            { type: 'GOAL', content: 'Rejected goal', status: 'REJECTED' },
            { type: 'GOAL', content: 'No status goal' }, // No status = included
          ],
        },
      ],
      scopeItems: [],
      integrations: [],
      businessRules: [],
    }

    const result = buildGenerationContext(designWeekData)

    // Should include APPROVED and items without status
    expect(result.extractedData.goals).toHaveLength(2)
    expect(result.extractedData.goals.map(g => g.description)).toContain('Approved goal')
    expect(result.extractedData.goals.map(g => g.description)).toContain('No status goal')
  })

  it('handles empty sessions array', () => {
    const designWeekData = {
      digitalEmployee: {
        name: 'Empty Agent',
        description: null,
        company: { name: 'Corp' },
      },
      sessions: [],
      scopeItems: [],
      integrations: [],
      businessRules: [],
    }

    const result = buildGenerationContext(designWeekData)

    expect(result.extractedData.stakeholders).toHaveLength(0)
    expect(result.extractedData.goals).toHaveLength(0)
  })

  it('extracts title from content when structuredData is missing', () => {
    const designWeekData = {
      digitalEmployee: {
        name: 'Agent',
        description: null,
        company: { name: 'Corp' },
      },
      sessions: [
        {
          extractedItems: [
            { type: 'GOAL', content: 'Primary Goal: Improve efficiency', status: 'APPROVED' },
            { type: 'STAKEHOLDER', content: 'Jane Doe - CTO', status: 'APPROVED' },
          ],
        },
      ],
      scopeItems: [],
      integrations: [],
      businessRules: [],
    }

    const result = buildGenerationContext(designWeekData)

    expect(result.extractedData.goals[0].title).toBe('Primary Goal')
    expect(result.extractedData.stakeholders[0].name).toBe('Jane Doe')
    expect(result.extractedData.stakeholders[0].role).toBe('CTO')
  })

  it('supports all document languages', () => {
    const baseData = {
      digitalEmployee: {
        name: 'Agent',
        description: null,
        company: { name: 'Corp' },
      },
      sessions: [],
      scopeItems: [],
      integrations: [],
      businessRules: [],
    }

    const languages: DocumentLanguage[] = ['en', 'nl', 'de', 'fr', 'es']

    languages.forEach(lang => {
      const result = buildGenerationContext(baseData, lang)
      expect(result.language).toBe(lang)
    })
  })
})

describe('mergeGeneratedContent', () => {
  it('merges generated content into base document', () => {
    const baseDocument: DEDesignDocument = {
      metadata: {
        title: 'Test Document',
        version: '1.0',
        date: new Date().toISOString(),
        author: 'Test Author',
        company: 'Test Corp',
        digitalEmployeeName: 'Test Agent',
        status: 'DRAFT',
        completenessScore: 50,
      },
      executiveSummary: {
        overview: 'Original overview',
        keyObjectives: ['Original objective'],
        timeline: 'Q1 2024',
      },
      stakeholders: [],
      businessContext: {
        goals: [],
        kpis: [],
        volumes: [],
      },
      processDesign: {
        toBeSteps: [],
        exceptions: [],
      },
      scope: {
        inScope: [],
        outOfScope: [],
        ambiguous: [],
        guardrails: [],
      },
      technicalRequirements: {
        integrations: [],
      },
      businessRules: [],
    }

    const generatedContent = {
      executiveSummary: {
        opening: 'Generated opening',
        overview: 'Generated overview with more detail',
        keyObjectives: ['Generated objective 1', 'Generated objective 2'],
        valueProposition: 'Great value',
        expectedOutcomes: ['Outcome 1'],
      },
      // ... other sections would be here in real usage
    } as any

    const result = mergeGeneratedContent(baseDocument, generatedContent)

    // Should merge executive summary
    expect(result.executiveSummary.overview).toBe('Generated overview with more detail')
    expect(result.executiveSummary.keyObjectives).toEqual(['Generated objective 1', 'Generated objective 2'])

    // Should preserve timeline from base
    expect(result.executiveSummary.timeline).toBe('Q1 2024')

    // Should add _generated field
    expect(result._generated).toBe(generatedContent)

    // Should preserve other base document fields
    expect(result.metadata.title).toBe('Test Document')
    expect(result.metadata.digitalEmployeeName).toBe('Test Agent')
  })
})
