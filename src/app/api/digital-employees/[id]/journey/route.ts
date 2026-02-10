import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId, validateBody, JourneyPhaseTransitionSchema } from '@/lib/validation'
import { getNextPhase, getPhaseOrder, getPhaseLabel, JOURNEY_PHASES } from '@/lib/journey-phases'
import type { JourneyPhaseType } from '@prisma/client'

/**
 * GET /api/digital-employees/[id]/journey
 * Get the current journey state including phase, prerequisites blocking next phase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    const digitalEmployee = await prisma.digitalEmployee.findUnique({
      where: { id },
      select: {
        id: true,
        currentJourneyPhase: true,
        designWeek: {
          select: {
            id: true,
            prerequisites: {
              select: {
                id: true,
                title: true,
                status: true,
                category: true,
                priority: true,
                blocksPhase: true,
                ownerType: true,
                ownerName: true,
                dueDate: true,
              },
            },
          },
        },
        journeyPhases: {
          select: {
            id: true,
            phaseType: true,
            status: true,
            startedAt: true,
            completedAt: true,
            notes: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!digitalEmployee) {
      return NextResponse.json(
        { success: false, error: 'Digital employee not found' },
        { status: 404 }
      )
    }

    const currentPhase = digitalEmployee.currentJourneyPhase
    const nextPhase = getNextPhase(currentPhase)

    // Find prerequisites blocking the next phase
    let blockingPrerequisites: Array<{
      id: string
      title: string
      status: string
      category: string
      priority: string
      blocksPhase: JourneyPhaseType | null
      ownerType: string
      ownerName: string | null
      dueDate: Date | null
    }> = []

    if (nextPhase && digitalEmployee.designWeek) {
      blockingPrerequisites = digitalEmployee.designWeek.prerequisites.filter(
        (p) =>
          p.blocksPhase === nextPhase &&
          p.status !== 'RECEIVED' &&
          p.status !== 'NOT_NEEDED'
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        currentPhase,
        currentPhaseLabel: getPhaseLabel(currentPhase),
        nextPhase,
        nextPhaseLabel: nextPhase ? getPhaseLabel(nextPhase) : null,
        journeyPhases: digitalEmployee.journeyPhases,
        blockingPrerequisites,
        canAdvance: blockingPrerequisites.length === 0,
      },
    })
  } catch (error) {
    console.error('[Journey GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch journey state' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/digital-employees/[id]/journey
 * Advance to next phase or set specific phase with prerequisites gate
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    const validation = await validateBody(request, JourneyPhaseTransitionSchema)
    if (!validation.success) return validation.response

    const { action, targetPhase, force } = validation.data

    // Fetch the digital employee with journey phases and prerequisites
    const digitalEmployee = await prisma.digitalEmployee.findUnique({
      where: { id },
      include: {
        journeyPhases: true,
        designWeek: {
          select: {
            id: true,
            prerequisites: {
              select: {
                id: true,
                title: true,
                status: true,
                blocksPhase: true,
                category: true,
                priority: true,
                ownerType: true,
                ownerName: true,
              },
            },
          },
        },
      },
    })

    if (!digitalEmployee) {
      return NextResponse.json(
        { success: false, error: 'Digital employee not found' },
        { status: 404 }
      )
    }

    // Determine target phase
    let resolvedTargetPhase: JourneyPhaseType

    if (action === 'advance') {
      const next = getNextPhase(digitalEmployee.currentJourneyPhase)
      if (!next) {
        return NextResponse.json(
          { success: false, error: 'Already at the final phase' },
          { status: 400 }
        )
      }
      resolvedTargetPhase = next
    } else {
      // action === 'set'
      if (!targetPhase) {
        return NextResponse.json(
          { success: false, error: 'targetPhase is required for set action' },
          { status: 400 }
        )
      }
      resolvedTargetPhase = targetPhase
    }

    // Prerequisites check
    let blockingPrerequisites: Array<{
      id: string
      title: string
      status: string
      blocksPhase: JourneyPhaseType | null
      category: string
      priority: string
      ownerType: string
      ownerName: string | null
    }> = []

    if (digitalEmployee.designWeek) {
      blockingPrerequisites = digitalEmployee.designWeek.prerequisites.filter(
        (p) =>
          p.blocksPhase === resolvedTargetPhase &&
          p.status !== 'RECEIVED' &&
          p.status !== 'NOT_NEEDED'
      )
    }

    // If there are blocking prerequisites and force is not set, return blocked response
    if (blockingPrerequisites.length > 0 && !force) {
      return NextResponse.json({
        success: false,
        blocked: true,
        reason: 'prerequisites',
        targetPhase: resolvedTargetPhase,
        targetPhaseLabel: getPhaseLabel(resolvedTargetPhase),
        blockedPrerequisites: blockingPrerequisites.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          category: p.category,
          priority: p.priority,
          ownerType: p.ownerType,
          ownerName: p.ownerName,
        })),
      })
    }

    // Perform the transition
    const previousPhase = digitalEmployee.currentJourneyPhase
    const previousPhaseOrder = getPhaseOrder(previousPhase)
    const targetPhaseOrder = getPhaseOrder(resolvedTargetPhase)

    // Build notes for force override
    const forceNote =
      force && blockingPrerequisites.length > 0
        ? `Phase started with override — ${blockingPrerequisites.length} prerequisite${blockingPrerequisites.length > 1 ? 's' : ''} pending`
        : undefined

    // Use a transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update DigitalEmployee.currentJourneyPhase
      const updatedDE = await tx.digitalEmployee.update({
        where: { id },
        data: { currentJourneyPhase: resolvedTargetPhase },
      })

      // 2. Mark previous phase(s) as COMPLETE (any phase between current and target if jumping)
      // Only mark phases that are currently IN_PROGRESS
      const phasesToComplete = JOURNEY_PHASES.filter(
        (p) => p.order >= previousPhaseOrder && p.order < targetPhaseOrder
      )

      for (const phase of phasesToComplete) {
        await tx.journeyPhase.upsert({
          where: {
            digitalEmployeeId_phaseType: {
              digitalEmployeeId: id,
              phaseType: phase.type,
            },
          },
          update: {
            status: 'COMPLETE',
            completedAt: new Date(),
          },
          create: {
            digitalEmployeeId: id,
            phaseType: phase.type,
            order: phase.order,
            status: 'COMPLETE',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        })
      }

      // 3. Update or create the target phase as IN_PROGRESS
      const targetJourneyPhase = await tx.journeyPhase.upsert({
        where: {
          digitalEmployeeId_phaseType: {
            digitalEmployeeId: id,
            phaseType: resolvedTargetPhase,
          },
        },
        update: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          completedAt: null,
          ...(forceNote ? { notes: forceNote } : {}),
        },
        create: {
          digitalEmployeeId: id,
          phaseType: resolvedTargetPhase,
          order: targetPhaseOrder,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          ...(forceNote ? { notes: forceNote } : {}),
        },
      })

      return { updatedDE, targetJourneyPhase }
    })

    return NextResponse.json({
      success: true,
      currentPhase: resolvedTargetPhase,
      currentPhaseLabel: getPhaseLabel(resolvedTargetPhase),
      previousPhase,
      forced: force && blockingPrerequisites.length > 0,
      forcedCount: force ? blockingPrerequisites.length : 0,
    })
  } catch (error) {
    console.error('[Journey PATCH] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to transition journey phase' },
      { status: 500 }
    )
  }
}
