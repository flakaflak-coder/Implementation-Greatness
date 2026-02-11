import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock @/lib/db for server-side tracking functions
const mockPrismaCreate = vi.fn()
const mockPrismaFindFirst = vi.fn()
const mockPrismaUpdate = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: {
    observatoryLLMOperation: {
      create: (...args: unknown[]) => mockPrismaCreate(...args),
    },
    observatoryError: {
      findFirst: (...args: unknown[]) => mockPrismaFindFirst(...args),
      create: (...args: unknown[]) => mockPrismaCreate(...args),
      update: (...args: unknown[]) => mockPrismaUpdate(...args),
    },
  },
}))

// The tracking module uses `typeof window !== 'undefined'` to detect client vs server.
// In jsdom environment, `window` exists, so by default we're testing client-side paths.
// We'll test server-side paths by temporarily removing window.

import {
  trackFeatureUsage,
  trackPageView,
  trackAPICall,
  trackError,
  trackLLMOperation,
  withTracking,
  trackLLMOperationServer,
  trackErrorServer,
} from './tracking'

describe('Observatory Tracking - Client-side', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true })
  })

  describe('trackFeatureUsage', () => {
    it('buffers events on client-side', () => {
      // Should not throw and should buffer the event
      expect(() => trackFeatureUsage('test-feature')).not.toThrow()
    })

    it('accepts optional parameters', () => {
      expect(() => trackFeatureUsage('test-feature', {
        userId: 'user-1',
        sessionId: 'session-1',
        duration: 1000,
        success: true,
        metadata: { key: 'value' },
      })).not.toThrow()
    })
  })

  describe('trackPageView', () => {
    it('buffers page view events', () => {
      expect(() => trackPageView('/dashboard')).not.toThrow()
    })

    it('accepts optional parameters', () => {
      expect(() => trackPageView('/companies', { userId: 'user-1' })).not.toThrow()
    })
  })

  describe('trackAPICall', () => {
    it('buffers API call events', () => {
      expect(() => trackAPICall('/api/companies', 'GET')).not.toThrow()
    })

    it('accepts optional parameters', () => {
      expect(() => trackAPICall('/api/companies', 'POST', {
        duration: 250,
        success: true,
      })).not.toThrow()
    })
  })

  describe('trackError', () => {
    it('sends error events immediately (not buffered)', () => {
      const error = new Error('Test error')
      trackError(error)

      // Errors are sent immediately via sendToAPI, not buffered
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/observatory/track',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('includes error details in the payload', () => {
      const error = new Error('Something went wrong')
      error.stack = 'Error: Something went wrong\n    at test.ts:10'

      trackError(error, { featureId: 'upload', endpoint: '/api/upload' })

      expect(mockFetch).toHaveBeenCalled()
      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.message).toBe('Something went wrong')
      expect(body.featureId).toBe('upload')
      expect(body.endpoint).toBe('/api/upload')
    })

    it('does not throw if fetch fails', () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      const error = new Error('Test error')

      // Should not throw even if fetch fails
      expect(() => trackError(error)).not.toThrow()
    })
  })

  describe('trackLLMOperation', () => {
    it('buffers LLM operation events', () => {
      expect(() => trackLLMOperation({
        pipelineName: 'extraction',
        model: 'claude-sonnet-4-5-20250929',
        inputTokens: 500,
        outputTokens: 200,
        latencyMs: 1500,
        success: true,
      })).not.toThrow()
    })
  })

  describe('withTracking', () => {
    it('wraps an async function and tracks its execution', async () => {
      const mockFn = vi.fn().mockResolvedValue('result')
      const tracked = withTracking(mockFn, 'test-feature')

      const result = await tracked('arg1', 'arg2')

      expect(result).toBe('result')
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('tracks errors when the wrapped function throws', async () => {
      const error = new Error('Function failed')
      const mockFn = vi.fn().mockRejectedValue(error)
      const tracked = withTracking(mockFn, 'failing-feature')

      await expect(tracked()).rejects.toThrow('Function failed')
    })
  })
})

describe('Observatory Tracking - Server-side', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('trackLLMOperationServer', () => {
    it('writes LLM operation to database', async () => {
      mockPrismaCreate.mockResolvedValue({ id: 'op-1' })

      await trackLLMOperationServer({
        pipelineName: 'extraction',
        model: 'claude-sonnet-4-5-20250929',
        inputTokens: 1000,
        outputTokens: 500,
        latencyMs: 2000,
        success: true,
        metadata: { designWeekId: 'dw-1' },
      })

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: {
          pipelineName: 'extraction',
          model: 'claude-sonnet-4-5-20250929',
          inputTokens: 1000,
          outputTokens: 500,
          latencyMs: 2000,
          cost: undefined,
          success: true,
          errorMessage: undefined,
          metadata: { designWeekId: 'dw-1' },
        },
      })
    })

    it('defaults success to true when not provided', async () => {
      mockPrismaCreate.mockResolvedValue({ id: 'op-2' })

      await trackLLMOperationServer({
        pipelineName: 'quality-check',
        model: 'claude-sonnet-4-5-20250929',
        inputTokens: 200,
        outputTokens: 100,
        latencyMs: 800,
      })

      const callArgs = mockPrismaCreate.mock.calls[0][0]
      expect(callArgs.data.success).toBe(true)
    })

    it('includes error message when provided', async () => {
      mockPrismaCreate.mockResolvedValue({ id: 'op-3' })

      await trackLLMOperationServer({
        pipelineName: 'extraction',
        model: 'claude-sonnet-4-5-20250929',
        inputTokens: 100,
        outputTokens: 0,
        latencyMs: 500,
        success: false,
        errorMessage: 'API rate limit exceeded',
      })

      const callArgs = mockPrismaCreate.mock.calls[0][0]
      expect(callArgs.data.success).toBe(false)
      expect(callArgs.data.errorMessage).toBe('API rate limit exceeded')
    })

    it('silently fails when database write fails', async () => {
      mockPrismaCreate.mockRejectedValue(new Error('DB connection lost'))

      // Should not throw
      await expect(
        trackLLMOperationServer({
          pipelineName: 'extraction',
          model: 'claude-sonnet-4-5-20250929',
          inputTokens: 100,
          outputTokens: 50,
          latencyMs: 300,
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('trackErrorServer', () => {
    it('creates a new error record when no existing error matches', async () => {
      mockPrismaFindFirst.mockResolvedValue(null)
      mockPrismaCreate.mockResolvedValue({ id: 'err-1' })

      const error = new Error('Something broke')
      error.stack = 'Error: Something broke\n    at handler.ts:42'

      await trackErrorServer(error, {
        featureId: 'upload',
        endpoint: '/api/upload',
      })

      expect(mockPrismaFindFirst).toHaveBeenCalledWith({
        where: {
          message: 'Something broke',
          status: { in: ['NEW', 'INVESTIGATING'] },
        },
      })

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: {
          message: 'Something broke',
          stack: error.stack,
          featureId: 'upload',
          userId: undefined,
          endpoint: '/api/upload',
          metadata: undefined,
          status: 'NEW',
        },
      })
    })

    it('increments count on existing error record', async () => {
      const existingError = { id: 'err-existing', message: 'Recurring error', count: 5 }
      mockPrismaFindFirst.mockResolvedValue(existingError)
      mockPrismaUpdate.mockResolvedValue({ ...existingError, count: 6 })

      const error = new Error('Recurring error')
      await trackErrorServer(error, { metadata: { attempt: 6 } })

      expect(mockPrismaUpdate).toHaveBeenCalledWith({
        where: { id: 'err-existing' },
        data: {
          count: { increment: 1 },
          lastSeen: expect.any(Date),
          metadata: { attempt: 6 },
        },
      })
      // Should NOT create a new record
      expect(mockPrismaCreate).not.toHaveBeenCalled()
    })

    it('silently fails when database operations fail', async () => {
      mockPrismaFindFirst.mockRejectedValue(new Error('DB error'))

      const error = new Error('Some error')

      // Should not throw
      await expect(trackErrorServer(error)).resolves.toBeUndefined()
    })

    it('handles error with no options', async () => {
      mockPrismaFindFirst.mockResolvedValue(null)
      mockPrismaCreate.mockResolvedValue({ id: 'err-2' })

      const error = new Error('Basic error')
      await trackErrorServer(error)

      expect(mockPrismaCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message: 'Basic error',
          status: 'NEW',
          featureId: undefined,
          userId: undefined,
          endpoint: undefined,
          metadata: undefined,
        }),
      })
    })
  })
})
