import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { validateId } from '@/lib/validation'

// POST /api/digital-employees/[id]/reset - Reset all Design Week data for testing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    // Find the digital employee and its design week
    const digitalEmployee = await prisma.digitalEmployee.findUnique({
      where: { id },
      include: {
        designWeek: true,
      },
    })

    if (!digitalEmployee) {
      return NextResponse.json(
        { success: false, error: 'Digital employee not found' },
        { status: 404 }
      )
    }

    if (!digitalEmployee.designWeek) {
      return NextResponse.json(
        { success: false, error: 'No Design Week found for this Digital Employee' },
        { status: 404 }
      )
    }

    const designWeekId = digitalEmployee.designWeek.id

    // Delete all related data in the correct order to respect foreign keys
    await prisma.$transaction(async (tx) => {
      // First, get all IDs we need to clean up Evidence references
      const scopeItemIds = (await tx.scopeItem.findMany({
        where: { designWeekId },
        select: { id: true },
      })).map(s => s.id)

      const scenarioIds = (await tx.scenario.findMany({
        where: { designWeekId },
        select: { id: true },
      })).map(s => s.id)

      const kpiIds = (await tx.kPI.findMany({
        where: { designWeekId },
        select: { id: true },
      })).map(k => k.id)

      const integrationIds = (await tx.integration.findMany({
        where: { designWeekId },
        select: { id: true },
      })).map(i => i.id)

      const escalationRuleIds = (await tx.escalationRule.findMany({
        where: { designWeekId },
        select: { id: true },
      })).map(e => e.id)

      // Delete Evidence records that reference items we're about to delete
      await tx.evidence.deleteMany({
        where: {
          OR: [
            { scopeItemId: { in: scopeItemIds } },
            { scenarioId: { in: scenarioIds } },
            { kpiId: { in: kpiIds } },
            { integrationId: { in: integrationIds } },
            { escalationRuleId: { in: escalationRuleIds } },
          ],
        },
      })

      // Delete upload jobs
      await tx.uploadJob.deleteMany({
        where: { designWeekId },
      })

      // Delete raw extractions
      await tx.rawExtraction.deleteMany({
        where: { designWeekId },
      })

      // Delete generated documents
      await tx.generatedDocument.deleteMany({
        where: { designWeekId },
      })

      // Delete sign-offs
      await tx.signOff.deleteMany({
        where: { designWeekId },
      })

      // Delete artifact sections (via cascade) and artifacts
      await tx.artifact.deleteMany({
        where: { designWeekId },
      })

      // Delete escalation rules
      await tx.escalationRule.deleteMany({
        where: { designWeekId },
      })

      // Delete integrations
      await tx.integration.deleteMany({
        where: { designWeekId },
      })

      // Delete KPIs
      await tx.kPI.deleteMany({
        where: { designWeekId },
      })

      // Delete scenarios (steps, edge cases will cascade)
      await tx.scenario.deleteMany({
        where: { designWeekId },
      })

      // Delete scope items
      await tx.scopeItem.deleteMany({
        where: { designWeekId },
      })

      // Delete sessions (materials, extractions, extracted items, transcripts will cascade)
      await tx.session.deleteMany({
        where: { designWeekId },
      })

      // Reset the Design Week to initial state
      await tx.designWeek.update({
        where: { id: designWeekId },
        data: {
          status: 'NOT_STARTED',
          currentPhase: 1,
          startedAt: null,
          completedAt: null,
          businessProfile: Prisma.DbNull,
          technicalProfile: Prisma.DbNull,
          testPlan: Prisma.DbNull,
        },
      })
    })

    console.log(`[Reset] Successfully reset Design Week data for DE: ${digitalEmployee.name} (${id})`)

    return NextResponse.json({
      success: true,
      message: `Reset all Design Week data for "${digitalEmployee.name}"`,
    })
  } catch (error) {
    console.error('Error resetting digital employee data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset digital employee data' },
      { status: 500 }
    )
  }
}
