import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/design-weeks/[id]/phases/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('GET /api/design-weeks/[id]/phases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns phase data for a valid design week', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      currentPhase: 2,
      status: 'IN_PROGRESS',
      manualPhaseCompletions: [1],
      sessions: [
        { phase: 1, processingStatus: 'COMPLETE' },
        { phase: 2, processingStatus: 'PENDING' },
      ],
      rawExtractions: [
        { contentType: 'KICKOFF_SESSION' },
      ],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/phases')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.designWeekId).toBe('dw-1')
    expect(data.data.currentPhase).toBe(2)
    expect(data.data.status).toBe('IN_PROGRESS')
    expect(data.data.phases).toHaveLength(4)

    // Phase 1: auto-completed (session complete) + manually completed
    expect(data.data.phases[0]).toEqual({
      phase: 1,
      autoCompleted: true,
      manuallyCompleted: true,
      completed: true,
    })

    // Phase 2: not auto-completed (session is PENDING), not manually completed
    expect(data.data.phases[1]).toEqual({
      phase: 2,
      autoCompleted: false,
      manuallyCompleted: false,
      completed: false,
    })

    // Phase 3 & 4: not completed
    expect(data.data.phases[2].completed).toBe(false)
    expect(data.data.phases[3].completed).toBe(false)

    expect(data.data.manualCompletions).toEqual([1])
  })

  it('returns phase data with auto-detection from raw extractions', async () => {
    const mockDesignWeek = {
      id: 'dw-2',
      currentPhase: 1,
      status: 'IN_PROGRESS',
      manualPhaseCompletions: [],
      sessions: [],
      rawExtractions: [
        { contentType: 'KICKOFF_SESSION' },
        { contentType: 'PROCESS_DESIGN_SESSION' },
        { contentType: 'TECHNICAL_SPEC' },
      ],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-2/phases')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-2' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.phases[0].autoCompleted).toBe(true) // phase 1 from KICKOFF_SESSION
    expect(data.data.phases[1].autoCompleted).toBe(true) // phase 2 from PROCESS_DESIGN_SESSION
    expect(data.data.phases[2].autoCompleted).toBe(true) // phase 3 from TECHNICAL_SPEC
    expect(data.data.phases[3].autoCompleted).toBe(false) // phase 4 not detected
  })

  it('returns 404 when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/design-weeks/nonexistent/phases')
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Design Week not found')
  })

  it('handles null manualPhaseCompletions gracefully', async () => {
    const mockDesignWeek = {
      id: 'dw-3',
      currentPhase: 1,
      status: 'NOT_STARTED',
      manualPhaseCompletions: null,
      sessions: [],
      rawExtractions: [],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-3/phases')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-3' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.manualCompletions).toEqual([])
    expect(data.data.phases.every((p: { manuallyCompleted: boolean }) => !p.manuallyCompleted)).toBe(true)
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.designWeek.findUnique.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/phases')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to fetch phase data')
  })
})

describe('PATCH /api/design-weeks/[id]/phases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds a manual phase completion', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      currentPhase: 1,
      status: 'NOT_STARTED',
      manualPhaseCompletions: [],
    }

    const updatedDesignWeek = {
      id: 'dw-1',
      currentPhase: 1,
      status: 'IN_PROGRESS',
      manualPhaseCompletions: [1],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockResolvedValue(updatedDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/phases', {
      method: 'PATCH',
      body: JSON.stringify({ phase: 1, completed: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.manualCompletions).toEqual([1])

    // Should have set startedAt since status was NOT_STARTED
    const updateCall = mockedPrisma.designWeek.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('IN_PROGRESS')
    expect(updateCall.data.startedAt).toBeDefined()
  })

  it('removes a manual phase completion', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      currentPhase: 2,
      status: 'IN_PROGRESS',
      manualPhaseCompletions: [1, 2],
    }

    const updatedDesignWeek = {
      id: 'dw-1',
      currentPhase: 2,
      status: 'IN_PROGRESS',
      manualPhaseCompletions: [2],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockResolvedValue(updatedDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/phases', {
      method: 'PATCH',
      body: JSON.stringify({ phase: 1, completed: false }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('sets PENDING_SIGNOFF status when phase 4 is manually completed', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      currentPhase: 3,
      status: 'IN_PROGRESS',
      manualPhaseCompletions: [1, 2, 3],
    }

    const updatedDesignWeek = {
      id: 'dw-1',
      currentPhase: 4,
      status: 'PENDING_SIGNOFF',
      manualPhaseCompletions: [1, 2, 3, 4],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockResolvedValue(updatedDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/phases', {
      method: 'PATCH',
      body: JSON.stringify({ phase: 4, completed: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)

    const updateCall = mockedPrisma.designWeek.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('PENDING_SIGNOFF')
    expect(updateCall.data.currentPhase).toBe(4)
  })

  it('returns 404 when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/design-weeks/nonexistent/phases', {
      method: 'PATCH',
      body: JSON.stringify({ phase: 1, completed: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Design Week not found')
  })

  it('returns 400 for invalid phase number', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/phases', {
      method: 'PATCH',
      body: JSON.stringify({ phase: 5, completed: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid input')
  })

  it('returns 400 for missing completed field', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/phases', {
      method: 'PATCH',
      body: JSON.stringify({ phase: 1 }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('does not duplicate phase when already in manual completions', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      currentPhase: 2,
      status: 'IN_PROGRESS',
      manualPhaseCompletions: [1],
    }

    const updatedDesignWeek = {
      id: 'dw-1',
      currentPhase: 2,
      status: 'IN_PROGRESS',
      manualPhaseCompletions: [1],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockResolvedValue(updatedDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/phases', {
      method: 'PATCH',
      body: JSON.stringify({ phase: 1, completed: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    // The update should keep manual completions as [1], not [1, 1]
    const updateCall = mockedPrisma.designWeek.update.mock.calls[0][0]
    expect(updateCall.data.manualPhaseCompletions).toEqual([1])
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.designWeek.findUnique.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/phases', {
      method: 'PATCH',
      body: JSON.stringify({ phase: 1, completed: true }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to toggle phase')
  })
})
