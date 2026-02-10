import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId, validateBody, UpdateCompanySchema } from '@/lib/validation'

// GET /api/companies/[id] - Get a single company with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        digitalEmployees: {
          include: {
            designWeek: {
              include: {
                sessions: {
                  orderBy: { date: 'desc' },
                  take: 1,
                },
                scopeItems: {
                  where: { classification: 'AMBIGUOUS' },
                },
              },
            },
            journeyPhases: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        milestones: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company' },
      { status: 500 }
    )
  }
}

// PATCH /api/companies/[id] - Update a company
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    const validation = await validateBody(request, UpdateCompanySchema)
    if (!validation.success) return validation.response
    const {
      name, industry, contactName, contactEmail, contactPhone, logoUrl,
      vision, journeyStartDate, journeyTargetDate,
    } = validation.data

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(industry !== undefined && { industry }),
        ...(contactName !== undefined && { contactName }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(vision !== undefined && { vision }),
        ...(journeyStartDate !== undefined && { journeyStartDate: journeyStartDate ? new Date(journeyStartDate) : null }),
        ...(journeyTargetDate !== undefined && { journeyTargetDate: journeyTargetDate ? new Date(journeyTargetDate) : null }),
      },
      include: {
        digitalEmployees: true,
      },
    })

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    console.error('Error updating company:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update company' },
      { status: 500 }
    )
  }
}

// DELETE /api/companies/[id] - Delete a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    await prisma.company.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete company' },
      { status: 500 }
    )
  }
}
