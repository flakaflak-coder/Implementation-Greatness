import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/sessions/route'
import { mockPrisma } from '../setup'

// Use the exported mock from setup
const mockedPrisma = mockPrisma

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
