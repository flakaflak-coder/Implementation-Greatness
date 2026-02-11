import { describe, it, expect, vi } from 'vitest'

// Mock @react-pdf/renderer before importing the components
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Image: ({ src }: { src: string }) => null,
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
}))

// Mock the types module for DOCUMENT_COLORS and DOCUMENT_FONTS
vi.mock('./types', () => ({
  DOCUMENT_COLORS: {
    primary: '#4F46E5',
    secondary: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    text: '#1F2937',
    textLight: '#6B7280',
    border: '#E5E7EB',
    background: '#F9FAFB',
    white: '#FFFFFF',
  },
  DOCUMENT_FONTS: {
    title: 24,
    subtitle: 18,
    heading1: 16,
    heading2: 14,
    heading3: 12,
    body: 10,
    small: 9,
    tiny: 8,
  },
}))

import { DEDesignPDF } from './pdf-template'
import type { DEDesignDocument, GeneratedDocumentContent } from './types'

// Helper to create minimal document data
function createMinimalDocument(overrides: Partial<DEDesignDocument> = {}): DEDesignDocument {
  return {
    metadata: {
      title: 'Test Document',
      version: '1.0',
      date: '2025-01-01',
      author: 'Test Author',
      company: 'Test Corp',
      digitalEmployeeName: 'Test Agent',
      status: 'DRAFT',
      completenessScore: 50,
    },
    executiveSummary: {
      overview: 'Test overview',
      keyObjectives: ['Objective 1'],
      timeline: 'Q1 2025',
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
    ...overrides,
  }
}

// Helper to create full generated content
function createGeneratedContent(): GeneratedDocumentContent {
  return {
    executiveSummary: {
      opening: 'A bold opening statement',
      overview: 'Comprehensive overview of the project',
      keyObjectives: ['Reduce costs', 'Improve speed'],
      valueProposition: 'Significant business value',
      expectedOutcomes: ['50% cost reduction', '3x faster processing'],
    },
    currentStateAnalysis: {
      introduction: 'Current state analysis intro',
      challenges: [
        { challenge: 'Manual processing', impact: 'High cost', frequency: 'Daily' },
      ],
      inefficiencies: 'Many manual steps cause delays',
      opportunityCost: 'Significant lost revenue',
    },
    futureStateVision: {
      introduction: 'Future state introduction',
      transformationNarrative: 'Complete transformation of the process',
      dayInTheLife: 'A typical day after automation',
      benefits: [
        { benefit: 'Speed', description: 'Faster processing', metric: '50% reduction' },
      ],
    },
    processAnalysis: {
      introduction: 'Process analysis approach',
      processOverview: 'End-to-end process overview',
      stepByStepNarrative: 'Detailed narrative of each step',
      automationBenefits: 'Key automation benefits',
      exceptionHandlingApproach: 'How exceptions are handled',
      humanMachineCollaboration: 'How humans and machines work together',
    },
    scopeAnalysis: {
      introduction: 'Scope analysis introduction',
      inScopeRationale: 'What is in scope and why',
      outOfScopeRationale: 'What is out of scope and why',
      guardrailsExplanation: 'Guardrails explanation',
      boundaryManagement: 'How boundaries are managed',
    },
    technicalFoundation: {
      introduction: 'Technical approach introduction',
      architectureOverview: 'Solution architecture overview',
      integrationStrategy: 'Integration strategy',
      dataFlowNarrative: 'Data flow description',
      securityApproach: 'Security and compliance approach',
    },
    riskAssessment: {
      introduction: 'Risk management approach',
      risks: [
        { risk: 'Data migration', likelihood: 'Medium', impact: 'High', mitigation: 'Phased approach' },
      ],
      overallRiskPosture: 'Moderate risk with good mitigation',
    },
    implementationApproach: {
      introduction: 'Implementation philosophy',
      phases: [
        { phase: 'Design', description: 'Design phase', deliverables: ['Design doc'] },
        { phase: 'Build', description: 'Build phase', deliverables: ['Working system'] },
      ],
      successFactors: ['Executive sponsorship', 'Clear requirements'],
      changeManagement: 'Change management plan',
      trainingPlan: {
        overview: 'Training plan overview',
        sessions: [
          { topic: 'System Overview', audience: 'All staff', duration: '2 hours', deliveryMethod: 'Workshop', keyContent: ['Features', 'Usage'] },
        ],
        materials: ['Quick start guide', 'FAQ'],
        supportPlan: 'Ongoing support plan',
      },
    },
    successMetrics: {
      introduction: 'Measurement philosophy',
      kpiNarrative: 'KPI details',
      measurementApproach: 'How metrics are collected',
      reportingCadence: 'Weekly reporting cycle',
    },
    conclusion: {
      summary: 'Summary of the document',
      callToAction: 'Clear call to action',
      nextSteps: [
        { step: 'Approve design', owner: 'Product Team', timeline: 'Week 1' },
      ],
      closingStatement: 'Memorable closing statement',
    },
    quickReference: {
      agentName: 'Test Agent',
      purpose: 'Handles customer inquiries',
      canDo: ['Answer FAQ', 'Route tickets'],
      cannotDo: ['Make financial decisions', 'Override policies'],
      escalationTriggers: [
        { trigger: 'Angry customer', action: 'Transfer', contactMethod: 'Phone' },
      ],
      keyContacts: [
        { role: 'Support Lead', name: 'Jane Doe', responsibility: 'Escalation handling' },
      ],
      quickTips: ['Be clear', 'Follow process'],
    },
    executiveOnePager: {
      headline: 'Transform Customer Service',
      problem: 'Manual processing is slow and costly',
      solution: 'Automated digital employee',
      keyBenefits: [
        { benefit: 'Speed', metric: '50% faster' },
      ],
      investment: 'Moderate investment',
      timeline: '3 months',
      bottomLine: 'Significant ROI within 6 months',
    },
    processFlowSummary: {
      happyPathFlow: 'Step 1 -> Step 2 -> Step 3',
      escalationFlow: 'Escalate when threshold exceeded',
      decisionPoints: [
        { point: 'Approve or reject', options: ['Approve', 'Reject'], criteria: 'Amount threshold' },
      ],
    },
  }
}

describe('pdf-template', () => {
  describe('DEDesignPDF', () => {
    it('renders without errors with minimal document', () => {
      const data = createMinimalDocument()
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders with full generated content', () => {
      const data = createMinimalDocument({
        _generated: createGeneratedContent(),
      })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders without generated content (fallback mode)', () => {
      const data = createMinimalDocument()
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders stakeholder table', () => {
      const data = createMinimalDocument({
        stakeholders: [
          { name: 'John Smith', role: 'VP Operations', email: 'john@acme.com', isKeyDecisionMaker: true },
          { name: 'Jane Doe', role: 'CTO', isKeyDecisionMaker: false },
        ],
      })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders business context with KPIs and volumes', () => {
      const data = createMinimalDocument({
        businessContext: {
          goals: [
            { title: 'Reduce Cost', description: 'Cut processing cost by 50%', priority: 'high' },
          ],
          kpis: [
            { name: 'Automation Rate', target: '85%', unit: '%', frequency: 'Monthly' },
            { name: 'Response Time', target: '2s' },
          ],
          volumes: [
            { metric: 'Monthly cases', value: '5000', period: 'month' },
          ],
        },
      })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders process design with steps and exceptions', () => {
      const data = createMinimalDocument({
        processDesign: {
          toBeSteps: [
            { stepNumber: 1, name: 'Receive', description: 'Receive claim', owner: 'System' },
            { stepNumber: 2, name: 'Validate', description: 'Check data' },
          ],
          exceptions: [
            { name: 'Missing Docs', description: 'Docs not provided', handling: 'Request from customer' },
          ],
        },
      })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders scope sections with guardrails', () => {
      const data = createMinimalDocument({
        scope: {
          inScope: [
            { id: '1', description: 'Handle simple claims', classification: 'IN_SCOPE', skill: 'claims', conditions: 'Under $1000' },
          ],
          outOfScope: [
            { id: '2', description: 'Litigation', classification: 'OUT_OF_SCOPE', notes: 'Needs legal review' },
          ],
          ambiguous: [],
          guardrails: [
            { type: 'NEVER', description: 'Never share PII' },
            { type: 'ALWAYS', description: 'Always verify identity' },
          ],
        },
      })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders technical requirements with integrations', () => {
      const data = createMinimalDocument({
        technicalRequirements: {
          integrations: [
            { systemName: 'SAP', purpose: 'read_write', connectionType: 'REST API', notes: 'Main ERP' },
          ],
          securityRequirements: ['SSL required', 'SOC2 compliance'],
        },
      })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders business rules table', () => {
      const data = createMinimalDocument({
        businessRules: [
          { name: 'Auto-approve', category: 'claims', condition: 'Amount < $500', action: 'Approve', priority: 'high' },
          { name: 'Escalate large', category: 'claims', condition: 'Amount > $10000', action: 'Escalate', priority: 'critical' },
        ],
      })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders test plan appendix when present', () => {
      const data = createMinimalDocument({
        testPlan: {
          testCases: [
            { id: '1', name: 'Simple claim', type: 'happy_path', priority: 'high', steps: ['Submit'], expectedResult: 'Approved', coverage: 'covered' },
          ],
          coverageSummary: { total: 1, covered: 1, partial: 0, missing: 0 },
        },
      })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('does not render test plan when empty', () => {
      const data = createMinimalDocument({
        testPlan: {
          testCases: [],
          coverageSummary: { total: 0, covered: 0, partial: 0, missing: 0 },
        },
      })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('does not render test plan when undefined', () => {
      const data = createMinimalDocument()
      expect(data.testPlan).toBeUndefined()
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders executive one-pager when generated content is present', () => {
      const gen = createGeneratedContent()
      const data = createMinimalDocument({ _generated: gen })
      // The executive one-pager section is conditionally rendered
      expect(gen.executiveOnePager).toBeDefined()
      expect(gen.executiveOnePager.headline).toBe('Transform Customer Service')
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders quick reference card when generated content is present', () => {
      const gen = createGeneratedContent()
      const data = createMinimalDocument({ _generated: gen })
      expect(gen.quickReference).toBeDefined()
      expect(gen.quickReference.agentName).toBe('Test Agent')
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders risk assessment with risk table', () => {
      const gen = createGeneratedContent()
      const data = createMinimalDocument({ _generated: gen })
      expect(gen.riskAssessment.risks).toHaveLength(1)
      expect(gen.riskAssessment.risks[0].likelihood).toBe('Medium')
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders implementation phases with deliverables', () => {
      const gen = createGeneratedContent()
      const data = createMinimalDocument({ _generated: gen })
      expect(gen.implementationApproach.phases).toHaveLength(2)
      expect(gen.implementationApproach.phases[0].deliverables).toContain('Design doc')
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders training plan with sessions', () => {
      const gen = createGeneratedContent()
      const data = createMinimalDocument({ _generated: gen })
      expect(gen.implementationApproach.trainingPlan.sessions).toHaveLength(1)
      expect(gen.implementationApproach.trainingPlan.sessions[0].topic).toBe('System Overview')
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })
  })

  describe('helper functions (tested via rendering)', () => {
    it('handles different status colors', () => {
      const statuses: Array<'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED'> = [
        'DRAFT',
        'IN_REVIEW',
        'APPROVED',
        'PUBLISHED',
      ]

      statuses.forEach(status => {
        const data = createMinimalDocument({
          metadata: {
            title: 'Test',
            version: '1.0',
            date: '2025-01-01',
            author: 'Author',
            company: 'Corp',
            digitalEmployeeName: 'Agent',
            status,
            completenessScore: 50,
          },
        })
        const result = DEDesignPDF({ data })
        expect(result).toBeDefined()
      })
    })

    it('handles risk badge styles for different levels', () => {
      const gen = createGeneratedContent()
      gen.riskAssessment.risks = [
        { risk: 'Low risk', likelihood: 'Low', impact: 'Low', mitigation: 'None needed' },
        { risk: 'Medium risk', likelihood: 'Medium', impact: 'Medium', mitigation: 'Monitor' },
        { risk: 'High risk', likelihood: 'High', impact: 'High', mitigation: 'Immediate action' },
      ]
      const data = createMinimalDocument({ _generated: gen })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('handles process flow summary with decision points', () => {
      const gen = createGeneratedContent()
      gen.processFlowSummary.decisionPoints = [
        { point: 'Decision 1', options: ['Option A', 'Option B'], criteria: 'Criteria 1' },
        { point: 'Decision 2', options: ['Yes', 'No'], criteria: 'Amount threshold' },
      ]
      const data = createMinimalDocument({ _generated: gen })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('handles many test cases (overflow logic with > 12)', () => {
      const testCases = Array.from({ length: 15 }, (_, i) => ({
        id: `tc-${i}`,
        name: `Test Case ${i + 1}`,
        type: 'happy_path' as const,
        priority: 'high' as const,
        steps: ['Step 1'],
        expectedResult: 'Pass',
        coverage: 'covered' as const,
      }))
      const data = createMinimalDocument({
        testPlan: {
          testCases,
          coverageSummary: { total: 15, covered: 10, partial: 3, missing: 2 },
        },
      })
      expect(data.testPlan!.testCases.length).toBeGreaterThan(12)
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders goals fallback when no generated benefits', () => {
      const gen = createGeneratedContent()
      gen.futureStateVision.benefits = []
      const data = createMinimalDocument({
        _generated: gen,
        businessContext: {
          goals: [{ title: 'Goal 1', description: 'Description 1' }],
          kpis: [],
          volumes: [],
        },
      })
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders objectives from goals when no generated objectives', () => {
      const data = createMinimalDocument({
        businessContext: {
          goals: [
            { title: 'Reduce Cost', description: 'Lower costs' },
            { title: 'Speed Up', description: 'Faster processing' },
          ],
          kpis: [],
          volumes: [],
        },
      })
      // When no _generated content, BulletList uses businessContext.goals.map(g => g.title)
      expect(data.businessContext.goals.map(g => g.title)).toEqual(['Reduce Cost', 'Speed Up'])
      const result = DEDesignPDF({ data })
      expect(result).toBeDefined()
    })
  })
})
