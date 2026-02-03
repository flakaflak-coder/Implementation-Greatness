import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim() || ''

    if (query.length < 1) {
      return NextResponse.json({
        success: true,
        companies: [],
        digitalEmployees: [],
      })
    }

    // Search companies
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { industry: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        industry: true,
      },
      take: 5,
      orderBy: { name: 'asc' },
    })

    // Search digital employees
    const digitalEmployees = await prisma.digitalEmployee.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { company: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        name: true,
        companyId: true,
        company: {
          select: {
            name: true,
          },
        },
      },
      take: 5,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      companies,
      digitalEmployees: digitalEmployees.map((de) => ({
        id: de.id,
        name: de.name,
        companyId: de.companyId,
        companyName: de.company.name,
      })),
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search' },
      { status: 500 }
    )
  }
}
