import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Expected sessions per phase for Design Week
const EXPECTED_SESSIONS_PER_PHASE: Record<number, number> = {
  1: 1, // Kickoff: 1 session
  2: 3, // Process Design: 2-3 sessions
  3: 3, // Technical: 2-3 sessions
  4: 1, // Sign-off: 1 session
}

// Phase requirements for readiness check
interface PhaseRequirement {
  label: string
  check: (data: PhaseData) => boolean
  critical: boolean
}

interface PhaseData {
  sessions: number
  scopeItems: { total: number; ambiguous: number; inScope: number; outOfScope: number }
  scenarios: number
  kpis: number
  integrations: number
  escalationRules: number
}

const PHASE_REQUIREMENTS: Record<number, PhaseRequirement[]> = {
  1: [ // Kickoff
    { label: 'Kickoff session recorded', check: (d) => d.sessions >= 1, critical: true },
    { label: 'Goals/KPIs identified', check: (d) => d.kpis >= 1, critical: false },
  ],
  2: [ // Process Design
    { label: 'Process sessions recorded', check: (d) => d.sessions >= 2, critical: true },
    { label: 'Scope items defined', check: (d) => d.scopeItems.total >= 5, critical: true },
    { label: 'No ambiguous scope items', check: (d) => d.scopeItems.ambiguous === 0, critical: true },
    { label: 'Scenarios documented', check: (d) => d.scenarios >= 1, critical: false },
    { label: 'Escalation rules defined', check: (d) => d.escalationRules >= 1, critical: false },
  ],
  3: [ // Technical
    { label: 'Technical sessions recorded', check: (d) => d.sessions >= 1, critical: true },
    { label: 'Integrations identified', check: (d) => d.integrations >= 1, critical: true },
  ],
  4: [ // Sign-off
    { label: 'Sign-off session recorded', check: (d) => d.sessions >= 1, critical: true },
    { label: 'All scope items resolved', check: (d) => d.scopeItems.ambiguous === 0, critical: true },
  ],
}

// GET /api/dashboard - Get dashboard data
export async function GET() {
  try {
    // Get counts
    const [
      totalDigitalEmployees,
      activeDesignWeeks,
      liveAgents,
      companies,
    ] = await Promise.all([
      prisma.digitalEmployee.count(),
      prisma.designWeek.count({
        where: { status: 'IN_PROGRESS' },
      }),
      prisma.digitalEmployee.count({
        where: { status: 'LIVE' },
      }),
      prisma.company.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { digitalEmployees: true },
          },
          digitalEmployees: {
            select: { status: true },
          },
        },
      }),
    ])

    // Get active design weeks with FULL details for progress tracking
    const designWeeks = await prisma.designWeek.findMany({
      where: {
        status: { in: ['IN_PROGRESS', 'PENDING_SIGNOFF'] },
      },
      include: {
        digitalEmployee: {
          include: {
            company: {
              select: { id: true, name: true },
            },
          },
        },
        sessions: {
          select: {
            id: true,
            phase: true,
            processingStatus: true,
            extractedItems: {
              select: { type: true, status: true },
            },
          },
        },
        scopeItems: {
          select: {
            classification: true,
            status: true,
            excludeFromDocument: true,
          },
        },
        scenarios: {
          select: {
            id: true,
            excludeFromDocument: true,
          },
        },
        kpis: {
          select: {
            id: true,
            status: true,
            excludeFromDocument: true,
          },
        },
        integrations: {
          select: {
            id: true,
            status: true,
            excludeFromDocument: true,
          },
        },
        escalationRules: {
          select: {
            id: true,
            excludeFromDocument: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    })

    // Count ambiguous items across all active design weeks
    const ambiguousCount = designWeeks.reduce((total, dw) => {
      return total + dw.scopeItems.filter(s => s.classification === 'AMBIGUOUS').length
    }, 0)

    // Format design weeks for response with detailed progress
    const formattedDesignWeeks = designWeeks.map(dw => {
      // Scope item counts
      const scopeCounts = {
        total: dw.scopeItems.length,
        inScope: dw.scopeItems.filter(s => s.classification === 'IN_SCOPE').length,
        outOfScope: dw.scopeItems.filter(s => s.classification === 'OUT_OF_SCOPE').length,
        ambiguous: dw.scopeItems.filter(s => s.classification === 'AMBIGUOUS').length,
        excluded: dw.scopeItems.filter(s => s.excludeFromDocument).length,
      }

      // Sessions per phase
      const sessionsByPhase: Record<number, { count: number; processed: number }> = {}
      for (let phase = 1; phase <= 4; phase++) {
        const phaseSessions = dw.sessions.filter(s => s.phase === phase)
        sessionsByPhase[phase] = {
          count: phaseSessions.length,
          processed: phaseSessions.filter(s => s.processingStatus === 'COMPLETE').length,
        }
      }

      // Extraction counts
      const extractions = {
        scopeItems: scopeCounts.total,
        scenarios: dw.scenarios.length,
        kpis: dw.kpis.length,
        integrations: dw.integrations.length,
        escalationRules: dw.escalationRules.length,
      }

      // Excluded items count
      const excludedCounts = {
        scopeItems: scopeCounts.excluded,
        scenarios: dw.scenarios.filter(s => s.excludeFromDocument).length,
        kpis: dw.kpis.filter(k => k.excludeFromDocument).length,
        integrations: dw.integrations.filter(i => i.excludeFromDocument).length,
        escalationRules: dw.escalationRules.filter(e => e.excludeFromDocument).length,
      }

      // Calculate phase readiness
      const currentPhase = dw.currentPhase
      const phaseData: PhaseData = {
        sessions: sessionsByPhase[currentPhase]?.count || 0,
        scopeItems: scopeCounts,
        scenarios: dw.scenarios.length,
        kpis: dw.kpis.length,
        integrations: dw.integrations.length,
        escalationRules: dw.escalationRules.length,
      }

      const requirements = PHASE_REQUIREMENTS[currentPhase] || []
      const readiness = requirements.map(req => ({
        label: req.label,
        met: req.check(phaseData),
        critical: req.critical,
      }))

      const criticalBlockers = readiness.filter(r => r.critical && !r.met)
      const isPhaseReady = criticalBlockers.length === 0

      // Calculate overall completeness
      const totalResolved = scopeCounts.inScope + scopeCounts.outOfScope
      const completenessScore = scopeCounts.total > 0
        ? Math.round((totalResolved / scopeCounts.total) * 100)
        : 0

      // Overall progress across all phases (0-100)
      const overallProgress = Math.round(
        ((currentPhase - 1) / 4) * 100 +
        (completenessScore / 4)
      )

      return {
        id: dw.id,
        digitalEmployee: {
          id: dw.digitalEmployee.id,
          name: dw.digitalEmployee.name,
          company: dw.digitalEmployee.company,
        },
        currentPhase: dw.currentPhase,
        status: dw.status,
        // Basic counts (existing)
        ambiguousCount: scopeCounts.ambiguous,
        completenessScore,
        // NEW: Detailed progress data
        progress: {
          overallProgress,
          sessionsByPhase,
          expectedSessions: EXPECTED_SESSIONS_PER_PHASE,
          extractions,
          excludedCounts,
          scopeCounts,
          readiness,
          isPhaseReady,
          blockers: criticalBlockers.map(b => b.label),
        },
      }
    })

    // Format companies for response
    const formattedCompanies = companies.map(c => {
      const activeCount = c.digitalEmployees.filter(
        de => de.status === 'DESIGN' || de.status === 'ONBOARDING'
      ).length
      const liveCount = c.digitalEmployees.filter(de => de.status === 'LIVE').length

      return {
        id: c.id,
        name: c.name,
        industry: c.industry,
        digitalEmployeeCount: c._count.digitalEmployees,
        activeCount,
        liveCount,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalDigitalEmployees,
          activeDesignWeeks,
          liveAgents,
          itemsNeedResolution: ambiguousCount,
        },
        designWeeks: formattedDesignWeeks,
        recentCompanies: formattedCompanies,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
