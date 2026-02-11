import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET, PATCH } from '@/app/api/observatory/feedback/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('POST /api/observatory/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates feedback with valid data', async () => {
    mockedPrisma.observatoryFeedback.create.mockResolvedValue({
      id: 'fb-1',
      type: 'PRAISE',
      content: 'Great extraction feature',
      featureId: 'extraction-pipeline',
      userId: 'user-1',
      npsScore: 9,
      status: 'NEW',
      createdAt: new Date(),
    } as never)

    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'PRAISE',
        content: 'Great extraction feature',
        featureId: 'extraction-pipeline',
        userId: 'user-1',
        npsScore: 9,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe('fb-1')
    expect(mockedPrisma.observatoryFeedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'PRAISE',
        content: 'Great extraction feature',
        featureId: 'extraction-pipeline',
        userId: 'user-1',
        npsScore: 9,
        status: 'NEW',
      }),
    })
  })

  it('creates feedback with minimal data (content only)', async () => {
    mockedPrisma.observatoryFeedback.create.mockResolvedValue({
      id: 'fb-2',
      type: 'GENERAL',
      content: 'Nice tool',
      featureId: null,
      userId: null,
      npsScore: null,
      status: 'NEW',
      createdAt: new Date(),
    } as never)

    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Nice tool',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryFeedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'GENERAL',
        content: 'Nice tool',
        featureId: null,
        userId: null,
        npsScore: null,
        status: 'NEW',
      }),
    })
  })

  it('defaults to GENERAL type for invalid feedback type', async () => {
    mockedPrisma.observatoryFeedback.create.mockResolvedValue({
      id: 'fb-3',
      type: 'GENERAL',
      content: 'Some feedback',
    } as never)

    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'INVALID_TYPE',
        content: 'Some feedback',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryFeedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'GENERAL',
      }),
    })
  })

  it('ignores invalid NPS score (out of range)', async () => {
    mockedPrisma.observatoryFeedback.create.mockResolvedValue({
      id: 'fb-4',
      type: 'GENERAL',
      content: 'Feedback with bad NPS',
      npsScore: null,
    } as never)

    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Feedback with bad NPS',
        npsScore: 15, // invalid, out of 0-10 range
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryFeedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        npsScore: null,
      }),
    })
  })

  it('returns 400 when content is missing', async () => {
    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'PRAISE',
        // missing content
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Feedback content is required')
    expect(mockedPrisma.observatoryFeedback.create).not.toHaveBeenCalled()
  })

  it('returns 400 when content is empty string', async () => {
    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '   ',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Feedback content is required')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.observatoryFeedback.create.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Valid feedback',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to submit feedback')
  })
})

describe('GET /api/observatory/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns feedback list without filters', async () => {
    const mockFeedback = [
      {
        id: 'fb-1',
        type: 'PRAISE',
        content: 'Great tool',
        featureId: 'dashboard',
        userId: null,
        npsScore: 9,
        status: 'NEW',
        createdAt: new Date(),
      },
      {
        id: 'fb-2',
        type: 'BUG',
        content: 'Button broken',
        featureId: 'extraction-pipeline',
        userId: 'user-1',
        npsScore: null,
        status: 'REVIEWED',
        createdAt: new Date(),
      },
    ]

    mockedPrisma.observatoryFeedback.findMany.mockResolvedValue(mockFeedback as never)

    const request = new Request('http://localhost/api/observatory/feedback')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
  })

  it('filters feedback by status', async () => {
    mockedPrisma.observatoryFeedback.findMany.mockResolvedValue([] as never)

    const request = new Request('http://localhost/api/observatory/feedback?status=NEW')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'NEW' }),
      })
    )
  })

  it('filters feedback by type', async () => {
    mockedPrisma.observatoryFeedback.findMany.mockResolvedValue([] as never)

    const request = new Request('http://localhost/api/observatory/feedback?type=BUG')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'BUG' }),
      })
    )
  })

  it('caps limit at 100', async () => {
    mockedPrisma.observatoryFeedback.findMany.mockResolvedValue([] as never)

    const request = new Request('http://localhost/api/observatory/feedback?limit=500')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockedPrisma.observatoryFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    )
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.observatoryFeedback.findMany.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost/api/observatory/feedback')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to fetch feedback')
  })
})

describe('PATCH /api/observatory/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates feedback status', async () => {
    mockedPrisma.observatoryFeedback.update.mockResolvedValue({} as never)

    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'fb-1',
        status: 'REVIEWED',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryFeedback.update).toHaveBeenCalledWith({
      where: { id: 'fb-1' },
      data: { status: 'REVIEWED' },
    })
  })

  it('returns 400 when feedback ID is missing', async () => {
    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'REVIEWED',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Feedback ID is required')
  })

  it('returns 400 for invalid status', async () => {
    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'fb-1',
        status: 'INVALID_STATUS',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid status')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.observatoryFeedback.update.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost/api/observatory/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'fb-1',
        status: 'ACTIONED',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to update feedback')
  })
})
