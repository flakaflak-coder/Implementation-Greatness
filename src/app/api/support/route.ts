import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/support - Get support dashboard data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    // Get all digital employees with company info and scope counts
    const digitalEmployees = await prisma.digitalEmployee.findMany({
      include: {
        company: {
          select: { id: true, name: true },
        },
        designWeek: {
          include: {
            scopeItems: {
              select: { classification: true },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { name: 'asc' },
      ],
    })

    // Format digital employees with scope summaries
    const formattedDigitalEmployees = digitalEmployees.map(de => {
      const scopeItems = de.designWeek?.scopeItems || []
      const inScope = scopeItems.filter(s => s.classification === 'IN_SCOPE').length
      const outOfScope = scopeItems.filter(s => s.classification === 'OUT_OF_SCOPE').length
      const ambiguous = scopeItems.filter(s => s.classification === 'AMBIGUOUS').length

      return {
        id: de.id,
        name: de.name,
        status: de.status,
        company: de.company,
        channels: de.channels,
        goLiveDate: de.goLiveDate,
        scopeSummary: {
          inScope,
          outOfScope,
          ambiguous,
        },
      }
    })

    // Get scope items for search functionality
    let scopeItems = await prisma.scopeItem.findMany({
      include: {
        designWeek: {
          include: {
            digitalEmployee: {
              include: {
                company: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Filter scope items by search if provided
    if (search) {
      const searchLower = search.toLowerCase()
      scopeItems = scopeItems.filter(item =>
        item.statement.toLowerCase().includes(searchLower) ||
        item.designWeek.digitalEmployee.name.toLowerCase().includes(searchLower) ||
        item.designWeek.digitalEmployee.company.name.toLowerCase().includes(searchLower)
      )
    }

    // Format scope items for response
    const formattedScopeItems = scopeItems.map(item => ({
      id: item.id,
      digitalEmployeeId: item.designWeek.digitalEmployee.id,
      digitalEmployeeName: item.designWeek.digitalEmployee.name,
      companyName: item.designWeek.digitalEmployee.company.name,
      statement: item.statement,
      classification: item.classification,
      skill: item.skill,
      conditions: item.conditions,
      notes: item.notes,
    }))

    return NextResponse.json({
      success: true,
      data: {
        digitalEmployees: formattedDigitalEmployees,
        scopeItems: formattedScopeItems,
      },
    })
  } catch (error) {
    console.error('Error fetching support data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch support data' },
      { status: 500 }
    )
  }
}
