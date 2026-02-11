import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/design-weeks/[id]/generate/route'
import { mockPrisma } from '../setup'

// Mock the Claude generateDocument function
vi.mock('@/lib/claude', () => ({
  generateDocument: vi.fn(),
}))

import { generateDocument } from '@/lib/claude'
const mockedGenerateDocument = vi.mocked(generateDocument)

const mockedPrisma = mockPrisma

describe('POST /api/design-weeks/[id]/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates a document successfully', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      sessions: [
        {
          extractedItems: [
            { id: 'item-1', type: 'GOAL', content: 'Reduce cost', status: 'APPROVED' },
            { id: 'item-2', type: 'KPI_TARGET', content: '80% automation', status: 'APPROVED' },
          ],
        },
      ],
      scopeItems: [],
      integrations: [],
    }

    const mockGenerationResult = {
      content: '# DE Design Document\n\nGenerated content...',
      inputTokens: 1000,
      outputTokens: 2000,
      latencyMs: 3000,
    }

    const mockDocument = {
      id: 'doc-1',
      designWeekId: 'dw-1',
      type: 'DE_DESIGN',
      version: 1,
      status: 'DRAFT',
      content: mockGenerationResult.content,
      inputTokens: 1000,
      outputTokens: 2000,
      latencyMs: 3000,
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.generatedDocument.findFirst.mockResolvedValue(null as never)
    mockedGenerateDocument.mockResolvedValue(mockGenerationResult as never)
    mockedPrisma.generatedDocument.create.mockResolvedValue(mockDocument as never)
    mockedPrisma.observatoryLLMOperation.create.mockResolvedValue({} as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/generate', {
      method: 'POST',
      body: JSON.stringify({ documentType: 'DE_DESIGN' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.document.id).toBe('doc-1')
    expect(data.document.type).toBe('DE_DESIGN')
    expect(data.document.version).toBe(1)
    expect(data.usage.inputTokens).toBe(1000)
    expect(data.usage.outputTokens).toBe(2000)
    expect(data.usage.latencyMs).toBe(3000)

    expect(mockedGenerateDocument).toHaveBeenCalledWith('dw-1', 'DE_DESIGN')
    expect(mockedPrisma.observatoryLLMOperation.create).toHaveBeenCalledOnce()
  })

  it('increments version when existing document exists', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      sessions: [
        {
          extractedItems: [
            { id: 'item-1', type: 'GOAL', content: 'Reduce cost', status: 'APPROVED' },
          ],
        },
      ],
      scopeItems: [],
      integrations: [],
    }

    const existingDoc = {
      id: 'doc-existing',
      version: 2,
    }

    const mockGenerationResult = {
      content: '# Updated Document',
      inputTokens: 500,
      outputTokens: 1000,
      latencyMs: 2000,
    }

    const mockDocument = {
      id: 'doc-2',
      designWeekId: 'dw-1',
      type: 'DE_DESIGN',
      version: 3,
      status: 'DRAFT',
      content: mockGenerationResult.content,
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.generatedDocument.findFirst.mockResolvedValue(existingDoc as never)
    mockedGenerateDocument.mockResolvedValue(mockGenerationResult as never)
    mockedPrisma.generatedDocument.create.mockResolvedValue(mockDocument as never)
    mockedPrisma.observatoryLLMOperation.create.mockResolvedValue({} as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/generate', {
      method: 'POST',
      body: JSON.stringify({ documentType: 'DE_DESIGN' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)

    // Check version was incremented
    const createCall = mockedPrisma.generatedDocument.create.mock.calls[0][0]
    expect(createCall.data.version).toBe(3) // existing was 2, so new is 3
  })

  it('returns 400 when no approved extracted items exist', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      sessions: [
        {
          extractedItems: [], // No approved items
        },
      ],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/generate', {
      method: 'POST',
      body: JSON.stringify({ documentType: 'DE_DESIGN' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('No approved extracted items')
    expect(mockedGenerateDocument).not.toHaveBeenCalled()
  })

  it('returns 404 when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/design-weeks/nonexistent/generate', {
      method: 'POST',
      body: JSON.stringify({ documentType: 'DE_DESIGN' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  it('returns 400 for invalid document type', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/generate', {
      method: 'POST',
      body: JSON.stringify({ documentType: 'INVALID_TYPE' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 400 for missing documentType', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/invalid id!/generate', {
      method: 'POST',
      body: JSON.stringify({ documentType: 'DE_DESIGN' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 500 when document generation fails', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      sessions: [
        {
          extractedItems: [
            { id: 'item-1', type: 'GOAL', content: 'Reduce cost', status: 'APPROVED' },
          ],
        },
      ],
      scopeItems: [],
      integrations: [],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.generatedDocument.findFirst.mockResolvedValue(null as never)
    mockedGenerateDocument.mockRejectedValue(new Error('AI generation failed'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/generate', {
      method: 'POST',
      body: JSON.stringify({ documentType: 'DE_DESIGN' }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Document generation failed')
  })
})

describe('GET /api/design-weeks/[id]/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns generated documents grouped by type', async () => {
    const mockDocuments = [
      {
        id: 'doc-1',
        designWeekId: 'dw-1',
        type: 'DE_DESIGN',
        version: 2,
        status: 'DRAFT',
        content: 'Latest DE Design v2',
        createdAt: new Date(),
      },
      {
        id: 'doc-2',
        designWeekId: 'dw-1',
        type: 'DE_DESIGN',
        version: 1,
        status: 'DRAFT',
        content: 'DE Design v1',
        createdAt: new Date(),
      },
      {
        id: 'doc-3',
        designWeekId: 'dw-1',
        type: 'SOLUTION_DESIGN',
        version: 1,
        status: 'DRAFT',
        content: 'Solution Design v1',
        createdAt: new Date(),
      },
    ]

    mockedPrisma.generatedDocument.findMany.mockResolvedValue(mockDocuments as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/generate')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    // Latest by type should have 2 entries (DE_DESIGN v2 and SOLUTION_DESIGN v1)
    expect(data.documents).toHaveLength(2)
    // All versions should have 3 entries
    expect(data.allVersions).toHaveLength(3)
  })

  it('returns empty arrays when no documents exist', async () => {
    mockedPrisma.generatedDocument.findMany.mockResolvedValue([] as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/generate')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.documents).toHaveLength(0)
    expect(data.allVersions).toHaveLength(0)
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/invalid id!/generate')
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.generatedDocument.findMany.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/generate')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch documents')
  })
})
