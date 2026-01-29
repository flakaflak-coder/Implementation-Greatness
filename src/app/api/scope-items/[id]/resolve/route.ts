import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/scope-items/[id]/resolve - Resolve an ambiguous scope item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { classification, notes } = body

    if (!classification || !['IN_SCOPE', 'OUT_OF_SCOPE'].includes(classification)) {
      return NextResponse.json(
        { success: false, error: 'Valid classification is required (IN_SCOPE or OUT_OF_SCOPE)' },
        { status: 400 }
      )
    }

    // Get the current scope item
    const currentItem = await prisma.scopeItem.findUnique({
      where: { id },
    })

    if (!currentItem) {
      return NextResponse.json(
        { success: false, error: 'Scope item not found' },
        { status: 404 }
      )
    }

    if (currentItem.classification !== 'AMBIGUOUS') {
      return NextResponse.json(
        { success: false, error: 'This scope item is not ambiguous' },
        { status: 400 }
      )
    }

    // Update the scope item
    const scopeItem = await prisma.scopeItem.update({
      where: { id },
      data: {
        classification,
        status: 'CONFIRMED',
        notes: notes ? `${currentItem.notes || ''}\n\nResolution: ${notes}`.trim() : currentItem.notes,
      },
      include: {
        evidence: true,
      },
    })

    return NextResponse.json({ success: true, data: scopeItem })
  } catch (error) {
    console.error('Error resolving scope item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resolve scope item' },
      { status: 500 }
    )
  }
}
