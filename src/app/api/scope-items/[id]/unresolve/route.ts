import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId } from '@/lib/validation'

// POST /api/scope-items/[id]/unresolve - Undo a scope resolution (set back to AMBIGUOUS)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

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

    if (currentItem.classification === 'AMBIGUOUS') {
      return NextResponse.json(
        { success: false, error: 'This scope item is already ambiguous' },
        { status: 400 }
      )
    }

    // Update the scope item back to AMBIGUOUS
    const scopeItem = await prisma.scopeItem.update({
      where: { id },
      data: {
        classification: 'AMBIGUOUS',
        status: 'AMBIGUOUS', // ExtractionStatus enum: CONFIRMED, AMBIGUOUS, NEEDS_DISCUSSION
        notes: currentItem.notes
          ? `${currentItem.notes}\n\n[Undo: Previously marked as ${currentItem.classification}]`
          : `[Undo: Previously marked as ${currentItem.classification}]`,
      },
      include: {
        evidence: true,
      },
    })

    return NextResponse.json({ success: true, data: scopeItem })
  } catch (error) {
    console.error('Error unresolving scope item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to unresolve scope item' },
      { status: 500 }
    )
  }
}
