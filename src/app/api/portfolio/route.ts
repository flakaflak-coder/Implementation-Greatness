import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Expected sessions per phase for Design Week
const EXPECTED_SESSIONS_PER_PHASE: Record<number, number> = {
  1: 1, // Kickoff: 1 session
  2: 3, // Process Design: 2-3 sessions
  3: 3, // Technical: 2-3 sessions
  4: 1, // Sign-off: 1 session
}

const PHASE_NAMES: Record<number, string> = {
  1: 'Kickoff',
  2: 'Process Design',
  3: 'Technical',
  4: 'Sign-off',
}

type TrafficLight = 'green' | 'yellow' | 'red'
type Trend = 'improving' | 'stable' | 'declining'

interface TrafficLightResult {
  light: TrafficLight
  issues: string[]
}

interface ConsultantWorkload {
  name: string
  total: number
  green: number
  yellow: number
  red: number
}

// Calculate trend based on recent activity
function calculateTrend(dw: {
  updatedAt: Date
  sessions: Array<{ createdAt?: Date }>
}): Trend {
  const now = Date.now()
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000
  const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000

  // Check if there's been recent session activity (last 3 days)
  const recentSessions = dw.sessions.filter(s => {
    if (!s.createdAt) return false
    return new Date(s.createdAt).getTime() > threeDaysAgo
  })

  if (recentSessions.length > 0) {
    return 'improving'
  }

  // Check if stale (no update in 5+ days)
  const lastUpdate = new Date(dw.updatedAt).getTime()
  if (lastUpdate < fiveDaysAgo) {
    return 'declining'
  }

  return 'stable'
}

// Calculate traffic light status for a Design Week
function calculateTrafficLight(dw: {
  currentPhase: number
  updatedAt: Date
  sessions: Array<{ phase: number; processingStatus: string }>
  scopeItems: Array<{ classification: string }>
  journeyPhases?: Array<{ status: string; blockedReason: string | null }> | null
}): TrafficLightResult {
  const issues: string[] = []

  // Expected vs uploaded sessions for current phase
  const expectedSessions = EXPECTED_SESSIONS_PER_PHASE[dw.currentPhase] || 1
  const uploadedSessions = dw.sessions.filter(s => s.phase === dw.currentPhase).length

  // Scope completeness
  const totalScope = dw.scopeItems.length
  const ambiguousCount = dw.scopeItems.filter(s => s.classification === 'AMBIGUOUS').length
  const resolvedScope = totalScope - ambiguousCount
  const completeness = totalScope > 0 ? Math.round((resolvedScope / totalScope) * 100) : 100

  // Check for blocked journey phases
  const blockedPhase = dw.journeyPhases?.find(p => p.status === 'BLOCKED')
  if (blockedPhase) {
    issues.push(`Blocked: ${blockedPhase.blockedReason || 'Unknown reason'}`)
    return { light: 'red', issues }
  }

  // Days since last update
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(dw.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  // RED conditions (check first)
  const redIssues: string[] = []
  if (daysSinceUpdate > 10) redIssues.push('No activity in 10+ days')
  if (ambiguousCount >= 5) redIssues.push(`${ambiguousCount} ambiguous items`)
  if (uploadedSessions < expectedSessions - 1 && expectedSessions > 1) {
    redIssues.push(`Missing ${expectedSessions - uploadedSessions} sessions`)
  }

  if (redIssues.length > 0) {
    return { light: 'red', issues: redIssues }
  }

  // YELLOW conditions
  if (daysSinceUpdate > 5) issues.push('No activity in 5+ days')
  if (ambiguousCount > 0) issues.push(`${ambiguousCount} ambiguous item${ambiguousCount > 1 ? 's' : ''}`)
  if (completeness < 50 && totalScope > 0) issues.push('Low scope completeness')
  if (uploadedSessions < expectedSessions) issues.push('Behind on sessions')

  if (issues.length > 0) {
    return { light: 'yellow', issues }
  }

  return { light: 'green', issues: [] }
}

// GET /api/portfolio - Get Design Week overview for portfolio dashboard
export async function GET() {
  try {
    // Fetch all Design Weeks with relevant data
    const designWeeks = await prisma.designWeek.findMany({
      where: {
        status: { in: ['IN_PROGRESS', 'PENDING_SIGNOFF', 'NOT_STARTED'] },
      },
      include: {
        digitalEmployee: {
          include: {
            company: {
              select: { id: true, name: true },
            },
            journeyPhases: {
              select: {
                phaseType: true,
                status: true,
                blockedReason: true,
                assignedTo: true,
              },
            },
          },
        },
        sessions: {
          select: {
            id: true,
            phase: true,
            processingStatus: true,
            createdAt: true,
          },
        },
        scopeItems: {
          select: {
            classification: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Process each design week
    const processedDesignWeeks = designWeeks.map(dw => {
      // Calculate traffic light
      const trafficLight = calculateTrafficLight({
        currentPhase: dw.currentPhase,
        updatedAt: dw.updatedAt,
        sessions: dw.sessions,
        scopeItems: dw.scopeItems,
        journeyPhases: dw.digitalEmployee.journeyPhases,
      })

      // Session counts
      const expectedSessions = EXPECTED_SESSIONS_PER_PHASE[dw.currentPhase] || 1
      const uploadedSessions = dw.sessions.filter(s => s.phase === dw.currentPhase).length

      // Scope stats
      const totalScope = dw.scopeItems.length
      const ambiguousCount = dw.scopeItems.filter(s => s.classification === 'AMBIGUOUS').length
      const resolvedScope = totalScope - ambiguousCount
      const scopeCompleteness = totalScope > 0 ? Math.round((resolvedScope / totalScope) * 100) : 100

      // Get assigned consultant from current journey phase (DESIGN_WEEK phase)
      const designWeekPhase = dw.digitalEmployee.journeyPhases?.find(
        p => p.phaseType === 'DESIGN_WEEK'
      )
      const assignedTo = designWeekPhase?.assignedTo || null

      // Get blocked reason if any
      const blockedPhase = dw.digitalEmployee.journeyPhases?.find(p => p.status === 'BLOCKED')

      // Calculate trend
      const trend = calculateTrend({
        updatedAt: dw.updatedAt,
        sessions: dw.sessions,
      })

      return {
        id: dw.id,
        digitalEmployee: {
          id: dw.digitalEmployee.id,
          name: dw.digitalEmployee.name,
        },
        company: dw.digitalEmployee.company,
        currentPhase: dw.currentPhase,
        phaseName: PHASE_NAMES[dw.currentPhase] || `Phase ${dw.currentPhase}`,
        status: dw.status,
        trafficLight: trafficLight.light,
        trend,
        issues: trafficLight.issues,
        sessions: {
          uploaded: uploadedSessions,
          expected: expectedSessions,
        },
        scopeCompleteness,
        ambiguousCount,
        assignedTo,
        lastUpdated: dw.updatedAt.toISOString(),
        blockedReason: blockedPhase?.blockedReason || null,
      }
    })

    // Sort: red first, then yellow, then green; within each, oldest first
    const sortOrder: Record<TrafficLight, number> = { red: 0, yellow: 1, green: 2 }
    processedDesignWeeks.sort((a, b) => {
      const lightDiff = sortOrder[a.trafficLight] - sortOrder[b.trafficLight]
      if (lightDiff !== 0) return lightDiff
      // Oldest first within same traffic light
      return new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
    })

    // Calculate summary counts
    const summary = {
      total: processedDesignWeeks.length,
      green: processedDesignWeeks.filter(dw => dw.trafficLight === 'green').length,
      yellow: processedDesignWeeks.filter(dw => dw.trafficLight === 'yellow').length,
      red: processedDesignWeeks.filter(dw => dw.trafficLight === 'red').length,
    }

    // Calculate consultant workload
    const workloadMap = new Map<string, ConsultantWorkload>()
    for (const dw of processedDesignWeeks) {
      const consultant = dw.assignedTo || 'Unassigned'
      if (!workloadMap.has(consultant)) {
        workloadMap.set(consultant, {
          name: consultant,
          total: 0,
          green: 0,
          yellow: 0,
          red: 0,
        })
      }
      const workload = workloadMap.get(consultant)!
      workload.total++
      workload[dw.trafficLight]++
    }

    // Sort by red count (highest first), then yellow, then total
    const consultantWorkload = Array.from(workloadMap.values()).sort((a, b) => {
      if (a.red !== b.red) return b.red - a.red
      if (a.yellow !== b.yellow) return b.yellow - a.yellow
      return b.total - a.total
    })

    return NextResponse.json({
      success: true,
      data: {
        summary,
        consultantWorkload,
        designWeeks: processedDesignWeeks,
      },
    })
  } catch (error) {
    console.error('Error fetching portfolio data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio data' },
      { status: 500 }
    )
  }
}
