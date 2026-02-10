import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { JourneyPhaseType } from '@prisma/client'

/**
 * Default phase durations in business days.
 * Used when a phase has no planned duration set.
 */
const DEFAULT_PHASE_DURATIONS: Record<JourneyPhaseType, number> = {
  SALES_HANDOVER: 5,
  KICKOFF: 2,
  DESIGN_WEEK: 10,
  ONBOARDING: 20,
  UAT: 10,
  GO_LIVE: 2,
  HYPERCARE: 14,
  HANDOVER_TO_SUPPORT: 3,
}

/** Ordered list of journey phases */
const PHASE_ORDER: JourneyPhaseType[] = [
  'SALES_HANDOVER',
  'KICKOFF',
  'DESIGN_WEEK',
  'ONBOARDING',
  'UAT',
  'GO_LIVE',
  'HYPERCARE',
  'HANDOVER_TO_SUPPORT',
]

/** Penalty in business days added per blocker */
const BLOCKER_PENALTY_DAYS = 5

/**
 * GET /api/portfolio/predictions
 *
 * Returns go-live deadline predictions for all active Digital Employees.
 * Calculates velocity from completed phases, estimates remaining work,
 * and compares predicted go-live against the target date.
 */
export async function GET() {
  try {
    const digitalEmployees = await prisma.digitalEmployee.findMany({
      where: {
        status: { in: ['DESIGN', 'ONBOARDING'] },
      },
      include: {
        company: {
          select: { id: true, name: true },
        },
        journeyPhases: {
          orderBy: { order: 'asc' },
        },
        designWeek: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            plannedDurationDays: true,
            actualDurationDays: true,
            prerequisites: {
              select: {
                id: true,
                status: true,
                blocksPhase: true,
              },
            },
          },
        },
      },
      orderBy: [
        { company: { name: 'asc' } },
        { name: 'asc' },
      ],
    })

    const now = new Date()

    const predictions = digitalEmployees.map((de) => {
      const phases = de.journeyPhases
      const prereqs = de.designWeek?.prerequisites ?? []

      // --- 1. Calculate velocity ratio from completed phases ---
      let totalPlanned = 0
      let totalActual = 0

      for (const phase of phases) {
        if (phase.status === 'COMPLETE' && phase.completedAt && phase.startedAt) {
          const planned = phase.plannedDurationDays ?? DEFAULT_PHASE_DURATIONS[phase.phaseType] ?? 10
          const actual = phase.actualDurationDays ?? diffBusinessDays(phase.startedAt, phase.completedAt)

          if (actual > 0) {
            totalPlanned += planned
            totalActual += actual
          }
        }
      }

      // Velocity = planned / actual. If actual > planned, velocity < 1 (slow).
      // Default to 1.0 if no completed phases.
      const velocityRatio = totalActual > 0
        ? Math.round((totalPlanned / totalActual) * 100) / 100
        : 1.0

      // --- 2. Count completed and remaining phases ---
      const completedPhases = phases.filter((p) => p.status === 'COMPLETE' || p.status === 'SKIPPED').length
      const totalPhases = PHASE_ORDER.length

      // Find the current phase (first IN_PROGRESS, or first NOT_STARTED)
      const currentPhase = phases.find((p) => p.status === 'IN_PROGRESS')
        ?? phases.find((p) => p.status === 'NOT_STARTED')

      const currentPhaseType = currentPhase?.phaseType
        ?? de.currentJourneyPhase
        ?? 'SALES_HANDOVER'

      // Determine which phases are remaining (not complete, not skipped)
      const remainingPhases = phases.filter(
        (p) => p.status !== 'COMPLETE' && p.status !== 'SKIPPED'
      )

      // If there are no journey phase records, estimate from default order
      let remainingDaysRaw = 0
      if (phases.length === 0) {
        // No journey phases exist yet - estimate from current phase onwards
        const currentIdx = PHASE_ORDER.indexOf(de.currentJourneyPhase)
        for (let i = currentIdx; i < PHASE_ORDER.length; i++) {
          remainingDaysRaw += DEFAULT_PHASE_DURATIONS[PHASE_ORDER[i]]
        }
      } else {
        for (const phase of remainingPhases) {
          const planned = phase.plannedDurationDays ?? DEFAULT_PHASE_DURATIONS[phase.phaseType] ?? 10

          if (phase.status === 'IN_PROGRESS' && phase.startedAt) {
            // For in-progress phase, subtract elapsed days
            const elapsed = diffBusinessDays(phase.startedAt, now)
            const remaining = Math.max(0, planned - elapsed)
            remainingDaysRaw += remaining
          } else {
            remainingDaysRaw += planned
          }
        }
      }

      // --- 3. Adjust by velocity ---
      const adjustedRemainingDays = velocityRatio > 0
        ? Math.round(remainingDaysRaw / velocityRatio)
        : remainingDaysRaw

      // --- 4. Count blockers and add penalty ---
      const blockedPhases = phases.filter((p) => p.status === 'BLOCKED').length
      const blockedPrereqs = prereqs.filter((p) => p.status === 'BLOCKED').length
      const blockerCount = blockedPhases + blockedPrereqs

      const blockerPenalty = blockerCount * BLOCKER_PENALTY_DAYS
      const totalRemainingDays = adjustedRemainingDays + blockerPenalty

      // --- 5. Calculate predicted go-live ---
      const predictedGoLive = addBusinessDays(now, totalRemainingDays)

      // --- 6. Assess risk ---
      const targetGoLive = de.goLiveDate ? new Date(de.goLiveDate) : null
      let riskStatus: 'on_track' | 'at_risk' | 'likely_delayed' | 'no_target'
      let daysAhead = 0

      if (!targetGoLive) {
        riskStatus = 'no_target'
        daysAhead = 0
      } else {
        // daysAhead: positive = ahead of schedule, negative = behind
        daysAhead = diffBusinessDays(predictedGoLive, targetGoLive)

        if (daysAhead >= 0) {
          riskStatus = 'on_track'
        } else if (daysAhead >= -5) {
          // Within ~1 business week after target
          riskStatus = 'at_risk'
        } else {
          riskStatus = 'likely_delayed'
        }
      }

      return {
        deId: de.id,
        deName: de.name,
        companyName: de.company.name,
        currentPhase: formatPhaseType(currentPhaseType),
        targetGoLive: targetGoLive?.toISOString() ?? null,
        predictedGoLive: predictedGoLive.toISOString(),
        velocityRatio,
        blockerCount,
        riskStatus,
        daysAhead,
        completedPhases,
        totalPhases,
      }
    })

    // Sort by risk: likely_delayed first, then at_risk, no_target, on_track
    const riskOrder: Record<string, number> = {
      likely_delayed: 0,
      at_risk: 1,
      no_target: 2,
      on_track: 3,
    }
    predictions.sort((a, b) => (riskOrder[a.riskStatus] ?? 9) - (riskOrder[b.riskStatus] ?? 9))

    const summary = {
      total: predictions.length,
      onTrack: predictions.filter((p) => p.riskStatus === 'on_track').length,
      atRisk: predictions.filter((p) => p.riskStatus === 'at_risk').length,
      likelyDelayed: predictions.filter((p) => p.riskStatus === 'likely_delayed').length,
      noTarget: predictions.filter((p) => p.riskStatus === 'no_target').length,
    }

    return NextResponse.json({
      success: true,
      data: {
        predictions,
        summary,
      },
    })
  } catch (error) {
    console.error('Error calculating predictions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to calculate deadline predictions' },
      { status: 500 }
    )
  }
}

// --- Utility functions ---

/**
 * Calculate the number of business days between two dates.
 * Returns positive if end > start, negative if end < start.
 */
function diffBusinessDays(start: Date, end: Date): number {
  const s = new Date(start)
  const e = new Date(end)

  // Normalize to start of day
  s.setHours(0, 0, 0, 0)
  e.setHours(0, 0, 0, 0)

  const sign = e >= s ? 1 : -1
  const from = sign === 1 ? new Date(s) : new Date(e)
  const to = sign === 1 ? new Date(e) : new Date(s)

  let count = 0
  const current = new Date(from)

  while (current < to) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count * sign
}

/**
 * Add a number of business days to a date.
 */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let remaining = days

  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining--
    }
  }

  return result
}

/**
 * Format a JourneyPhaseType enum value to a readable string.
 */
function formatPhaseType(type: string): string {
  const labels: Record<string, string> = {
    SALES_HANDOVER: 'Sales Handover',
    KICKOFF: 'Kickoff',
    DESIGN_WEEK: 'Design Week',
    ONBOARDING: 'Onboarding',
    UAT: 'UAT',
    GO_LIVE: 'Go Live',
    HYPERCARE: 'Hypercare',
    HANDOVER_TO_SUPPORT: 'Handover to Support',
  }
  return labels[type] ?? type
}
