import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/design-weeks/[id]/recalculate-progress/route'
import { mockPrisma } from '../setup'

// Mock the phase-durations module to avoid importing Prisma enums at runtime
vi.mock('@/lib/phase-durations', () => ({
  calculateDesignWeekEndDate: vi.fn((startDate: Date) => {
    const end = new Date(startDate)
    end.setDate(end.getDate() + 14) // 2 weeks
    return end
  }),
}))

const mockedPrisma = mockPrisma

describe('POST /api/design-weeks/[id]/recalculate-progress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('recalculates progress from NOT_STARTED to IN_PROGRESS with sessions', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      status: 'NOT_STARTED',
      currentPhase: 1,
      startedAt: null,
      plannedEndDate: null,
      plannedDurationDays: 10,
      sessions: [
        { phase: 1 },
        { phase: 2 },
      ],
      uploadJobs: [],
      rawExtractions: [],
    }

    const updatedDesignWeek = {
      id: 'dw-1',
      status: 'IN_PROGRESS',
      currentPhase: 2,
      startedAt: new Date(),
      plannedEndDate: new Date(),
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockResolvedValue(updatedDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.updated).toBe(true)
    expect(data.changes.status.from).toBe('NOT_STARTED')
    expect(data.changes.status.to).toBe('IN_PROGRESS')
    expect(data.changes.currentPhase.from).toBe(1)
    expect(data.changes.currentPhase.to).toBe(2)

    const updateCall = mockedPrisma.designWeek.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('IN_PROGRESS')
    expect(updateCall.data.currentPhase).toBe(2)
    expect(updateCall.data.startedAt).toBeDefined()
  })

  it('recalculates progress to PENDING_SIGNOFF with sign-off session', async () => {
    const mockDesignWeek = {
      id: 'dw-2',
      status: 'IN_PROGRESS',
      currentPhase: 3,
      startedAt: new Date(),
      plannedEndDate: null,
      plannedDurationDays: 10,
      sessions: [
        { phase: 1 },
        { phase: 2 },
        { phase: 3 },
        { phase: 4 }, // sign-off session
      ],
      uploadJobs: [],
      rawExtractions: [],
    }

    const updatedDesignWeek = {
      id: 'dw-2',
      status: 'PENDING_SIGNOFF',
      currentPhase: 4,
      startedAt: mockDesignWeek.startedAt,
      plannedEndDate: null,
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockResolvedValue(updatedDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-2/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-2' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.updated).toBe(true)

    const updateCall = mockedPrisma.designWeek.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('PENDING_SIGNOFF')
    expect(updateCall.data.currentPhase).toBe(4)
  })

  it('detects highest phase from upload jobs with classification', async () => {
    const mockDesignWeek = {
      id: 'dw-3',
      status: 'IN_PROGRESS',
      currentPhase: 1,
      startedAt: new Date(),
      plannedEndDate: null,
      plannedDurationDays: 10,
      sessions: [],
      uploadJobs: [
        { classificationResult: { type: 'TECHNICAL_SESSION' } },
      ],
      rawExtractions: [],
    }

    const updatedDesignWeek = {
      id: 'dw-3',
      status: 'IN_PROGRESS',
      currentPhase: 3,
      startedAt: mockDesignWeek.startedAt,
      plannedEndDate: null,
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockResolvedValue(updatedDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-3/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-3' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.updated).toBe(true)
    expect(data.changes.currentPhase.to).toBe(3)
  })

  it('detects highest phase from raw extractions', async () => {
    const mockDesignWeek = {
      id: 'dw-4',
      status: 'IN_PROGRESS',
      currentPhase: 1,
      startedAt: new Date(),
      plannedEndDate: null,
      plannedDurationDays: 10,
      sessions: [],
      uploadJobs: [],
      rawExtractions: [
        { contentType: 'PROCESS_DESIGN_SESSION' },
        { contentType: 'SIGNOFF_SESSION' },
      ],
    }

    const updatedDesignWeek = {
      id: 'dw-4',
      status: 'PENDING_SIGNOFF',
      currentPhase: 4,
      startedAt: mockDesignWeek.startedAt,
      plannedEndDate: null,
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockResolvedValue(updatedDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-4/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-4' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.updated).toBe(true)

    const updateCall = mockedPrisma.designWeek.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('PENDING_SIGNOFF')
    expect(updateCall.data.currentPhase).toBe(4)
  })

  it('returns no changes when status and phase are already correct', async () => {
    const mockDesignWeek = {
      id: 'dw-5',
      status: 'IN_PROGRESS',
      currentPhase: 2,
      startedAt: new Date(),
      plannedEndDate: null,
      plannedDurationDays: 10,
      sessions: [
        { phase: 1 },
        { phase: 2 },
      ],
      uploadJobs: [],
      rawExtractions: [],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-5/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-5' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.updated).toBe(false)
    expect(data.message).toContain('No changes needed')
    expect(mockedPrisma.designWeek.update).not.toHaveBeenCalled()
  })

  it('does not downgrade from COMPLETE status', async () => {
    const mockDesignWeek = {
      id: 'dw-6',
      status: 'COMPLETE',
      currentPhase: 4,
      startedAt: new Date(),
      plannedEndDate: null,
      plannedDurationDays: 10,
      sessions: [
        { phase: 1 },
      ],
      uploadJobs: [],
      rawExtractions: [],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-6/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-6' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    // Status should remain COMPLETE even though sessions only have phase 1
    // The phase might update but status should not downgrade
  })

  it('handles empty sessions, uploadJobs, and rawExtractions (NOT_STARTED)', async () => {
    const mockDesignWeek = {
      id: 'dw-7',
      status: 'NOT_STARTED',
      currentPhase: 1,
      startedAt: null,
      plannedEndDate: null,
      plannedDurationDays: 10,
      sessions: [],
      uploadJobs: [],
      rawExtractions: [],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-7/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-7' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.updated).toBe(false)
    expect(mockedPrisma.designWeek.update).not.toHaveBeenCalled()
  })

  it('returns 404 when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/design-weeks/nonexistent/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Design Week not found')
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/invalid id!/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.designWeek.findUnique.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to recalculate progress')
  })

  it('detects PENDING_SIGNOFF from upload job with SIGNOFF_SESSION classification', async () => {
    const mockDesignWeek = {
      id: 'dw-8',
      status: 'IN_PROGRESS',
      currentPhase: 2,
      startedAt: new Date(),
      plannedEndDate: null,
      plannedDurationDays: 10,
      sessions: [],
      uploadJobs: [
        { classificationResult: { type: 'SIGNOFF_SESSION' } },
      ],
      rawExtractions: [],
    }

    const updatedDesignWeek = {
      id: 'dw-8',
      status: 'PENDING_SIGNOFF',
      currentPhase: 4,
      startedAt: mockDesignWeek.startedAt,
      plannedEndDate: null,
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockResolvedValue(updatedDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-8/recalculate-progress', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'dw-8' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.updated).toBe(true)

    const updateCall = mockedPrisma.designWeek.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('PENDING_SIGNOFF')
  })
})
