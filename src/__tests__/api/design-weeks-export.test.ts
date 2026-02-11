import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/design-weeks/[id]/export/route'
import { mockPrisma } from '../setup'

// Mock all external dependencies the export route uses
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-pdf-content')),
}))

vi.mock('@/lib/documents', () => ({
  DEDesignPDF: vi.fn(() => ({ type: 'div', props: {} })),
  mapToDocument: vi.fn(() => ({
    title: 'Test Document',
    sections: [],
  })),
}))

vi.mock('@/lib/documents/generate-document', () => ({
  generateDocumentContent: vi.fn().mockResolvedValue({
    executiveSummary: 'Generated summary',
    _metadata: { isFallback: false },
  }),
  buildGenerationContext: vi.fn().mockReturnValue({
    deName: 'Test DE',
    language: 'en',
  }),
  mergeGeneratedContent: vi.fn((doc) => doc),
  LANGUAGE_NAMES: {
    en: 'English',
    nl: 'Dutch',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
  },
}))

vi.mock('@/lib/documents/meet-your-de', () => ({
  generateMeetYourDEContent: vi.fn().mockResolvedValue({
    greeting: 'Hello!',
    personality: 'Friendly assistant',
    avatarBase64: null,
  }),
  MeetYourDEPDF: vi.fn(() => ({ type: 'div', props: {} })),
}))

vi.mock('@/lib/documents/focused-templates', () => ({
  TestPlanPDF: vi.fn(() => ({ type: 'div', props: {} })),
  ProcessDesignPDF: vi.fn(() => ({ type: 'div', props: {} })),
  ExecutiveSummaryPDF: vi.fn(() => ({ type: 'div', props: {} })),
  TechnicalFoundationPDF: vi.fn(() => ({ type: 'div', props: {} })),
  PersonaDesignPDF: vi.fn(() => ({ type: 'div', props: {} })),
  MonitoringFrameworkPDF: vi.fn(() => ({ type: 'div', props: {} })),
  RolloutPlanPDF: vi.fn(() => ({ type: 'div', props: {} })),
}))

vi.mock('@/lib/gemini', () => ({
  generateDEAvatar: vi.fn().mockResolvedValue('base64-avatar-data'),
}))

const mockedPrisma = mockPrisma

// Helper to build a complete design week mock for export tests
function createMockDesignWeek(overrides = {}) {
  return {
    id: 'dw-1',
    testPlan: null,
    digitalEmployee: {
      id: 'de-1',
      name: 'Claims Assistant',
      description: 'Handles insurance claims',
      channels: ['email', 'chat'],
      company: {
        name: 'Acme Insurance',
      },
    },
    sessions: [
      {
        extractedItems: [
          {
            id: 'item-1',
            type: 'GOAL',
            content: 'Reduce claims processing time',
            status: 'APPROVED',
            structuredData: null,
            confidence: 0.9,
          },
          {
            id: 'item-2',
            type: 'KPI_TARGET',
            content: '80% automation rate',
            status: 'APPROVED',
            structuredData: { target: '80%', metric: 'automation rate' },
            confidence: 0.85,
          },
        ],
      },
    ],
    scopeItems: [
      {
        id: 'scope-1',
        statement: 'Handle simple claims',
        classification: 'IN_SCOPE',
        skill: 'claims',
        conditions: null,
        notes: null,
        excludeFromDocument: false,
      },
    ],
    integrations: [
      {
        id: 'int-1',
        systemName: 'CRM System',
        purpose: 'read_write',
        type: 'API',
        authMethod: 'oauth',
        endpoint: 'https://api.crm.example.com',
      },
    ],
    businessProfile: null,
    technicalProfile: null,
    ...overrides,
  }
}

describe('GET /api/design-weeks/[id]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports a design document as PDF by default', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(createMockDesignWeek() as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('claims-assistant')
    expect(response.headers.get('Content-Disposition')).toContain('.pdf')
  })

  it('exports a design document as JSON when format=json', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(createMockDesignWeek() as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export?format=json')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.language).toBe('en')
    expect(data.enhanced).toBe(true)
    expect(data.data).toBeDefined()
  })

  it('exports a design document without LLM enhancement when enhanced=false', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(createMockDesignWeek() as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export?format=json&enhanced=false')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.enhanced).toBe(false)
  })

  it('exports a "Meet Your DE" document as JSON', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(createMockDesignWeek() as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export?type=meet&format=json')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.type).toBe('meet')
    expect(data.data).toBeDefined()
  })

  it('exports a "Meet Your DE" document as PDF', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(createMockDesignWeek() as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export?type=meet')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('meet-')
  })

  it('exports test-plan document as JSON', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(createMockDesignWeek() as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export?type=test-plan&format=json')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.type).toBe('test-plan')
  })

  it('exports process document as JSON', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(createMockDesignWeek() as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export?type=process&format=json')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.type).toBe('process')
  })

  it('exports executive summary as JSON', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(createMockDesignWeek() as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export?type=executive&format=json')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.type).toBe('executive')
  })

  it('exports technical document as JSON', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(createMockDesignWeek() as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export?type=technical&format=json')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.type).toBe('technical')
  })

  it('returns 404 when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/design-weeks/nonexistent/export')
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
    expect(data.code).toBe('DESIGN_WEEK_NOT_FOUND')
  })

  it('returns 400 for invalid language', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export?language=xx')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('INVALID_LANGUAGE')
    expect(data.error).toContain('Invalid language')
  })

  it('returns 400 for invalid document type', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export?type=invalid-type')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('INVALID_TYPE')
    expect(data.error).toContain('Invalid type')
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/invalid id!/export')
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('accepts valid languages: nl, de, fr, es', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(createMockDesignWeek() as never)

    for (const lang of ['nl', 'de', 'fr', 'es']) {
      const request = new NextRequest(`http://localhost/api/design-weeks/dw-1/export?format=json&enhanced=false&language=${lang}`)
      const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.language).toBe(lang)
    }
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.designWeek.findUnique.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/export')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to generate document')
  })
})
