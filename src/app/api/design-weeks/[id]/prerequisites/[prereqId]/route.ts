import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * PATCH /api/design-weeks/[id]/prerequisites/[prereqId]
 * Update a prerequisite (status, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prereqId: string }> }
) {
  const resolvedParams = await params

  try {
    const body = await request.json()
    const {
      title,
      description,
      category,
      ownerType,
      ownerName,
      ownerEmail,
      status,
      priority,
      dueDate,
      blocksPhase,
      integrationId,
      notes,
    } = body

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (ownerType !== undefined) updateData.ownerType = ownerType
    if (ownerName !== undefined) updateData.ownerName = ownerName
    if (ownerEmail !== undefined) updateData.ownerEmail = ownerEmail
    if (priority !== undefined) updateData.priority = priority
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (blocksPhase !== undefined) updateData.blocksPhase = blocksPhase
    if (integrationId !== undefined) updateData.integrationId = integrationId
    if (notes !== undefined) updateData.notes = notes

    // Handle status changes with timestamps
    if (status !== undefined) {
      updateData.status = status
      if (status === 'REQUESTED') {
        updateData.requestedAt = new Date()
      } else if (status === 'RECEIVED') {
        updateData.receivedAt = new Date()
      }
    }

    const prerequisite = await prisma.prerequisite.update({
      where: {
        id: resolvedParams.prereqId,
        designWeekId: resolvedParams.id,
      },
      data: updateData,
      include: {
        integration: {
          select: {
            id: true,
            systemName: true,
          },
        },
      },
    })

    return NextResponse.json({ prerequisite })
  } catch (error) {
    console.error('[Prerequisites PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update prerequisite' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/design-weeks/[id]/prerequisites/[prereqId]
 * Delete a prerequisite
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prereqId: string }> }
) {
  const resolvedParams = await params

  try {
    await prisma.prerequisite.delete({
      where: {
        id: resolvedParams.prereqId,
        designWeekId: resolvedParams.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Prerequisites DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete prerequisite' },
      { status: 500 }
    )
  }
}
