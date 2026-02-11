import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/observatory/route'
import { mockPrisma } from '../setup'

// Mock the observatory features module
vi.mock('@/lib/observatory/features', () => ({
  FEATURES: [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Main dashboard',
      status: 'built',
      category: 'core',
      dateAdded: '2026-01-27',
      healthStatus: 'healthy',
    },
    {
      id: 'extraction-pipeline',
      name: 'Extraction Pipeline',
      description: 'AI extraction',
      status: 'built',
      category: 'extraction',
      dateAdded: '2026-01-31',
      healthStatus: 'unknown',
    },
  ],
  getFeatureSummary: () => ({
    total: 2,
    built: 2,
    inProgress: 0,
    planned: 0,
    deprecated: 0,
    healthy: 1,
    degraded: 0,
    broken: 0,
  }),
}))

const mockedPrisma = mockPrisma

describe('GET /api/observatory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns observatory metrics with all sections', async () => {
    // Mock event counts
    mockedPrisma.observatoryEvent.count
      .mockResolvedValueOnce(50 as never)  // dailyEvents
      .mockResolvedValueOnce(300 as never) // weeklyEvents
      .mockResolvedValueOnce(1000 as never) // totalEvents

    // Mock active users
    mockedPrisma.observatoryEvent.findMany
      .mockResolvedValueOnce([{ userId: 'user-1', sessionId: null }] as never) // daily active users
      .mockResolvedValueOnce([
        { userId: 'user-1', sessionId: null },
        { userId: 'user-2', sessionId: null },
      ] as never) // weekly active users

    // Mock top features (groupBy)
    mockedPrisma.observatoryEvent.groupBy.mockResolvedValue([
      { featureId: 'dashboard', _count: { featureId: 150 } },
    ] as never)

    // Mock recent activity (findMany, third call)
    mockedPrisma.observatoryEvent.findMany.mockResolvedValueOnce([
      {
        featureId: 'dashboard',
        type: 'FEATURE_USAGE',
        timestamp: new Date(),
        success: true,
      },
    ] as never)

    // Mock error counts
    mockedPrisma.observatoryError.count
      .mockResolvedValueOnce(2 as never)  // new errors
      .mockResolvedValueOnce(1 as never)  // investigating
      .mockResolvedValueOnce(5 as never)  // resolved
      .mockResolvedValueOnce(8 as never)  // total

    // Mock recent errors
    mockedPrisma.observatoryError.findMany.mockResolvedValue([
      {
        id: 'err-1',
        message: 'Connection timeout',
        featureId: 'extraction-pipeline',
        endpoint: '/api/extract',
        count: 3,
        status: 'NEW',
        firstSeen: new Date(),
        lastSeen: new Date(),
      },
    ] as never)

    // Mock feedback counts
    mockedPrisma.observatoryFeedback.count
      .mockResolvedValueOnce(3 as never)  // new feedback
      .mockResolvedValueOnce(10 as never) // total feedback

    // Mock NPS scores
    mockedPrisma.observatoryFeedback.findMany
      .mockResolvedValueOnce([
        { npsScore: 8 },
        { npsScore: 9 },
        { npsScore: 7 },
      ] as never) // nps scores
      .mockResolvedValueOnce([
        {
          id: 'fb-1',
          type: 'PRAISE',
          content: 'Great tool',
          featureId: 'dashboard',
          npsScore: 9,
          status: 'NEW',
          createdAt: new Date(),
        },
      ] as never) // recent feedback

    // Mock LLM operations
    mockedPrisma.observatoryLLMOperation.findMany.mockResolvedValue([
      {
        pipelineName: 'extraction',
        model: 'claude-3-opus',
        inputTokens: 5000,
        outputTokens: 1500,
        latencyMs: 3200,
        cost: 0.05,
        success: true,
      },
    ] as never)

    mockedPrisma.observatoryLLMOperation.count
      .mockResolvedValueOnce(95 as never)  // successful ops
      .mockResolvedValueOnce(5 as never)   // failed ops

    // Mock recent LLM operations
    mockedPrisma.observatoryLLMOperation.findMany.mockResolvedValueOnce([
      {
        id: 'llm-1',
        pipelineName: 'extraction',
        model: 'claude-3-opus',
        inputTokens: 5000,
        outputTokens: 1500,
        latencyMs: 3200,
        cost: 0.05,
        success: true,
        errorMessage: null,
        timestamp: new Date(),
      },
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.timestamp).toBeDefined()

    // Features section
    expect(data.data.features.summary.total).toBe(2)
    expect(data.data.features.summary.healthy).toBe(1)
    expect(data.data.features.list).toHaveLength(2)
    expect(data.data.features.byCategory).toBeDefined()

    // Health section
    expect(data.data.health.overall).toBe('healthy')
    expect(data.data.health.features.healthy).toBe(1)

    // Usage section
    expect(data.data.usage).toBeDefined()
    expect(data.data.usage.totalEvents).toBe(1000)

    // Errors section
    expect(data.data.errors).toBeDefined()
    expect(data.data.errors.total).toBe(8)
    expect(data.data.errors.new).toBe(2)

    // Feedback section
    expect(data.data.feedback).toBeDefined()
    expect(data.data.feedback.total).toBe(10)
    expect(data.data.feedback.new).toBe(3)

    // LLM section
    expect(data.data.llm).toBeDefined()
    expect(data.data.llm.totalOperations).toBeGreaterThanOrEqual(0)
  })

  it('returns 500 on database error', async () => {
    // The first prisma call in the route is observatoryEvent.count
    mockedPrisma.observatoryEvent.count.mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to fetch observatory data')
  })
})
