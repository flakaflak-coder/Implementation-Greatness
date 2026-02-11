import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateTrackerStatus,
  calculateProgress,
  calculateRiskLevel,
  getISOWeek,
  calculateDefaultWeeks,
} from './tracker-utils'

describe('calculateTrackerStatus', () => {
  it('returns BLOCKED when DE has a blocker', () => {
    const result = calculateTrackerStatus({
      blocker: 'Waiting for API credentials',
    })
    expect(result).toBe('BLOCKED')
  })

  it('returns BLOCKED when DE has a blocker with whitespace', () => {
    const result = calculateTrackerStatus({
      blocker: '  Something blocks us  ',
    })
    expect(result).toBe('BLOCKED')
  })

  it('does not return BLOCKED for empty/whitespace-only blocker', () => {
    const result = calculateTrackerStatus({
      blocker: '   ',
    })
    expect(result).not.toBe('BLOCKED')
  })

  it('does not return BLOCKED for null blocker', () => {
    const result = calculateTrackerStatus({
      blocker: null,
    })
    expect(result).toBe('ON_TRACK')
  })

  it('returns BLOCKED when prerequisites are blocked', () => {
    const result = calculateTrackerStatus({
      prerequisites: [
        { status: 'BLOCKED' as const },
        { status: 'RECEIVED' as const },
      ],
    })
    expect(result).toBe('BLOCKED')
  })

  it('returns ATTENTION when prerequisites are overdue', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateTrackerStatus({
      prerequisites: [
        { status: 'PENDING' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('ATTENTION')
  })

  it('returns ATTENTION when REQUESTED prerequisites are overdue', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateTrackerStatus({
      prerequisites: [
        { status: 'REQUESTED' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('ATTENTION')
  })

  it('returns ATTENTION when IN_PROGRESS prerequisites are overdue', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateTrackerStatus({
      prerequisites: [
        { status: 'IN_PROGRESS' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('ATTENTION')
  })

  it('does not flag RECEIVED prerequisites as overdue', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateTrackerStatus({
      prerequisites: [
        { status: 'RECEIVED' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('ON_TRACK')
  })

  it('returns ATTENTION when past go-live date and still in early phases', () => {
    const pastGoLive = new Date('2020-01-01')
    const result = calculateTrackerStatus({
      goLiveDate: pastGoLive,
      journeyPhases: [
        { phaseType: 'DESIGN_WEEK' as const, status: 'IN_PROGRESS' as const },
      ],
    })
    expect(result).toBe('ATTENTION')
  })

  it('does not flag ATTENTION when past go-live but in HYPERCARE', () => {
    const pastGoLive = new Date('2020-01-01')
    const result = calculateTrackerStatus({
      goLiveDate: pastGoLive,
      journeyPhases: [
        { phaseType: 'HYPERCARE' as const, status: 'IN_PROGRESS' as const },
      ],
    })
    // HYPERCARE index (6) >= GO_LIVE index (5), so not flagged for past go-live
    expect(result).toBe('ON_TRACK')
  })

  it('returns ATTENTION when journey phase is past due', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateTrackerStatus({
      journeyPhases: [
        { phaseType: 'DESIGN_WEEK' as const, status: 'IN_PROGRESS' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('ATTENTION')
  })

  it('does not flag COMPLETE phases as overdue', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateTrackerStatus({
      journeyPhases: [
        { phaseType: 'DESIGN_WEEK' as const, status: 'COMPLETE' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('ON_TRACK')
  })

  it('returns ON_TRACK when everything is fine', () => {
    const futureDate = new Date('2099-01-01')
    const result = calculateTrackerStatus({
      goLiveDate: futureDate,
      journeyPhases: [
        { phaseType: 'DESIGN_WEEK' as const, status: 'IN_PROGRESS' as const, dueDate: futureDate },
      ],
      prerequisites: [
        { status: 'RECEIVED' as const },
        { status: 'PENDING' as const, dueDate: futureDate },
      ],
    })
    expect(result).toBe('ON_TRACK')
  })

  it('returns ON_TRACK when no data provided', () => {
    const result = calculateTrackerStatus({})
    expect(result).toBe('ON_TRACK')
  })

  it('prioritizes BLOCKED over ATTENTION', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateTrackerStatus({
      blocker: 'Critical issue',
      prerequisites: [
        { status: 'PENDING' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('BLOCKED')
  })
})

describe('calculateProgress', () => {
  it('returns 0 when no journey phases and no design week', () => {
    expect(calculateProgress({})).toBe(0)
  })

  it('returns 0 when journey phases is empty', () => {
    expect(calculateProgress({ journeyPhases: [] })).toBe(0)
  })

  it('falls back to design week progress when no journey phases', () => {
    const result = calculateProgress({
      designWeek: {
        status: 'IN_PROGRESS' as const,
        currentPhase: 3,
      },
    })
    // (3/6) * 100 * 0.8 = 40
    expect(result).toBe(40)
  })

  it('uses multiplier of 1 when design week is COMPLETE', () => {
    const result = calculateProgress({
      designWeek: {
        status: 'COMPLETE' as const,
        currentPhase: 6,
      },
    })
    // (6/6) * 100 * 1.0 = 100
    expect(result).toBe(100)
  })

  it('caps at 100% for design week progress', () => {
    const result = calculateProgress({
      designWeek: {
        status: 'COMPLETE' as const,
        currentPhase: 6,
      },
    })
    expect(result).toBeLessThanOrEqual(100)
  })

  it('calculates progress from journey phases', () => {
    const result = calculateProgress({
      journeyPhases: [
        { phaseType: 'SALES_HANDOVER' as const, status: 'COMPLETE' as const },
        { phaseType: 'KICKOFF' as const, status: 'COMPLETE' as const },
        { phaseType: 'DESIGN_WEEK' as const, status: 'IN_PROGRESS' as const },
      ],
    })
    // 2 complete + 0.5 in-progress = 2.5 / 8 = 31.25 -> 31
    expect(result).toBe(31)
  })

  it('gives partial credit for in-progress phase', () => {
    const withInProgress = calculateProgress({
      journeyPhases: [
        { phaseType: 'SALES_HANDOVER' as const, status: 'COMPLETE' as const },
        { phaseType: 'KICKOFF' as const, status: 'IN_PROGRESS' as const },
      ],
    })
    const withoutInProgress = calculateProgress({
      journeyPhases: [
        { phaseType: 'SALES_HANDOVER' as const, status: 'COMPLETE' as const },
        { phaseType: 'KICKOFF' as const, status: 'NOT_STARTED' as const },
      ],
    })
    expect(withInProgress).toBeGreaterThan(withoutInProgress)
  })

  it('returns 100 when all phases are complete', () => {
    const allPhases = [
      'SALES_HANDOVER', 'KICKOFF', 'DESIGN_WEEK', 'ONBOARDING',
      'UAT', 'GO_LIVE', 'HYPERCARE', 'HANDOVER_TO_SUPPORT',
    ].map((phaseType) => ({
      phaseType: phaseType as 'SALES_HANDOVER',
      status: 'COMPLETE' as const,
    }))

    expect(calculateProgress({ journeyPhases: allPhases })).toBe(100)
  })

  it('returns 0 when no phases are complete and none in progress', () => {
    const result = calculateProgress({
      journeyPhases: [
        { phaseType: 'SALES_HANDOVER' as const, status: 'NOT_STARTED' as const },
      ],
    })
    expect(result).toBe(0)
  })
})

describe('calculateRiskLevel', () => {
  it('returns LOW when no risk factors', () => {
    expect(calculateRiskLevel({})).toBe('LOW')
  })

  it('returns MEDIUM when there is a blocker (score 2)', () => {
    const result = calculateRiskLevel({
      blocker: 'Issue',
    })
    expect(result).toBe('MEDIUM')
  })

  it('returns HIGH when blocker AND blocked prerequisites (score 4)', () => {
    const result = calculateRiskLevel({
      blocker: 'Critical issue',
      prerequisites: [
        { status: 'BLOCKED' as const },
      ],
    })
    expect(result).toBe('HIGH')
  })

  it('returns MEDIUM for overdue prerequisites only (score 1)', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateRiskLevel({
      prerequisites: [
        { status: 'PENDING' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('MEDIUM')
  })

  it('returns HIGH when past go-live date (score 2)', () => {
    const pastGoLive = new Date('2020-01-01')
    // Also needs something else to push to HIGH (score >= 3)
    const result = calculateRiskLevel({
      goLiveDate: pastGoLive,
      prerequisites: [
        { status: 'PENDING' as const, dueDate: new Date('2020-01-01') },
      ],
    })
    // Past go-live (2) + overdue prereq (1) = 3 -> HIGH
    expect(result).toBe('HIGH')
  })

  it('returns MEDIUM for a single overdue journey phase (score 1)', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateRiskLevel({
      journeyPhases: [
        { phaseType: 'DESIGN_WEEK' as const, status: 'IN_PROGRESS' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('MEDIUM')
  })

  it('does not count RECEIVED prerequisites as overdue', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateRiskLevel({
      prerequisites: [
        { status: 'RECEIVED' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('LOW')
  })

  it('does not count NOT_NEEDED prerequisites as overdue', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateRiskLevel({
      prerequisites: [
        { status: 'NOT_NEEDED' as const, dueDate: pastDate },
      ],
    })
    expect(result).toBe('LOW')
  })

  it('accumulates risk from multiple factors', () => {
    const pastDate = new Date('2020-01-01')
    const result = calculateRiskLevel({
      blocker: 'Issue',                               // +2
      prerequisites: [
        { status: 'BLOCKED' as const },               // +2
        { status: 'PENDING' as const, dueDate: pastDate }, // +1
      ],
      goLiveDate: pastDate,                            // +2
      journeyPhases: [
        { phaseType: 'DESIGN_WEEK' as const, status: 'IN_PROGRESS' as const, dueDate: pastDate }, // +1
      ],
    })
    // Total = 2 + 2 + 1 + 2 + 1 = 8 -> HIGH
    expect(result).toBe('HIGH')
  })
})

describe('getISOWeek', () => {
  it('returns week 1 for Jan 1 2026 (Thursday)', () => {
    // Jan 1 2026 is a Thursday
    const result = getISOWeek(new Date('2026-01-01'))
    expect(result).toBe(1)
  })

  it('returns correct week for a known date', () => {
    // Feb 9 2026 is a Monday in week 7
    const result = getISOWeek(new Date('2026-02-09'))
    expect(result).toBe(7)
  })

  it('returns a number between 1 and 53', () => {
    const result = getISOWeek(new Date())
    expect(result).toBeGreaterThanOrEqual(1)
    expect(result).toBeLessThanOrEqual(53)
  })

  it('uses current date when no argument provided', () => {
    const result = getISOWeek()
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(1)
  })
})

describe('calculateDefaultWeeks', () => {
  let realDateNow: () => number

  beforeEach(() => {
    realDateNow = Date.now
  })

  afterEach(() => {
    Date.now = realDateNow
    vi.restoreAllMocks()
  })

  it('returns start and end weeks', () => {
    const result = calculateDefaultWeeks({})
    expect(result).toHaveProperty('startWeek')
    expect(result).toHaveProperty('endWeek')
    expect(typeof result.startWeek).toBe('number')
    expect(typeof result.endWeek).toBe('number')
  })

  it('defaults to 12 week span', () => {
    const result = calculateDefaultWeeks({})
    expect(result.endWeek - result.startWeek).toBe(12)
  })

  it('adjusts weeks based on go-live date', () => {
    // Use a go-live date well in the future
    const goLiveDate = new Date('2026-07-01')
    const result = calculateDefaultWeeks({ goLiveDate })
    // End week should be go-live week + 2 (hypercare)
    const goLiveWeek = getISOWeek(goLiveDate)
    expect(result.endWeek).toBe(goLiveWeek + 2)
  })

  it('estimates start based on go-live date minus 10 weeks', () => {
    const goLiveDate = new Date('2026-07-01')
    const result = calculateDefaultWeeks({ goLiveDate })
    const goLiveWeek = getISOWeek(goLiveDate)
    expect(result.startWeek).toBe(Math.max(1, goLiveWeek - 10))
  })

  it('start week is at least 1', () => {
    // Use an early go-live date that would push startWeek below 1
    const goLiveDate = new Date('2026-01-15')
    const result = calculateDefaultWeeks({ goLiveDate })
    expect(result.startWeek).toBeGreaterThanOrEqual(1)
  })
})
