import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * PATCH /api/journey-phases/[id]/checklist
 *
 * Toggle a checklist item for a journey phase.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: checklistItemId } = await params
    const body = await request.json()
    const { isCompleted, completedBy } = body as {
      isCompleted: boolean
      completedBy?: string
    }

    if (typeof isCompleted !== 'boolean') {
      return NextResponse.json({ error: 'isCompleted is required' }, { status: 400 })
    }

    const item = await prisma.journeyChecklistItem.findUnique({
      where: { id: checklistItemId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const updated = await prisma.journeyChecklistItem.update({
      where: { id: checklistItemId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completedBy: isCompleted ? (completedBy || 'Sophie') : null,
      },
    })

    return NextResponse.json({ success: true, item: updated })
  } catch (error) {
    console.error('Error updating checklist item:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update checklist item' },
      { status: 500 }
    )
  }
}
