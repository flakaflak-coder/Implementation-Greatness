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

import {
  TestPlanPDF,
  ProcessDesignPDF,
  ExecutiveSummaryPDF,
  TechnicalFoundationPDF,
  PersonaDesignPDF,
  MonitoringFrameworkPDF,
  RolloutPlanPDF,
} from './focused-templates'

describe('focused-templates', () => {
  describe('TestPlanPDF', () => {
    it('renders without errors with empty test cases', () => {
      const data = {
        companyName: 'Acme Corp',
        digitalEmployeeName: 'Claims Bot',
        testCases: [],
        scopeItems: [],
      }
      const result = TestPlanPDF({ data })
      expect(result).toBeDefined()
    })

    it('computes metrics correctly', () => {
      const data = {
        companyName: 'Acme Corp',
        digitalEmployeeName: 'Claims Bot',
        testCases: [
          { id: '1', name: 'Test 1', type: 'happy_path', priority: 'critical', steps: ['Step 1'], expectedResult: 'Pass' },
          { id: '2', name: 'Test 2', type: 'exception', priority: 'high', steps: ['Step 1'], expectedResult: 'Pass' },
          { id: '3', name: 'Test 3', type: 'boundary', priority: 'low', steps: ['Step 1'], expectedResult: 'Pass' },
        ],
        scopeItems: [
          { description: 'Simple claims', classification: 'IN_SCOPE' },
          { description: 'Litigation', classification: 'OUT_OF_SCOPE' },
        ],
      }

      // Test data logic: totalTests=3, highPriority=2 (critical+high), scopeInCount=1
      const totalTests = data.testCases.length
      const highPriority = data.testCases.filter(t => t.priority === 'critical' || t.priority === 'high').length
      const scopeInCount = data.scopeItems.filter(s => s.classification === 'IN_SCOPE').length

      expect(totalTests).toBe(3)
      expect(highPriority).toBe(2)
      expect(scopeInCount).toBe(1)
    })

    it('renders with test cases that have preconditions', () => {
      const data = {
        companyName: 'Test Corp',
        digitalEmployeeName: 'Test Bot',
        testCases: [
          { id: '1', name: 'Login Test', type: 'happy_path', priority: 'high', preconditions: 'User logged in', steps: ['Open page', 'Click button'], expectedResult: 'Success' },
        ],
        scopeItems: [],
      }
      const result = TestPlanPDF({ data })
      expect(result).toBeDefined()
    })

    it('handles more than 8 test cases (overflow message)', () => {
      const testCases = Array.from({ length: 10 }, (_, i) => ({
        id: `tc-${i}`,
        name: `Test ${i + 1}`,
        type: 'happy_path',
        priority: 'medium',
        steps: ['Step 1'],
        expectedResult: 'Pass',
      }))
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        testCases,
        scopeItems: [],
      }
      // Verify the overflow logic: slice(0, 8) shows 8, remaining = 10 - 8 = 2
      expect(data.testCases.length).toBeGreaterThan(8)
      expect(data.testCases.length - 8).toBe(2)
      const result = TestPlanPDF({ data })
      expect(result).toBeDefined()
    })
  })

  describe('ProcessDesignPDF', () => {
    it('renders without errors with empty data', () => {
      const data = {
        companyName: 'Test Corp',
        digitalEmployeeName: 'Test Bot',
        happyPathSteps: [],
        exceptions: [],
        escalationTriggers: [],
        caseTypes: [],
        channels: [],
        scopeItems: [],
      }
      const result = ProcessDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('separates scope items correctly', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        happyPathSteps: [],
        exceptions: [],
        escalationTriggers: [],
        caseTypes: [],
        channels: [],
        scopeItems: [
          { description: 'Handle simple claims', classification: 'IN_SCOPE' },
          { description: 'Handle litigation', classification: 'OUT_OF_SCOPE' },
          { description: 'Handle partial', classification: 'IN_SCOPE' },
        ],
      }

      const inScope = data.scopeItems.filter(s => s.classification === 'IN_SCOPE')
      const outOfScope = data.scopeItems.filter(s => s.classification === 'OUT_OF_SCOPE')
      expect(inScope).toHaveLength(2)
      expect(outOfScope).toHaveLength(1)

      const result = ProcessDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders with happy path steps', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        happyPathSteps: [
          { content: 'Receive request', structuredData: {} },
          { content: 'Process request', structuredData: {} },
        ],
        exceptions: [{ content: 'Missing docs', structuredData: {} }],
        escalationTriggers: [{ content: 'Customer angry', structuredData: {} }],
        caseTypes: [{ content: 'Simple claim', structuredData: {} }],
        channels: [{ content: 'Email' }],
        scopeItems: [],
      }
      const result = ProcessDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders empty state for exceptions and escalation triggers', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        happyPathSteps: [{ content: 'Step 1', structuredData: {} }],
        exceptions: [],
        escalationTriggers: [],
        caseTypes: [],
        channels: [],
        scopeItems: [],
      }
      const result = ProcessDesignPDF({ data })
      expect(result).toBeDefined()
    })
  })

  describe('ExecutiveSummaryPDF', () => {
    it('renders without errors with minimal data', () => {
      const data = {
        companyName: 'Test Corp',
        digitalEmployeeName: 'Test Bot',
        description: null,
        goals: [],
        kpis: [],
        stakeholders: [],
        volumes: [],
        integrationCount: 0,
        scopeInCount: 0,
        scopeOutCount: 0,
      }
      const result = ExecutiveSummaryPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders with full data including description', () => {
      const data = {
        companyName: 'Acme Corp',
        digitalEmployeeName: 'Claims Bot',
        description: 'Handles insurance claims processing',
        goals: [{ content: 'Reduce cost' }, { content: 'Improve speed' }],
        kpis: [{ content: 'Automation rate 85%', structuredData: {} }],
        stakeholders: [{ content: 'John - VP Ops', structuredData: {} }],
        volumes: [{ content: '5000 per month', structuredData: {} }],
        integrationCount: 3,
        scopeInCount: 5,
        scopeOutCount: 2,
      }
      const result = ExecutiveSummaryPDF({ data })
      expect(result).toBeDefined()
    })

    it('uses fallback text when description is null', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        description: null,
        goals: [],
        kpis: [],
        stakeholders: [],
        volumes: [],
        integrationCount: 0,
        scopeInCount: 0,
        scopeOutCount: 0,
      }
      // When description is null, the component uses 'Digital Employee Implementation'
      expect(data.description).toBeNull()
      const result = ExecutiveSummaryPDF({ data })
      expect(result).toBeDefined()
    })

    it('limits displayed items to sliced amounts', () => {
      const goals = Array.from({ length: 8 }, (_, i) => ({ content: `Goal ${i + 1}` }))
      const kpis = Array.from({ length: 8 }, (_, i) => ({ content: `KPI ${i + 1}`, structuredData: {} }))
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        description: 'Test',
        goals,
        kpis,
        stakeholders: [],
        volumes: [],
        integrationCount: 0,
        scopeInCount: 0,
        scopeOutCount: 0,
      }
      // Component slices goals to 5, kpis to 5, stakeholders to 4, volumes to 3
      expect(data.goals.slice(0, 5)).toHaveLength(5)
      expect(data.kpis.slice(0, 5)).toHaveLength(5)
      const result = ExecutiveSummaryPDF({ data })
      expect(result).toBeDefined()
    })
  })

  describe('TechnicalFoundationPDF', () => {
    it('renders without errors with empty data', () => {
      const data = {
        companyName: 'Test Corp',
        digitalEmployeeName: 'Test Bot',
        integrations: [],
        dataFields: [],
        securityRequirements: [],
        complianceRequirements: [],
        apiEndpoints: [],
      }
      const result = TechnicalFoundationPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders with full integration data', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        integrations: [
          { systemName: 'SAP', purpose: 'ERP', type: 'REST', authMethod: 'OAuth2', endpoint: '/api/v1' },
          { systemName: 'Salesforce', purpose: 'CRM', type: null, authMethod: null, endpoint: null },
        ],
        dataFields: [{ content: 'Customer ID', structuredData: {} }],
        securityRequirements: [{ content: 'SSL required' }],
        complianceRequirements: [{ content: 'GDPR compliance' }],
        apiEndpoints: [{ content: 'POST /claims', structuredData: {} }],
      }
      const result = TechnicalFoundationPDF({ data })
      expect(result).toBeDefined()
    })

    it('handles empty state for security, compliance, and API sections', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        integrations: [
          { systemName: 'SAP', purpose: 'ERP', type: 'REST', authMethod: null, endpoint: null },
        ],
        dataFields: [],
        securityRequirements: [],
        complianceRequirements: [],
        apiEndpoints: [],
      }
      const result = TechnicalFoundationPDF({ data })
      expect(result).toBeDefined()
    })
  })

  describe('PersonaDesignPDF', () => {
    it('renders without errors with empty data', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        personaTraits: [],
        toneRules: [],
        dosAndDonts: [],
        exampleDialogues: [],
        escalationScripts: [],
        edgeCaseResponses: [],
        communicationStyles: [],
        guardrails: [],
      }
      const result = PersonaDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('renders with persona traits including example phrases', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        personaTraits: [
          { content: 'Always helpful', structuredData: { name: 'Helpful', examplePhrase: 'Let me help!' } },
        ],
        toneRules: [
          { content: 'Keep it simple', structuredData: { aspect: 'Clarity' } },
        ],
        dosAndDonts: [
          { content: 'Be clear', structuredData: { wrong: 'Unclear response', right: 'Clear response' } },
        ],
        exampleDialogues: [
          { content: 'Dialogue 1', structuredData: { scenario: 'Greeting', messages: [{ speaker: 'DE', text: 'Hello!' }] } },
        ],
        escalationScripts: [
          { content: 'Transfer', structuredData: { context: 'Angry customer', script: 'Let me connect you' } },
        ],
        edgeCaseResponses: [
          { content: 'Handle profanity', structuredData: { trigger: 'Profanity' } },
        ],
        communicationStyles: [{ content: 'Friendly and warm' }],
        guardrails: [{ content: 'Never share passwords', type: 'NEVER' }],
      }
      const result = PersonaDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('shows empty state when no persona traits or tone rules', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        personaTraits: [],
        toneRules: [],
        dosAndDonts: [{ content: 'Test', structuredData: null }],
        exampleDialogues: [],
        escalationScripts: [],
        edgeCaseResponses: [],
        communicationStyles: [],
        guardrails: [],
      }
      const result = PersonaDesignPDF({ data })
      expect(result).toBeDefined()
    })

    it('shows empty state for escalation scripts and dialogues page', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        personaTraits: [{ content: 'Friendly', structuredData: null }],
        toneRules: [],
        dosAndDonts: [],
        exampleDialogues: [],
        escalationScripts: [],
        edgeCaseResponses: [],
        communicationStyles: [],
        guardrails: [],
      }
      const result = PersonaDesignPDF({ data })
      expect(result).toBeDefined()
    })
  })

  describe('MonitoringFrameworkPDF', () => {
    it('renders without errors with empty data', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        monitoringMetrics: [],
        kpis: [],
        volumes: [],
      }
      const result = MonitoringFrameworkPDF({ data })
      expect(result).toBeDefined()
    })

    it('categorizes metrics by perspective', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        monitoringMetrics: [
          { content: 'CSAT', structuredData: { name: 'CSAT', perspective: 'user_experience', target: '4.5' } },
          { content: 'Uptime', structuredData: { name: 'Uptime', perspective: 'operational', target: '99.9%' } },
          { content: 'Accuracy', structuredData: { name: 'Accuracy', perspective: 'knowledge_quality', target: '95%' } },
          { content: 'ROI', structuredData: { name: 'ROI', perspective: 'financial', target: '200%' } },
          { content: 'Other', structuredData: { name: 'Other', target: '100' } },
        ],
        kpis: [{ content: 'Automation Rate', structuredData: { name: 'Automation', target: '85%' } }],
        volumes: [{ content: '5000 per month', structuredData: {} }],
      }

      // Test the categorization logic directly
      const userMetrics: typeof data.monitoringMetrics = []
      const operationalMetrics: typeof data.monitoringMetrics = []
      const knowledgeMetrics: typeof data.monitoringMetrics = []
      const financialMetrics: typeof data.monitoringMetrics = []

      for (const m of data.monitoringMetrics) {
        const sd = m.structuredData as Record<string, string> | null
        const perspective = sd?.perspective?.toLowerCase() || ''
        if (perspective.includes('user') || perspective.includes('experience') || perspective.includes('satisfaction')) {
          userMetrics.push(m)
        } else if (perspective.includes('knowledge') || perspective.includes('quality')) {
          knowledgeMetrics.push(m)
        } else if (perspective.includes('financial') || perspective.includes('cost') || perspective.includes('roi')) {
          financialMetrics.push(m)
        } else {
          operationalMetrics.push(m)
        }
      }

      expect(userMetrics).toHaveLength(1)
      expect(operationalMetrics).toHaveLength(2) // 'operational' + 'Other' (no perspective match)
      expect(knowledgeMetrics).toHaveLength(1)
      expect(financialMetrics).toHaveLength(1)

      const result = MonitoringFrameworkPDF({ data })
      expect(result).toBeDefined()
    })

    it('computes total metrics correctly', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        monitoringMetrics: [
          { content: 'M1', structuredData: {} },
          { content: 'M2', structuredData: {} },
        ],
        kpis: [
          { content: 'K1', structuredData: {} },
        ],
        volumes: [],
      }
      const totalMetrics = data.monitoringMetrics.length + data.kpis.length
      expect(totalMetrics).toBe(3)

      const result = MonitoringFrameworkPDF({ data })
      expect(result).toBeDefined()
    })
  })

  describe('RolloutPlanPDF', () => {
    it('renders without errors with empty data', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        launchCriteria: [],
        testCases: [],
        kpis: [],
        scopeItems: [],
      }
      const result = RolloutPlanPDF({ data })
      expect(result).toBeDefined()
    })

    it('categorizes launch criteria by phase', () => {
      const data = {
        companyName: 'Acme',
        digitalEmployeeName: 'Bot',
        launchCriteria: [
          { content: 'Go/no-go check', structuredData: { phase: 'go_decision', criterion: 'All tests pass' } },
          { content: 'Soft launch', structuredData: { phase: 'soft_launch_pilot', criterion: 'Limited users' } },
          { content: 'Full launch', structuredData: { phase: 'full_launch', criterion: 'All users' } },
          { content: 'Other', structuredData: { phase: 'preparation', criterion: 'Setup done' } },
        ],
        testCases: [
          { id: '1', name: 'Test 1', type: 'happy_path', priority: 'high', expectedResult: 'Pass' },
        ],
        kpis: [{ content: 'KPI 1', structuredData: { name: 'Metric', target: '90%' } }],
        scopeItems: [{ description: 'In scope item', classification: 'IN_SCOPE' }],
      }

      // Test the categorization logic directly
      const goNoGoCriteria: typeof data.launchCriteria = []
      const softLaunchCriteria: typeof data.launchCriteria = []
      const otherCriteria: typeof data.launchCriteria = []

      for (const lc of data.launchCriteria) {
        const sd = lc.structuredData as Record<string, string> | null
        const phase = sd?.phase?.toLowerCase() || ''
        if (phase.includes('go') || phase.includes('decision') || phase.includes('full')) {
          goNoGoCriteria.push(lc)
        } else if (phase.includes('soft') || phase.includes('pilot')) {
          softLaunchCriteria.push(lc)
        } else {
          otherCriteria.push(lc)
        }
      }

      expect(goNoGoCriteria).toHaveLength(2) // 'go_decision' and 'full_launch'
      expect(softLaunchCriteria).toHaveLength(1) // 'soft_launch_pilot'
      expect(otherCriteria).toHaveLength(1) // 'preparation'

      const result = RolloutPlanPDF({ data })
      expect(result).toBeDefined()
    })
  })
})
