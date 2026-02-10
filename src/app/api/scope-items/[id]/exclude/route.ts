import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { validateId } from '@/lib/validation'

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

const ExcludeScopeItemSchema = z.object({
  excludeFromDocument: z.boolean(),
})

// PATCH /api/scope-items/[id]/exclude - Toggle exclude from document flag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    let body: z.infer<typeof ExcludeScopeItemSchema>
    try {
      const raw = await request.json()
      body = ExcludeScopeItemSchema.parse(raw)
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

    // Verify the scope item exists before updating
    const existing = await prisma.scopeItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Scope item not found' },
        { status: 404 }
      )
    }

    const scopeItem = await prisma.scopeItem.update({
      where: { id },
      data: { excludeFromDocument: body.excludeFromDocument },
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
