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
import { POST } from '@/app/api/scope-items/[id]/resolve/route'
import { prisma } from '@/lib/db'

describe('POST /api/scope-items/[id]/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when classification is missing', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/si-123/resolve', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Some notes' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Valid classification is required')
  })

  it('returns 400 when classification is invalid', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/si-123/resolve', {
      method: 'POST',
      body: JSON.stringify({ classification: 'INVALID' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Valid classification is required')
  })

  it('returns 404 when scope item not found', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/scope-items/nonexistent/resolve', {
      method: 'POST',
      body: JSON.stringify({ classification: 'IN_SCOPE' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Scope item not found')
  })

  it('returns 400 when scope item is not ambiguous', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue({
      id: 'si-123',
      classification: 'IN_SCOPE',
      notes: null,
    } as any)

    const request = new NextRequest('http://localhost/api/scope-items/si-123/resolve', {
      method: 'POST',
      body: JSON.stringify({ classification: 'OUT_OF_SCOPE' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('This scope item is not ambiguous')
  })

  it('resolves ambiguous scope item to IN_SCOPE', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue({
      id: 'si-123',
      classification: 'AMBIGUOUS',
      notes: 'Initial notes',
    } as any)

    vi.mocked(prisma.scopeItem.update).mockResolvedValue({
      id: 'si-123',
      classification: 'IN_SCOPE',
      status: 'CONFIRMED',
      notes: 'Initial notes\n\nResolution: Added to scope after client confirmation',
      evidence: [],
    } as any)

    const request = new NextRequest('http://localhost/api/scope-items/si-123/resolve', {
      method: 'POST',
      body: JSON.stringify({
        classification: 'IN_SCOPE',
        notes: 'Added to scope after client confirmation',
      }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.classification).toBe('IN_SCOPE')
    expect(data.data.status).toBe('CONFIRMED')

    expect(prisma.scopeItem.update).toHaveBeenCalledWith({
      where: { id: 'si-123' },
      data: {
        classification: 'IN_SCOPE',
        status: 'CONFIRMED',
        notes: 'Initial notes\n\nResolution: Added to scope after client confirmation',
      },
      include: { evidence: true },
    })
  })

  it('resolves ambiguous scope item to OUT_OF_SCOPE', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue({
      id: 'si-123',
      classification: 'AMBIGUOUS',
      notes: null,
    } as any)

    vi.mocked(prisma.scopeItem.update).mockResolvedValue({
      id: 'si-123',
      classification: 'OUT_OF_SCOPE',
      status: 'CONFIRMED',
      evidence: [],
    } as any)

    const request = new NextRequest('http://localhost/api/scope-items/si-123/resolve', {
      method: 'POST',
      body: JSON.stringify({
        classification: 'OUT_OF_SCOPE',
      }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.classification).toBe('OUT_OF_SCOPE')
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/scope-items/si-123/resolve', {
      method: 'POST',
      body: JSON.stringify({ classification: 'IN_SCOPE' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to resolve scope item')
  })

  it('preserves existing notes when no resolution notes provided', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue({
      id: 'si-123',
      classification: 'AMBIGUOUS',
      notes: 'Existing important notes',
    } as any)

    vi.mocked(prisma.scopeItem.update).mockResolvedValue({
      id: 'si-123',
      classification: 'IN_SCOPE',
      status: 'CONFIRMED',
      notes: 'Existing important notes',
      evidence: [],
    } as any)

    const request = new NextRequest('http://localhost/api/scope-items/si-123/resolve', {
      method: 'POST',
      body: JSON.stringify({ classification: 'IN_SCOPE' }),
    })

    await POST(request, { params: Promise.resolve({ id: 'si-123' }) })

    expect(prisma.scopeItem.update).toHaveBeenCalledWith({
      where: { id: 'si-123' },
      data: {
        classification: 'IN_SCOPE',
        status: 'CONFIRMED',
        notes: 'Existing important notes',
      },
      include: { evidence: true },
    })
  })
})
