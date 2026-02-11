import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Define mocks inside factories
vi.mock('@/lib/db', () => ({
  prisma: {
    uploadJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/pipeline', () => ({
  retryPipeline: vi.fn(),
}))

// Import after mocks
import { POST as CancelPOST } from '@/app/api/upload/[jobId]/cancel/route'
import { POST as RetryPOST } from '@/app/api/upload/[jobId]/retry/route'
import { prisma } from '@/lib/db'
import { retryPipeline } from '@/lib/pipeline'

// ═══════════════════════════════════════════════════════════════════════════════
// CANCEL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/upload/[jobId]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid job ID format', async () => {
    const request = new NextRequest('http://localhost/api/upload/invalid id!/cancel', {
      method: 'POST',
    })

    const response = await CancelPOST(request, { params: Promise.resolve({ jobId: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 404 when job not found', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/upload/job-nonexistent/cancel', {
      method: 'POST',
    })

    const response = await CancelPOST(request, { params: Promise.resolve({ jobId: 'job-nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Job not found')
  })

  it('returns success with message when job already COMPLETE', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-123',
      status: 'COMPLETE',
    } as never)

    const request = new NextRequest('http://localhost/api/upload/job-123/cancel', {
      method: 'POST',
    })

    const response = await CancelPOST(request, { params: Promise.resolve({ jobId: 'job-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Job already finished')
    expect(data.status).toBe('COMPLETE')
    expect(prisma.uploadJob.update).not.toHaveBeenCalled()
  })

  it('returns success with message when job already FAILED', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-123',
      status: 'FAILED',
    } as never)

    const request = new NextRequest('http://localhost/api/upload/job-123/cancel', {
      method: 'POST',
    })

    const response = await CancelPOST(request, { params: Promise.resolve({ jobId: 'job-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Job already finished')
    expect(data.status).toBe('FAILED')
    expect(prisma.uploadJob.update).not.toHaveBeenCalled()
  })

  it('successfully cancels a QUEUED job', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-123',
      status: 'QUEUED',
    } as never)

    vi.mocked(prisma.uploadJob.update).mockResolvedValue({
      id: 'job-123',
      status: 'FAILED',
      error: 'Cancelled by user',
    } as never)

    const request = new NextRequest('http://localhost/api/upload/job-123/cancel', {
      method: 'POST',
    })

    const response = await CancelPOST(request, { params: Promise.resolve({ jobId: 'job-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Job cancelled')

    expect(prisma.uploadJob.update).toHaveBeenCalledWith({
      where: { id: 'job-123' },
      data: {
        status: 'FAILED',
        error: 'Cancelled by user',
        completedAt: expect.any(Date),
      },
    })
  })

  it('successfully cancels a PROCESSING job', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-456',
      status: 'PROCESSING',
    } as never)

    vi.mocked(prisma.uploadJob.update).mockResolvedValue({
      id: 'job-456',
      status: 'FAILED',
      error: 'Cancelled by user',
    } as never)

    const request = new NextRequest('http://localhost/api/upload/job-456/cancel', {
      method: 'POST',
    })

    const response = await CancelPOST(request, { params: Promise.resolve({ jobId: 'job-456' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Job cancelled')
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/upload/job-123/cancel', {
      method: 'POST',
    })

    const response = await CancelPOST(request, { params: Promise.resolve({ jobId: 'job-123' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Cancel failed. Please try again.')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/upload/[jobId]/retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid job ID format', async () => {
    const request = new NextRequest('http://localhost/api/upload/invalid id!/retry', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await RetryPOST(request, { params: Promise.resolve({ jobId: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 404 when job not found', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/upload/job-nonexistent/retry', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await RetryPOST(request, { params: Promise.resolve({ jobId: 'job-nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Job not found')
  })

  it('returns 400 when job is not in FAILED state', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-123',
      status: 'PROCESSING',
      currentStage: 'CLASSIFICATION',
    } as never)

    const request = new NextRequest('http://localhost/api/upload/job-123/retry', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await RetryPOST(request, { params: Promise.resolve({ jobId: 'job-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Can only retry failed jobs')
  })

  it('returns 400 when job is COMPLETE (not FAILED)', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-123',
      status: 'COMPLETE',
      currentStage: 'POPULATION',
    } as never)

    const request = new NextRequest('http://localhost/api/upload/job-123/retry', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await RetryPOST(request, { params: Promise.resolve({ jobId: 'job-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Can only retry failed jobs')
  })

  it('returns 400 when maximum retry attempts reached', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-123',
      status: 'FAILED',
      currentStage: 'EXTRACTION',
      retryCount: 3,
    } as never)

    const request = new NextRequest('http://localhost/api/upload/job-123/retry', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await RetryPOST(request, { params: Promise.resolve({ jobId: 'job-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Maximum retry attempts (3) reached. Please upload the file again.')
    expect(prisma.uploadJob.update).not.toHaveBeenCalled()
  })

  it('returns 400 when retry count exceeds maximum', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-123',
      status: 'FAILED',
      currentStage: 'EXTRACTION',
      retryCount: 5,
    } as never)

    const request = new NextRequest('http://localhost/api/upload/job-123/retry', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await RetryPOST(request, { params: Promise.resolve({ jobId: 'job-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Maximum retry attempts (3) reached. Please upload the file again.')
  })

  it('successfully retries a failed job from its current stage', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-123',
      status: 'FAILED',
      currentStage: 'EXTRACTION',
      retryCount: 0,
    } as never)

    vi.mocked(prisma.uploadJob.update).mockResolvedValue({} as never)
    vi.mocked(retryPipeline).mockResolvedValue(undefined as never)

    const request = new NextRequest('http://localhost/api/upload/job-123/retry', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await RetryPOST(request, { params: Promise.resolve({ jobId: 'job-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.jobId).toBe('job-123')
    expect(data.status).toBe('QUEUED')
    expect(data.retryingFrom).toBe('EXTRACTION')
    expect(data.retryCount).toBe(1)
    expect(data.maxRetries).toBe(3)

    // Verify retry count was incremented
    expect(prisma.uploadJob.update).toHaveBeenCalledWith({
      where: { id: 'job-123' },
      data: { retryCount: { increment: 1 } },
    })
  })

  it('retries from a specified stage', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-456',
      status: 'FAILED',
      currentStage: 'POPULATION',
      retryCount: 1,
    } as never)

    vi.mocked(prisma.uploadJob.update).mockResolvedValue({} as never)
    vi.mocked(retryPipeline).mockResolvedValue(undefined as never)

    const request = new NextRequest('http://localhost/api/upload/job-456/retry', {
      method: 'POST',
      body: JSON.stringify({ fromStage: 'CLASSIFICATION' }),
    })

    const response = await RetryPOST(request, { params: Promise.resolve({ jobId: 'job-456' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.jobId).toBe('job-456')
    expect(data.retryingFrom).toBe('CLASSIFICATION')
    expect(data.retryCount).toBe(2)
    expect(data.maxRetries).toBe(3)
    expect(data.message).toContain('Retry started')
  })

  it('allows retry when retryCount is below maximum (2 of 3)', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockResolvedValue({
      id: 'job-789',
      status: 'FAILED',
      currentStage: 'GENERAL_EXTRACTION',
      retryCount: 2,
    } as never)

    vi.mocked(prisma.uploadJob.update).mockResolvedValue({} as never)
    vi.mocked(retryPipeline).mockResolvedValue(undefined as never)

    const request = new NextRequest('http://localhost/api/upload/job-789/retry', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await RetryPOST(request, { params: Promise.resolve({ jobId: 'job-789' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.retryCount).toBe(3)
    expect(data.maxRetries).toBe(3)
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(prisma.uploadJob.findUnique).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/upload/job-123/retry', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await RetryPOST(request, { params: Promise.resolve({ jobId: 'job-123' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Retry failed. Please try again.')
  })
})
