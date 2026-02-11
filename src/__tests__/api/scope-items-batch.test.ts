import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Define mocks inside factories
vi.mock('@/lib/db', () => ({
  prisma: {
    scopeItem: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/observatory/tracking', () => ({
  trackErrorServer: vi.fn().mockResolvedValue(undefined),
}))

// Import after mocks
import { POST } from '@/app/api/scope-items/batch-resolve/route'
import { prisma } from '@/lib/db'

describe('POST /api/scope-items/batch-resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when ids array is empty', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/batch-resolve', {
      method: 'POST',
      body: JSON.stringify({ ids: [], classification: 'IN_SCOPE' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('returns 400 when classification is missing', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/batch-resolve', {
      method: 'POST',
      body: JSON.stringify({ ids: ['si-1'] }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('returns 400 when classification is invalid', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/batch-resolve', {
      method: 'POST',
      body: JSON.stringify({ ids: ['si-1'], classification: 'INVALID' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
  })

  it('returns 400 for invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/batch-resolve', {
      method: 'POST',
      body: 'not json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON body')
  })

  it('returns 404 when some scope items are not found', async () => {
    vi.mocked(prisma.scopeItem.findMany).mockResolvedValue([
      { id: 'si-1', classification: 'AMBIGUOUS', notes: null },
    ] as never)

    const request = new NextRequest('http://localhost/api/scope-items/batch-resolve', {
      method: 'POST',
      body: JSON.stringify({
        ids: ['si-1', 'si-missing'],
        classification: 'IN_SCOPE',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Some scope items were not found')
    expect(data.details.missingIds).toContain('si-missing')
  })

  it('returns 400 when some scope items are not ambiguous', async () => {
    vi.mocked(prisma.scopeItem.findMany).mockResolvedValue([
      { id: 'si-1', classification: 'AMBIGUOUS', notes: null },
      { id: 'si-2', classification: 'IN_SCOPE', notes: null },
    ] as never)

    const request = new NextRequest('http://localhost/api/scope-items/batch-resolve', {
      method: 'POST',
      body: JSON.stringify({
        ids: ['si-1', 'si-2'],
        classification: 'OUT_OF_SCOPE',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Some scope items are not ambiguous')
    expect(data.details.nonAmbiguousIds).toContain('si-2')
  })

  it('successfully batch resolves ambiguous items to IN_SCOPE', async () => {
    vi.mocked(prisma.scopeItem.findMany).mockResolvedValue([
      { id: 'si-1', classification: 'AMBIGUOUS', notes: 'Note 1' },
      { id: 'si-2', classification: 'AMBIGUOUS', notes: null },
    ] as never)

    vi.mocked(prisma.$transaction).mockResolvedValue([
      { id: 'si-1', classification: 'IN_SCOPE', status: 'CONFIRMED' },
      { id: 'si-2', classification: 'IN_SCOPE', status: 'CONFIRMED' },
    ] as never)

    const request = new NextRequest('http://localhost/api/scope-items/batch-resolve', {
      method: 'POST',
      body: JSON.stringify({
        ids: ['si-1', 'si-2'],
        classification: 'IN_SCOPE',
        notes: 'Batch approved',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.count).toBe(2)
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('successfully batch resolves items to OUT_OF_SCOPE without notes', async () => {
    vi.mocked(prisma.scopeItem.findMany).mockResolvedValue([
      { id: 'si-1', classification: 'AMBIGUOUS', notes: 'Existing note' },
    ] as never)

    vi.mocked(prisma.$transaction).mockResolvedValue([
      { id: 'si-1', classification: 'OUT_OF_SCOPE', status: 'CONFIRMED' },
    ] as never)

    const request = new NextRequest('http://localhost/api/scope-items/batch-resolve', {
      method: 'POST',
      body: JSON.stringify({
        ids: ['si-1'],
        classification: 'OUT_OF_SCOPE',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.count).toBe(1)
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.scopeItem.findMany).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/scope-items/batch-resolve', {
      method: 'POST',
      body: JSON.stringify({
        ids: ['si-1'],
        classification: 'IN_SCOPE',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })
})
