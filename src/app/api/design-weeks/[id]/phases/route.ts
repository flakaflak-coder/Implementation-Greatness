import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const TogglePhaseSchema = z.object({
  phase: z.number().min(1).max(4),
  completed: z.boolean(),
})

/**
 * GET /api/design-weeks/[id]/phases
 * Get manual phase completions for a Design Week
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const designWeek = await prisma.designWeek.findUnique({
      where: { id },
      select: {
        id: true,
        currentPhase: true,
        status: true,
        manualPhaseCompletions: true,
        sessions: {
          select: { phase: true, processingStatus: true },
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

    const manualCompletions = (designWeek.manualPhaseCompletions as number[]) || []

    // Determine auto-detected phases from sessions/extractions
    const autoPhases = new Set<number>()
    for (const session of designWeek.sessions) {
      if (session.processingStatus === 'COMPLETE') {
        autoPhases.add(session.phase)
      }
    }

    const CLASSIFICATION_TO_PHASE: Record<string, number> = {
      KICKOFF_SESSION: 1,
      PROCESS_DESIGN_SESSION: 2,
      SKILLS_GUARDRAILS_SESSION: 2,
      PERSONA_DESIGN_SESSION: 2,
      TECHNICAL_SESSION: 3,
      SIGNOFF_SESSION: 4,
      REQUIREMENTS_DOCUMENT: 1,
      TECHNICAL_SPEC: 3,
      PROCESS_DOCUMENT: 2,
    }

    for (const extraction of designWeek.rawExtractions) {
      const phase = CLASSIFICATION_TO_PHASE[extraction.contentType]
      if (phase) autoPhases.add(phase)
    }

    // Build phase status for each phase
    const phases = [1, 2, 3, 4].map(phase => ({
      phase,
      autoCompleted: autoPhases.has(phase),
      manuallyCompleted: manualCompletions.includes(phase),
      completed: autoPhases.has(phase) || manualCompletions.includes(phase),
    }))

    return NextResponse.json({
      success: true,
      data: {
        designWeekId: designWeek.id,
        currentPhase: designWeek.currentPhase,
        status: designWeek.status,
        phases,
        manualCompletions,
      },
    })
  } catch (error) {
    console.error('Error fetching phase data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch phase data' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/design-weeks/[id]/phases
 * Toggle manual completion of a Design Week phase
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = TogglePhaseSchema.parse(body)

    const designWeek = await prisma.designWeek.findUnique({
      where: { id },
      select: {
        id: true,
        currentPhase: true,
        status: true,
        manualPhaseCompletions: true,
      },
    })

    if (!designWeek) {
      return NextResponse.json(
        { success: false, error: 'Design Week not found' },
        { status: 404 }
      )
    }

    const currentManual = (designWeek.manualPhaseCompletions as number[]) || []

    let updatedManual: number[]
    if (parsed.completed) {
      // Add phase if not already present
      updatedManual = currentManual.includes(parsed.phase)
        ? currentManual
        : [...currentManual, parsed.phase].sort()
    } else {
      // Remove phase
      updatedManual = currentManual.filter(p => p !== parsed.phase)
    }

    // Calculate effective highest phase (max of auto + manual)
    const highestManual = updatedManual.length > 0 ? Math.max(...updatedManual) : 0
    const effectivePhase = Math.max(designWeek.currentPhase, highestManual)

    // Update status if needed
    let newStatus = designWeek.status
    if (designWeek.status === 'NOT_STARTED' && updatedManual.length > 0) {
      newStatus = 'IN_PROGRESS'
    }
    if (updatedManual.includes(4) || effectivePhase >= 4) {
      if (newStatus === 'IN_PROGRESS') {
        newStatus = 'PENDING_SIGNOFF'
      }
    }

    const updated = await prisma.designWeek.update({
      where: { id },
      data: {
        manualPhaseCompletions: updatedManual,
        currentPhase: effectivePhase,
        status: newStatus,
        ...(designWeek.status === 'NOT_STARTED' && updatedManual.length > 0
          ? { startedAt: new Date() }
          : {}),
      },
      select: {
        id: true,
        currentPhase: true,
        status: true,
        manualPhaseCompletions: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        manualCompletions: updated.manualPhaseCompletions as number[],
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error toggling phase:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle phase' },
      { status: 500 }
    )
  }
}
