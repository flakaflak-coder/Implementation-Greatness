/**
 * Standard Phase Durations
 *
 * Defines the expected duration for each lifecycle phase.
 * Used for automatic end date calculation and variance tracking.
 */

import { JourneyPhaseType } from '@prisma/client'

/**
 * Standard durations in business days
 */
export const PHASE_DURATIONS: Record<JourneyPhaseType, number> = {
  SALES_HANDOVER: 2,       // 2 days - quick handover
  KICKOFF: 1,              // 1 day - single kickoff meeting
  DESIGN_WEEK: 10,         // 2 weeks (10 business days)
  ONBOARDING: 10,          // 2 weeks (10 business days) - Configuration phase
  UAT: 5,                  // 1 week (5 business days)
  GO_LIVE: 1,              // 1 day - go-live event
  HYPERCARE: 10,           // 2 weeks (10 business days)
  HANDOVER_TO_SUPPORT: 2,  // 2 days - handover process
}

/**
 * Phase display names for UI
 */
export const PHASE_NAMES: Record<JourneyPhaseType, string> = {
  SALES_HANDOVER: 'Sales Handover',
  KICKOFF: 'Kickoff',
  DESIGN_WEEK: 'Design Week',
  ONBOARDING: 'Configuration',
  UAT: 'UAT',
  GO_LIVE: 'Go-Live',
  HYPERCARE: 'Hypercare',
  HANDOVER_TO_SUPPORT: 'Handover to Support',
}

/**
 * Add business days to a date (excludes weekends)
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate)
  let daysAdded = 0

  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++
    }
  }

  return result
}

/**
 * Calculate business days between two dates (excludes weekends)
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)

  while (current < endDate) {
    current.setDate(current.getDate() + 1)
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
  }

  return count
}

/**
 * Calculate the planned end date based on start date and phase type
 */
export function calculatePlannedEndDate(
  startDate: Date,
  phaseType: JourneyPhaseType
): Date {
  const durationDays = PHASE_DURATIONS[phaseType]
  return addBusinessDays(startDate, durationDays)
}

/**
 * Calculate the planned end date for a Design Week
 * Default: 10 business days (2 weeks)
 */
export function calculateDesignWeekEndDate(
  startDate: Date,
  plannedDurationDays: number = 10
): Date {
  return addBusinessDays(startDate, plannedDurationDays)
}

/**
 * Calculate actual duration in business days
 */
export function calculateActualDuration(
  startDate: Date,
  endDate: Date
): number {
  return getBusinessDaysBetween(startDate, endDate)
}

/**
 * Calculate variance (actual - planned)
 * Positive = took longer than expected
 * Negative = finished earlier than expected
 */
export function calculateVariance(
  plannedDays: number,
  actualDays: number
): { days: number; percent: number; status: 'early' | 'on-time' | 'late' } {
  const variance = actualDays - plannedDays
  const percent = plannedDays > 0 ? Math.round((variance / plannedDays) * 100) : 0

  let status: 'early' | 'on-time' | 'late' = 'on-time'
  if (variance < 0) {
    status = 'early'
  } else if (variance > 0) {
    status = 'late'
  }

  return { days: variance, percent, status }
}

/**
 * Format variance for display
 */
export function formatVariance(
  plannedDays: number,
  actualDays: number
): string {
  const { days, status } = calculateVariance(plannedDays, actualDays)

  if (status === 'on-time') {
    return 'On time'
  } else if (status === 'early') {
    return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} early`
  } else {
    return `${days} day${days !== 1 ? 's' : ''} over`
  }
}

/**
 * Get the standard duration for a phase type
 */
export function getStandardDuration(phaseType: JourneyPhaseType): number {
  return PHASE_DURATIONS[phaseType]
}

/**
 * Calculate projected go-live date from current progress
 * Sums remaining phases' standard durations
 */
export function calculateProjectedGoLive(
  currentPhase: JourneyPhaseType,
  currentPhaseStartDate: Date
): Date {
  const phaseOrder: JourneyPhaseType[] = [
    'SALES_HANDOVER',
    'KICKOFF',
    'DESIGN_WEEK',
    'ONBOARDING',
    'UAT',
    'GO_LIVE',
    'HYPERCARE',
    'HANDOVER_TO_SUPPORT',
  ]

  const currentIndex = phaseOrder.indexOf(currentPhase)
  let totalRemainingDays = 0

  // Add remaining days for current phase (assume midway through)
  totalRemainingDays += Math.ceil(PHASE_DURATIONS[currentPhase] / 2)

  // Add days for all subsequent phases up to GO_LIVE
  for (let i = currentIndex + 1; i < phaseOrder.length; i++) {
    const phase = phaseOrder[i]
    if (phase === 'HYPERCARE' || phase === 'HANDOVER_TO_SUPPORT') {
      // Don't include post-go-live phases in projection
      break
    }
    totalRemainingDays += PHASE_DURATIONS[phase]
  }

  return addBusinessDays(currentPhaseStartDate, totalRemainingDays)
}
