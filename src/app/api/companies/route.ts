import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/companies - List all companies with their digital employees
export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      include: {
        digitalEmployees: {
          include: {
            designWeek: {
              select: {
                id: true,
                status: true,
                currentPhase: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, data: companies })
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}

// POST /api/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, industry } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Company name is required' },
        { status: 400 }
      )
    }

    const company = await prisma.company.create({
      data: {
        name,
        industry,
      },
      include: {
        digitalEmployees: true,
      },
    })

    return NextResponse.json({ success: true, data: company }, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create company' },
      { status: 500 }
    )
  }
}
