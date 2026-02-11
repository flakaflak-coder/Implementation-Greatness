import { describe, it, expect, vi, beforeEach } from 'vitest'

// Define mocks inside factories
vi.mock('@/lib/db', () => ({
  prisma: {
    digitalEmployee: {
      findMany: vi.fn(),
    },
  },
}))

// Import after mocks
import { GET } from '@/app/api/portfolio/predictions/route'
import { prisma } from '@/lib/db'

/**
 * Helper to build a mock DE record for the predictions route.
 */
function createMockDE(overrides: Record<string, unknown> = {}) {
  return {
    id: 'de-1',
    name: 'Claims Agent',
    status: 'DESIGN',
    goLiveDate: null,
    currentJourneyPhase: 'DESIGN_WEEK',
    company: { id: 'company-1', name: 'Acme Insurance' },
    journeyPhases: [],
    designWeek: {
      id: 'dw-1',
      status: 'IN_PROGRESS',
      startedAt: new Date('2026-01-15T10:00:00Z'),
      completedAt: null,
      plannedDurationDays: 10,
      actualDurationDays: null,
      prerequisites: [],
    },
    ...overrides,
  }
}

describe('GET /api/portfolio/predictions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns predictions with summary', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE(),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.predictions).toHaveLength(1)
    expect(data.data.summary).toBeDefined()
    expect(data.data.summary.total).toBe(1)
  })

  it('returns empty state when no active DEs', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.predictions).toHaveLength(0)
    expect(data.data.summary.total).toBe(0)
    expect(data.data.summary.onTrack).toBe(0)
    expect(data.data.summary.atRisk).toBe(0)
    expect(data.data.summary.likelyDelayed).toBe(0)
    expect(data.data.summary.noTarget).toBe(0)
  })

  it('marks DE as no_target when goLiveDate is not set', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE({ goLiveDate: null }),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    const prediction = data.data.predictions[0]
    expect(prediction.riskStatus).toBe('no_target')
    expect(prediction.targetGoLive).toBeNull()
    expect(prediction.predictedGoLive).toBeDefined()
  })

  it('marks DE as on_track when well ahead of go-live date', async () => {
    // Set go-live far in the future so prediction is ahead
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 12) // 12 months from now

    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE({
        goLiveDate: futureDate,
        journeyPhases: [
          {
            phaseType: 'DESIGN_WEEK',
            status: 'IN_PROGRESS',
            order: 3,
            startedAt: new Date(),
            completedAt: null,
            plannedDurationDays: 10,
            actualDurationDays: null,
          },
        ],
      }),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    const prediction = data.data.predictions[0]
    expect(prediction.riskStatus).toBe('on_track')
    expect(prediction.daysAhead).toBeGreaterThanOrEqual(0)
  })

  it('calculates velocity from completed phases', async () => {
    const now = new Date()
    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE({
        goLiveDate: null,
        journeyPhases: [
          {
            phaseType: 'SALES_HANDOVER',
            status: 'COMPLETE',
            order: 1,
            startedAt: twoWeeksAgo,
            completedAt: oneWeekAgo,
            plannedDurationDays: 5,
            actualDurationDays: null,
          },
          {
            phaseType: 'KICKOFF',
            status: 'IN_PROGRESS',
            order: 2,
            startedAt: oneWeekAgo,
            completedAt: null,
            plannedDurationDays: 2,
            actualDurationDays: null,
          },
        ],
      }),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    const prediction = data.data.predictions[0]
    expect(prediction.velocityRatio).toBeGreaterThan(0)
    expect(prediction.completedPhases).toBe(1)
    expect(prediction.totalPhases).toBe(8)
  })

  it('accounts for blocked prerequisites in predictions', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE({
        goLiveDate: null,
        designWeek: {
          id: 'dw-1',
          status: 'IN_PROGRESS',
          startedAt: new Date('2026-01-15T10:00:00Z'),
          completedAt: null,
          plannedDurationDays: 10,
          actualDurationDays: null,
          prerequisites: [
            { id: 'prereq-1', status: 'BLOCKED', blocksPhase: 'DESIGN_WEEK' },
            { id: 'prereq-2', status: 'RECEIVED', blocksPhase: null },
          ],
        },
      }),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    const prediction = data.data.predictions[0]
    expect(prediction.blockerCount).toBeGreaterThanOrEqual(1)
  })

  it('includes all required fields in prediction response', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE(),
    ] as never)

    const response = await GET()
    const data = await response.json()

    const prediction = data.data.predictions[0]
    expect(prediction).toHaveProperty('deId')
    expect(prediction).toHaveProperty('deName')
    expect(prediction).toHaveProperty('companyName')
    expect(prediction).toHaveProperty('currentPhase')
    expect(prediction).toHaveProperty('targetGoLive')
    expect(prediction).toHaveProperty('predictedGoLive')
    expect(prediction).toHaveProperty('velocityRatio')
    expect(prediction).toHaveProperty('blockerCount')
    expect(prediction).toHaveProperty('riskStatus')
    expect(prediction).toHaveProperty('daysAhead')
    expect(prediction).toHaveProperty('completedPhases')
    expect(prediction).toHaveProperty('totalPhases')
  })

  it('sorts predictions by risk (likely_delayed first)', async () => {
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 12)

    const pastDate = new Date()
    pastDate.setMonth(pastDate.getMonth() - 1)

    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      createMockDE({
        id: 'de-safe',
        name: 'Safe DE',
        goLiveDate: futureDate,
        journeyPhases: [],
      }),
      createMockDE({
        id: 'de-no-target',
        name: 'No Target DE',
        goLiveDate: null,
        journeyPhases: [],
      }),
    ] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    // Predictions should be sorted by risk
    expect(data.data.predictions.length).toBe(2)
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.digitalEmployee.findMany).mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to calculate deadline predictions')
  })
})
