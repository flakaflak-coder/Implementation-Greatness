import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ContentClassification, DesignWeekStatus } from '@prisma/client'
import { calculateDesignWeekEndDate } from '@/lib/phase-durations'

/**
 * Map content classification to Design Week phase
 */
const CLASSIFICATION_TO_PHASE: Record<ContentClassification, number> = {
  KICKOFF_SESSION: 1,
  PROCESS_DESIGN_SESSION: 2,
  SKILLS_GUARDRAILS_SESSION: 2,
  PERSONA_DESIGN_SESSION: 2,
  TECHNICAL_SESSION: 3,
  SIGNOFF_SESSION: 4,
  SALES_HANDOVER_DOCUMENT: 0,
  REQUIREMENTS_DOCUMENT: 1,
  TECHNICAL_SPEC: 3,
  PROCESS_DOCUMENT: 2,
  UNKNOWN: 1,
}

/**
 * POST /api/design-weeks/[id]/recalculate-progress
 *
 * Recalculates the Design Week status and phase based on existing data.
 * Useful for fixing records that weren't updated correctly.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the Design Week with related data
    const designWeek = await prisma.designWeek.findUnique({
      where: { id },
      include: {
        sessions: {
          where: { processingStatus: 'COMPLETE' },
          select: { phase: true },
        },
        uploadJobs: {
          where: { status: 'COMPLETE' },
          select: { classificationResult: true },
        },
        rawExtractions: {
          select: { contentType: true },
        },
      },
    })

    if (!designWeek) {
      return NextResponse.json(
        { success: false, error: 'Design Week not found' },
        { status: 404 }
      )
    }

    console.log(`[Recalculate] Design Week ${id}`)
    console.log(`[Recalculate] Current status: ${designWeek.status}, phase: ${designWeek.currentPhase}`)
    console.log(`[Recalculate] Sessions: ${designWeek.sessions.length}, Upload Jobs: ${designWeek.uploadJobs.length}, Raw Extractions: ${designWeek.rawExtractions.length}`)

    // Determine the highest phase from all sources
    let highestPhase = 1

    // From completed sessions
    for (const session of designWeek.sessions) {
      highestPhase = Math.max(highestPhase, session.phase)
    }

    // From completed upload jobs with classification
    for (const job of designWeek.uploadJobs) {
      const classification = job.classificationResult as { type?: string } | null
      if (classification?.type) {
        const phase = CLASSIFICATION_TO_PHASE[classification.type as ContentClassification] || 1
        highestPhase = Math.max(highestPhase, phase)
      }
    }

    // From raw extractions
    for (const extraction of designWeek.rawExtractions) {
      const phase = CLASSIFICATION_TO_PHASE[extraction.contentType] || 1
      highestPhase = Math.max(highestPhase, phase)
    }

    console.log(`[Recalculate] Highest phase detected: ${highestPhase}`)

    // Determine the new status
    let newStatus: DesignWeekStatus = 'NOT_STARTED'

    // If there's any completed content, it's IN_PROGRESS
    if (designWeek.sessions.length > 0 || designWeek.uploadJobs.length > 0 || designWeek.rawExtractions.length > 0) {
      newStatus = 'IN_PROGRESS'
    }

    // If we have sign-off content, it's PENDING_SIGNOFF
    const hasSignoffContent =
      designWeek.sessions.some(s => s.phase === 4) ||
      designWeek.uploadJobs.some(j => {
        const classification = j.classificationResult as { type?: string } | null
        return classification?.type === 'SIGNOFF_SESSION'
      }) ||
      designWeek.rawExtractions.some(e => e.contentType === 'SIGNOFF_SESSION')

    if (hasSignoffContent && newStatus === 'IN_PROGRESS') {
      newStatus = 'PENDING_SIGNOFF'
    }

    // Don't downgrade from COMPLETE
    if (designWeek.status === 'COMPLETE') {
      newStatus = 'COMPLETE'
    }

    console.log(`[Recalculate] New status: ${newStatus}, new phase: ${highestPhase}`)

    // Only update if something changed
    const statusChanged = newStatus !== designWeek.status
    const phaseChanged = highestPhase !== designWeek.currentPhase

    if (statusChanged || phaseChanged) {
      // Calculate dates when starting for the first time
      const isStarting = designWeek.status === 'NOT_STARTED' && newStatus !== 'NOT_STARTED'
      const startDate = isStarting ? new Date() : designWeek.startedAt
      const plannedEndDate = isStarting && startDate
        ? calculateDesignWeekEndDate(startDate, designWeek.plannedDurationDays)
        : undefined

      const updated = await prisma.designWeek.update({
        where: { id },
        data: {
          status: newStatus,
          currentPhase: highestPhase,
          ...(isStarting ? { startedAt: startDate, plannedEndDate } : {}),
        },
        select: {
          id: true,
          status: true,
          currentPhase: true,
          startedAt: true,
          plannedEndDate: true,
        },
      })

      console.log(`[Recalculate] Updated Design Week:`, updated)

      return NextResponse.json({
        success: true,
        updated: true,
        changes: {
          status: { from: designWeek.status, to: updated.status },
          currentPhase: { from: designWeek.currentPhase, to: updated.currentPhase },
          ...(isStarting ? { plannedEndDate: updated.plannedEndDate } : {}),
        },
        data: updated,
      })
    }

    console.log(`[Recalculate] No changes needed`)

    return NextResponse.json({
      success: true,
      updated: false,
      message: 'No changes needed - status and phase are already correct',
      data: {
        id: designWeek.id,
        status: designWeek.status,
        currentPhase: designWeek.currentPhase,
      },
    })
  } catch (error) {
    console.error('Error recalculating Design Week progress:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate progress' },
      { status: 500 }
    )
  }
}
