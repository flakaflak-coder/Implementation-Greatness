import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/digital-employees/route'
import { mockPrisma } from '../setup'

// Use the exported mock from setup
const mockedPrisma = mockPrisma

describe('GET /api/digital-employees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list of digital employees', async () => {
    const mockDigitalEmployees = [
      {
        id: 'de-1',
        companyId: 'company-1',
        name: 'Claims Agent',
        description: 'Handles insurance claims',
        status: 'DESIGN',
        channels: ['email', 'chat'],
        createdAt: new Date('2026-01-27T10:00:00Z'),
        updatedAt: new Date('2026-01-27T10:00:00Z'),
        company: {
          id: 'company-1',
          name: 'Acme Insurance',
          industry: 'Insurance',
        },
        designWeek: {
          id: 'dw-1',
          status: 'IN_PROGRESS',
          currentPhase: 2,
        },
      },
    ]

    mockedPrisma.digitalEmployee.findMany.mockResolvedValue(mockDigitalEmployees as never)

    const request = new NextRequest('http://localhost/api/digital-employees')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    expect(data.data[0].id).toBe('de-1')
    expect(data.data[0].name).toBe('Claims Agent')
    expect(mockedPrisma.digitalEmployee.findMany).toHaveBeenCalledOnce()
  })

  it('filters by status when provided', async () => {
    mockedPrisma.digitalEmployee.findMany.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/digital-employees?status=LIVE')
    await GET(request)

    expect(mockedPrisma.digitalEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'LIVE',
        }),
      })
    )
  })

  it('filters by companyId when provided', async () => {
    mockedPrisma.digitalEmployee.findMany.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/digital-employees?companyId=company-1')
    await GET(request)

    expect(mockedPrisma.digitalEmployee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
        }),
      })
    )
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.digitalEmployee.findMany.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/digital-employees')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to fetch digital employees')
  })
})

describe('POST /api/digital-employees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a digital employee with valid data', async () => {
    const newDigitalEmployee = {
      id: 'new-de',
      companyId: 'company-1',
      name: 'Support Agent',
      description: 'Customer support assistant',
      status: 'DESIGN',
      channels: ['chat'],
      createdAt: new Date(),
      updatedAt: new Date(),
      company: {
        id: 'company-1',
        name: 'Acme Insurance',
      },
      designWeek: {
        id: 'dw-1',
        status: 'NOT_STARTED',
        currentPhase: 1,
      },
    }

    mockedPrisma.digitalEmployee.create.mockResolvedValue(newDigitalEmployee as never)

    const request = new NextRequest('http://localhost/api/digital-employees', {
      method: 'POST',
      body: JSON.stringify({
        companyId: 'company-1',
        name: 'Support Agent',
        description: 'Customer support assistant',
        channels: ['chat'],
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('Support Agent')
    expect(mockedPrisma.digitalEmployee.create).toHaveBeenCalledOnce()
  })

  it('creates a digital employee with default empty channels', async () => {
    const newDigitalEmployee = {
      id: 'new-de',
      companyId: 'company-1',
      name: 'Basic Agent',
      description: null,
      status: 'DESIGN',
      channels: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      company: { id: 'company-1', name: 'Acme' },
      designWeek: { id: 'dw-1', status: 'NOT_STARTED', currentPhase: 1 },
    }

    mockedPrisma.digitalEmployee.create.mockResolvedValue(newDigitalEmployee as never)

    const request = new NextRequest('http://localhost/api/digital-employees', {
      method: 'POST',
      body: JSON.stringify({
        companyId: 'company-1',
        name: 'Basic Agent',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(mockedPrisma.digitalEmployee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channels: [],
        }),
      })
    )
  })

  it('returns 400 when companyId is missing', async () => {
    const request = new NextRequest('http://localhost/api/digital-employees', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Support Agent',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Company ID and name are required')
    expect(mockedPrisma.digitalEmployee.create).not.toHaveBeenCalled()
  })

  it('returns 400 when name is missing', async () => {
    const request = new NextRequest('http://localhost/api/digital-employees', {
      method: 'POST',
      body: JSON.stringify({
        companyId: 'company-1',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Company ID and name are required')
    expect(mockedPrisma.digitalEmployee.create).not.toHaveBeenCalled()
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.digitalEmployee.create.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/digital-employees', {
      method: 'POST',
      body: JSON.stringify({
        companyId: 'company-1',
        name: 'Support Agent',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to create digital employee')
  })
})
