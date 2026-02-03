import { describe, it, expect, vi, beforeEach } from 'vitest'

// Define mocks inside factories
vi.mock('@/lib/db', () => ({
  prisma: {
    designWeek: {
      findMany: vi.fn(),
    },
  },
}))

// Import after mocks
import { GET } from '@/app/api/portfolio/route'
import { prisma } from '@/lib/db'

describe('GET /api/portfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns portfolio data successfully', async () => {
    const mockDesignWeeks = [
      {
        id: 'dw-1',
        currentPhase: 1,
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
        digitalEmployee: {
          id: 'de-1',
          name: 'Claims Bot',
          company: { id: 'c-1', name: 'Acme Insurance' },
          journeyPhases: [
            { phaseType: 'DESIGN_WEEK', status: 'IN_PROGRESS', blockedReason: null, assignedTo: 'Sophie' },
          ],
        },
        sessions: [
          { id: 's-1', phase: 1, processingStatus: 'COMPLETE', createdAt: new Date() },
        ],
        scopeItems: [
          { classification: 'IN_SCOPE' },
          { classification: 'OUT_OF_SCOPE' },
        ],
      },
    ]

    vi.mocked(prisma.designWeek.findMany).mockResolvedValue(mockDesignWeeks as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.designWeeks).toHaveLength(1)
    expect(data.data.summary.total).toBe(1)
  })

  it('calculates traffic light status correctly - green', async () => {
    const mockDesignWeeks = [
      {
        id: 'dw-1',
        currentPhase: 1,
        status: 'IN_PROGRESS',
        updatedAt: new Date(), // Recently updated
        digitalEmployee: {
          id: 'de-1',
          name: 'Test Bot',
          company: { id: 'c-1', name: 'Test Co' },
          journeyPhases: [],
        },
        sessions: [
          { id: 's-1', phase: 1, processingStatus: 'COMPLETE', createdAt: new Date() },
        ],
        scopeItems: [], // No ambiguous items
      },
    ]

    vi.mocked(prisma.designWeek.findMany).mockResolvedValue(mockDesignWeeks as any)

    const response = await GET()
    const data = await response.json()

    expect(data.data.designWeeks[0].trafficLight).toBe('green')
    expect(data.data.summary.green).toBe(1)
  })

  it('calculates traffic light status correctly - yellow (ambiguous items)', async () => {
    const mockDesignWeeks = [
      {
        id: 'dw-1',
        currentPhase: 1,
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
        digitalEmployee: {
          id: 'de-1',
          name: 'Test Bot',
          company: { id: 'c-1', name: 'Test Co' },
          journeyPhases: [],
        },
        sessions: [
          { id: 's-1', phase: 1, processingStatus: 'COMPLETE', createdAt: new Date() },
        ],
        scopeItems: [
          { classification: 'AMBIGUOUS' },
          { classification: 'AMBIGUOUS' },
        ],
      },
    ]

    vi.mocked(prisma.designWeek.findMany).mockResolvedValue(mockDesignWeeks as any)

    const response = await GET()
    const data = await response.json()

    expect(data.data.designWeeks[0].trafficLight).toBe('yellow')
    expect(data.data.designWeeks[0].issues).toContain('2 ambiguous items')
  })

  it('calculates traffic light status correctly - red (blocked)', async () => {
    const mockDesignWeeks = [
      {
        id: 'dw-1',
        currentPhase: 2,
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
        digitalEmployee: {
          id: 'de-1',
          name: 'Test Bot',
          company: { id: 'c-1', name: 'Test Co' },
          journeyPhases: [
            { phaseType: 'DESIGN_WEEK', status: 'BLOCKED', blockedReason: 'Missing client input', assignedTo: null },
          ],
        },
        sessions: [],
        scopeItems: [],
      },
    ]

    vi.mocked(prisma.designWeek.findMany).mockResolvedValue(mockDesignWeeks as any)

    const response = await GET()
    const data = await response.json()

    expect(data.data.designWeeks[0].trafficLight).toBe('red')
    expect(data.data.designWeeks[0].issues).toContain('Blocked: Missing client input')
  })

  it('calculates traffic light status correctly - red (stale)', async () => {
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - 15) // 15 days ago

    const mockDesignWeeks = [
      {
        id: 'dw-1',
        currentPhase: 1,
        status: 'IN_PROGRESS',
        updatedAt: staleDate,
        digitalEmployee: {
          id: 'de-1',
          name: 'Test Bot',
          company: { id: 'c-1', name: 'Test Co' },
          journeyPhases: [],
        },
        sessions: [],
        scopeItems: [],
      },
    ]

    vi.mocked(prisma.designWeek.findMany).mockResolvedValue(mockDesignWeeks as any)

    const response = await GET()
    const data = await response.json()

    expect(data.data.designWeeks[0].trafficLight).toBe('red')
    expect(data.data.designWeeks[0].issues).toContain('No activity in 10+ days')
  })

  it('calculates consultant workload correctly', async () => {
    const mockDesignWeeks = [
      {
        id: 'dw-1',
        currentPhase: 1,
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
        digitalEmployee: {
          id: 'de-1',
          name: 'Bot 1',
          company: { id: 'c-1', name: 'Co 1' },
          journeyPhases: [
            { phaseType: 'DESIGN_WEEK', status: 'IN_PROGRESS', blockedReason: null, assignedTo: 'Sophie' },
          ],
        },
        sessions: [{ id: 's-1', phase: 1, processingStatus: 'COMPLETE', createdAt: new Date() }],
        scopeItems: [],
      },
      {
        id: 'dw-2',
        currentPhase: 2,
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
        digitalEmployee: {
          id: 'de-2',
          name: 'Bot 2',
          company: { id: 'c-2', name: 'Co 2' },
          journeyPhases: [
            { phaseType: 'DESIGN_WEEK', status: 'IN_PROGRESS', blockedReason: null, assignedTo: 'Sophie' },
          ],
        },
        sessions: [{ id: 's-2', phase: 2, processingStatus: 'COMPLETE', createdAt: new Date() }],
        scopeItems: [],
      },
    ]

    vi.mocked(prisma.designWeek.findMany).mockResolvedValue(mockDesignWeeks as any)

    const response = await GET()
    const data = await response.json()

    const sophieWorkload = data.data.consultantWorkload.find((c: any) => c.name === 'Sophie')
    expect(sophieWorkload).toBeDefined()
    expect(sophieWorkload.total).toBe(2)
  })

  it('sorts design weeks by traffic light priority', async () => {
    const recentDate = new Date()
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - 15)

    const mockDesignWeeks = [
      {
        id: 'dw-green',
        currentPhase: 1,
        status: 'IN_PROGRESS',
        updatedAt: recentDate,
        digitalEmployee: {
          id: 'de-1',
          name: 'Green Bot',
          company: { id: 'c-1', name: 'Co 1' },
          journeyPhases: [],
        },
        sessions: [{ id: 's-1', phase: 1, processingStatus: 'COMPLETE', createdAt: recentDate }],
        scopeItems: [],
      },
      {
        id: 'dw-red',
        currentPhase: 1,
        status: 'IN_PROGRESS',
        updatedAt: staleDate,
        digitalEmployee: {
          id: 'de-2',
          name: 'Red Bot',
          company: { id: 'c-2', name: 'Co 2' },
          journeyPhases: [],
        },
        sessions: [],
        scopeItems: [],
      },
    ]

    vi.mocked(prisma.designWeek.findMany).mockResolvedValue(mockDesignWeeks as any)

    const response = await GET()
    const data = await response.json()

    // Red should be first
    expect(data.data.designWeeks[0].trafficLight).toBe('red')
    expect(data.data.designWeeks[1].trafficLight).toBe('green')
  })

  it('handles empty portfolio', async () => {
    vi.mocked(prisma.designWeek.findMany).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.designWeeks).toEqual([])
    expect(data.data.summary.total).toBe(0)
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.designWeek.findMany).mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to fetch portfolio data')
  })

  it('calculates scope completeness correctly', async () => {
    const mockDesignWeeks = [
      {
        id: 'dw-1',
        currentPhase: 1,
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
        digitalEmployee: {
          id: 'de-1',
          name: 'Test Bot',
          company: { id: 'c-1', name: 'Test Co' },
          journeyPhases: [],
        },
        sessions: [{ id: 's-1', phase: 1, processingStatus: 'COMPLETE', createdAt: new Date() }],
        scopeItems: [
          { classification: 'IN_SCOPE' },
          { classification: 'OUT_OF_SCOPE' },
          { classification: 'AMBIGUOUS' },
          { classification: 'AMBIGUOUS' },
        ],
      },
    ]

    vi.mocked(prisma.designWeek.findMany).mockResolvedValue(mockDesignWeeks as any)

    const response = await GET()
    const data = await response.json()

    // 2 resolved out of 4 = 50%
    expect(data.data.designWeeks[0].scopeCompleteness).toBe(50)
    expect(data.data.designWeeks[0].ambiguousCount).toBe(2)
  })
})
