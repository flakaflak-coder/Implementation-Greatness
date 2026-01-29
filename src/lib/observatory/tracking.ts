// Observatory tracking utilities
// Use these to track events, errors, and LLM operations

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
