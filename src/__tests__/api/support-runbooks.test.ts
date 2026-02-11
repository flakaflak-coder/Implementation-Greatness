import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/support/runbooks/[deId]/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('GET /api/support/runbooks/[deId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns runbook data for a digital employee', async () => {
    const mockDE = {
      id: 'de-1',
      name: 'Claims Agent',
      description: 'Handles insurance claims',
      status: 'LIVE',
      channels: ['email', 'chat'],
      currentJourneyPhase: 'LIVE',
      goLiveDate: new Date('2026-03-01'),
      company: { id: 'company-1', name: 'Acme Insurance' },
      designWeek: {
        scopeItems: [
          {
            id: 'scope-1',
            statement: 'Handle basic claims',
            classification: 'IN_SCOPE',
            skill: 'claims-processing',
            conditions: 'Standard claims only',
            notes: null,
            excludeFromDocument: false,
          },
          {
            id: 'scope-2',
            statement: 'Handle fraud cases',
            classification: 'OUT_OF_SCOPE',
            skill: null,
            conditions: null,
            notes: 'Requires manual review',
            excludeFromDocument: false,
          },
        ],
        escalationRules: [
          {
            id: 'esc-1',
            trigger: 'Angry customer',
            conditionType: 'KEYWORD',
            threshold: null,
            keywords: ['angry', 'frustrated'],
            action: 'Transfer to supervisor',
            handoverContext: 'Include full conversation',
            priority: 1,
            excludeFromDocument: false,
          },
        ],
        scenarios: [
          {
            id: 'scenario-1',
            name: 'Basic claim submission',
            trigger: 'Customer initiates claim',
            actor: 'Customer',
            expectedOutcome: 'Claim registered',
            successCriteria: 'Claim number assigned',
            skill: 'claims-processing',
            excludeFromDocument: false,
            steps: [
              {
                id: 'step-1',
                order: 1,
                actor: 'Customer',
                action: 'Submit claim form',
                systemAction: 'Validate form fields',
                decisionPoint: null,
              },
            ],
            edgeCases: [
              {
                id: 'ec-1',
                condition: 'Missing required fields',
                handling: 'Prompt for missing info',
                escalate: false,
              },
            ],
          },
        ],
        integrations: [
          {
            id: 'int-1',
            systemName: 'ClaimsDB',
            purpose: 'Store claims data',
            type: 'REST_API',
            endpoint: 'https://api.claims.example.com',
            authMethod: 'OAuth2',
            authOwner: 'IT Team',
            fieldsRead: ['claimId', 'status'],
            fieldsWrite: ['newClaim'],
            rateLimits: '100/min',
            onTimeout: 'Retry 3 times',
            onAuthFailure: 'Alert admin',
            onNotFound: 'Create new record',
            status: 'ACTIVE',
            excludeFromDocument: false,
          },
        ],
        kpis: [
          {
            id: 'kpi-1',
            name: 'First Response Time',
            description: 'Time to first response',
            targetValue: '< 2 minutes',
            baselineValue: '5 minutes',
            measurementMethod: 'Automated tracking',
            dataSource: 'ClaimsDB',
            frequency: 'Real-time',
            owner: 'Support Lead',
            excludeFromDocument: false,
          },
        ],
      },
    }

    mockedPrisma.digitalEmployee.findUnique.mockResolvedValue(mockDE as never)

    const request = new NextRequest('http://localhost/api/support/runbooks/de-1')
    const response = await GET(request, { params: Promise.resolve({ deId: 'de-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.digitalEmployee.id).toBe('de-1')
    expect(data.data.digitalEmployee.name).toBe('Claims Agent')
    expect(data.data.company.name).toBe('Acme Insurance')
    expect(data.data.hasDesignWeek).toBe(true)

    // Scope sections
    expect(data.data.sections.scope.inScope).toHaveLength(1)
    expect(data.data.sections.scope.outOfScope).toHaveLength(1)
    expect(data.data.sections.scope.inScope[0].statement).toBe('Handle basic claims')

    // Escalation rules
    expect(data.data.sections.escalationRules).toHaveLength(1)
    expect(data.data.sections.escalationRules[0].trigger).toBe('Angry customer')

    // Scenarios
    expect(data.data.sections.scenarios).toHaveLength(1)
    expect(data.data.sections.scenarios[0].steps).toHaveLength(1)
    expect(data.data.sections.scenarios[0].edgeCases).toHaveLength(1)

    // Integrations
    expect(data.data.sections.integrations).toHaveLength(1)
    expect(data.data.sections.integrations[0].systemName).toBe('ClaimsDB')

    // KPIs
    expect(data.data.sections.kpis).toHaveLength(1)
    expect(data.data.sections.kpis[0].name).toBe('First Response Time')

    expect(mockedPrisma.digitalEmployee.findUnique).toHaveBeenCalledOnce()
  })

  it('returns 404 when digital employee is not found', async () => {
    mockedPrisma.digitalEmployee.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/support/runbooks/nonexistent')
    const response = await GET(request, { params: Promise.resolve({ deId: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Digital Employee not found')
  })

  it('returns runbook with empty sections when no design week exists', async () => {
    const mockDE = {
      id: 'de-2',
      name: 'New Agent',
      description: null,
      status: 'DESIGN',
      channels: [],
      currentJourneyPhase: 'DESIGN_WEEK',
      goLiveDate: null,
      company: { id: 'company-1', name: 'Acme Insurance' },
      designWeek: null,
    }

    mockedPrisma.digitalEmployee.findUnique.mockResolvedValue(mockDE as never)

    const request = new NextRequest('http://localhost/api/support/runbooks/de-2')
    const response = await GET(request, { params: Promise.resolve({ deId: 'de-2' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.hasDesignWeek).toBe(false)
    expect(data.data.sections.scope.inScope).toHaveLength(0)
    expect(data.data.sections.scope.outOfScope).toHaveLength(0)
    expect(data.data.sections.escalationRules).toHaveLength(0)
    expect(data.data.sections.scenarios).toHaveLength(0)
    expect(data.data.sections.integrations).toHaveLength(0)
    expect(data.data.sections.kpis).toHaveLength(0)
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.digitalEmployee.findUnique.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/support/runbooks/de-1')
    const response = await GET(request, { params: Promise.resolve({ deId: 'de-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to fetch runbook data')
  })
})
