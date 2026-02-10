import { NextRequest, NextResponse } from 'next/server'
import { Channel } from '@prisma/client'
import { prisma } from '@/lib/db'
import { validateId, validateBody, UpdateDigitalEmployeeSchema } from '@/lib/validation'

// GET /api/digital-employees/[id] - Get a single digital employee with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    const digitalEmployee = await prisma.digitalEmployee.findUnique({
      where: { id },
      include: {
        company: true,
        designWeek: {
          include: {
            sessions: {
              include: {
                materials: true,
                extractions: true,
                extractedItems: true,
              },
              orderBy: { date: 'desc' },
            },
            scopeItems: {
              include: {
                evidence: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            scenarios: {
              include: {
                steps: { orderBy: { order: 'asc' } },
                edgeCases: true,
                evidence: true,
              },
            },
            kpis: {
              include: {
                evidence: true,
              },
            },
            integrations: {
              include: {
                evidence: true,
              },
            },
            escalationRules: {
              include: {
                evidence: true,
              },
            },
            artifacts: {
              include: {
                sections: { orderBy: { order: 'asc' } },
              },
            },
            signOffs: true,
            uploadJobs: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                filename: true,
                mimeType: true,
                fileUrl: true,
                fileSize: true,
                status: true,
                currentStage: true,
                classificationResult: true,
                populationResult: true,
                error: true,
                createdAt: true,
                completedAt: true,
              },
            },
          },
        },
      },
    })

    if (!digitalEmployee) {
      return NextResponse.json(
        { success: false, error: 'Digital employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: digitalEmployee })
  } catch (error) {
    console.error('Error fetching digital employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch digital employee' },
      { status: 500 }
    )
  }
}

// PATCH /api/digital-employees/[id] - Update a digital employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    const validation = await validateBody(request, UpdateDigitalEmployeeSchema)
    if (!validation.success) return validation.response
    const { name, description, channels, status, goLiveDate } = validation.data

    const digitalEmployee = await prisma.digitalEmployee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(channels && { channels: channels as Channel[] }),
        ...(status && { status }),
        ...(goLiveDate !== undefined && { goLiveDate: goLiveDate ? new Date(goLiveDate) : null }),
      },
      include: {
        company: true,
        designWeek: true,
      },
    })

    return NextResponse.json({ success: true, data: digitalEmployee })
  } catch (error) {
    console.error('Error updating digital employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update digital employee' },
      { status: 500 }
    )
  }
}

// DELETE /api/digital-employees/[id] - Delete a digital employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    await prisma.digitalEmployee.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting digital employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete digital employee' },
      { status: 500 }
    )
  }
}
