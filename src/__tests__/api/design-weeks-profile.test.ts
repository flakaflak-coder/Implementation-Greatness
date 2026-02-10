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

vi.mock('@/lib/profile-mapper', () => ({
  mapExtractedItemsToProfile: vi.fn(),
  mergeProfiles: vi.fn(),
}))

vi.mock('@/components/de-workspace/profile-types', () => ({
  createEmptyProfile: vi.fn(() => ({
    identity: { name: '', description: '', stakeholders: [] },
    businessContext: { problemStatement: '', painPoints: [], peakPeriods: [] },
    kpis: [],
    channels: [],
    skills: { skills: [], communicationStyle: { tone: [], languages: [] } },
    process: { happyPathSteps: [], exceptions: [], escalationRules: [], caseTypes: [] },
    scope: { inScope: [], outOfScope: [] },
    guardrails: { never: [], always: [], financialLimits: [], legalRestrictions: [] },
  })),
}))

// Import after mocks
import { GET, PUT, POST } from '@/app/api/design-weeks/[id]/profile/route'
import { prisma } from '@/lib/db'
import { mapExtractedItemsToProfile, mergeProfiles } from '@/lib/profile-mapper'

describe('GET /api/design-weeks/[id]/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns saved profile when it exists', async () => {
    const savedProfile = {
      identity: { name: 'Test Bot', stakeholders: [] },
      businessContext: { problemStatement: 'Test problem' },
    }

    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      businessProfile: savedProfile,
      digitalEmployee: { name: 'Test Bot' },
      sessions: [],
    } as any)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile.identity.name).toBe('Test Bot')
    expect(data.stats.hasSavedProfile).toBe(true)
  })

  it('generates profile from extracted items when no saved profile', async () => {
    const generatedProfile = {
      identity: { name: '', stakeholders: [{ name: 'John' }] },
    }

    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      businessProfile: null,
      digitalEmployee: { name: 'Claims Bot', description: 'Handles claims' },
      sessions: [
        {
          id: 's-1',
          extractedItems: [
            { type: 'STAKEHOLDER', content: 'John' },
          ],
        },
      ],
    } as any)

    vi.mocked(mapExtractedItemsToProfile).mockReturnValue(generatedProfile as any)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mapExtractedItemsToProfile).toHaveBeenCalled()
    expect(data.profile.identity.name).toBe('Claims Bot') // Falls back to DE name
    expect(data.stats.hasSavedProfile).toBe(false)
    expect(data.stats.extractedItemsCount).toBe(1)
  })

  it('returns 404 when design week not found', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/design-weeks/nonexistent/profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  it('handles errors gracefully', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to load profile')
  })
})

describe('PUT /api/design-weeks/[id]/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves profile successfully', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({ id: 'dw-123' } as any)
    vi.mocked(prisma.designWeek.update).mockResolvedValue({} as any)

    const profile = {
      identity: { name: 'Updated Bot' },
      businessContext: { problemStatement: 'Updated problem' },
    }

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile', {
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
        businessProfile: profile,
      }),
    })
  })

  it('returns 400 when profile is missing', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile', {
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

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile: {} }),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })
})

describe('POST /api/design-weeks/[id]/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('regenerates profile from extracted items', async () => {
    const newProfile = {
      identity: { name: '', stakeholders: [{ name: 'Jane' }] },
    }

    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      businessProfile: null,
      digitalEmployee: { name: 'Support Bot', description: 'Support' },
      sessions: [
        {
          extractedItems: [{ type: 'STAKEHOLDER', content: 'Jane' }],
        },
      ],
    } as any)

    vi.mocked(mapExtractedItemsToProfile).mockReturnValue(newProfile as any)
    vi.mocked(prisma.designWeek.update).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile', {
      method: 'POST',
      body: JSON.stringify({ merge: false }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.profile.identity.name).toBe('Support Bot')
    expect(data.stats.merged).toBe(false)
  })

  it('merges with existing profile when merge is true', async () => {
    const existingProfile = {
      identity: { name: 'Existing Name' },
    }

    const newProfile = {
      identity: { name: '', stakeholders: [{ name: 'New Stakeholder' }] },
    }

    const mergedProfile = {
      identity: { name: 'Existing Name', stakeholders: [{ name: 'New Stakeholder' }] },
    }

    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      businessProfile: existingProfile,
      digitalEmployee: { name: 'Bot' },
      sessions: [{ extractedItems: [] }],
    } as any)

    vi.mocked(mapExtractedItemsToProfile).mockReturnValue(newProfile as any)
    vi.mocked(mergeProfiles).mockReturnValue(mergedProfile as any)
    vi.mocked(prisma.designWeek.update).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile', {
      method: 'POST',
      body: JSON.stringify({ merge: true }),
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mergeProfiles).toHaveBeenCalledWith(existingProfile, expect.any(Object))
    expect(data.stats.merged).toBe(true)
  })

  it('defaults to merge true when body is empty', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-123',
      businessProfile: { identity: { name: 'Existing' } },
      digitalEmployee: { name: 'Bot' },
      sessions: [],
    } as any)

    vi.mocked(mapExtractedItemsToProfile).mockReturnValue({ identity: {} } as any)
    vi.mocked(mergeProfiles).mockReturnValue({ identity: { name: 'Merged' } } as any)
    vi.mocked(prisma.designWeek.update).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile', {
      method: 'POST',
      // No body
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mergeProfiles).toHaveBeenCalled()
    expect(data.stats.merged).toBe(true)
  })

  it('returns 404 when design week not found', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  it('handles errors gracefully', async () => {
    vi.mocked(prisma.designWeek.findUnique).mockRejectedValue(new Error('DB Error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-123/profile', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-123' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to recalculate profile')
  })
})
