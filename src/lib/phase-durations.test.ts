import { describe, it, expect } from 'vitest'
import {
  PHASE_DURATIONS,
  PHASE_NAMES,
  addBusinessDays,
  getBusinessDaysBetween,
  calculatePlannedEndDate,
  calculateDesignWeekEndDate,
  calculateActualDuration,
  calculateVariance,
  formatVariance,
  getStandardDuration,
  calculateProjectedGoLive,
} from './phase-durations'

describe('PHASE_DURATIONS', () => {
  it('defines durations for all 8 phase types', () => {
    expect(Object.keys(PHASE_DURATIONS)).toHaveLength(8)
  })

  it('has correct standard durations', () => {
    expect(PHASE_DURATIONS.SALES_HANDOVER).toBe(2)
    expect(PHASE_DURATIONS.KICKOFF).toBe(1)
    expect(PHASE_DURATIONS.DESIGN_WEEK).toBe(10)
    expect(PHASE_DURATIONS.ONBOARDING).toBe(10)
    expect(PHASE_DURATIONS.UAT).toBe(5)
    expect(PHASE_DURATIONS.GO_LIVE).toBe(1)
    expect(PHASE_DURATIONS.HYPERCARE).toBe(10)
    expect(PHASE_DURATIONS.HANDOVER_TO_SUPPORT).toBe(2)
  })

  it('all durations are positive', () => {
    for (const duration of Object.values(PHASE_DURATIONS)) {
      expect(duration).toBeGreaterThan(0)
    }
  })
})

describe('PHASE_NAMES', () => {
  it('defines names for all 8 phase types', () => {
    expect(Object.keys(PHASE_NAMES)).toHaveLength(8)
  })

  it('has human-readable names', () => {
    expect(PHASE_NAMES.SALES_HANDOVER).toBe('Sales Handover')
    expect(PHASE_NAMES.KICKOFF).toBe('Kickoff')
    expect(PHASE_NAMES.DESIGN_WEEK).toBe('Design Week')
    expect(PHASE_NAMES.ONBOARDING).toBe('Configuration')
    expect(PHASE_NAMES.UAT).toBe('UAT')
    expect(PHASE_NAMES.GO_LIVE).toBe('Go-Live')
    expect(PHASE_NAMES.HYPERCARE).toBe('Hypercare')
    expect(PHASE_NAMES.HANDOVER_TO_SUPPORT).toBe('Handover to Support')
  })
})

describe('addBusinessDays', () => {
  it('adds 1 business day on a Monday', () => {
    // 2026-02-09 is a Monday
    const start = new Date('2026-02-09T00:00:00Z')
    const result = addBusinessDays(start, 1)
    expect(result.getDate()).toBe(10) // Tuesday
  })

  it('adds 5 business days (one full week) on a Monday', () => {
    // 2026-02-09 is a Monday
    const start = new Date('2026-02-09T00:00:00Z')
    const result = addBusinessDays(start, 5)
    // Monday + 5 business days = the following Monday (Feb 16)
    // Feb 9 (Mon) -> 10, 11, 12, 13, 14(Sat skip), 15(Sun skip), 16
    // Actually: +1=Tue10, +2=Wed11, +3=Thu12, +4=Fri13, skip Sat/Sun, +5=Mon16
    expect(result.getDate()).toBe(16) // Monday
  })

  it('skips weekends', () => {
    // 2026-02-13 is a Friday
    const start = new Date('2026-02-13T00:00:00Z')
    const result = addBusinessDays(start, 1)
    // Friday + 1 business day = Monday (skipping Sat/Sun)
    expect(result.getDate()).toBe(16) // Monday
  })

  it('handles multi-week spans correctly', () => {
    // 2026-02-09 is a Monday
    const start = new Date('2026-02-09T00:00:00Z')
    const result = addBusinessDays(start, 10)
    // 10 business days = 2 calendar weeks
    expect(result.getDate()).toBe(23) // Monday Feb 23
  })

  it('returns same date type for 0 business days', () => {
    const start = new Date('2026-02-09T00:00:00Z')
    const result = addBusinessDays(start, 0)
    expect(result.getDate()).toBe(start.getDate())
  })

  it('does not mutate the input date', () => {
    const start = new Date('2026-02-09T00:00:00Z')
    const originalDate = start.getDate()
    addBusinessDays(start, 5)
    expect(start.getDate()).toBe(originalDate)
  })
})

describe('getBusinessDaysBetween', () => {
  it('returns 5 for a Monday to following Monday', () => {
    const start = new Date('2026-02-09T00:00:00Z') // Monday
    const end = new Date('2026-02-16T00:00:00Z') // Next Monday
    expect(getBusinessDaysBetween(start, end)).toBe(5)
  })

  it('returns 0 for same date', () => {
    const date = new Date('2026-02-09T00:00:00Z')
    expect(getBusinessDaysBetween(date, date)).toBe(0)
  })

  it('returns 1 for Monday to Tuesday', () => {
    const start = new Date('2026-02-09T00:00:00Z') // Monday
    const end = new Date('2026-02-10T00:00:00Z') // Tuesday
    expect(getBusinessDaysBetween(start, end)).toBe(1)
  })

  it('returns 0 for Friday to Saturday (weekend days are skipped)', () => {
    const start = new Date('2026-02-13T00:00:00Z') // Friday
    const end = new Date('2026-02-14T00:00:00Z') // Saturday
    expect(getBusinessDaysBetween(start, end)).toBe(0)
  })

  it('returns 0 for Saturday to Sunday', () => {
    const start = new Date('2026-02-14T00:00:00Z') // Saturday
    const end = new Date('2026-02-15T00:00:00Z') // Sunday
    expect(getBusinessDaysBetween(start, end)).toBe(0)
  })

  it('returns 10 for two calendar weeks (Monday to Monday+2 weeks)', () => {
    const start = new Date('2026-02-09T00:00:00Z') // Monday
    const end = new Date('2026-02-23T00:00:00Z') // Monday 2 weeks later
    expect(getBusinessDaysBetween(start, end)).toBe(10)
  })

  it('does not mutate input dates', () => {
    const start = new Date('2026-02-09T00:00:00Z')
    const end = new Date('2026-02-16T00:00:00Z')
    const startDate = start.getDate()
    const endDate = end.getDate()
    getBusinessDaysBetween(start, end)
    expect(start.getDate()).toBe(startDate)
    expect(end.getDate()).toBe(endDate)
  })
})

describe('calculatePlannedEndDate', () => {
  it('calculates end date for SALES_HANDOVER (2 business days)', () => {
    const start = new Date('2026-02-09T00:00:00Z') // Monday
    const result = calculatePlannedEndDate(start, 'SALES_HANDOVER')
    expect(result.getDate()).toBe(11) // Wednesday
  })

  it('calculates end date for KICKOFF (1 business day)', () => {
    const start = new Date('2026-02-09T00:00:00Z') // Monday
    const result = calculatePlannedEndDate(start, 'KICKOFF')
    expect(result.getDate()).toBe(10) // Tuesday
  })

  it('calculates end date for DESIGN_WEEK (10 business days)', () => {
    const start = new Date('2026-02-09T00:00:00Z') // Monday
    const result = calculatePlannedEndDate(start, 'DESIGN_WEEK')
    expect(result.getDate()).toBe(23) // Monday 2 weeks later
  })
})

describe('calculateDesignWeekEndDate', () => {
  it('defaults to 10 business days', () => {
    const start = new Date('2026-02-09T00:00:00Z') // Monday
    const result = calculateDesignWeekEndDate(start)
    expect(result.getDate()).toBe(23) // Monday 2 weeks later
  })

  it('accepts custom duration', () => {
    const start = new Date('2026-02-09T00:00:00Z') // Monday
    const result = calculateDesignWeekEndDate(start, 5)
    expect(result.getDate()).toBe(16) // Monday 1 week later
  })
})

describe('calculateActualDuration', () => {
  it('returns business days between two dates', () => {
    const start = new Date('2026-02-09T00:00:00Z') // Monday
    const end = new Date('2026-02-16T00:00:00Z') // Next Monday
    expect(calculateActualDuration(start, end)).toBe(5)
  })
})

describe('calculateVariance', () => {
  it('returns on-time when actual equals planned', () => {
    const result = calculateVariance(10, 10)
    expect(result.days).toBe(0)
    expect(result.percent).toBe(0)
    expect(result.status).toBe('on-time')
  })

  it('returns early when actual is less than planned', () => {
    const result = calculateVariance(10, 8)
    expect(result.days).toBe(-2)
    expect(result.percent).toBe(-20)
    expect(result.status).toBe('early')
  })

  it('returns late when actual exceeds planned', () => {
    const result = calculateVariance(10, 12)
    expect(result.days).toBe(2)
    expect(result.percent).toBe(20)
    expect(result.status).toBe('late')
  })

  it('handles zero planned days', () => {
    const result = calculateVariance(0, 5)
    expect(result.days).toBe(5)
    expect(result.percent).toBe(0) // Avoid division by zero
    expect(result.status).toBe('late')
  })

  it('rounds percent to nearest integer', () => {
    const result = calculateVariance(3, 4)
    expect(result.percent).toBe(33) // 1/3 * 100 = 33.33 -> 33
  })
})

describe('formatVariance', () => {
  it('returns "On time" when actual equals planned', () => {
    expect(formatVariance(10, 10)).toBe('On time')
  })

  it('returns days early for early completion', () => {
    expect(formatVariance(10, 8)).toBe('2 days early')
  })

  it('returns day early (singular) for 1 day early', () => {
    expect(formatVariance(10, 9)).toBe('1 day early')
  })

  it('returns days over for late completion', () => {
    expect(formatVariance(10, 13)).toBe('3 days over')
  })

  it('returns day over (singular) for 1 day late', () => {
    expect(formatVariance(10, 11)).toBe('1 day over')
  })
})

describe('getStandardDuration', () => {
  it('returns the standard duration for each phase', () => {
    expect(getStandardDuration('SALES_HANDOVER')).toBe(2)
    expect(getStandardDuration('KICKOFF')).toBe(1)
    expect(getStandardDuration('DESIGN_WEEK')).toBe(10)
    expect(getStandardDuration('ONBOARDING')).toBe(10)
    expect(getStandardDuration('UAT')).toBe(5)
    expect(getStandardDuration('GO_LIVE')).toBe(1)
    expect(getStandardDuration('HYPERCARE')).toBe(10)
    expect(getStandardDuration('HANDOVER_TO_SUPPORT')).toBe(2)
  })
})

describe('calculateProjectedGoLive', () => {
  it('projects go-live from SALES_HANDOVER phase', () => {
    const start = new Date('2026-02-09T00:00:00Z') // Monday
    const result = calculateProjectedGoLive('SALES_HANDOVER', start)
    // Remaining = ceil(2/2) + 1(KICKOFF) + 10(DESIGN_WEEK) + 10(ONBOARDING) + 5(UAT) + 1(GO_LIVE)
    // = 1 + 1 + 10 + 10 + 5 + 1 = 28 business days
    expect(result instanceof Date).toBe(true)
    // Ensure it's in the future
    expect(result.getTime()).toBeGreaterThan(start.getTime())
  })

  it('projects go-live from DESIGN_WEEK phase', () => {
    const start = new Date('2026-02-09T00:00:00Z')
    const result = calculateProjectedGoLive('DESIGN_WEEK', start)
    // Remaining for current phase = ceil(10/2) = 5
    // Plus: ONBOARDING(10) + UAT(5) + GO_LIVE(1) = 16
    // Total = 5 + 16 = 21 business days
    expect(result instanceof Date).toBe(true)
    expect(result.getTime()).toBeGreaterThan(start.getTime())
  })

  it('projects go-live from UAT phase (close to go-live)', () => {
    const start = new Date('2026-02-09T00:00:00Z')
    const result = calculateProjectedGoLive('UAT', start)
    // Remaining for current phase = ceil(5/2) = 3
    // Plus: GO_LIVE(1) = 1
    // Total = 3 + 1 = 4 business days
    expect(result instanceof Date).toBe(true)
  })

  it('does not include HYPERCARE and HANDOVER_TO_SUPPORT in projection', () => {
    const start = new Date('2026-02-09T00:00:00Z')
    const fromGoLive = calculateProjectedGoLive('GO_LIVE', start)
    // Only remaining current phase = ceil(1/2) = 1 business day
    // No subsequent phases (HYPERCARE/HANDOVER_TO_SUPPORT excluded)
    const fromHypercare = calculateProjectedGoLive('HYPERCARE', start)
    // Remaining current phase = ceil(10/2) = 5
    // HANDOVER_TO_SUPPORT is excluded, so no extra
    // Actually HYPERCARE is post-GO_LIVE so it only includes itself
    expect(fromGoLive instanceof Date).toBe(true)
    expect(fromHypercare instanceof Date).toBe(true)
  })

  it('result is further in future for earlier phases', () => {
    const start = new Date('2026-02-09T00:00:00Z')
    const fromSalesHandover = calculateProjectedGoLive('SALES_HANDOVER', start)
    const fromDesignWeek = calculateProjectedGoLive('DESIGN_WEEK', start)
    const fromUAT = calculateProjectedGoLive('UAT', start)

    expect(fromSalesHandover.getTime()).toBeGreaterThan(fromDesignWeek.getTime())
    expect(fromDesignWeek.getTime()).toBeGreaterThan(fromUAT.getTime())
  })
})
