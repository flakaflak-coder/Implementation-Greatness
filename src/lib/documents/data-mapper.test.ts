import { describe, it, expect } from 'vitest'
import { mapToDocument } from './data-mapper'

// Helper to create minimal design week data
function createDesignWeekData(overrides = {}) {
  return {
    id: 'dw-123',
    digitalEmployee: {
      id: 'de-123',
      name: 'Claims Bot',
      description: 'Handles insurance claims',
      company: { name: 'Acme Insurance' },
    },
    sessions: [],
    scopeItems: [],
    integrations: [],
    businessRules: [],
    testCases: [],
    ...overrides,
  }
}

describe('data-mapper', () => {
  describe('mapToDocument', () => {
    it('creates document with correct metadata', () => {
      const data = createDesignWeekData()
      const doc = mapToDocument(data)

      expect(doc.metadata.title).toBe('Claims Bot Design Document')
      expect(doc.metadata.subtitle).toBe('Handles insurance claims')
      expect(doc.metadata.company).toBe('Acme Insurance')
      expect(doc.metadata.digitalEmployeeName).toBe('Claims Bot')
      expect(doc.metadata.version).toBe('1.0')
      expect(doc.metadata.status).toBe('DRAFT')
    })

    it('maps stakeholders from extracted items', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              {
                id: 'item-1',
                type: 'STAKEHOLDER',
                content: 'John Doe - Product Manager',
                status: 'APPROVED',
                rawJson: { name: 'John Doe', role: 'Product Manager', email: 'john@example.com' },
              },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.stakeholders).toHaveLength(1)
      expect(doc.stakeholders[0].name).toBe('John Doe')
      expect(doc.stakeholders[0].role).toBe('Product Manager')
      expect(doc.stakeholders[0].email).toBe('john@example.com')
    })

    it('parses stakeholder from content when no rawJson', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              {
                id: 'item-1',
                type: 'STAKEHOLDER',
                content: 'Jane Smith - CEO',
                status: 'APPROVED',
              },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.stakeholders[0].name).toBe('Jane Smith')
      expect(doc.stakeholders[0].role).toBe('CEO')
    })

    it('maps goals from extracted items', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              {
                id: 'item-1',
                type: 'GOAL',
                content: 'Reduce claim processing time by 50%',
                status: 'APPROVED',
                rawJson: { title: 'Reduce Processing Time', priority: 'high' },
              },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.businessContext.goals).toHaveLength(1)
      expect(doc.businessContext.goals[0].title).toBe('Reduce Processing Time')
      expect(doc.businessContext.goals[0].priority).toBe('high')
    })

    it('maps KPIs from extracted items', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              {
                id: 'item-1',
                type: 'KPI_TARGET',
                content: 'Automation rate: 85%',
                status: 'APPROVED',
                rawJson: { name: 'Automation Rate', target: '85%', unit: '%' },
              },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.businessContext.kpis).toHaveLength(1)
      expect(doc.businessContext.kpis[0].name).toBe('Automation Rate')
      expect(doc.businessContext.kpis[0].target).toBe('85%')
    })

    it('extracts target value from content', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              {
                id: 'item-1',
                type: 'KPI_TARGET',
                content: 'Target completion rate of 90% within first quarter',
                status: 'APPROVED',
              },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.businessContext.kpis[0].target).toBe('90%')
    })

    it('maps volume expectations', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              {
                id: 'item-1',
                type: 'VOLUME_EXPECTATION',
                content: '5000 cases per month',
                status: 'APPROVED',
                rawJson: { metric: 'Monthly Cases', value: '5000', period: 'monthly' },
              },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.businessContext.volumes).toHaveLength(1)
      expect(doc.businessContext.volumes[0].value).toBe('5000')
      expect(doc.businessContext.volumes[0].period).toBe('monthly')
    })

    it('maps happy path steps with ordering', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              {
                id: 'item-1',
                type: 'HAPPY_PATH_STEP',
                content: 'Receive claim submission',
                status: 'APPROVED',
                rawJson: { stepNumber: 1, name: 'Receive Claim', isAutomatable: true },
              },
              {
                id: 'item-2',
                type: 'HAPPY_PATH_STEP',
                content: 'Validate claim data',
                status: 'APPROVED',
                rawJson: { stepNumber: 2, name: 'Validate Data', isAutomatable: true },
              },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.processDesign.toBeSteps).toHaveLength(2)
      expect(doc.processDesign.toBeSteps[0].stepNumber).toBe(1)
      expect(doc.processDesign.toBeSteps[1].stepNumber).toBe(2)
    })

    it('maps exception cases', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              {
                id: 'item-1',
                type: 'EXCEPTION_CASE',
                content: 'Missing documentation - escalate to agent',
                status: 'APPROVED',
                rawJson: { name: 'Missing Docs', handling: 'Request additional docs' },
              },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.processDesign.exceptions).toHaveLength(1)
      expect(doc.processDesign.exceptions[0].name).toBe('Missing Docs')
    })

    it('maps scope items by classification', () => {
      const data = createDesignWeekData({
        scopeItems: [
          { id: '1', description: 'Handle simple claims', classification: 'IN_SCOPE', skill: 'claims-basic' },
          { id: '2', description: 'Handle litigation', classification: 'OUT_OF_SCOPE', notes: 'Too complex' },
          { id: '3', description: 'Handle partial claims', classification: 'AMBIGUOUS' },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.scope.inScope).toHaveLength(1)
      expect(doc.scope.inScope[0].skill).toBe('claims-basic')
      expect(doc.scope.outOfScope).toHaveLength(1)
      expect(doc.scope.outOfScope[0].notes).toBe('Too complex')
      expect(doc.scope.ambiguous).toHaveLength(1)
    })

    it('maps guardrails from extracted items', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              { id: '1', type: 'GUARDRAIL_NEVER', content: 'Never share passwords', status: 'APPROVED' },
              { id: '2', type: 'GUARDRAIL_ALWAYS', content: 'Always verify identity', status: 'APPROVED' },
              { id: '3', type: 'FINANCIAL_LIMIT', content: 'Max €5000 approval', status: 'APPROVED' },
              { id: '4', type: 'LEGAL_RESTRICTION', content: 'GDPR compliance', status: 'APPROVED' },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.scope.guardrails).toHaveLength(4)
      expect(doc.scope.guardrails.find(g => g.type === 'NEVER')?.description).toBe('Never share passwords')
      expect(doc.scope.guardrails.find(g => g.type === 'ALWAYS')?.description).toBe('Always verify identity')
      expect(doc.scope.guardrails.find(g => g.type === 'FINANCIAL_LIMIT')?.description).toBe('Max €5000 approval')
    })

    it('maps integrations from dedicated table', () => {
      const data = createDesignWeekData({
        integrations: [
          {
            id: 'int-1',
            systemName: 'SAP',
            purpose: 'read_write',
            connectionType: 'rest_api',
            authMethod: 'oauth2',
            notes: 'Primary ERP',
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.technicalRequirements.integrations).toHaveLength(1)
      expect(doc.technicalRequirements.integrations[0].systemName).toBe('SAP')
      expect(doc.technicalRequirements.integrations[0].authMethod).toBe('oauth2')
    })

    it('falls back to extracted items for integrations', () => {
      const data = createDesignWeekData({
        integrations: [], // Empty
        sessions: [
          {
            extractedItems: [
              {
                id: 'item-1',
                type: 'SYSTEM_INTEGRATION',
                content: 'Salesforce CRM',
                status: 'APPROVED',
                rawJson: { systemName: 'Salesforce', purpose: 'read', connectionType: 'rest_api' },
              },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.technicalRequirements.integrations).toHaveLength(1)
      expect(doc.technicalRequirements.integrations[0].systemName).toBe('Salesforce')
    })

    it('maps business rules', () => {
      const data = createDesignWeekData({
        businessRules: [
          {
            id: 'rule-1',
            name: 'Auto-approve small claims',
            category: 'claims',
            condition: 'Claim amount < €500',
            action: 'Approve automatically',
            priority: 'high',
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.businessRules).toHaveLength(1)
      expect(doc.businessRules[0].name).toBe('Auto-approve small claims')
      expect(doc.businessRules[0].priority).toBe('high')
    })

    it('adds business rules from extracted items', () => {
      const data = createDesignWeekData({
        businessRules: [],
        sessions: [
          {
            extractedItems: [
              {
                id: 'item-1',
                type: 'BUSINESS_RULE',
                content: 'Claims over €10000 require manager approval',
                status: 'APPROVED',
                rawJson: { name: 'Large Claim Rule', category: 'approval', priority: 'critical' },
              },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.businessRules).toHaveLength(1)
      expect(doc.businessRules[0].priority).toBe('critical')
    })

    it('maps test cases', () => {
      const data = createDesignWeekData({
        testCases: [
          {
            id: 'tc-1',
            name: 'Simple claim submission',
            type: 'happy_path',
            priority: 'high',
            preconditions: 'Customer logged in',
            steps: ['Submit claim', 'Verify data', 'Approve'],
            expectedResult: 'Claim approved',
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.testPlan).toBeDefined()
      expect(doc.testPlan?.testCases).toHaveLength(1)
      expect(doc.testPlan?.testCases[0].name).toBe('Simple claim submission')
      expect(doc.testPlan?.coverageSummary.total).toBe(1)
    })

    it('excludes non-approved items', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              { id: '1', type: 'GOAL', content: 'Approved goal', status: 'APPROVED' },
              { id: '2', type: 'GOAL', content: 'Pending goal', status: 'PENDING' },
              { id: '3', type: 'GOAL', content: 'Rejected goal', status: 'REJECTED' },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.businessContext.goals).toHaveLength(1)
      expect(doc.businessContext.goals[0].description).toBe('Approved goal')
    })

    it('includes items without status', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              { id: '1', type: 'GOAL', content: 'Goal without status' },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.businessContext.goals).toHaveLength(1)
    })

    it('builds executive summary correctly', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              { id: '1', type: 'GOAL', content: 'Reduce processing time', status: 'APPROVED', rawJson: { title: 'Reduce Processing Time' } },
              { id: '2', type: 'BUSINESS_CASE', content: 'High manual workload', status: 'APPROVED' },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.executiveSummary.overview).toContain('Claims Bot')
      expect(doc.executiveSummary.overview).toContain('Acme Insurance')
      expect(doc.executiveSummary.keyObjectives).toContain('Reduce Processing Time')
    })

    it('maps security requirements', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              { id: '1', type: 'SECURITY_REQUIREMENT', content: 'SSL encryption required', status: 'APPROVED' },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.technicalRequirements.securityRequirements).toContain('SSL encryption required')
    })

    it('maps channels', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              { id: '1', type: 'CHANNEL', content: 'Email', status: 'APPROVED' },
              { id: '2', type: 'CHANNEL', content: 'Web Portal', status: 'APPROVED' },
            ],
          },
        ],
      })

      const doc = mapToDocument(data)

      expect(doc.technicalRequirements.channels).toContain('Email')
      expect(doc.technicalRequirements.channels).toContain('Web Portal')
    })

    it('calculates completeness score', () => {
      const data = createDesignWeekData({
        sessions: [
          {
            extractedItems: [
              { id: '1', type: 'STAKEHOLDER', content: 'John', status: 'APPROVED' },
              { id: '2', type: 'GOAL', content: 'Goal 1', status: 'APPROVED' },
              { id: '3', type: 'KPI_TARGET', content: 'KPI 1', status: 'APPROVED' },
              { id: '4', type: 'HAPPY_PATH_STEP', content: 'Step 1', status: 'APPROVED' },
              { id: '5', type: 'GUARDRAIL_NEVER', content: 'Never X', status: 'APPROVED' },
            ],
          },
        ],
        scopeItems: [{ id: '1', description: 'Scope', classification: 'IN_SCOPE' }],
        integrations: [{ id: '1', systemName: 'SAP', purpose: 'read', connectionType: 'api' }],
        businessRules: [{ id: '1', name: 'Rule', category: 'test', condition: 'if', action: 'then', priority: 'high' }],
        testCases: [{ id: '1', name: 'Test', type: 'happy_path', priority: 'high', steps: ['step'], expectedResult: 'pass' }],
      })

      const doc = mapToDocument(data)

      // Should have high completeness with all sections filled
      expect(doc.metadata.completenessScore).toBeGreaterThan(80)
    })
  })
})
