import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/design-weeks/[id]/prerequisites/route'
import { PATCH, DELETE } from '@/app/api/design-weeks/[id]/prerequisites/[prereqId]/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('GET /api/design-weeks/[id]/prerequisites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns prerequisites for a valid design week', async () => {
    const mockPrerequisites = [
      {
        id: 'prereq-1',
        designWeekId: 'dw-1',
        title: 'CRM API Key',
        description: 'Need API key for CRM integration',
        category: 'API_CREDENTIALS',
        ownerType: 'CLIENT',
        ownerName: 'John Doe',
        ownerEmail: 'john@example.com',
        status: 'PENDING',
        priority: 'HIGH',
        dueDate: null,
        requestedAt: null,
        receivedAt: null,
        blocksPhase: null,
        integrationId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        integration: null,
      },
      {
        id: 'prereq-2',
        designWeekId: 'dw-1',
        title: 'Test Environment Access',
        description: null,
        category: 'SYSTEM_ACCESS',
        ownerType: 'FREEDAY',
        ownerName: null,
        ownerEmail: null,
        status: 'RECEIVED',
        priority: 'MEDIUM',
        dueDate: null,
        requestedAt: null,
        receivedAt: new Date(),
        blocksPhase: null,
        integrationId: 'int-1',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        integration: { id: 'int-1', systemName: 'Test CRM' },
      },
    ]

    mockedPrisma.prerequisite.findMany.mockResolvedValue(mockPrerequisites as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/prerequisites')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.prerequisites).toHaveLength(2)
    expect(data.prerequisites[0].id).toBe('prereq-1')
    expect(data.prerequisites[1].integration.systemName).toBe('Test CRM')
    expect(mockedPrisma.prerequisite.findMany).toHaveBeenCalledOnce()
  })

  it('returns empty array when no prerequisites exist', async () => {
    mockedPrisma.prerequisite.findMany.mockResolvedValue([] as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/prerequisites')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.prerequisites).toHaveLength(0)
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/invalid id!/prerequisites')
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
    expect(mockedPrisma.prerequisite.findMany).not.toHaveBeenCalled()
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.prerequisite.findMany.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/prerequisites')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch prerequisites')
  })
})

describe('POST /api/design-weeks/[id]/prerequisites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a prerequisite with valid data', async () => {
    const mockPrerequisite = {
      id: 'prereq-new',
      designWeekId: 'dw-1',
      title: 'VPN Access',
      description: 'Need VPN access to client network',
      category: 'SYSTEM_ACCESS',
      ownerType: 'CLIENT',
      ownerName: 'Jane Smith',
      ownerEmail: 'jane@example.com',
      status: 'PENDING',
      priority: 'HIGH',
      dueDate: null,
      requestedAt: null,
      receivedAt: null,
      blocksPhase: null,
      integrationId: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      integration: null,
    }

    mockedPrisma.prerequisite.create.mockResolvedValue(mockPrerequisite as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/prerequisites', {
      method: 'POST',
      body: JSON.stringify({
        title: 'VPN Access',
        description: 'Need VPN access to client network',
        category: 'SYSTEM_ACCESS',
        ownerType: 'CLIENT',
        ownerName: 'Jane Smith',
        ownerEmail: 'jane@example.com',
        priority: 'HIGH',
      }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.prerequisite.id).toBe('prereq-new')
    expect(data.prerequisite.title).toBe('VPN Access')
    expect(mockedPrisma.prerequisite.create).toHaveBeenCalledOnce()

    const createCall = mockedPrisma.prerequisite.create.mock.calls[0][0]
    expect(createCall.data.designWeekId).toBe('dw-1')
    expect(createCall.data.status).toBe('PENDING')
    expect(createCall.data.priority).toBe('HIGH')
  })

  it('creates a prerequisite with minimal required fields', async () => {
    const mockPrerequisite = {
      id: 'prereq-min',
      designWeekId: 'dw-1',
      title: 'Some Item',
      category: 'DOCUMENTATION',
      ownerType: 'CLIENT',
      status: 'PENDING',
      priority: 'MEDIUM',
      integration: null,
    }

    mockedPrisma.prerequisite.create.mockResolvedValue(mockPrerequisite as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/prerequisites', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Some Item',
        category: 'DOCUMENTATION',
        ownerType: 'CLIENT',
      }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.prerequisite.title).toBe('Some Item')

    const createCall = mockedPrisma.prerequisite.create.mock.calls[0][0]
    expect(createCall.data.priority).toBe('MEDIUM') // default
  })

  it('returns 400 when title is missing', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/prerequisites', {
      method: 'POST',
      body: JSON.stringify({
        category: 'SYSTEM_ACCESS',
        ownerType: 'CLIENT',
      }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(mockedPrisma.prerequisite.create).not.toHaveBeenCalled()
  })

  it('returns 400 when category is invalid', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/prerequisites', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Some Item',
        category: 'INVALID_CATEGORY',
        ownerType: 'CLIENT',
      }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/invalid id!/prerequisites', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Some Item',
        category: 'SYSTEM_ACCESS',
        ownerType: 'CLIENT',
      }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.prerequisite.create.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/prerequisites', {
      method: 'POST',
      body: JSON.stringify({
        title: 'VPN Access',
        category: 'SYSTEM_ACCESS',
        ownerType: 'CLIENT',
      }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create prerequisite')
  })
})

describe('PATCH /api/design-weeks/[id]/prerequisites/[prereqId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates a prerequisite status to REQUESTED', async () => {
    const mockUpdated = {
      id: 'prereq-1',
      designWeekId: 'dw-1',
      title: 'CRM API Key',
      status: 'REQUESTED',
      requestedAt: new Date(),
      integration: null,
    }

    mockedPrisma.prerequisite.update.mockResolvedValue(mockUpdated as never)

    const request = new NextRequest(
      'http://localhost/api/design-weeks/dw-1/prerequisites/prereq-1',
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'REQUESTED' }),
      }
    )

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'dw-1', prereqId: 'prereq-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.prerequisite.status).toBe('REQUESTED')

    const updateCall = mockedPrisma.prerequisite.update.mock.calls[0][0]
    expect(updateCall.where.id).toBe('prereq-1')
    expect(updateCall.where.designWeekId).toBe('dw-1')
    expect(updateCall.data.status).toBe('REQUESTED')
    expect(updateCall.data.requestedAt).toBeDefined()
  })

  it('updates a prerequisite status to RECEIVED', async () => {
    const mockUpdated = {
      id: 'prereq-1',
      status: 'RECEIVED',
      receivedAt: new Date(),
      integration: null,
    }

    mockedPrisma.prerequisite.update.mockResolvedValue(mockUpdated as never)

    const request = new NextRequest(
      'http://localhost/api/design-weeks/dw-1/prerequisites/prereq-1',
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RECEIVED' }),
      }
    )

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'dw-1', prereqId: 'prereq-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)

    const updateCall = mockedPrisma.prerequisite.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('RECEIVED')
    expect(updateCall.data.receivedAt).toBeDefined()
  })

  it('updates multiple fields at once', async () => {
    const mockUpdated = {
      id: 'prereq-1',
      title: 'Updated Title',
      priority: 'HIGH',
      ownerName: 'New Owner',
      integration: null,
    }

    mockedPrisma.prerequisite.update.mockResolvedValue(mockUpdated as never)

    const request = new NextRequest(
      'http://localhost/api/design-weeks/dw-1/prerequisites/prereq-1',
      {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Title',
          priority: 'HIGH',
          ownerName: 'New Owner',
        }),
      }
    )

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'dw-1', prereqId: 'prereq-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)

    const updateCall = mockedPrisma.prerequisite.update.mock.calls[0][0]
    expect(updateCall.data.title).toBe('Updated Title')
    expect(updateCall.data.priority).toBe('HIGH')
    expect(updateCall.data.ownerName).toBe('New Owner')
  })

  it('returns 400 for invalid design week ID', async () => {
    const request = new NextRequest(
      'http://localhost/api/design-weeks/invalid id!/prerequisites/prereq-1',
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RECEIVED' }),
      }
    )

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'invalid id!', prereqId: 'prereq-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 400 for invalid prereq ID', async () => {
    const request = new NextRequest(
      'http://localhost/api/design-weeks/dw-1/prerequisites/bad id!',
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RECEIVED' }),
      }
    )

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'dw-1', prereqId: 'bad id!' }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.prerequisite.update.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest(
      'http://localhost/api/design-weeks/dw-1/prerequisites/prereq-1',
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'RECEIVED' }),
      }
    )

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'dw-1', prereqId: 'prereq-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update prerequisite')
  })
})

describe('DELETE /api/design-weeks/[id]/prerequisites/[prereqId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes a prerequisite successfully', async () => {
    mockedPrisma.prerequisite.delete.mockResolvedValue({} as never)

    const request = new NextRequest(
      'http://localhost/api/design-weeks/dw-1/prerequisites/prereq-1',
      { method: 'DELETE' }
    )

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'dw-1', prereqId: 'prereq-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    const deleteCall = mockedPrisma.prerequisite.delete.mock.calls[0][0]
    expect(deleteCall.where.id).toBe('prereq-1')
    expect(deleteCall.where.designWeekId).toBe('dw-1')
  })

  it('returns 400 for invalid design week ID', async () => {
    const request = new NextRequest(
      'http://localhost/api/design-weeks/invalid id!/prerequisites/prereq-1',
      { method: 'DELETE' }
    )

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'invalid id!', prereqId: 'prereq-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
    expect(mockedPrisma.prerequisite.delete).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid prereq ID', async () => {
    const request = new NextRequest(
      'http://localhost/api/design-weeks/dw-1/prerequisites/bad id!',
      { method: 'DELETE' }
    )

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'dw-1', prereqId: 'bad id!' }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.prerequisite.delete.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest(
      'http://localhost/api/design-weeks/dw-1/prerequisites/prereq-1',
      { method: 'DELETE' }
    )

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'dw-1', prereqId: 'prereq-1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to delete prerequisite')
  })
})
