import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    designWeek: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/components/de-workspace/profile-types', () => ({
  createEmptyTechnicalProfile: vi.fn(() => ({
    integrations: [],
    dataFields: [],
    apiEndpoints: [],
    securityRequirements: [],
    technicalContacts: [],
    notes: [],
  })),
}))

// Import after mocks
import { GET, PUT } from '@/app/api/design-weeks/[id]/technical-profile/route'
import { prisma } from '@/lib/db'

describe('GET /api/design-weeks/[id]/technical-profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns saved technical profile when it exists', async () => {
    const savedProfile = {
      integrations: [{ systemName: 'SAP', purpose: 'ERP integration' }],
      dataFields: [],
    }

    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      technicalProfile: savedProfile,
      sessions: [],
    } as any)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/technical-profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile.integrations).toHaveLength(1)
    expect(data.profile.integrations[0].systemName).toBe('SAP')
  })

  it('generates profile from extracted items when no saved profile', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      technicalProfile: null,
      sessions: [
        {
          extractedItems: [
            {
              id: 'item-1',
              type: 'SYSTEM_INTEGRATION',
              content: 'Salesforce CRM',
              structuredData: { systemName: 'Salesforce', purpose: 'Customer data', type: 'rest_api' },
            },
            {
              id: 'item-2',
              type: 'DATA_FIELD',
              content: 'Customer ID',
              structuredData: { name: 'customerId', source: 'CRM', type: 'string', required: true },
            },
            {
              id: 'item-3',
              type: 'SECURITY_REQUIREMENT',
              content: 'GDPR compliance required',
              structuredData: { category: 'compliance' },
            },
          ],
        },
      ],
    } as any)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/technical-profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile.integrations).toHaveLength(1)
    expect(data.profile.integrations[0].systemName).toBe('Salesforce')
    expect(data.profile.dataFields).toHaveLength(1)
    expect(data.profile.dataFields[0].name).toBe('customerId')
    expect(data.profile.securityRequirements).toHaveLength(1)
  })

  it('maps API endpoints correctly', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      technicalProfile: null,
      sessions: [
        {
          extractedItems: [
            {
              id: 'item-1',
              type: 'API_ENDPOINT',
              content: 'GET /api/customers',
              structuredData: { name: 'Get Customers', method: 'GET', path: '/api/customers' },
            },
          ],
        },
      ],
    } as any)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/technical-profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(data.profile.apiEndpoints).toHaveLength(1)
    expect(data.profile.apiEndpoints[0].method).toBe('GET')
    expect(data.profile.apiEndpoints[0].path).toBe('/api/customers')
  })

  it('maps technical contacts correctly', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      technicalProfile: null,
      sessions: [
        {
          extractedItems: [
            {
              id: 'item-1',
              type: 'TECHNICAL_CONTACT',
              content: 'John Doe - IT Lead',
              structuredData: { name: 'John Doe', role: 'IT Lead', system: 'SAP', email: 'john@example.com' },
            },
          ],
        },
      ],
    } as any)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/technical-profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(data.profile.technicalContacts).toHaveLength(1)
    expect(data.profile.technicalContacts[0].name).toBe('John Doe')
    expect(data.profile.technicalContacts[0].email).toBe('john@example.com')
  })

  it('adds error handling to notes', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      technicalProfile: null,
      sessions: [
        {
          extractedItems: [
            {
              id: 'item-1',
              type: 'ERROR_HANDLING',
              content: 'Retry 3 times before escalating',
              structuredData: null,
            },
          ],
        },
      ],
    } as any)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/technical-profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(data.profile.notes).toContain('Error Handling: Retry 3 times before escalating')
  })

  it('returns 404 when design week not found', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/design-weeks/nonexistent/technical-profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  it('handles errors gracefully', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/technical-profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to load technical profile')
  })
})

describe('PUT /api/design-weeks/[id]/technical-profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves technical profile successfully', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({ id: 'dw-123' } as any)
    vi.mocked(prisma.designWeek.update).mockResolvedValue({} as any)

    const profile = {
      integrations: [{ systemName: 'NewSystem', purpose: 'Testing' }],
      dataFields: [],
    }

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/technical-profile', {
      method: 'PUT',
      body: JSON.stringify({ profile }),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(prisma.designWeek.update).toHaveBeenCalledWith({
      where: { id: 'dw-123' },
      data: expect.objectContaining({
        technicalProfile: profile,
      }),
    })
  })

  it('returns 400 when profile is missing', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/technical-profile', {
      method: 'PUT',
      body: JSON.stringify({}),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 404 when design week not found', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/technical-profile', {
      method: 'PUT',
      body: JSON.stringify({ profile: {} }),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  it('handles errors gracefully', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({ id: 'dw-123' } as any)
    vi.mocked(prisma.designWeek.update).mockRejectedValue(new Error('Update failed'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/technical-profile', {
      method: 'PUT',
      body: JSON.stringify({ profile: {} }),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save technical profile')
  })
})
