import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/sessions/route'
import { GET as getSession, PATCH as updateSession, DELETE as deleteSession } from '@/app/api/sessions/[id]/route'
import { GET as getExtractedItems, POST as extractItems } from '@/app/api/sessions/[id]/extract/route'
import { mockPrisma } from '../setup'

// Use the exported mock from setup
const mockedPrisma = mockPrisma

// Mock claude module
vi.mock('@/lib/claude', () => ({
  extractFromTranscript: vi.fn().mockResolvedValue({
    items: [{ type: 'GOAL', content: 'Test goal', confidence: 0.9 }],
    inputTokens: 100,
    outputTokens: 50,
    latencyMs: 500,
  }),
  saveExtractedItems: vi.fn().mockResolvedValue(undefined),
}))

// Mock storage module
vi.mock('@/lib/storage', () => ({
  uploadFile: vi.fn().mockResolvedValue({
    id: 'file-123',
    path: '/data/uploads/sessions/session-1/file-123.mp3',
    url: '/api/files/sessions/session-1/file-123.mp3',
    size: 1024,
  }),
}))

// Mock processing module
vi.mock('@/lib/processing', () => ({
  processSession: vi.fn().mockResolvedValue(undefined),
}))

describe('GET /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns list of sessions', async () => {
    const mockSessions = [
      {
        id: 'session-1',
        designWeekId: 'dw-1',
        sessionNumber: 1,
        phase: 1,
        date: new Date('2026-01-27T10:00:00Z'),
        recordingUrl: '/api/files/sessions/session-1/recording.mp3',
        processingStatus: 'COMPLETE',
        topicsCovered: ['scope', 'goals'],
        materials: [
          {
            id: 'material-1',
            type: 'RECORDING',
            filename: 'recording.mp3',
          },
        ],
        _count: {
          extractions: 5,
          transcript: 1,
        },
      },
    ]

    mockedPrisma.session.findMany.mockResolvedValue(mockSessions as never)

    const request = new NextRequest('http://localhost/api/sessions')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('session-1')
    expect(data[0].processingStatus).toBe('COMPLETE')
    expect(mockedPrisma.session.findMany).toHaveBeenCalledOnce()
  })

  it('filters by designWeekId when provided', async () => {
    mockedPrisma.session.findMany.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/sessions?designWeekId=dw-1')
    await GET(request)

    expect(mockedPrisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { designWeekId: 'dw-1' },
      })
    )
  })

  it('returns all sessions when no filter provided', async () => {
    mockedPrisma.session.findMany.mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/sessions')
    await GET(request)

    expect(mockedPrisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    )
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.session.findMany.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/sessions')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch sessions')
  })
})

describe('POST /api/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when designWeekId is missing', async () => {
    const formData = new FormData()
    formData.append('phase', '1')

    const request = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Design week ID is required')
    expect(mockedPrisma.session.create).not.toHaveBeenCalled()
  })

  it('creates a session with no files', async () => {
    const mockSession = {
      id: 'session-1',
      designWeekId: 'dw-1',
      sessionNumber: 1,
      phase: 2,
      date: new Date(),
      recordingUrl: null,
      processingStatus: 'PENDING',
      topicsCovered: [],
    }

    mockedPrisma.session.count.mockResolvedValue(0)
    mockedPrisma.session.create.mockResolvedValue(mockSession as never)

    const formData = new FormData()
    formData.append('designWeekId', 'dw-1')
    formData.append('phase', '2')

    const request = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('session-1')
    expect(data.phase).toBe(2)
    expect(mockedPrisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          designWeekId: 'dw-1',
          phase: 2,
          sessionNumber: 1,
          processingStatus: 'PENDING',
        }),
      })
    )
  })

  it('increments session number based on existing sessions', async () => {
    const mockSession = {
      id: 'session-3',
      designWeekId: 'dw-1',
      sessionNumber: 3,
      phase: 1,
      date: new Date(),
      recordingUrl: null,
      processingStatus: 'PENDING',
      topicsCovered: [],
    }

    mockedPrisma.session.count.mockResolvedValue(2) // 2 existing sessions
    mockedPrisma.session.create.mockResolvedValue(mockSession as never)

    const formData = new FormData()
    formData.append('designWeekId', 'dw-1')
    formData.append('phase', '1')

    const request = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: formData,
    })

    await POST(request)

    expect(mockedPrisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionNumber: 3, // 2 + 1
        }),
      })
    )
  })

  it('accepts recording URL parameter', async () => {
    const mockSession = {
      id: 'session-1',
      designWeekId: 'dw-1',
      sessionNumber: 1,
      phase: 1,
      date: new Date(),
      recordingUrl: 'https://zoom.us/recording/123',
      processingStatus: 'PENDING',
      topicsCovered: [],
    }

    mockedPrisma.session.count.mockResolvedValue(0)
    mockedPrisma.session.create.mockResolvedValue(mockSession as never)

    const formData = new FormData()
    formData.append('designWeekId', 'dw-1')
    formData.append('phase', '1')
    formData.append('recordingUrl', 'https://zoom.us/recording/123')

    const request = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: formData,
    })

    await POST(request)

    expect(mockedPrisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recordingUrl: 'https://zoom.us/recording/123',
        }),
      })
    )
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.session.count.mockRejectedValue(new Error('Database error'))

    const formData = new FormData()
    formData.append('designWeekId', 'dw-1')
    formData.append('phase', '1')

    const request = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create session')
  })
})

describe('GET /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns session details', async () => {
    const mockSession = {
      id: 'session-1',
      phase: 1,
      sessionNumber: 1,
      designWeek: { digitalEmployee: { company: { name: 'Acme' } } },
      materials: [],
      extractions: [],
      transcript: [],
    }
    mockedPrisma.session.findUnique.mockResolvedValue(mockSession as never)

    const request = new NextRequest('http://localhost/api/sessions/session-1')
    const response = await getSession(request, { params: Promise.resolve({ id: 'session-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('session-1')
  })

  it('returns 404 when session not found', async () => {
    mockedPrisma.session.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/sessions/nonexistent')
    const response = await getSession(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Session not found')
  })

  it('handles errors gracefully', async () => {
    mockedPrisma.session.findUnique.mockRejectedValue(new Error('DB Error'))

    const request = new NextRequest('http://localhost/api/sessions/session-1')
    const response = await getSession(request, { params: Promise.resolve({ id: 'session-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch session')
  })
})

describe('PATCH /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates session successfully', async () => {
    mockedPrisma.session.update.mockResolvedValue({
      id: 'session-1',
      processingStatus: 'COMPLETE',
    } as never)

    const request = new NextRequest('http://localhost/api/sessions/session-1', {
      method: 'PATCH',
      body: JSON.stringify({ processingStatus: 'COMPLETE' }),
    })

    const response = await updateSession(request, { params: Promise.resolve({ id: 'session-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.processingStatus).toBe('COMPLETE')
    expect(mockedPrisma.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { processingStatus: 'COMPLETE' },
    })
  })

  it('handles errors gracefully', async () => {
    mockedPrisma.session.update.mockRejectedValue(new Error('DB Error'))

    const request = new NextRequest('http://localhost/api/sessions/session-1', {
      method: 'PATCH',
      body: JSON.stringify({ processingStatus: 'COMPLETE' }),
    })

    const response = await updateSession(request, { params: Promise.resolve({ id: 'session-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update session')
  })
})

describe('DELETE /api/sessions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes session successfully', async () => {
    mockedPrisma.session.delete.mockResolvedValue({} as never)

    const request = new NextRequest('http://localhost/api/sessions/session-1', {
      method: 'DELETE',
    })

    const response = await deleteSession(request, { params: Promise.resolve({ id: 'session-1' }) })

    expect(response.status).toBe(204)
    expect(mockedPrisma.session.delete).toHaveBeenCalledWith({
      where: { id: 'session-1' },
    })
  })

  it('handles errors gracefully', async () => {
    mockedPrisma.session.delete.mockRejectedValue(new Error('DB Error'))

    const request = new NextRequest('http://localhost/api/sessions/session-1', {
      method: 'DELETE',
    })

    const response = await deleteSession(request, { params: Promise.resolve({ id: 'session-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to delete session')
  })
})

describe('GET /api/sessions/[id]/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns extracted items for a session', async () => {
    const mockItems = [
      { id: 'item-1', type: 'GOAL', content: 'Goal 1' },
      { id: 'item-2', type: 'STAKEHOLDER', content: 'John Doe' },
    ]
    mockedPrisma.extractedItem.findMany.mockResolvedValue(mockItems as never)

    const request = new NextRequest('http://localhost/api/sessions/session-1/extract')
    const response = await getExtractedItems(request, { params: Promise.resolve({ id: 'session-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.items).toHaveLength(2)
    expect(mockedPrisma.extractedItem.findMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    })
  })

  it('handles errors gracefully', async () => {
    mockedPrisma.extractedItem.findMany.mockRejectedValue(new Error('DB Error'))

    const request = new NextRequest('http://localhost/api/sessions/session-1/extract')
    const response = await getExtractedItems(request, { params: Promise.resolve({ id: 'session-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch extracted items')
  })
})

describe('POST /api/sessions/[id]/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when transcript is missing', async () => {
    const request = new NextRequest('http://localhost/api/sessions/session-1/extract', {
      method: 'POST',
      body: JSON.stringify({ sessionType: 'kickoff' }),
    })

    const response = await extractItems(request, { params: Promise.resolve({ id: 'session-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('returns 400 when sessionType is missing', async () => {
    const request = new NextRequest('http://localhost/api/sessions/session-1/extract', {
      method: 'POST',
      body: JSON.stringify({ transcript: 'Some transcript' }),
    })

    const response = await extractItems(request, { params: Promise.resolve({ id: 'session-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('returns 404 when session not found', async () => {
    mockedPrisma.session.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/sessions/nonexistent/extract', {
      method: 'POST',
      body: JSON.stringify({ transcript: 'Some transcript', sessionType: 'kickoff' }),
    })

    const response = await extractItems(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Session not found')
  })

  it('extracts items successfully', async () => {
    mockedPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' } as never)
    mockedPrisma.session.update.mockResolvedValue({} as never)
    mockedPrisma.extractedItem.count.mockResolvedValue(0)
    mockedPrisma.observatoryLLMOperation.create.mockResolvedValue({} as never)

    const request = new NextRequest('http://localhost/api/sessions/session-1/extract', {
      method: 'POST',
      body: JSON.stringify({
        transcript: 'Meeting transcript content',
        sessionType: 'kickoff',
      }),
    })

    const response = await extractItems(request, { params: Promise.resolve({ id: 'session-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.itemCount).toBe(1)
  })

  it('deletes existing items before re-extracting', async () => {
    mockedPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' } as never)
    mockedPrisma.session.update.mockResolvedValue({} as never)
    mockedPrisma.extractedItem.count.mockResolvedValue(5)
    mockedPrisma.extractedItem.deleteMany.mockResolvedValue({ count: 5 } as never)
    mockedPrisma.observatoryLLMOperation.create.mockResolvedValue({} as never)

    const request = new NextRequest('http://localhost/api/sessions/session-1/extract', {
      method: 'POST',
      body: JSON.stringify({
        transcript: 'Re-process this transcript',
        sessionType: 'process',
      }),
    })

    await extractItems(request, { params: Promise.resolve({ id: 'session-1' }) })

    expect(mockedPrisma.extractedItem.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-1' },
    })
  })

  it('logs operation to observatory', async () => {
    mockedPrisma.session.findUnique.mockResolvedValue({ id: 'session-1' } as never)
    mockedPrisma.session.update.mockResolvedValue({} as never)
    mockedPrisma.extractedItem.count.mockResolvedValue(0)
    mockedPrisma.observatoryLLMOperation.create.mockResolvedValue({} as never)

    const request = new NextRequest('http://localhost/api/sessions/session-1/extract', {
      method: 'POST',
      body: JSON.stringify({
        transcript: 'Transcript',
        sessionType: 'technical',
      }),
    })

    await extractItems(request, { params: Promise.resolve({ id: 'session-1' }) })

    expect(mockedPrisma.observatoryLLMOperation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pipelineName: 'extract_technical',
        model: 'claude-sonnet-4-5-20250929',
        success: true,
      }),
    })
  })
})
