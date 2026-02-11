import { NextRequest, NextResponse } from 'next/server'
import { trackErrorServer } from '@/lib/observatory/tracking'

/**
 * Wraps an API route handler with automatic error tracking via the Observatory system.
 * Catches unhandled errors, logs them, tracks them in the database, and returns a 500 response.
 *
 * Usage:
 *   export const GET = withErrorTracking(async (request) => {
 *     // ... handler logic
 *     return NextResponse.json({ success: true, data })
 *   }, '/api/my-route')
 */
export function withErrorTracking(
  handler: (request: NextRequest) => Promise<NextResponse>,
  endpoint: string
) {
  return async (request?: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request as NextRequest)
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      console.error(`[API Error] ${endpoint}:`, error)

      // Track to Observatory - swallow any tracking errors so they don't mask the original
      await trackErrorServer(errorObj, { endpoint }).catch(() => {})

      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
