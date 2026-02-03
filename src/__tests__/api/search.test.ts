import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock database
vi.mock('@/lib/db', () => ({
  prisma: {
    company: {
      findMany: vi.fn(),
    },
    digitalEmployee: {
      findMany: vi.fn(),
    },
  },
}))

// Import after mocks
import { GET } from '@/app/api/search/route'
import { prisma } from '@/lib/db'

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty results for empty query', async () => {
    const request = new NextRequest('http://localhost/api/search?q=')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.companies).toEqual([])
    expect(data.digitalEmployees).toEqual([])

    // Should not query database for empty search
    expect(prisma.company.findMany).not.toHaveBeenCalled()
    expect(prisma.digitalEmployee.findMany).not.toHaveBeenCalled()
  })

  it('returns empty results for missing query param', async () => {
    const request = new NextRequest('http://localhost/api/search')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.companies).toEqual([])
    expect(data.digitalEmployees).toEqual([])
  })

  it('searches companies by name', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { id: 'c-1', name: 'Acme Insurance', industry: 'Insurance' },
      { id: 'c-2', name: 'Acme Healthcare', industry: 'Healthcare' },
    ] as any)

    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/search?q=Acme')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.companies).toHaveLength(2)
    expect(data.companies[0].name).toBe('Acme Insurance')

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: 'Acme', mode: 'insensitive' } },
          { industry: { contains: 'Acme', mode: 'insensitive' } },
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
  })

  it('searches companies by industry', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { id: 'c-1', name: 'Blue Shield', industry: 'Insurance' },
    ] as any)

    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/search?q=Insurance')

    const response = await GET(request)
    const data = await response.json()

    expect(data.companies).toHaveLength(1)
    expect(data.companies[0].industry).toBe('Insurance')
  })

  it('searches digital employees by name', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([])

    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      {
        id: 'de-1',
        name: 'Claims Bot',
        companyId: 'c-1',
        company: { name: 'Acme Insurance' },
      },
    ] as any)

    const request = new NextRequest('http://localhost/api/search?q=Claims')

    const response = await GET(request)
    const data = await response.json()

    expect(data.digitalEmployees).toHaveLength(1)
    expect(data.digitalEmployees[0].name).toBe('Claims Bot')
    expect(data.digitalEmployees[0].companyName).toBe('Acme Insurance')
  })

  it('searches digital employees by description', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([])

    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      {
        id: 'de-1',
        name: 'Support Agent',
        companyId: 'c-1',
        company: { name: 'Tech Corp' },
      },
    ] as any)

    const request = new NextRequest('http://localhost/api/search?q=support')

    const response = await GET(request)
    const data = await response.json()

    expect(data.digitalEmployees).toHaveLength(1)
    expect(prisma.digitalEmployee.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: 'support', mode: 'insensitive' } },
          { description: { contains: 'support', mode: 'insensitive' } },
          { company: { name: { contains: 'support', mode: 'insensitive' } } },
        ],
      },
      select: expect.any(Object),
      take: 5,
      orderBy: { name: 'asc' },
    })
  })

  it('returns both companies and digital employees', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { id: 'c-1', name: 'Acme Corp', industry: 'Tech' },
    ] as any)

    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      {
        id: 'de-1',
        name: 'Acme Bot',
        companyId: 'c-1',
        company: { name: 'Acme Corp' },
      },
    ] as any)

    const request = new NextRequest('http://localhost/api/search?q=Acme')

    const response = await GET(request)
    const data = await response.json()

    expect(data.companies).toHaveLength(1)
    expect(data.digitalEmployees).toHaveLength(1)
  })

  it('trims whitespace from query', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([])
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/search?q=  test  ')

    await GET(request)

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: 'test', mode: 'insensitive' } },
          { industry: { contains: 'test', mode: 'insensitive' } },
        ],
      },
      select: expect.any(Object),
      take: 5,
      orderBy: { name: 'asc' },
    })
  })

  it('limits results to 5 each', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([])
    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/search?q=test')

    await GET(request)

    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    )
    expect(prisma.digitalEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    )
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.company.findMany).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/search?q=test')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to search')
  })

  it('formats digital employee response correctly', async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([])

    vi.mocked(prisma.digitalEmployee.findMany).mockResolvedValue([
      {
        id: 'de-123',
        name: 'Test Bot',
        companyId: 'c-456',
        company: { name: 'Test Company' },
      },
    ] as any)

    const request = new NextRequest('http://localhost/api/search?q=test')

    const response = await GET(request)
    const data = await response.json()

    expect(data.digitalEmployees[0]).toEqual({
      id: 'de-123',
      name: 'Test Bot',
      companyId: 'c-456',
      companyName: 'Test Company',
    })
  })
})
