import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * Middleware combining authentication (NextAuth) and rate limiting.
 *
 * Authentication: Protects all routes except /login, /api/health, /api/auth/*
 * Rate Limiting: Applied to API routes to prevent abuse
 */

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple in-memory rate limiter
 *
 * Note: In production with multiple instances, use Redis or a distributed rate limiter.
 * This implementation works for single-instance deployments.
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 60000) // Clean up every minute
}

interface RateLimitConfig {
  windowMs: number    // Time window in milliseconds
  maxRequests: number // Max requests per window
}

// Rate limit configurations by route pattern
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth sign-in - strict to prevent brute force (only callback endpoints)
  '/api/auth/callback': { windowMs: 60000, maxRequests: 10 },     // 10 login attempts per minute
  '/api/auth/signin': { windowMs: 60000, maxRequests: 10 },       // 10 signin page loads per minute
  // Auth session/csrf/providers - high limit (called frequently by client)
  '/api/auth': { windowMs: 60000, maxRequests: 200 },             // 200 session checks per minute

  // Strict limits for sensitive operations
  '/api/upload': { windowMs: 60000, maxRequests: 10 },           // 10 uploads per minute
  '/api/assistant/chat': { windowMs: 60000, maxRequests: 30 },   // 30 chat messages per minute
  '/api/sessions/*/extract': { windowMs: 60000, maxRequests: 5 }, // 5 extractions per minute
  '/api/design-weeks/*/generate': { windowMs: 60000, maxRequests: 5 }, // 5 document generations per minute

  // Moderate limits for data modification
  '/api/companies': { windowMs: 60000, maxRequests: 60 },
  '/api/digital-employees': { windowMs: 60000, maxRequests: 60 },
  '/api/extracted-items': { windowMs: 60000, maxRequests: 100 },
  '/api/scope-items': { windowMs: 60000, maxRequests: 100 },

  // General API limit
  '/api': { windowMs: 60000, maxRequests: 200 },
}

function getRateLimitConfig(path: string): RateLimitConfig {
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pattern === '/api') continue
    const regexPattern = pattern.replace(/\*/g, '[^/]+')
    const regex = new RegExp(`^${regexPattern}`)
    if (regex.test(path)) {
      return config
    }
  }
  return RATE_LIMITS['/api']
}

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown'
}

function checkRateLimit(
  clientId: string,
  path: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = `${clientId}:${path}`
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || record.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs }
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  rateLimitStore.set(key, record)
  return { allowed: true, remaining: config.maxRequests - record.count, resetTime: record.resetTime }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/api/health',
  '/api/auth', // NextAuth routes
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}

export default auth((request) => {
  const { pathname } = request.nextUrl
  const isLoggedIn = !!request.auth?.user

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Authentication Check
  // ─────────────────────────────────────────────────────────────────────────────

  // Allow public routes
  if (isPublicRoute(pathname)) {
    // If logged in and on login page, redirect to home
    if (isLoggedIn && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // Continue to rate limiting for API routes
  } else {
    // Protected route - require authentication
    if (!isLoggedIn) {
      // API routes return 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Please sign in to access this resource' },
          { status: 401 }
        )
      }
      // Pages redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Rate Limiting (API routes only)
  // ─────────────────────────────────────────────────────────────────────────────

  if (pathname.startsWith('/api/') && pathname !== '/api/health') {
    const clientId = getClientId(request)
    const config = getRateLimitConfig(pathname)
    const result = checkRateLimit(clientId, pathname, config)

    if (!result.allowed) {
      console.warn(`[Rate Limit] Blocked request from ${clientId} to ${pathname}`)
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000) },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          },
        }
      )
    }

    // Add rate limit headers to response
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(config.maxRequests))
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)))
    return response
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
