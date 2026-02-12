import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId, validateBody, UpdateSignOffSchema } from '@/lib/validation'

/**
 * PATCH /api/design-weeks/[id]/sign-offs/[signOffId]
 * Update a sign-off status and/or comments
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signOffId: string }> }
) {
  const resolvedParams = await params
  const idCheck = validateId(resolvedParams.id)
  if (!idCheck.success) return idCheck.response
  const signOffIdCheck = validateId(resolvedParams.signOffId)
  if (!signOffIdCheck.success) return signOffIdCheck.response

  try {
    const validation = await validateBody(request, UpdateSignOffSchema)
    if (!validation.success) return validation.response
    const { status, comments } = validation.data

    // Build update data conditionally
    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (comments !== undefined) updateData.comments = comments

    const signOff = await prisma.signOff.update({
      where: {
        id: resolvedParams.signOffId,
        designWeekId: resolvedParams.id,
      },
      data: updateData,
    })

    return NextResponse.json({ signOff })
  } catch (error) {
    console.error('[SignOffs PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update sign-off' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/design-weeks/[id]/sign-offs/[signOffId]
 * Delete a sign-off
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signOffId: string }> }
) {
  const resolvedParams = await params
  const idCheck = validateId(resolvedParams.id)
  if (!idCheck.success) return idCheck.response
  const signOffIdCheck = validateId(resolvedParams.signOffId)
  if (!signOffIdCheck.success) return signOffIdCheck.response

  try {
    await prisma.signOff.delete({
      where: {
        id: resolvedParams.signOffId,
        designWeekId: resolvedParams.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[SignOffs DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete sign-off' },
      { status: 500 }
    )
  }
}
