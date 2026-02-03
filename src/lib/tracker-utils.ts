/**
 * Tracker Utilities
 *
 * Auto-calculation logic for Portfolio Timeline view.
 * Calculates tracker status and progress based on various factors.
 */

import {
  TrackerStatus,
  RiskLevel,
  DesignWeekStatus,
  JourneyPhaseType,
  JourneyPhaseStatus,
  PrerequisiteStatus,
} from '@prisma/client'

interface JourneyPhase {
  phaseType: JourneyPhaseType
  status: JourneyPhaseStatus
  dueDate?: Date | null
}

interface Prerequisite {
  status: PrerequisiteStatus
  dueDate?: Date | null
}

interface DesignWeek {
  status: DesignWeekStatus
  currentPhase: number
}

interface DigitalEmployeeForCalculation {
  blocker?: string | null
  goLiveDate?: Date | null
  journeyPhases?: JourneyPhase[]
  designWeek?: DesignWeek | null
  prerequisites?: Prerequisite[]
}

// Journey phase order for progress calculation
const JOURNEY_PHASE_ORDER: JourneyPhaseType[] = [
  'SALES_HANDOVER',
  'KICKOFF',
  'DESIGN_WEEK',
  'ONBOARDING',
  'UAT',
  'GO_LIVE',
  'HYPERCARE',
  'HANDOVER_TO_SUPPORT',
]

/**
 * Calculate tracker status based on various factors
 */
export function calculateTrackerStatus(de: DigitalEmployeeForCalculation): TrackerStatus {
  // 1. Has blocker? → BLOCKED
  if (de.blocker && de.blocker.trim().length > 0) {
    return 'BLOCKED'
  }

  // 2. Has blocked prerequisites? → BLOCKED
  const blockedPrereqs = de.prerequisites?.filter(p => p.status === 'BLOCKED') || []
  if (blockedPrereqs.length > 0) {
    return 'BLOCKED'
  }

  // 3. Missing prerequisites past due date? → ATTENTION
  const now = new Date()
  const overduePrereqs = de.prerequisites?.filter(p =>
    (p.status === 'PENDING' || p.status === 'REQUESTED' || p.status === 'IN_PROGRESS') &&
    p.dueDate && new Date(p.dueDate) < now
  ) || []
  if (overduePrereqs.length > 0) {
    return 'ATTENTION'
  }

  // 4. Past go-live date but not in HYPERCARE or later? → ATTENTION
  if (de.goLiveDate && new Date(de.goLiveDate) < now) {
    const currentPhaseIndex = de.journeyPhases?.find(
      p => p.status === 'IN_PROGRESS'
    )?.phaseType

    if (currentPhaseIndex) {
      const phaseIdx = JOURNEY_PHASE_ORDER.indexOf(currentPhaseIndex)
      const goLiveIdx = JOURNEY_PHASE_ORDER.indexOf('GO_LIVE')
      if (phaseIdx < goLiveIdx) {
        return 'ATTENTION'
      }
    }
  }

  // 5. Journey phase past due? → ATTENTION
  const overduePhases = de.journeyPhases?.filter(p =>
    p.status === 'IN_PROGRESS' &&
    p.dueDate && new Date(p.dueDate) < now
  ) || []
  if (overduePhases.length > 0) {
    return 'ATTENTION'
  }

  // 6. No start week set? → TO_PLAN
  // (This would need startWeek field, handled at API level)

  // Otherwise → ON_TRACK
  return 'ON_TRACK'
}

/**
 * Calculate progress percentage based on journey phases
 */
export function calculateProgress(de: DigitalEmployeeForCalculation): number {
  if (!de.journeyPhases || de.journeyPhases.length === 0) {
    // Fall back to design week progress
    if (de.designWeek) {
      const phaseProgress = (de.designWeek.currentPhase / 6) * 100
      const statusMultiplier = de.designWeek.status === 'COMPLETE' ? 1 : 0.8
      return Math.min(100, Math.round(phaseProgress * statusMultiplier))
    }
    return 0
  }

  const completedPhases = de.journeyPhases.filter(
    p => p.status === 'COMPLETE'
  ).length

  const totalPhases = JOURNEY_PHASE_ORDER.length

  // Add partial credit for in-progress phase
  const inProgressPhase = de.journeyPhases.find(p => p.status === 'IN_PROGRESS')
  const partialCredit = inProgressPhase ? 0.5 : 0

  return Math.min(100, Math.round(((completedPhases + partialCredit) / totalPhases) * 100))
}

/**
 * Calculate risk level based on various factors
 */
export function calculateRiskLevel(de: DigitalEmployeeForCalculation): RiskLevel {
  let riskScore = 0

  // Has blocker? +2
  if (de.blocker && de.blocker.trim().length > 0) {
    riskScore += 2
  }

  // Blocked prerequisites? +2
  const blockedPrereqs = de.prerequisites?.filter(p => p.status === 'BLOCKED') || []
  if (blockedPrereqs.length > 0) {
    riskScore += 2
  }

  // Pending prerequisites past due? +1
  const now = new Date()
  const overduePrereqs = de.prerequisites?.filter(p =>
    p.status !== 'RECEIVED' && p.status !== 'NOT_NEEDED' &&
    p.dueDate && new Date(p.dueDate) < now
  ) || []
  if (overduePrereqs.length > 0) {
    riskScore += 1
  }

  // Past go-live date? +2
  if (de.goLiveDate && new Date(de.goLiveDate) < now) {
    riskScore += 2
  }

  // Journey phase past due? +1
  const overduePhases = de.journeyPhases?.filter(p =>
    p.status === 'IN_PROGRESS' &&
    p.dueDate && new Date(p.dueDate) < now
  ) || []
  if (overduePhases.length > 0) {
    riskScore += 1
  }

  if (riskScore >= 3) return 'HIGH'
  if (riskScore >= 1) return 'MEDIUM'
  return 'LOW'
}

/**
 * Get current ISO week number
 */
export function getISOWeek(date: Date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Calculate default start/end weeks based on journey phases
 */
export function calculateDefaultWeeks(de: DigitalEmployeeForCalculation): { startWeek: number; endWeek: number } {
  const currentWeek = getISOWeek()

  // Default: start now, end in 12 weeks
  let startWeek = currentWeek
  let endWeek = currentWeek + 12

  // If has go-live date, calculate end week from that
  if (de.goLiveDate) {
    const goLiveWeek = getISOWeek(new Date(de.goLiveDate))
    endWeek = goLiveWeek + 2 // Add hypercare weeks

    // Estimate start based on typical project duration (10-14 weeks)
    startWeek = Math.max(1, goLiveWeek - 10)
  }

  return { startWeek, endWeek }
}
