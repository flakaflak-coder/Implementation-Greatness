import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Define mocks inside factories
vi.mock('@/lib/db', () => ({
  prisma: {
    uploadJob: {
      findUnique: vi.fn(),
    },
  },
}))

// Import after mocks
import { GET } from '@/app/api/upload/[jobId]/status/route'
import { prisma } from '@/lib/db'

/**
 * Helper to read the first SSE event from a Response stream.
 * Returns the parsed data object from the first `data: ...` line.
 */
async function readFirstSSEEvent(response: Response): Promise<unknown> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE events end with \n\n
    const eventEnd = buffer.indexOf('\n\n')
    if (eventEnd !== -1) {
      const eventStr = buffer.substring(0, eventEnd)
      // Cancel the reader to stop further reads
      await reader.cancel()
      // Parse the data line
      const dataLine = eventStr.split('\n').find(line => line.startsWith('data: '))
      if (dataLine) {
        return JSON.parse(dataLine.replace('data: ', ''))
      }
    }
  }

  return null
}

describe('GET /api/upload/[jobId]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Use fake timers to prevent the 1-second polling interval from firing
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 400 for invalid job ID format', async () => {
    const request = new NextRequest('http://localhost/api/upload/invalid id!/status')

    const response = await GET(request, { params: Promise.resolve({ jobId: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 404 when job not found', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/upload/job-nonexistent/status')

    const response = await GET(request, { params: Promise.resolve({ jobId: 'job-nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Job not found')
  })

  it('returns SSE stream with initial status for QUEUED job', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-123',
      status: 'QUEUED',
      currentStage: null,
      stageProgress: null,
    } as never)

    const controller = new AbortController()
    const request = new NextRequest('http://localhost/api/upload/job-123/status', {
      signal: controller.signal,
    })

    const response = await GET(request, { params: Promise.resolve({ jobId: 'job-123' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')

    // Read the initial SSE event
    const data = await readFirstSSEEvent(response)

    expect(data).toEqual({
      jobId: 'job-123',
      status: 'QUEUED',
      stage: null,
      progress: null,
    })
  })

  it('returns SSE stream with initial status for PROCESSING job', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-456',
      status: 'PROCESSING',
      currentStage: 'CLASSIFICATION',
      stageProgress: { step: 1, total: 3 },
    } as never)

    const controller = new AbortController()
    const request = new NextRequest('http://localhost/api/upload/job-456/status', {
      signal: controller.signal,
    })

    const response = await GET(request, { params: Promise.resolve({ jobId: 'job-456' }) })

    expect(response.status).toBe(200)

    const data = await readFirstSSEEvent(response)

    expect(data).toEqual({
      jobId: 'job-456',
      status: 'PROCESSING',
      stage: 'CLASSIFICATION',
      progress: { step: 1, total: 3 },
    })
  })
})
