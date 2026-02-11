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
import { POST } from '@/app/api/scope-items/[id]/unresolve/route'
import { prisma } from '@/lib/db'

describe('POST /api/scope-items/[id]/unresolve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/scope-items/invalid id!/unresolve', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 404 when scope item not found', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/scope-items/si-nonexistent/unresolve', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Scope item not found')
  })

  it('returns 400 when scope item is already ambiguous', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue({
      id: 'si-123',
      classification: 'AMBIGUOUS',
      notes: null,
    } as never)

    const request = new NextRequest('http://localhost/api/scope-items/si-123/unresolve', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('This scope item is already ambiguous')
  })

  it('successfully unresolves an IN_SCOPE item back to AMBIGUOUS', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue({
      id: 'si-123',
      classification: 'IN_SCOPE',
      status: 'CONFIRMED',
      notes: 'Some existing notes',
    } as never)

    vi.mocked(prisma.scopeItem.update).mockResolvedValue({
      id: 'si-123',
      classification: 'AMBIGUOUS',
      status: 'AMBIGUOUS',
      notes: 'Some existing notes\n\n[Undo: Previously marked as IN_SCOPE]',
      evidence: [],
    } as never)

    const request = new NextRequest('http://localhost/api/scope-items/si-123/unresolve', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.classification).toBe('AMBIGUOUS')
    expect(data.data.status).toBe('AMBIGUOUS')

    expect(prisma.scopeItem.update).toHaveBeenCalledWith({
      where: { id: 'si-123' },
      data: {
        classification: 'AMBIGUOUS',
        status: 'AMBIGUOUS',
        notes: 'Some existing notes\n\n[Undo: Previously marked as IN_SCOPE]',
      },
      include: { evidence: true },
    })
  })

  it('successfully unresolves an OUT_OF_SCOPE item back to AMBIGUOUS', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockResolvedValue({
      id: 'si-456',
      classification: 'OUT_OF_SCOPE',
      status: 'CONFIRMED',
      notes: null,
    } as never)

    vi.mocked(prisma.scopeItem.update).mockResolvedValue({
      id: 'si-456',
      classification: 'AMBIGUOUS',
      status: 'AMBIGUOUS',
      notes: '[Undo: Previously marked as OUT_OF_SCOPE]',
      evidence: [],
    } as never)

    const request = new NextRequest('http://localhost/api/scope-items/si-456/unresolve', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-456' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.classification).toBe('AMBIGUOUS')

    expect(prisma.scopeItem.update).toHaveBeenCalledWith({
      where: { id: 'si-456' },
      data: {
        classification: 'AMBIGUOUS',
        status: 'AMBIGUOUS',
        notes: '[Undo: Previously marked as OUT_OF_SCOPE]',
      },
      include: { evidence: true },
    })
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.scopeItem.findUnique).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/scope-items/si-123/unresolve', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'si-123' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to unresolve scope item')
  })
})
