import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { validateId } from '@/lib/validation'

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

const ResolveScopeItemSchema = z.object({
  classification: z.enum(['IN_SCOPE', 'OUT_OF_SCOPE'], {
    error: 'classification must be IN_SCOPE or OUT_OF_SCOPE',
  }),
  notes: z.string().max(5000).trim().optional(),
})

// POST /api/scope-items/[id]/resolve - Resolve an ambiguous scope item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    let body: z.infer<typeof ResolveScopeItemSchema>
    try {
      const raw = await request.json()
      body = ResolveScopeItemSchema.parse(raw)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.issues.map(e => ({ path: e.path.join('.'), message: e.message })) },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { classification, notes } = body

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
