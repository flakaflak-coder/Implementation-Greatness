import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/scope-items/[id]/exclude - Toggle exclude from document flag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { excludeFromDocument } = body

    if (typeof excludeFromDocument !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'excludeFromDocument must be a boolean' },
        { status: 400 }
      )
    }

    const scopeItem = await prisma.scopeItem.update({
      where: { id },
      data: { excludeFromDocument },
      include: { evidence: true },
    })

    return NextResponse.json({ success: true, data: scopeItem })
  } catch (error) {
    console.error('Error updating scope item exclude flag:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update scope item' },
      { status: 500 }
    )
  }
}
