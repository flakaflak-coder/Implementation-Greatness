// Observatory tracking utilities
// Use these to track events, errors, and LLM operations
//
// Client-side: Uses buffering and API calls
// Server-side: Writes directly to database via trackLLMOperationServer()

type EventType = 'FEATURE_USAGE' | 'PAGE_VIEW' | 'API_CALL' | 'ERROR' | 'LLM_OPERATION'

interface TrackEventOptions {
  featureId?: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, unknown>
  duration?: number
  success?: boolean
}

interface TrackErrorOptions {
  featureId?: string
  userId?: string
  endpoint?: string
  metadata?: Record<string, unknown>
}

interface TrackLLMOptions {
  pipelineName: string
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  cost?: number
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, unknown>
}

// In-memory buffer for batching events (in production, send to API)
const eventBuffer: Array<{ type: EventType; data: unknown; timestamp: Date }> = []
const BUFFER_SIZE = 10
const FLUSH_INTERVAL = 5000 // 5 seconds

// Track feature usage
export function trackFeatureUsage(featureId: string, options: Omit<TrackEventOptions, 'featureId'> = {}) {
  const event = {
    type: 'FEATURE_USAGE' as const,
    featureId,
    ...options,
    timestamp: new Date(),
  }

  if (typeof window !== 'undefined') {
    // Client-side: send to API or buffer
    bufferEvent('FEATURE_USAGE', event)
  } else {
    // Server-side: log for now, could write to DB directly
    console.log('[Observatory] Feature usage:', featureId, options)
  }
}

// Track page views
export function trackPageView(path: string, options: Omit<TrackEventOptions, 'featureId'> = {}) {
  const event = {
    type: 'PAGE_VIEW' as const,
    path,
    ...options,
    timestamp: new Date(),
  }

  if (typeof window !== 'undefined') {
    bufferEvent('PAGE_VIEW', event)
  } else {
    console.log('[Observatory] Page view:', path)
  }
}

// Track API calls
export function trackAPICall(endpoint: string, method: string, options: TrackEventOptions = {}) {
  const event = {
    type: 'API_CALL' as const,
    endpoint,
    method,
    ...options,
    timestamp: new Date(),
  }

  if (typeof window !== 'undefined') {
    bufferEvent('API_CALL', event)
  } else {
    console.log('[Observatory] API call:', method, endpoint, options.duration ? `${options.duration}ms` : '')
  }
}

// Track errors
export function trackError(error: Error, options: TrackErrorOptions = {}) {
  const errorData = {
    type: 'ERROR' as const,
    message: error.message,
    stack: error.stack,
    ...options,
    timestamp: new Date(),
  }

  if (typeof window !== 'undefined') {
    // Client-side: send immediately (errors are important)
    sendToAPI('/api/observatory/track', errorData).catch(console.error)
  } else {
    // Server-side: log and could write to DB
    console.error('[Observatory] Error:', error.message, options)
  }
}

// Track LLM operations
export function trackLLMOperation(options: TrackLLMOptions) {
  const llmData = {
    type: 'LLM_OPERATION' as const,
    ...options,
    timestamp: new Date(),
  }

  if (typeof window !== 'undefined') {
    bufferEvent('LLM_OPERATION', llmData)
  } else {
    console.log('[Observatory] LLM operation:', options.pipelineName, `${options.latencyMs}ms`, options.success ? 'success' : 'failed')
  }
}

// Buffer events for batching
function bufferEvent(type: EventType, data: unknown) {
  eventBuffer.push({ type, data, timestamp: new Date() })

  if (eventBuffer.length >= BUFFER_SIZE) {
    flushEvents()
  }
}

// Flush buffered events to API
async function flushEvents() {
  if (eventBuffer.length === 0) return

  const events = [...eventBuffer]
  eventBuffer.length = 0

  try {
    await sendToAPI('/api/observatory/track/batch', { events })
  } catch (error) {
    console.error('[Observatory] Failed to flush events:', error)
    // Put events back in buffer (with limit to prevent memory issues)
    if (eventBuffer.length < 100) {
      eventBuffer.push(...events)
    }
  }
}

// Send data to observatory API
async function sendToAPI(endpoint: string, data: unknown): Promise<void> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Observatory API error: ${response.status}`)
    }
  } catch (error) {
    // Silently fail tracking - don't break the app
    console.error('[Observatory] Tracking failed:', error)
  }
}

// Set up periodic flushing (client-side only)
if (typeof window !== 'undefined') {
  setInterval(flushEvents, FLUSH_INTERVAL)

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    if (eventBuffer.length > 0) {
      // Use sendBeacon for reliable delivery on page close
      navigator.sendBeacon('/api/observatory/track/batch', JSON.stringify({ events: eventBuffer }))
    }
  })
}

// Higher-order function for tracking async operations
export function withTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  featureId: string
): T {
  return (async (...args: unknown[]) => {
    const start = Date.now()
    let success = true

    try {
      const result = await fn(...args)
      return result
    } catch (error) {
      success = false
      if (error instanceof Error) {
        trackError(error, { featureId })
      }
      throw error
    } finally {
      trackFeatureUsage(featureId, {
        duration: Date.now() - start,
        success,
      })
    }
  }) as T
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER-SIDE TRACKING
// These functions write directly to the database and should only be used server-side
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Track an LLM operation server-side (writes directly to database)
 * Use this in claude.ts, gemini.ts, and other server-side LLM code
 */
export async function trackLLMOperationServer(options: TrackLLMOptions): Promise<void> {
  // Dynamic import to avoid bundling Prisma in client code
  try {
    const { prisma } = await import('@/lib/db')
    await prisma.observatoryLLMOperation.create({
      data: {
        pipelineName: options.pipelineName,
        model: options.model,
        inputTokens: options.inputTokens,
        outputTokens: options.outputTokens,
        latencyMs: options.latencyMs,
        cost: options.cost,
        success: options.success ?? true,
        errorMessage: options.errorMessage,
        metadata: options.metadata as object | undefined,
      },
    })
  } catch (error) {
    // Silently fail - don't break the main operation
    console.error('[Observatory] Failed to track LLM operation:', error)
  }
}

/**
 * Track an error server-side (writes directly to database)
 * Use this in API routes and server-side code
 */
export async function trackErrorServer(
  error: Error,
  options: TrackErrorOptions = {}
): Promise<void> {
  try {
    const { prisma } = await import('@/lib/db')

    // Check for existing error with same message
    const existing = await prisma.observatoryError.findFirst({
      where: {
        message: error.message,
        status: { in: ['NEW', 'INVESTIGATING'] },
      },
    })

    if (existing) {
      await prisma.observatoryError.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
          lastSeen: new Date(),
          metadata: options.metadata as object | undefined,
        },
      })
    } else {
      await prisma.observatoryError.create({
        data: {
          message: error.message,
          stack: error.stack,
          featureId: options.featureId,
          userId: options.userId,
          endpoint: options.endpoint,
          metadata: options.metadata as object | undefined,
          status: 'NEW',
        },
      })
    }
  } catch (err) {
    console.error('[Observatory] Failed to track error:', err)
  }
}
