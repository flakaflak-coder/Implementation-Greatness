import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getAvatarUrl,
  getDEAvatar,
  statusColors,
  getDEGreeting,
  getAchievementMessage,
} from './avatar'

describe('getAvatarUrl', () => {
  it('generates a DiceBear URL with the seed', () => {
    const url = getAvatarUrl({ seed: 'test-seed' })
    expect(url).toContain('https://api.dicebear.com/7.x/')
    expect(url).toContain('seed=test-seed')
  })

  it('defaults to bottts style', () => {
    const url = getAvatarUrl({ seed: 'test' })
    expect(url).toContain('/bottts/svg')
  })

  it('uses custom style when provided', () => {
    const url = getAvatarUrl({ seed: 'test', style: 'shapes' })
    expect(url).toContain('/shapes/svg')
  })

  it('defaults to size 80', () => {
    const url = getAvatarUrl({ seed: 'test' })
    expect(url).toContain('size=80')
  })

  it('uses custom size when provided', () => {
    const url = getAvatarUrl({ seed: 'test', size: 120 })
    expect(url).toContain('size=120')
  })

  it('includes backgroundColor when provided', () => {
    const url = getAvatarUrl({ seed: 'test', backgroundColor: 'ff0000' })
    expect(url).toContain('backgroundColor=ff0000')
  })

  it('does not include backgroundColor when not provided', () => {
    const url = getAvatarUrl({ seed: 'test' })
    expect(url).not.toContain('backgroundColor')
  })

  it('URL-encodes the seed', () => {
    const url = getAvatarUrl({ seed: 'test with spaces' })
    expect(url).toContain('seed=test%20with%20spaces')
  })
})

describe('getDEAvatar', () => {
  it('generates URL using DE id and name as seed', () => {
    const url = getDEAvatar('clm1234', 'ClaimsBot')
    expect(url).toContain('seed=clm1234-ClaimsBot')
  })

  it('uses bottts style', () => {
    const url = getDEAvatar('clm1234', 'ClaimsBot')
    expect(url).toContain('/bottts/svg')
  })

  it('uses size 80', () => {
    const url = getDEAvatar('clm1234', 'ClaimsBot')
    expect(url).toContain('size=80')
  })
})

describe('statusColors', () => {
  it('has color for LIVE status', () => {
    expect(statusColors.LIVE).toBe('#10b981')
  })

  it('has color for DESIGN status', () => {
    expect(statusColors.DESIGN).toBe('#C2703E')
  })

  it('has color for ONBOARDING status', () => {
    expect(statusColors.ONBOARDING).toBe('#f59e0b')
  })

  it('has color for UAT status', () => {
    expect(statusColors.UAT).toBe('#D4956A')
  })

  it('has color for PAUSED status', () => {
    expect(statusColors.PAUSED).toBe('#6b7280')
  })

  it('has exactly 5 status colors', () => {
    expect(Object.keys(statusColors)).toHaveLength(5)
  })
})

describe('getDEGreeting', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a greeting for LIVE status', () => {
    const greeting = getDEGreeting('LIVE', 'ClaimsBot')
    expect(greeting).toContain('ClaimsBot')
    expect(greeting).toBe('ClaimsBot is crushing it!')
  })

  it('returns a greeting for DESIGN status', () => {
    const greeting = getDEGreeting('DESIGN', 'ClaimsBot')
    expect(greeting).toBe('ClaimsBot is being designed')
  })

  it('returns a greeting for ONBOARDING status', () => {
    const greeting = getDEGreeting('ONBOARDING', 'ClaimsBot')
    expect(greeting).toBe('ClaimsBot is learning the ropes')
  })

  it('returns a greeting for UAT status', () => {
    const greeting = getDEGreeting('UAT', 'ClaimsBot')
    expect(greeting).toBe('ClaimsBot is being tested')
  })

  it('returns a greeting for PAUSED status', () => {
    const greeting = getDEGreeting('PAUSED', 'ClaimsBot')
    expect(greeting).toBe('ClaimsBot is taking a break')
  })

  it('returns DE name for unknown status', () => {
    const greeting = getDEGreeting('UNKNOWN', 'ClaimsBot')
    expect(greeting).toBe('ClaimsBot')
  })
})

describe('getAchievementMessage', () => {
  it('returns message for first-live achievement', () => {
    expect(getAchievementMessage('first-live')).toContain('First DE went live')
  })

  it('returns message for all-healthy achievement', () => {
    expect(getAchievementMessage('all-healthy')).toContain('All DEs are healthy')
  })

  it('returns message for streak-5 achievement', () => {
    expect(getAchievementMessage('streak-5')).toContain('5-day healthy streak')
  })

  it('returns message for streak-10 achievement', () => {
    expect(getAchievementMessage('streak-10')).toContain('10-day healthy streak')
  })

  it('uses DE name from data for 100-transactions', () => {
    const message = getAchievementMessage('100-transactions', { name: 'ClaimsBot' })
    expect(message).toContain('ClaimsBot')
    expect(message).toContain('100 transactions')
  })

  it('uses DE name from data for 1000-transactions', () => {
    const message = getAchievementMessage('1000-transactions', { name: 'ClaimsBot' })
    expect(message).toContain('ClaimsBot')
    expect(message).toContain('1000 transactions')
  })

  it('uses fallback name when data.name is not provided for 100-transactions', () => {
    const message = getAchievementMessage('100-transactions')
    expect(message).toContain('DE')
    expect(message).toContain('100 transactions')
  })

  it('returns message for design-complete', () => {
    const message = getAchievementMessage('design-complete', { name: 'ClaimsBot' })
    expect(message).toContain('ClaimsBot')
    expect(message).toContain('completed Design Week')
  })

  it('returns message for uat-passed', () => {
    const message = getAchievementMessage('uat-passed', { name: 'ClaimsBot' })
    expect(message).toContain('ClaimsBot')
    expect(message).toContain('passed UAT')
  })

  it('returns default message for unknown achievement type', () => {
    const message = getAchievementMessage('unknown-achievement')
    expect(message).toContain('Achievement unlocked')
  })
})
