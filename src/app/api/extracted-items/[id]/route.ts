import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ReviewStatus } from '@prisma/client'

// Update extracted item (review)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, content, reviewNotes, reviewedBy } = body as {
      status?: ReviewStatus
      content?: string
      reviewNotes?: string
      reviewedBy?: string
    }

    const item = await prisma.extractedItem.update({
      where: { id },
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

    await prisma.extractedItem.delete({
      where: { id },
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
