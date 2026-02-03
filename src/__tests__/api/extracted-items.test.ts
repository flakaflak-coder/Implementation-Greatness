import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Define mocks inside factories to avoid hoisting issues
vi.mock('@/lib/db', () => ({
  prisma: {
    designWeek: {
      findUnique: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
    extractedItem: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

// Import after mocks
import { POST, GET } from '@/app/api/extracted-items/route'
import { prisma } from '@/lib/db'

describe('POST /api/extracted-items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: Record<string, unknown>): NextRequest => {
    return {
      json: () => Promise.resolve(body),
    } as unknown as NextRequest
  }

  it('returns 400 when required fields are missing', async () => {
    const request = createMockRequest({
      designWeekId: 'dw-123',
      // missing type and content
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('returns 404 when design week not found', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue(null)

    const request = createMockRequest({
      designWeekId: 'nonexistent',
      type: 'GOAL',
      content: 'Test goal',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  it('returns 400 when no sessions exist in design week', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      sessions: [],
    } as any)

    const request = createMockRequest({
      designWeekId: 'dw-123',
      type: 'GOAL',
      content: 'Test goal',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('No sessions found')
  })

  it('creates extracted item successfully', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      sessions: [{ id: 'session-456' }],
    } as any)

    vi.mocked(prisma.extractedItem.create).mockResolvedValue({
      id: 'item-789',
      sessionId: 'session-456',
      type: 'GOAL',
      content: 'Reduce processing time by 50%',
      confidence: 1.0,
      status: 'APPROVED',
    } as any)

    const request = createMockRequest({
      designWeekId: 'dw-123',
      type: 'GOAL',
      content: 'Reduce processing time by 50%',
      notes: 'Priority goal',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.item.type).toBe('GOAL')

    expect(prisma.extractedItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: 'session-456',
        type: 'GOAL',
        content: 'Reduce processing time by 50%',
        confidence: 1.0,
        status: 'APPROVED',
        reviewNotes: 'Priority goal',
      }),
    })
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      sessions: [{ id: 'session-456' }],
    } as any)

    vi.mocked(prisma.extractedItem.create).mockRejectedValue(new Error('Database error'))

    const request = createMockRequest({
      designWeekId: 'dw-123',
      type: 'GOAL',
      content: 'Test',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Failed to create')
  })
})

describe('GET /api/extracted-items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (searchParams: Record<string, string>): NextRequest => {
    const url = new URL('http://localhost/api/extracted-items')
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    return {
      url: url.toString(),
    } as unknown as NextRequest
  }

  it('returns all items when no filters specified', async () => {
    vi.mocked(prisma.extractedItem.findMany).mockResolvedValue([
      { id: 'item-1', type: 'GOAL', content: 'Goal 1' },
      { id: 'item-2', type: 'STAKEHOLDER', content: 'Stakeholder 1' },
    ] as any)

    const request = createMockRequest({})

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.items).toHaveLength(2)
  })

  it('filters by sessionId', async () => {
    vi.mocked(prisma.extractedItem.findMany).mockResolvedValue([
      { id: 'item-1', sessionId: 'session-123', type: 'GOAL', content: 'Goal 1' },
    ] as any)

    const request = createMockRequest({ sessionId: 'session-123' })

    await GET(request)

    expect(prisma.extractedItem.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        sessionId: 'session-123',
      }),
      include: expect.anything(),
      orderBy: expect.anything(),
    })
  })

  it('filters by designWeekId via session lookup', async () => {
    vi.mocked(prisma.session.findMany).mockResolvedValue([
      { id: 'session-1' },
      { id: 'session-2' },
    ] as any)

    vi.mocked(prisma.extractedItem.findMany).mockResolvedValue([])

    const request = createMockRequest({ designWeekId: 'dw-123' })

    await GET(request)

    expect(prisma.session.findMany).toHaveBeenCalledWith({
      where: { designWeekId: 'dw-123' },
      select: { id: true },
    })

    expect(prisma.extractedItem.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        sessionId: { in: ['session-1', 'session-2'] },
      }),
      include: expect.anything(),
      orderBy: expect.anything(),
    })
  })

  it('filters by type', async () => {
    vi.mocked(prisma.extractedItem.findMany).mockResolvedValue([])

    const request = createMockRequest({ type: 'GOAL' })

    await GET(request)

    expect(prisma.extractedItem.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        type: 'GOAL',
      }),
      include: expect.anything(),
      orderBy: expect.anything(),
    })
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.extractedItem.findMany).mockRejectedValue(new Error('Database error'))

    const request = createMockRequest({})

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Failed to fetch')
  })
})
