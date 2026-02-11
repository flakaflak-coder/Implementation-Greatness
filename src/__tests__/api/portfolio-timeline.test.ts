import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Define mocks inside factories
vi.mock('@/lib/db', () => ({
  prisma: {
    digitalEmployee: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    journeyPhase: {
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/tracker-utils', () => ({
  calculateTrackerStatus: vi.fn().mockReturnValue('ON_TRACK'),
  calculateProgress: vi.fn().mockReturnValue(50),
  calculateRiskLevel: vi.fn().mockReturnValue('LOW'),
  calculateDefaultWeeks: vi.fn().mockReturnValue({ startWeek: 5, endWeek: 17 }),
  getISOWeek: vi.fn().mockReturnValue(7),
}))

// Import after mocks
import { GET, PATCH } from '@/app/api/portfolio/timeline/route'
import { prisma } from '@/lib/db'

/**
 * Helper to build a minimal mock DE record matching the shape
 * returned by the Prisma query in the timeline GET route.
 */
function createMockDE(overrides: Record<string, unknown> = {}) {
  return {
    id: 'de-1',
    name: 'Claims Agent',
    status: 'DESIGN',
    blocker: null,
    goLiveDate: null,
    startWeek: null,
    endWeek: null,
    goLiveWeek: null,
    ownerClient: null,
    ownerFreedayProject: null,
    ownerFreedayEngineering: null,
    thisWeekActions: null,
    sortOrder: 0,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-20T12:00:00Z'),
    company: { id: 'company-1', name: 'Acme Insurance' },
    journeyPhases: [
      {
        id: 'jp-1',
        phaseType: 'DESIGN_WEEK',
        status: 'IN_PROGRESS',
        order: 3,
        startedAt: new Date('2026-01-20T10:00:00Z'),
        completedAt: null,
        dueDate: null,
        blockedReason: null,
        assignedTo: 'Sophie',
      },
    ],
    designWeek: {
      id: 'dw-1',
      status: 'IN_PROGRESS',
      currentPhase: 2,
      startedAt: new Date('2026-01-20T10:00:00Z'),
      completedAt: null,
      manualPhaseCompletions: [],
      prerequisites: [],
      sessions: [
        { id: 'session-1', phase: 1, processingStatus: 'COMPLETE' },
      ],
      scopeItems: [
        { classification: 'IN_SCOPE' },
        { classification: 'AMBIGUOUS' },
      ],
      rawExtractions: [
        { contentType: 'KICKOFF_SESSION' },
      ],
    },
    ...overrides,
  }
}

describe('GET /api/portfolio/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns timeline data with summary and companies', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE(),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.digitalEmployees).toHaveLength(1)
    expect(data.data.companies).toHaveLength(1)
    expect(data.data.companies[0].name).toBe('Acme Insurance')
    expect(data.data.summary.total).toBe(1)
    expect(data.data.currentWeek).toBe(7)
    expect(data.data.leads).toContain('Sophie')
  })

  it('returns empty state when no digital employees exist', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.digitalEmployees).toHaveLength(0)
    expect(data.data.companies).toHaveLength(0)
    expect(data.data.summary.total).toBe(0)
    expect(data.data.leads).toHaveLength(0)
  })

  it('groups multiple DEs under the same company', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE({ id: 'de-1', name: 'Claims Agent' }),
      createMockDE({ id: 'de-2', name: 'Support Bot' }),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.companies).toHaveLength(1)
    expect(data.data.companies[0].digitalEmployees).toHaveLength(2)
    expect(data.data.summary.total).toBe(2)
  })

  it('calculates traffic light correctly for DEs with blockers', async () => {
    const { calculateTrackerStatus } = await import('@/lib/tracker-utils')
    vi.mocked(calculateTrackerStatus).mockReturnValue('BLOCKED' as never)

    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE({
        blocker: 'Waiting for client API access',
      }),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    const de = data.data.digitalEmployees[0]
    expect(de.trafficLight).toBe('red')
    expect(de.issues).toContain('Waiting for client API access')
  })

  it('includes design week progress data', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE(),
    ] as never)

    const response = await GET()
    const data = await response.json()

    const de = data.data.digitalEmployees[0]
    expect(de.designWeek).toBeDefined()
    expect(de.designWeek.id).toBe('dw-1')
    expect(de.designWeek.status).toBe('IN_PROGRESS')
    expect(typeof de.designWeek.progress).toBe('number')
    expect(typeof de.designWeek.sessionProgress).toBe('number')
    expect(typeof de.designWeek.scopeProgress).toBe('number')
  })

  it('returns summary with stage breakdown', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE({ id: 'de-1' }),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(data.data.summary.byStage).toBeDefined()
    expect(data.data.summary.byStage.designWeek).toBeGreaterThanOrEqual(0)
    expect(data.data.summary.byTrafficLight).toBeDefined()
    expect(data.data.summary.byTrackerStatus).toBeDefined()
    expect(data.data.summary.byRiskLevel).toBeDefined()
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to fetch timeline data')
  })
})

describe('PATCH /api/portfolio/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when id is missing', async () => {
    const request = new NextRequest('http://localhost/api/portfolio/timeline', {
      method: 'PATCH',
      body: JSON.stringify({ startWeek: 5 }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Digital Employee ID is required')
  })

  it('successfully updates startWeek and endWeek', async () => {
    vi.mocked(prisma.digitalEmployee.update).mockResolvedValue({
      id: 'de-1',
      name: 'Claims Agent',
      startWeek: 5,
      endWeek: 17,
      goLiveWeek: null,
      blocker: null,
      thisWeekActions: null,
      sortOrder: 0,
      updatedAt: new Date('2026-01-21T10:00:00Z'),
      journeyPhases: [{ assignedTo: 'Sophie' }],
    } as never)

    const request = new NextRequest('http://localhost/api/portfolio/timeline', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'de-1', startWeek: 5, endWeek: 17 }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.startWeek).toBe(5)
    expect(data.data.endWeek).toBe(17)
    expect(data.data.updatedAt).toBeDefined()
  })

  it('successfully updates blocker text', async () => {
    vi.mocked(prisma.digitalEmployee.update).mockResolvedValue({
      id: 'de-1',
      name: 'Claims Agent',
      startWeek: 5,
      endWeek: 17,
      goLiveWeek: null,
      blocker: 'Waiting for API credentials',
      thisWeekActions: null,
      sortOrder: 0,
      updatedAt: new Date('2026-01-21T10:00:00Z'),
      journeyPhases: [{ assignedTo: 'Sophie' }],
    } as never)

    const request = new NextRequest('http://localhost/api/portfolio/timeline', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'de-1', blocker: 'Waiting for API credentials' }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.blocker).toBe('Waiting for API credentials')
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.digitalEmployee.update).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/portfolio/timeline', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'de-1', startWeek: 5 }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to update timeline data')
  })

  it('returns 409 when updatedAt does not match (optimistic locking conflict)', async () => {
    // The record was last updated at 12:00, but the client thinks it was at 10:00
    vi.mocked(prisma.digitalEmployee.findUnique).mockResolvedValue({
      updatedAt: new Date('2026-01-21T12:00:00.000Z'),
    } as never)

    const request = new NextRequest('http://localhost/api/portfolio/timeline', {
      method: 'PATCH',
      body: JSON.stringify({
        id: 'de-1',
        startWeek: 5,
        updatedAt: '2026-01-21T10:00:00.000Z',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.success).toBe(false)
    expect(data.code).toBe('CONFLICT')
    expect(data.error).toContain('modified by another user')
    // Should NOT have called update
    expect(prisma.digitalEmployee.update).not.toHaveBeenCalled()
  })

  it('proceeds with update when updatedAt matches (no conflict)', async () => {
    const timestamp = '2026-01-21T10:00:00.000Z'

    vi.mocked(prisma.digitalEmployee.findUnique).mockResolvedValue({
      updatedAt: new Date(timestamp),
    } as never)

    vi.mocked(prisma.digitalEmployee.update).mockResolvedValue({
      id: 'de-1',
      name: 'Claims Agent',
      startWeek: 8,
      endWeek: 20,
      goLiveWeek: null,
      blocker: null,
      thisWeekActions: null,
      sortOrder: 0,
      updatedAt: new Date('2026-01-21T10:05:00.000Z'),
      journeyPhases: [{ assignedTo: 'Sophie' }],
    } as never)

    const request = new NextRequest('http://localhost/api/portfolio/timeline', {
      method: 'PATCH',
      body: JSON.stringify({
        id: 'de-1',
        startWeek: 8,
        endWeek: 20,
        updatedAt: timestamp,
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.startWeek).toBe(8)
    expect(data.data.updatedAt).toBeDefined()
    expect(prisma.digitalEmployee.findUnique).toHaveBeenCalledWith({
      where: { id: 'de-1' },
      select: { updatedAt: true },
    })
  })

  it('skips optimistic locking check when updatedAt is not provided (backwards compatible)', async () => {
    vi.mocked(prisma.digitalEmployee.update).mockResolvedValue({
      id: 'de-1',
      name: 'Claims Agent',
      startWeek: 5,
      endWeek: 17,
      goLiveWeek: null,
      blocker: null,
      thisWeekActions: null,
      sortOrder: 0,
      updatedAt: new Date('2026-01-21T10:00:00Z'),
      journeyPhases: [{ assignedTo: 'Sophie' }],
    } as never)

    const request = new NextRequest('http://localhost/api/portfolio/timeline', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'de-1', startWeek: 5, endWeek: 17 }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // findUnique should NOT have been called
    expect(prisma.digitalEmployee.findUnique).not.toHaveBeenCalled()
  })

  it('returns 404 when DE not found during optimistic locking check', async () => {
    vi.mocked(prisma.digitalEmployee.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/portfolio/timeline', {
      method: 'PATCH',
      body: JSON.stringify({
        id: 'nonexistent-de',
        startWeek: 5,
        updatedAt: '2026-01-21T10:00:00.000Z',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Digital Employee not found')
    expect(prisma.digitalEmployee.update).not.toHaveBeenCalled()
  })
})

describe('GET /api/portfolio/timeline - updatedAt field', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes updatedAt in each digital employee response', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE(),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    const de = data.data.digitalEmployees[0]
    expect(de.updatedAt).toBe('2026-01-20T12:00:00.000Z')
  })
})
