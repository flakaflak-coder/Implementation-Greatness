import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/digital-employees - List all digital employees (for Support view)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const companyId = searchParams.get('companyId')

    const digitalEmployees = await prisma.digitalEmployee.findMany({
      where: {
        ...(status && { status: status as 'DESIGN' | 'ONBOARDING' | 'LIVE' | 'PAUSED' }),
        ...(companyId && { companyId }),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            industry: true,
          },
        },
        designWeek: {
          select: {
            id: true,
            status: true,
            currentPhase: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, data: digitalEmployees })
  } catch (error) {
    console.error('Error fetching digital employees:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch digital employees' },
      { status: 500 }
    )
  }
}

// POST /api/digital-employees - Create a new digital employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, name, description, channels } = body

    if (!companyId || !name) {
      return NextResponse.json(
        { success: false, error: 'Company ID and name are required' },
        { status: 400 }
      )
    }

    // Create digital employee with a design week
    const digitalEmployee = await prisma.digitalEmployee.create({
      data: {
        companyId,
        name,
        description,
        channels: channels || [],
        designWeek: {
          create: {
            status: 'NOT_STARTED',
            currentPhase: 1,
          },
        },
      },
      include: {
        company: true,
        designWeek: true,
      },
    })

    return NextResponse.json(
      { success: true, data: digitalEmployee },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating digital employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create digital employee' },
      { status: 500 }
    )
  }
}
