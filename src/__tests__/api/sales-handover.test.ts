import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrisma } from '../setup'

// Mock the profile-types module
vi.mock('@/components/de-workspace/profile-types', () => ({
  createEmptySalesHandoverProfile: () => ({
    context: {
      dealSummary: '',
      clientMotivation: '',
      contractType: '',
      contractValue: '',
      salesOwner: '',
    },
    watchOuts: [],
    deadlines: [],
    specialNotes: {
      clientPreferences: [],
      internalNotes: '',
      promisedCapabilities: [],
      knownConstraints: [],
    },
    stakeholders: [],
    submittedBy: '',
    submittedAt: '',
    lastUpdatedAt: '',
    handoverStatus: 'draft',
    reviewedBy: '',
    reviewedAt: '',
    reviewComment: '',
  }),
}))

// Must import after mocks are set up
import { GET, PUT } from '@/app/api/design-weeks/[id]/sales-handover/route'

const mockedPrisma = mockPrisma

describe('GET /api/design-weeks/[id]/sales-handover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/invalid$$id/sales-handover')
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid$$id' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 404 when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  it('returns profile from salesHandoverProfile field when it exists', async () => {
    const existingProfile = {
      context: { dealSummary: 'Test deal', clientMotivation: '', contractType: '', contractValue: '', salesOwner: '' },
      watchOuts: [],
      deadlines: [],
      specialNotes: { clientPreferences: [], internalNotes: '', promisedCapabilities: [], knownConstraints: [] },
      stakeholders: [],
      handoverStatus: 'draft',
      submittedBy: '',
      submittedAt: '',
      lastUpdatedAt: '',
      reviewedBy: '',
      reviewedAt: '',
      reviewComment: '',
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue({
      id: 'dw-1',
      status: 'IN_PROGRESS',
      currentPhase: 2,
      salesHandoverProfile: existingProfile,
      sessions: [],
      digitalEmployee: {
        journeyPhases: [],
      },
      _count: { sessions: 3 },
    } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile.context.dealSummary).toBe('Test deal')
    expect(data.checklist).toEqual([])
    expect(data.journeyPhaseId).toBeNull()
    expect(data.journeyPhaseStatus).toBe('NOT_STARTED')
    expect(data.implementationPulse).toBeNull()
  })

  it('generates profile from extracted items when salesHandoverProfile is null', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue({
      id: 'dw-1',
      status: 'IN_PROGRESS',
      currentPhase: 2,
      salesHandoverProfile: null,
      sessions: [
        {
          extractedItems: [
            { id: 'item-1', type: 'DEAL_SUMMARY', content: 'Big insurance deal', structuredData: null },
            { id: 'item-2', type: 'STAKEHOLDER', content: 'John Doe', structuredData: { name: 'John Doe', role: 'CTO', isDecisionMaker: true } },
            { id: 'item-3', type: 'GOAL', content: 'Reduce processing time', structuredData: null },
          ],
        },
      ],
      digitalEmployee: {
        journeyPhases: [],
      },
      _count: { sessions: 1 },
    } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile.context.dealSummary).toBe('Big insurance deal')
    expect(data.profile.stakeholders).toHaveLength(1)
    expect(data.profile.stakeholders[0].name).toBe('John Doe')
    expect(data.profile.context.clientMotivation).toBe('Reduce processing time')
  })

  it('returns checklist from SALES_HANDOVER journey phase', async () => {
    const checklistItems = [
      { id: 'cl-1', label: 'Review deal', isCompleted: false, order: 1 },
      { id: 'cl-2', label: 'Contact client', isCompleted: true, order: 2 },
    ]

    mockedPrisma.designWeek.findUnique.mockResolvedValue({
      id: 'dw-1',
      status: 'IN_PROGRESS',
      currentPhase: 2,
      salesHandoverProfile: null,
      sessions: [],
      digitalEmployee: {
        journeyPhases: [
          {
            id: 'jp-1',
            phaseType: 'SALES_HANDOVER',
            status: 'IN_PROGRESS',
            checklistItems,
          },
        ],
      },
      _count: { sessions: 2 },
    } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.checklist).toHaveLength(2)
    expect(data.journeyPhaseId).toBe('jp-1')
    expect(data.journeyPhaseStatus).toBe('IN_PROGRESS')
  })

  it('returns implementation pulse when handover status is accepted', async () => {
    const profile = {
      context: { dealSummary: 'Test', clientMotivation: '', contractType: '', contractValue: '', salesOwner: '' },
      watchOuts: [],
      deadlines: [],
      specialNotes: { clientPreferences: [], internalNotes: '', promisedCapabilities: [], knownConstraints: [] },
      stakeholders: [],
      handoverStatus: 'accepted',
      submittedBy: 'Sales',
      submittedAt: '2026-01-01T00:00:00Z',
      lastUpdatedAt: '2026-01-02T00:00:00Z',
      reviewedBy: 'Sophie',
      reviewedAt: '2026-01-02T00:00:00Z',
      reviewComment: '',
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue({
      id: 'dw-1',
      status: 'IN_PROGRESS',
      currentPhase: 2,
      salesHandoverProfile: profile,
      businessProfile: { some: 'data' },
      technicalProfile: null,
      sessions: [],
      digitalEmployee: {
        journeyPhases: [],
      },
      _count: { sessions: 5 },
    } as never)

    mockedPrisma.prerequisite.findMany.mockResolvedValue([
      { id: 'p-1', status: 'BLOCKED', dueDate: null },
      { id: 'p-2', status: 'PENDING', dueDate: null },
    ] as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.implementationPulse).not.toBeNull()
    expect(data.implementationPulse.blockedPrerequisites).toBe(1)
    expect(data.implementationPulse.pendingPrerequisites).toBe(2)
    expect(data.implementationPulse.hasBusinessProfile).toBe(true)
    expect(data.implementationPulse.hasTechnicalProfile).toBe(false)
    expect(data.implementationPulse.sessionsProcessed).toBe(5)
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.designWeek.findUnique.mockRejectedValue(new Error('DB connection failed'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to load sales handover profile')
  })
})

describe('PUT /api/design-weeks/[id]/sales-handover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/bad!id/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ profile: {} }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'bad!id' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('saves profile on auto-save (no action)', async () => {
    const profile = {
      context: { dealSummary: 'Updated deal', clientMotivation: '', contractType: '', contractValue: '', salesOwner: '' },
      watchOuts: [],
      deadlines: [],
      specialNotes: { clientPreferences: [], internalNotes: '', promisedCapabilities: [], knownConstraints: [] },
      stakeholders: [],
      handoverStatus: 'draft',
      submittedBy: '',
      submittedAt: '',
      lastUpdatedAt: '',
      reviewedBy: '',
      reviewedAt: '',
      reviewComment: '',
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue({ id: 'dw-1' } as never)
    mockedPrisma.designWeek.update.mockResolvedValue({ id: 'dw-1' } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ profile }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.designWeek.update).toHaveBeenCalledOnce()
  })

  it('returns 400 when profile is missing on auto-save', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({}),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Profile is required')
  })

  it('returns 404 on auto-save when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ profile: { context: {} } }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  // Status transition tests
  it('handles submit action from draft status', async () => {
    const existingProfile = {
      context: { dealSummary: 'Test', clientMotivation: '', contractType: '', contractValue: '', salesOwner: 'Alice' },
      watchOuts: [],
      deadlines: [],
      specialNotes: { clientPreferences: [], internalNotes: '', promisedCapabilities: [], knownConstraints: [] },
      stakeholders: [],
      handoverStatus: 'draft',
      submittedBy: '',
      submittedAt: '',
      lastUpdatedAt: '',
      reviewedBy: '',
      reviewedAt: '',
      reviewComment: '',
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue({
      id: 'dw-1',
      salesHandoverProfile: existingProfile,
    } as never)
    mockedPrisma.designWeek.update.mockResolvedValue({ id: 'dw-1' } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ action: 'submit' }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.profile.handoverStatus).toBe('submitted')
    expect(data.profile.submittedBy).toBe('Alice')
  })

  it('handles accept action from submitted status', async () => {
    const existingProfile = {
      context: { dealSummary: 'Test', clientMotivation: '', contractType: '', contractValue: '', salesOwner: '' },
      watchOuts: [],
      deadlines: [],
      specialNotes: { clientPreferences: [], internalNotes: '', promisedCapabilities: [], knownConstraints: [] },
      stakeholders: [],
      handoverStatus: 'submitted',
      submittedBy: 'Sales',
      submittedAt: '2026-01-01T00:00:00Z',
      lastUpdatedAt: '',
      reviewedBy: '',
      reviewedAt: '',
      reviewComment: '',
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue({
      id: 'dw-1',
      salesHandoverProfile: existingProfile,
    } as never)
    mockedPrisma.designWeek.update.mockResolvedValue({ id: 'dw-1' } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ action: 'accept', comment: 'Looks good!' }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile.handoverStatus).toBe('accepted')
    expect(data.profile.reviewComment).toBe('Looks good!')
  })

  it('handles request_changes action from submitted status', async () => {
    const existingProfile = {
      context: { dealSummary: 'Test', clientMotivation: '', contractType: '', contractValue: '', salesOwner: '' },
      watchOuts: [],
      deadlines: [],
      specialNotes: { clientPreferences: [], internalNotes: '', promisedCapabilities: [], knownConstraints: [] },
      stakeholders: [],
      handoverStatus: 'submitted',
      submittedBy: 'Sales',
      submittedAt: '2026-01-01T00:00:00Z',
      lastUpdatedAt: '',
      reviewedBy: '',
      reviewedAt: '',
      reviewComment: '',
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue({
      id: 'dw-1',
      salesHandoverProfile: existingProfile,
    } as never)
    mockedPrisma.designWeek.update.mockResolvedValue({ id: 'dw-1' } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ action: 'request_changes', comment: 'Need more details' }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile.handoverStatus).toBe('changes_requested')
    expect(data.profile.reviewComment).toBe('Need more details')
  })

  it('returns 400 when submitting from accepted state', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue({
      id: 'dw-1',
      salesHandoverProfile: { handoverStatus: 'accepted' },
    } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ action: 'submit' }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Can only submit from draft or changes_requested state')
  })

  it('returns 400 when accepting from draft state', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue({
      id: 'dw-1',
      salesHandoverProfile: { handoverStatus: 'draft' },
    } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ action: 'accept' }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Can only accept a submitted handover')
  })

  it('returns 400 when requesting changes from draft state', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue({
      id: 'dw-1',
      salesHandoverProfile: { handoverStatus: 'draft' },
    } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ action: 'request_changes' }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Can only request changes on a submitted handover')
  })

  it('returns 400 for invalid action value', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ action: 'invalid_action' }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid action')
  })

  it('returns 404 on status transition when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ action: 'submit' }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.designWeek.findUnique.mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover', {
      method: 'PUT',
      body: JSON.stringify({ profile: { context: {} } }),
    })
    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save sales handover profile')
  })
})
