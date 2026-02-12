import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId, validateBody, CreateSignOffSchema } from '@/lib/validation'

/**
 * GET /api/design-weeks/[id]/sign-offs
 * Get all sign-offs for a design week
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const idCheck = validateId(resolvedParams.id)
  if (!idCheck.success) return idCheck.response

  try {
    const signOffs = await prisma.signOff.findMany({
      where: { designWeekId: resolvedParams.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ signOffs })
  } catch (error) {
    console.error('[SignOffs GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sign-offs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/design-weeks/[id]/sign-offs
 * Create a new sign-off request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const idCheck = validateId(resolvedParams.id)
  if (!idCheck.success) return idCheck.response

  try {
    const validation = await validateBody(request, CreateSignOffSchema)
    if (!validation.success) return validation.response
    const { stakeholder, role, comments } = validation.data

    const signOff = await prisma.signOff.create({
      data: {
        designWeekId: resolvedParams.id,
        stakeholder,
        role,
        comments: comments || null,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ signOff }, { status: 201 })
  } catch (error) {
    console.error('[SignOffs POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create sign-off' },
      { status: 500 }
    )
  }
}
