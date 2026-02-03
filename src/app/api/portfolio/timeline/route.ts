import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  calculateTrackerStatus,
  calculateProgress,
  calculateRiskLevel,
  calculateDefaultWeeks,
  getISOWeek,
} from '@/lib/tracker-utils'

/**
 * GET /api/portfolio/timeline
 * Get timeline data for portfolio Gantt view
 * Includes all DEs with their journey phases, design week status, prerequisites, and tracker fields
 */
export async function GET() {
  try {
    const currentWeek = getISOWeek()

    // Fetch all active Digital Employees with timeline-relevant data
    const digitalEmployees = await prisma.digitalEmployee.findMany({
      where: {
        status: { in: ['DESIGN', 'ONBOARDING'] },
      },
      include: {
        company: {
          select: { id: true, name: true },
        },
        journeyPhases: {
          select: {
            id: true,
            phaseType: true,
            status: true,
            order: true,
            startedAt: true,
            completedAt: true,
            dueDate: true,
            blockedReason: true,
            assignedTo: true,
          },
          orderBy: { order: 'asc' },
        },
        designWeek: {
          select: {
            id: true,
            status: true,
            currentPhase: true,
            startedAt: true,
            completedAt: true,
            prerequisites: {
              select: {
                id: true,
                status: true,
                priority: true,
                dueDate: true,
              },
            },
            sessions: {
              select: {
                id: true,
                phase: true,
                processingStatus: true,
              },
            },
            scopeItems: {
              select: {
                classification: true,
              },
            },
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { company: { name: 'asc' } },
        { name: 'asc' },
      ],
    })

    // Group by company for the hierarchical view
    const companiesMap = new Map<string, {
      id: string
      name: string
      digitalEmployees: typeof processedDEs
    }>()

    // Process each DE for timeline display
    const processedDEs = digitalEmployees.map(de => {
      // Calculate prerequisites summary
      const prereqs = de.designWeek?.prerequisites || []
      const prereqSummary = {
        total: prereqs.length,
        received: prereqs.filter(p => p.status === 'RECEIVED').length,
        blocked: prereqs.filter(p => p.status === 'BLOCKED').length,
        pending: prereqs.filter(p => !['RECEIVED', 'NOT_NEEDED'].includes(p.status)).length,
      }

      // Calculate Design Week progress
      const sessions = de.designWeek?.sessions || []
      const scopeItems = de.designWeek?.scopeItems || []
      const totalExpectedSessions = 8 // 1 + 3 + 3 + 1
      const completedSessions = sessions.filter(s => s.processingStatus === 'COMPLETE').length
      const sessionProgress = Math.round((completedSessions / totalExpectedSessions) * 100)

      const resolvedScope = scopeItems.filter(s => s.classification !== 'AMBIGUOUS').length
      const scopeProgress = scopeItems.length > 0
        ? Math.round((resolvedScope / scopeItems.length) * 100)
        : 0

      // Calculate overall Design Week phase (1-4 as percentage progress through DW)
      const designWeekPhase = de.designWeek?.currentPhase || 1
      const designWeekProgress = Math.round(((designWeekPhase - 1) / 4) * 100) +
        (sessionProgress / 4) // Add partial progress within current phase

      // Find assigned lead from DESIGN_WEEK journey phase
      const designWeekJourneyPhase = de.journeyPhases.find(p => p.phaseType === 'DESIGN_WEEK')
      const assignedTo = designWeekJourneyPhase?.assignedTo || null

      // Calculate timeline dates
      const phases = de.journeyPhases.map(phase => ({
        type: phase.phaseType,
        status: phase.status,
        startedAt: phase.startedAt?.toISOString() || null,
        completedAt: phase.completedAt?.toISOString() || null,
        dueDate: phase.dueDate?.toISOString() || null,
        blockedReason: phase.blockedReason,
      }))

      // Determine current lifecycle stage
      let currentStage: 'design_week' | 'configuration' | 'uat' | 'live' = 'design_week'
      const designWeekStatus = de.designWeek?.status
      if (designWeekStatus === 'COMPLETE') {
        const configPhase = de.journeyPhases.find(p => p.phaseType === 'ONBOARDING')
        const uatPhase = de.journeyPhases.find(p => p.phaseType === 'UAT')
        if (uatPhase?.status === 'IN_PROGRESS' || uatPhase?.status === 'COMPLETE') {
          currentStage = 'uat'
        } else if (configPhase?.status === 'IN_PROGRESS') {
          currentStage = 'configuration'
        } else {
          currentStage = 'configuration'
        }
      }
      if (de.status === 'LIVE') {
        currentStage = 'live'
      }

      // === AUTO-CALCULATION: Tracker Status, Progress, Risk Level ===
      const calculationData = {
        blocker: de.blocker,
        goLiveDate: de.goLiveDate,
        journeyPhases: de.journeyPhases,
        designWeek: de.designWeek ? {
          status: de.designWeek.status,
          currentPhase: de.designWeek.currentPhase,
        } : null,
        prerequisites: prereqs,
      }

      const autoTrackerStatus = calculateTrackerStatus(calculationData)
      const autoProgress = calculateProgress(calculationData)
      const autoRiskLevel = calculateRiskLevel(calculationData)

      // Get or calculate week values
      let startWeek = de.startWeek
      let endWeek = de.endWeek
      let goLiveWeek = de.goLiveWeek

      // Auto-calculate weeks if not set
      if (!startWeek || !endWeek) {
        const defaultWeeks = calculateDefaultWeeks(calculationData)
        startWeek = startWeek ?? defaultWeeks.startWeek
        endWeek = endWeek ?? defaultWeeks.endWeek
      }

      // Calculate goLiveWeek from goLiveDate if not set
      if (!goLiveWeek && de.goLiveDate) {
        goLiveWeek = getISOWeek(new Date(de.goLiveDate))
      }

      // Determine traffic light (now based on auto-calculated tracker status)
      let trafficLight: 'green' | 'yellow' | 'red' = 'green'
      const issues: string[] = []

      if (autoTrackerStatus === 'BLOCKED') {
        trafficLight = 'red'
        if (de.blocker) issues.push(de.blocker)
        if (prereqSummary.blocked > 0) issues.push(`${prereqSummary.blocked} prerequisites blocked`)
      } else if (autoTrackerStatus === 'ATTENTION') {
        trafficLight = 'yellow'
      } else if (autoTrackerStatus === 'TO_PLAN') {
        trafficLight = 'yellow'
        issues.push('Needs planning')
      }

      const blockedPhase = de.journeyPhases.find(p => p.status === 'BLOCKED')
      if (blockedPhase) {
        trafficLight = 'red'
        issues.push(`${blockedPhase.phaseType} phase blocked`)
      }

      // Check if behind on go-live date
      if (de.goLiveDate && new Date(de.goLiveDate) < new Date() && de.status !== 'LIVE') {
        trafficLight = 'red'
        issues.push('Past go-live date')
      } else if (de.goLiveDate) {
        const daysToGoLive = Math.ceil((new Date(de.goLiveDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        if (daysToGoLive < 14 && currentStage === 'design_week') {
          trafficLight = 'yellow'
          issues.push(`Only ${daysToGoLive} days to go-live`)
        }
      }

      return {
        id: de.id,
        name: de.name,
        company: de.company,
        status: de.status,
        currentStage,
        goLiveDate: de.goLiveDate?.toISOString() || null,
        assignedTo,
        trafficLight,
        issues,
        // Tracker fields
        startWeek,
        endWeek,
        goLiveWeek,
        trackerStatus: autoTrackerStatus,
        riskLevel: autoRiskLevel,
        blocker: de.blocker,
        ownerClient: de.ownerClient,
        ownerFreedayProject: de.ownerFreedayProject,
        ownerFreedayEngineering: de.ownerFreedayEngineering,
        thisWeekActions: de.thisWeekActions,
        percentComplete: autoProgress,
        sortOrder: de.sortOrder,
        designWeek: de.designWeek ? {
          id: de.designWeek.id,
          status: de.designWeek.status,
          currentPhase: de.designWeek.currentPhase,
          startedAt: de.designWeek.startedAt?.toISOString() || null,
          completedAt: de.designWeek.completedAt?.toISOString() || null,
          progress: designWeekProgress,
          sessionProgress,
          scopeProgress,
        } : null,
        prerequisites: prereqSummary,
        phases,
        createdAt: de.createdAt.toISOString(),
      }
    })

    // Group by company
    for (const de of processedDEs) {
      if (!companiesMap.has(de.company.id)) {
        companiesMap.set(de.company.id, {
          id: de.company.id,
          name: de.company.name,
          digitalEmployees: [],
        })
      }
      companiesMap.get(de.company.id)!.digitalEmployees.push(de)
    }

    const companies = Array.from(companiesMap.values())

    // Calculate summary stats
    const summary = {
      total: processedDEs.length,
      byStage: {
        designWeek: processedDEs.filter(de => de.currentStage === 'design_week').length,
        configuration: processedDEs.filter(de => de.currentStage === 'configuration').length,
        uat: processedDEs.filter(de => de.currentStage === 'uat').length,
        live: processedDEs.filter(de => de.currentStage === 'live').length,
      },
      byTrafficLight: {
        green: processedDEs.filter(de => de.trafficLight === 'green').length,
        yellow: processedDEs.filter(de => de.trafficLight === 'yellow').length,
        red: processedDEs.filter(de => de.trafficLight === 'red').length,
      },
      byTrackerStatus: {
        onTrack: processedDEs.filter(de => de.trackerStatus === 'ON_TRACK').length,
        attention: processedDEs.filter(de => de.trackerStatus === 'ATTENTION').length,
        blocked: processedDEs.filter(de => de.trackerStatus === 'BLOCKED').length,
        toPlan: processedDEs.filter(de => de.trackerStatus === 'TO_PLAN').length,
      },
      byRiskLevel: {
        low: processedDEs.filter(de => de.riskLevel === 'LOW').length,
        medium: processedDEs.filter(de => de.riskLevel === 'MEDIUM').length,
        high: processedDEs.filter(de => de.riskLevel === 'HIGH').length,
      },
      prerequisitesBlocked: processedDEs.filter(de => de.prerequisites.blocked > 0).length,
      companiesCount: companies.length,
      currentWeek,
    }

    // Get unique leads for filter
    const leads = [...new Set(processedDEs.map(de => de.assignedTo).filter(Boolean))]

    return NextResponse.json({
      success: true,
      data: {
        summary,
        companies,
        digitalEmployees: processedDEs,
        leads,
        currentWeek,
      },
    })
  } catch (error) {
    console.error('Error fetching timeline data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timeline data' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/portfolio/timeline
 * Update week positions for drag-and-drop functionality
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, startWeek, endWeek, goLiveWeek, blocker, thisWeekActions, sortOrder } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Digital Employee ID is required' },
        { status: 400 }
      )
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {}
    if (startWeek !== undefined) updateData.startWeek = startWeek
    if (endWeek !== undefined) updateData.endWeek = endWeek
    if (goLiveWeek !== undefined) updateData.goLiveWeek = goLiveWeek
    if (blocker !== undefined) updateData.blocker = blocker
    if (thisWeekActions !== undefined) updateData.thisWeekActions = thisWeekActions
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    const updated = await prisma.digitalEmployee.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        startWeek: true,
        endWeek: true,
        goLiveWeek: true,
        blocker: true,
        thisWeekActions: true,
        sortOrder: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Error updating timeline data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update timeline data' },
      { status: 500 }
    )
  }
}
