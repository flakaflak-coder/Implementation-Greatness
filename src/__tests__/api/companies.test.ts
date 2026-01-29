import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/companies/route'
import { mockPrisma } from '../setup'

// Use the exported mock from setup
const mockedPrisma = mockPrisma

describe('GET /api/companies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list of companies with digital employees', async () => {
    const mockCompanies = [
      {
        id: 'company-1',
        name: 'Acme Insurance',
        industry: 'Insurance',
        contactName: 'John Doe',
        contactEmail: 'john@acme.com',
        contactPhone: null,
        createdAt: new Date('2026-01-27T10:00:00Z'),
        updatedAt: new Date('2026-01-27T10:00:00Z'),
        digitalEmployees: [
          {
            id: 'de-1',
            name: 'Claims Agent',
            designWeek: { id: 'dw-1', status: 'IN_PROGRESS', currentPhase: 2 },
          },
        ],
      },
    ]

    mockedPrisma.company.findMany.mockResolvedValue(mockCompanies as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    expect(data.data[0].id).toBe('company-1')
    expect(data.data[0].name).toBe('Acme Insurance')
    expect(data.data[0].digitalEmployees).toHaveLength(1)
    expect(mockedPrisma.company.findMany).toHaveBeenCalledOnce()
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.company.findMany.mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to fetch companies')
  })
})

describe('POST /api/companies', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a company with valid data', async () => {
    const newCompany = {
      id: 'new-company',
      name: 'New Corp',
      industry: 'Technology',
      contactName: 'Jane Doe',
      contactEmail: 'jane@newcorp.com',
      contactPhone: '+31612345678',
      createdAt: new Date(),
      updatedAt: new Date(),
      digitalEmployees: [],
    }

    mockedPrisma.company.create.mockResolvedValue(newCompany as never)

    const request = new NextRequest('http://localhost/api/companies', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Corp',
        industry: 'Technology',
        contactName: 'Jane Doe',
        contactEmail: 'jane@newcorp.com',
        contactPhone: '+31612345678',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('New Corp')
    expect(mockedPrisma.company.create).toHaveBeenCalledOnce()
  })

  it('returns 400 when name is missing', async () => {
    const request = new NextRequest('http://localhost/api/companies', {
      method: 'POST',
      body: JSON.stringify({
        industry: 'Technology',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Company name is required')
    expect(mockedPrisma.company.create).not.toHaveBeenCalled()
  })

  it('creates a company with only name (optional fields)', async () => {
    const newCompany = {
      id: 'minimal-company',
      name: 'Minimal Corp',
      industry: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      digitalEmployees: [],
    }

    mockedPrisma.company.create.mockResolvedValue(newCompany as never)

    const request = new NextRequest('http://localhost/api/companies', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Minimal Corp',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(mockedPrisma.company.create).toHaveBeenCalledWith({
      data: {
        name: 'Minimal Corp',
        industry: undefined,
        contactName: undefined,
        contactEmail: undefined,
        contactPhone: undefined,
      },
      include: {
        digitalEmployees: true,
      },
    })
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.company.create.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/companies', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Corp',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to create company')
  })
})
