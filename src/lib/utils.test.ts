import { describe, it, expect } from 'vitest'
import {
  cn,
  formatDate,
  formatDuration,
  formatTimestamp,
  getPhaseLabel,
  getDesignWeekProgress,
  calculateCompleteness,
} from './utils'

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
})

describe('formatDate', () => {
  it('formats a Date object', () => {
    const date = new Date('2026-01-27T10:00:00Z')
    const result = formatDate(date)
    // Dutch locale format: 27 jan. 2026
    expect(result).toContain('27')
    expect(result).toContain('2026')
  })

  it('formats a date string', () => {
    const result = formatDate('2026-01-27')
    expect(result).toContain('27')
    expect(result).toContain('2026')
  })
})

describe('formatDuration', () => {
  it('formats seconds under an hour', () => {
    expect(formatDuration(300)).toBe('5m')
    expect(formatDuration(60)).toBe('1m')
    expect(formatDuration(3599)).toBe('59m')
  })

  it('formats seconds over an hour', () => {
    expect(formatDuration(3600)).toBe('1h 0m')
    expect(formatDuration(3660)).toBe('1h 1m')
    expect(formatDuration(7200)).toBe('2h 0m')
    expect(formatDuration(5400)).toBe('1h 30m')
  })
})

describe('formatTimestamp', () => {
  it('formats seconds under an hour', () => {
    expect(formatTimestamp(0)).toBe('0:00')
    expect(formatTimestamp(60)).toBe('1:00')
    expect(formatTimestamp(65)).toBe('1:05')
    expect(formatTimestamp(3599)).toBe('59:59')
  })

  it('formats seconds over an hour', () => {
    expect(formatTimestamp(3600)).toBe('1:00:00')
    expect(formatTimestamp(3661)).toBe('1:01:01')
    expect(formatTimestamp(7200)).toBe('2:00:00')
  })
})

describe('getPhaseLabel', () => {
  it('returns correct labels for known phases', () => {
    expect(getPhaseLabel(1)).toBe('Kickoff')
    expect(getPhaseLabel(2)).toBe('Process Design')
    expect(getPhaseLabel(3)).toBe('Technical Deep-dive')
    expect(getPhaseLabel(4)).toBe('Sign-off')
  })

  it('returns generic label for unknown phases', () => {
    expect(getPhaseLabel(0)).toBe('Phase 0')
    expect(getPhaseLabel(5)).toBe('Phase 5')
    expect(getPhaseLabel(99)).toBe('Phase 99')
  })
})

describe('getDesignWeekProgress', () => {
  it('calculates progress percentage correctly', () => {
    expect(getDesignWeekProgress(1)).toBe(0)
    expect(getDesignWeekProgress(2)).toBeCloseTo(33.33, 1)
    expect(getDesignWeekProgress(3)).toBeCloseTo(66.67, 1)
    expect(getDesignWeekProgress(4)).toBe(100)
  })
})

describe('calculateCompleteness', () => {
  it('returns 0 for empty array', () => {
    expect(calculateCompleteness([])).toBe(0)
  })

  it('calculates percentage of confirmed items', () => {
    const items = [
      { status: 'CONFIRMED' },
      { status: 'CONFIRMED' },
      { status: 'PENDING' },
      { status: 'PENDING' },
    ]
    expect(calculateCompleteness(items)).toBe(50)
  })

  it('returns 100 when all items are confirmed', () => {
    const items = [
      { status: 'CONFIRMED' },
      { status: 'CONFIRMED' },
    ]
    expect(calculateCompleteness(items)).toBe(100)
  })

  it('returns 0 when no items are confirmed', () => {
    const items = [
      { status: 'PENDING' },
      { status: 'PENDING' },
    ]
    expect(calculateCompleteness(items)).toBe(0)
  })

  it('rounds to nearest integer', () => {
    const items = [
      { status: 'CONFIRMED' },
      { status: 'PENDING' },
      { status: 'PENDING' },
    ]
    expect(calculateCompleteness(items)).toBe(33)
  })
})
