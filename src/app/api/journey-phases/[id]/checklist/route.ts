import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId, validateBody, UpdateChecklistItemSchema } from '@/lib/validation'

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
    const idCheck = validateId(checklistItemId)
    if (!idCheck.success) return idCheck.response

    const bodyCheck = await validateBody(request, UpdateChecklistItemSchema)
    if (!bodyCheck.success) return bodyCheck.response

    const { isCompleted } = bodyCheck.data

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
        completedBy: isCompleted ? 'Sophie' : null,
      },
    })

    return NextResponse.json({ success: true, item: updated })
  } catch (error) {
    console.error('Error updating checklist item:', error)
    return NextResponse.json(
      { error: 'Failed to update checklist item' },
      { status: 500 }
    )
  }
}
