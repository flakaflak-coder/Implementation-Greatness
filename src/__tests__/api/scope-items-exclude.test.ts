import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Define mocks inside factories
vi.mock('@/lib/db', () => ({
  prisma: {
    scopeItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Import after mocks
import { PATCH } from '@/app/api/scope-items/[id]/exclude/route'
import { prisma } from '@/lib/db'

describe('PATCH /api/scope-items/[id]/exclude', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when excludeFromDocument is missing', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/si-123/exclude', {
      method: 'PATCH',
      body: JSON.stringify({}),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid input')
  })

  it('returns 400 when excludeFromDocument is not a boolean', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/si-123/exclude', {
      method: 'PATCH',
      body: JSON.stringify({ excludeFromDocument: 'yes' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid input')
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/invalid id!/exclude', {
      method: 'PATCH',
      body: JSON.stringify({ excludeFromDocument: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 400 for invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/si-123/exclude', {
      method: 'PATCH',
      body: 'not json',
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid JSON body')
  })

  it('returns 404 when scope item not found', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/scope-items/si-nonexistent/exclude', {
      method: 'PATCH',
      body: JSON.stringify({ excludeFromDocument: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'si-nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Scope item not found')
  })

  it('successfully excludes a scope item from document', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue({
      id: 'si-123',
      excludeFromDocument: false,
    } as never)

    vi.mocked(prisma.scopeItem.update).mockResolvedValue({
      id: 'si-123',
      excludeFromDocument: true,
      evidence: [],
    } as never)

    const request = new NextRequest('http://localhost/api/scope-items/si-123/exclude', {
      method: 'PATCH',
      body: JSON.stringify({ excludeFromDocument: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.excludeFromDocument).toBe(true)

    expect(prisma.scopeItem.update).toHaveBeenCalledWith({
      where: { id: 'si-123' },
      data: { excludeFromDocument: true },
      include: { evidence: true },
    })
  })

  it('successfully includes a previously excluded scope item', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue({
      id: 'si-123',
      excludeFromDocument: true,
    } as never)

    vi.mocked(prisma.scopeItem.update).mockResolvedValue({
      id: 'si-123',
      excludeFromDocument: false,
      evidence: [],
    } as never)

    const request = new NextRequest('http://localhost/api/scope-items/si-123/exclude', {
      method: 'PATCH',
      body: JSON.stringify({ excludeFromDocument: false }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.excludeFromDocument).toBe(false)
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/scope-items/si-123/exclude', {
      method: 'PATCH',
      body: JSON.stringify({ excludeFromDocument: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to update scope item')
  })
})
