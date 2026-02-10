import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId, validateBody, CreatePrerequisiteSchema } from '@/lib/validation'

/**
 * GET /api/design-weeks/[id]/prerequisites
 * Get all prerequisites for a design week
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const idCheck = validateId(resolvedParams.id)
  if (!idCheck.success) return idCheck.response

  try {
    const prerequisites = await prisma.prerequisite.findMany({
      where: { designWeekId: resolvedParams.id },
      include: {
        integration: {
          select: {
            id: true,
            systemName: true,
          },
        },
      },
      orderBy: [
        { priority: 'asc' }, // HIGH first
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ prerequisites })
  } catch (error) {
    console.error('[Prerequisites GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prerequisites' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/design-weeks/[id]/prerequisites
 * Create a new prerequisite
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const idCheck = validateId(resolvedParams.id)
  if (!idCheck.success) return idCheck.response

  try {
    const validation = await validateBody(request, CreatePrerequisiteSchema)
    if (!validation.success) return validation.response
    const {
      title,
      description,
      category,
      ownerType,
      ownerName,
      ownerEmail,
      priority,
      dueDate,
      blocksPhase,
      integrationId,
    } = validation.data

    const prerequisite = await prisma.prerequisite.create({
      data: {
        designWeekId: resolvedParams.id,
        title,
        description,
        category,
        ownerType,
        ownerName,
        ownerEmail,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        blocksPhase,
        integrationId,
        status: 'PENDING',
      },
      include: {
        integration: {
          select: {
            id: true,
            systemName: true,
          },
        },
      },
    })

    return NextResponse.json({ prerequisite }, { status: 201 })
  } catch (error) {
    console.error('[Prerequisites POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create prerequisite' },
      { status: 500 }
    )
  }
}
