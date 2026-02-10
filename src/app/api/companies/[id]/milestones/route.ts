import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CreateMilestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['UPCOMING', 'IN_PROGRESS', 'ACHIEVED', 'BLOCKED']).optional(),
  targetDate: z.string().optional(),
  gatingCriteria: z.string().optional(),
  order: z.number().optional(),
})

const UpdateMilestoneSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['UPCOMING', 'IN_PROGRESS', 'ACHIEVED', 'BLOCKED']).optional(),
  targetDate: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  gatingCriteria: z.string().nullable().optional(),
  order: z.number().optional(),
})

// GET /api/companies/[id]/milestones
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const milestones = await prisma.companyMilestone.findMany({
      where: { companyId: id },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ success: true, data: milestones })
  } catch (error) {
    console.error('Error fetching milestones:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch milestones' },
      { status: 500 }
    )
  }
}

// POST /api/companies/[id]/milestones
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = CreateMilestoneSchema.parse(body)

    // Get the next order number
    const maxOrder = await prisma.companyMilestone.aggregate({
      where: { companyId: id },
      _max: { order: true },
    })

    const milestone = await prisma.companyMilestone.create({
      data: {
        companyId: id,
        title: parsed.title,
        description: parsed.description,
        status: parsed.status || 'UPCOMING',
        targetDate: parsed.targetDate ? new Date(parsed.targetDate) : null,
        gatingCriteria: parsed.gatingCriteria,
        order: parsed.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    })

    return NextResponse.json({ success: true, data: milestone }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating milestone:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create milestone' },
      { status: 500 }
    )
  }
}

// PATCH /api/companies/[id]/milestones - Update a milestone
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params
    const body = await request.json()
    const parsed = UpdateMilestoneSchema.parse(body)

    const { id: milestoneId, ...updateData } = parsed

    const milestone = await prisma.companyMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(updateData.title !== undefined && { title: updateData.title }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.status !== undefined && { status: updateData.status }),
        ...(updateData.targetDate !== undefined && {
          targetDate: updateData.targetDate ? new Date(updateData.targetDate) : null,
        }),
        ...(updateData.completedAt !== undefined && {
          completedAt: updateData.completedAt ? new Date(updateData.completedAt) : null,
        }),
        ...(updateData.gatingCriteria !== undefined && { gatingCriteria: updateData.gatingCriteria }),
        ...(updateData.order !== undefined && { order: updateData.order }),
      },
    })

    return NextResponse.json({ success: true, data: milestone })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error updating milestone:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update milestone' },
      { status: 500 }
    )
  }
}

// DELETE /api/companies/[id]/milestones
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('milestoneId')

    if (!milestoneId) {
      return NextResponse.json(
        { success: false, error: 'milestoneId is required' },
        { status: 400 }
      )
    }

    await prisma.companyMilestone.delete({
      where: { id: milestoneId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting milestone:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete milestone' },
      { status: 500 }
    )
  }
}
