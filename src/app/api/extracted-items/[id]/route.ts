import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateBody, validateId, UpdateExtractedItemSchema } from '@/lib/validation'

// Update extracted item (review)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate ID format
    const idValidation = validateId(id)
    if (!idValidation.success) {
      return idValidation.response
    }

    // Validate request body
    const bodyValidation = await validateBody(request, UpdateExtractedItemSchema)
    if (!bodyValidation.success) {
      return bodyValidation.response
    }

    const { status, content, reviewNotes, reviewedBy } = bodyValidation.data

    const item = await prisma.extractedItem.update({
      where: { id: idValidation.id },
      data: {
        ...(status && { status }),
        ...(content && { content }),
        ...(reviewNotes !== undefined && { reviewNotes }),
        ...(reviewedBy && { reviewedBy }),
        ...(status && { reviewedAt: new Date() }),
      },
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error updating extracted item:', error)
    return NextResponse.json(
      { error: 'Failed to update extracted item' },
      { status: 500 }
    )
  }
}

// Delete extracted item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate ID format
    const idValidation = validateId(id)
    if (!idValidation.success) {
      return idValidation.response
    }

    await prisma.extractedItem.delete({
      where: { id: idValidation.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting extracted item:', error)
    return NextResponse.json(
      { error: 'Failed to delete extracted item' },
      { status: 500 }
    )
  }
}
