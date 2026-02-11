import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/observatory/track/route'
import { POST as batchPOST } from '@/app/api/observatory/track/batch/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('POST /api/observatory/track', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records a FEATURE_USAGE event', async () => {
    mockedPrisma.observatoryEvent.create.mockResolvedValue({} as never)

    const request = new Request('http://localhost/api/observatory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'FEATURE_USAGE',
        featureId: 'dashboard',
        userId: 'user-1',
        sessionId: 'session-abc',
        success: true,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'FEATURE_USAGE',
        featureId: 'dashboard',
        userId: 'user-1',
        sessionId: 'session-abc',
        success: true,
      }),
    })
  })

  it('records a PAGE_VIEW event', async () => {
    mockedPrisma.observatoryEvent.create.mockResolvedValue({} as never)

    const request = new Request('http://localhost/api/observatory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'PAGE_VIEW',
        featureId: 'support-dashboard',
        duration: 5000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryEvent.create).toHaveBeenCalledOnce()
  })

  it('records an ERROR event as new error', async () => {
    mockedPrisma.observatoryError.findFirst.mockResolvedValue(null as never)
    mockedPrisma.observatoryError.create.mockResolvedValue({} as never)

    const request = new Request('http://localhost/api/observatory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ERROR',
        message: 'Connection timeout',
        featureId: 'extraction-pipeline',
        endpoint: '/api/extract',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryError.findFirst).toHaveBeenCalledOnce()
    expect(mockedPrisma.observatoryError.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        message: 'Connection timeout',
        featureId: 'extraction-pipeline',
        endpoint: '/api/extract',
        status: 'NEW',
      }),
    })
  })

  it('increments count for existing ERROR event', async () => {
    const existingError = { id: 'err-1', message: 'Connection timeout', count: 3 }
    mockedPrisma.observatoryError.findFirst.mockResolvedValue(existingError as never)
    mockedPrisma.observatoryError.update.mockResolvedValue({} as never)

    const request = new Request('http://localhost/api/observatory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ERROR',
        message: 'Connection timeout',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryError.update).toHaveBeenCalledWith({
      where: { id: 'err-1' },
      data: expect.objectContaining({
        count: { increment: 1 },
      }),
    })
    expect(mockedPrisma.observatoryError.create).not.toHaveBeenCalled()
  })

  it('records an LLM_OPERATION event', async () => {
    mockedPrisma.observatoryLLMOperation.create.mockResolvedValue({} as never)

    const request = new Request('http://localhost/api/observatory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'LLM_OPERATION',
        pipelineName: 'extraction',
        model: 'claude-3-opus',
        inputTokens: 5000,
        outputTokens: 1500,
        latencyMs: 3200,
        cost: 0.05,
        success: true,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockedPrisma.observatoryLLMOperation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pipelineName: 'extraction',
        model: 'claude-3-opus',
        inputTokens: 5000,
        outputTokens: 1500,
        latencyMs: 3200,
        cost: 0.05,
        success: true,
      }),
    })
  })

  it('returns 400 for invalid event type', async () => {
    const request = new Request('http://localhost/api/observatory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'INVALID_TYPE',
        featureId: 'test',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid input')
    expect(data.details).toBeDefined()
  })

  it('returns 400 for missing required ERROR fields', async () => {
    const request = new Request('http://localhost/api/observatory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ERROR',
        // missing required 'message' field
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('returns 400 for missing required LLM_OPERATION fields', async () => {
    const request = new Request('http://localhost/api/observatory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'LLM_OPERATION',
        // missing required pipelineName and model
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('returns 400 for invalid JSON body', async () => {
    const request = new Request('http://localhost/api/observatory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid JSON body')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.observatoryEvent.create.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost/api/observatory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'FEATURE_USAGE',
        featureId: 'dashboard',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to record event')
  })
})

describe('POST /api/observatory/track/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('processes a batch of mixed events', async () => {
    mockedPrisma.observatoryEvent.createMany.mockResolvedValue({ count: 2 } as never)
    mockedPrisma.observatoryLLMOperation.createMany.mockResolvedValue({ count: 1 } as never)
    mockedPrisma.observatoryError.findFirst.mockResolvedValue(null as never)
    mockedPrisma.observatoryError.create.mockResolvedValue({} as never)

    const request = new Request('http://localhost/api/observatory/track/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          {
            type: 'FEATURE_USAGE',
            data: { featureId: 'dashboard', userId: 'user-1' },
          },
          {
            type: 'PAGE_VIEW',
            data: { featureId: 'support', sessionId: 'sess-1' },
          },
          {
            type: 'LLM_OPERATION',
            data: {
              pipelineName: 'extraction',
              model: 'claude-3-opus',
              inputTokens: 5000,
              outputTokens: 1500,
              latencyMs: 3200,
            },
          },
          {
            type: 'ERROR',
            data: { message: 'Test error', endpoint: '/api/test' },
          },
        ],
      }),
    })

    const response = await batchPOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.processed.events).toBe(2)
    expect(data.processed.llmOperations).toBe(1)
    expect(data.processed.errors).toBe(1)
    expect(data.processed.total).toBe(4)
  })

  it('handles batch with only regular events', async () => {
    mockedPrisma.observatoryEvent.createMany.mockResolvedValue({ count: 2 } as never)

    const request = new Request('http://localhost/api/observatory/track/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          { type: 'FEATURE_USAGE', data: { featureId: 'dashboard' } },
          { type: 'API_CALL', data: { featureId: 'companies-crud' } },
        ],
      }),
    })

    const response = await batchPOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.processed.events).toBe(2)
    expect(data.processed.llmOperations).toBe(0)
    expect(data.processed.errors).toBe(0)
    expect(mockedPrisma.observatoryEvent.createMany).toHaveBeenCalledOnce()
  })

  it('returns 400 for empty events array', async () => {
    const request = new Request('http://localhost/api/observatory/track/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [],
      }),
    })

    const response = await batchPOST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid input')
  })

  it('returns 400 for missing events field', async () => {
    const request = new Request('http://localhost/api/observatory/track/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await batchPOST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('returns 400 for invalid JSON body', async () => {
    const request = new Request('http://localhost/api/observatory/track/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{',
    })

    const response = await batchPOST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid JSON body')
  })

  it('skips malformed events in batch and processes valid ones', async () => {
    mockedPrisma.observatoryEvent.createMany.mockResolvedValue({ count: 1 } as never)

    const request = new Request('http://localhost/api/observatory/track/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          { type: 'FEATURE_USAGE', data: { featureId: 'dashboard' } },
          {
            type: 'FEATURE_USAGE',
            data: {
              // duration exceeds max (86400000)
              duration: 999999999,
            },
          },
        ],
      }),
    })

    const response = await batchPOST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // First event processes, second is skipped due to invalid duration
    expect(data.processed.events).toBe(1)
    expect(data.skipped).toBe(1)
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.observatoryEvent.createMany.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost/api/observatory/track/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [
          { type: 'FEATURE_USAGE', data: { featureId: 'dashboard' } },
        ],
      }),
    })

    const response = await batchPOST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to record events')
  })
})
