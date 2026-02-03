import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/dashboard/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns dashboard data with stats and design weeks', async () => {
    // Mock count queries
    mockedPrisma.digitalEmployee.count
      .mockResolvedValueOnce(10) // totalDigitalEmployees
      .mockResolvedValueOnce(3) // liveAgents

    mockedPrisma.designWeek.count.mockResolvedValue(5) // activeDesignWeeks

    // Mock allDigitalEmployees
    mockedPrisma.digitalEmployee.findMany.mockResolvedValue([])

    // Mock companies
    mockedPrisma.company.findMany.mockResolvedValue([
      {
        id: 'company-1',
        name: 'Acme Insurance',
        industry: 'Insurance',
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { digitalEmployees: 3 },
        digitalEmployees: [
          { status: 'DESIGN' },
          { status: 'LIVE' },
          { status: 'ONBOARDING' },
        ],
      },
    ] as never)

    // Mock design weeks with full details
    mockedPrisma.designWeek.findMany.mockResolvedValue([
      {
        id: 'dw-1',
        currentPhase: 2,
        status: 'IN_PROGRESS',
        digitalEmployee: {
          id: 'de-1',
          name: 'Claims Agent',
          company: { id: 'company-1', name: 'Acme Insurance' },
        },
        sessions: [
          { id: 's-1', phase: 1, processingStatus: 'COMPLETE', extractedItems: [] },
          { id: 's-2', phase: 2, processingStatus: 'COMPLETE', extractedItems: [] },
        ],
        scopeItems: [
          { classification: 'IN_SCOPE', status: 'CONFIRMED', excludeFromDocument: false },
          { classification: 'OUT_OF_SCOPE', status: 'CONFIRMED', excludeFromDocument: false },
          { classification: 'AMBIGUOUS', status: 'NEEDS_DISCUSSION', excludeFromDocument: false },
        ],
        scenarios: [{ id: 'sc-1', excludeFromDocument: false }],
        kpis: [{ id: 'kpi-1', status: 'CONFIRMED', excludeFromDocument: false }],
        integrations: [{ id: 'int-1', status: 'IDENTIFIED', excludeFromDocument: false }],
        escalationRules: [{ id: 'esc-1', excludeFromDocument: false }],
      },
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Check stats
    expect(data.data.stats.totalDigitalEmployees).toBe(10)
    expect(data.data.stats.activeDesignWeeks).toBe(5)
    expect(data.data.stats.liveAgents).toBe(3)
    expect(data.data.stats.itemsNeedResolution).toBe(1) // 1 ambiguous item

    // Check design weeks
    expect(data.data.designWeeks).toHaveLength(1)
    expect(data.data.designWeeks[0].id).toBe('dw-1')
    expect(data.data.designWeeks[0].digitalEmployee.name).toBe('Claims Agent')
    expect(data.data.designWeeks[0].currentPhase).toBe(2)
    expect(data.data.designWeeks[0].ambiguousCount).toBe(1)

    // Check progress details
    const progress = data.data.designWeeks[0].progress
    expect(progress.scopeCounts.inScope).toBe(1)
    expect(progress.scopeCounts.outOfScope).toBe(1)
    expect(progress.scopeCounts.ambiguous).toBe(1)
    expect(progress.extractions.scenarios).toBe(1)
    expect(progress.extractions.kpis).toBe(1)
    expect(progress.extractions.integrations).toBe(1)

    // Check companies
    expect(data.data.recentCompanies).toHaveLength(1)
    expect(data.data.recentCompanies[0].name).toBe('Acme Insurance')
    expect(data.data.recentCompanies[0].digitalEmployeeCount).toBe(3)
    expect(data.data.recentCompanies[0].activeCount).toBe(2) // DESIGN + ONBOARDING
    expect(data.data.recentCompanies[0].liveCount).toBe(1)
  })

  it('calculates phase readiness correctly', async () => {
    mockedPrisma.digitalEmployee.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0)
    mockedPrisma.designWeek.count.mockResolvedValue(1)
    mockedPrisma.company.findMany.mockResolvedValue([])
    mockedPrisma.digitalEmployee.findMany.mockResolvedValue([])

    // Design week at phase 2 with insufficient data
    mockedPrisma.designWeek.findMany.mockResolvedValue([
      {
        id: 'dw-1',
        currentPhase: 2,
        status: 'IN_PROGRESS',
        digitalEmployee: {
          id: 'de-1',
          name: 'Test Agent',
          company: { id: 'c-1', name: 'Test Corp' },
        },
        sessions: [
          { id: 's-1', phase: 2, processingStatus: 'COMPLETE', extractedItems: [] },
        ], // Only 1 session, phase 2 requires 2
        scopeItems: [], // No scope items, phase 2 requires >= 5
        scenarios: [],
        kpis: [],
        integrations: [],
        escalationRules: [],
      },
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(data.success).toBe(true)

    const progress = data.data.designWeeks[0].progress
    expect(progress.isPhaseReady).toBe(false)
    expect(progress.blockers).toContain('Process sessions recorded')
    expect(progress.blockers).toContain('Scope items defined')
  })

  it('calculates completeness score correctly', async () => {
    mockedPrisma.digitalEmployee.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
    mockedPrisma.designWeek.count.mockResolvedValue(1)
    mockedPrisma.company.findMany.mockResolvedValue([])
    mockedPrisma.digitalEmployee.findMany.mockResolvedValue([])

    mockedPrisma.designWeek.findMany.mockResolvedValue([
      {
        id: 'dw-1',
        currentPhase: 2,
        status: 'IN_PROGRESS',
        digitalEmployee: {
          id: 'de-1',
          name: 'Test Agent',
          company: { id: 'c-1', name: 'Test Corp' },
        },
        sessions: [],
        scopeItems: [
          { classification: 'IN_SCOPE', status: 'CONFIRMED', excludeFromDocument: false },
          { classification: 'IN_SCOPE', status: 'CONFIRMED', excludeFromDocument: false },
          { classification: 'OUT_OF_SCOPE', status: 'CONFIRMED', excludeFromDocument: false },
          { classification: 'AMBIGUOUS', status: 'NEEDS_DISCUSSION', excludeFromDocument: false },
        ], // 3 resolved out of 4 = 75%
        scenarios: [],
        kpis: [],
        integrations: [],
        escalationRules: [],
      },
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(data.data.designWeeks[0].completenessScore).toBe(75)
  })

  it('handles empty design weeks', async () => {
    mockedPrisma.digitalEmployee.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
    mockedPrisma.designWeek.count.mockResolvedValue(0)
    mockedPrisma.company.findMany.mockResolvedValue([])
    mockedPrisma.digitalEmployee.findMany.mockResolvedValue([])
    mockedPrisma.designWeek.findMany.mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.stats.totalDigitalEmployees).toBe(0)
    expect(data.data.stats.activeDesignWeeks).toBe(0)
    expect(data.data.stats.itemsNeedResolution).toBe(0)
    expect(data.data.designWeeks).toEqual([])
    expect(data.data.recentCompanies).toEqual([])
  })

  it('counts excluded items correctly', async () => {
    mockedPrisma.digitalEmployee.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
    mockedPrisma.designWeek.count.mockResolvedValue(1)
    mockedPrisma.company.findMany.mockResolvedValue([])
    mockedPrisma.digitalEmployee.findMany.mockResolvedValue([])

    mockedPrisma.designWeek.findMany.mockResolvedValue([
      {
        id: 'dw-1',
        currentPhase: 1,
        status: 'IN_PROGRESS',
        digitalEmployee: {
          id: 'de-1',
          name: 'Test Agent',
          company: { id: 'c-1', name: 'Test Corp' },
        },
        sessions: [],
        scopeItems: [
          { classification: 'IN_SCOPE', status: 'CONFIRMED', excludeFromDocument: true },
          { classification: 'IN_SCOPE', status: 'CONFIRMED', excludeFromDocument: false },
        ],
        scenarios: [
          { id: 'sc-1', excludeFromDocument: true },
          { id: 'sc-2', excludeFromDocument: false },
        ],
        kpis: [{ id: 'kpi-1', status: 'CONFIRMED', excludeFromDocument: true }],
        integrations: [],
        escalationRules: [],
      },
    ] as never)

    const response = await GET()
    const data = await response.json()

    const excludedCounts = data.data.designWeeks[0].progress.excludedCounts
    expect(excludedCounts.scopeItems).toBe(1)
    expect(excludedCounts.scenarios).toBe(1)
    expect(excludedCounts.kpis).toBe(1)
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.digitalEmployee.count.mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to fetch dashboard data')
  })
})
