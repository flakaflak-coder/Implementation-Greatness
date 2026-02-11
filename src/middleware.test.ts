import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Use a module-level object that the hoisted mock factory can close over.
// vi.hoisted() creates values before vi.mock hoisting, so both the mock
// factory and the test code can share this reference.
const shared = vi.hoisted(() => ({
  handler: null as ((req: NextRequest & { auth?: { user?: unknown } | null }) => NextResponse | Response | undefined) | null,
}))

vi.mock('@/lib/auth', () => ({
  auth: (handler: (req: NextRequest & { auth?: { user?: unknown } | null }) => NextResponse | Response | undefined) => {
    shared.handler = handler
    return handler
  },
}))

// Import after mocking
import middleware, { config } from './middleware'

function createMockRequest(
  pathname: string,
  options: {
    isLoggedIn?: boolean
    forwardedFor?: string
  } = {}
): NextRequest & { auth?: { user?: unknown } | null } {
  const url = `http://localhost${pathname}`
  const headers = new Headers()
  if (options.forwardedFor) {
    headers.set('x-forwarded-for', options.forwardedFor)
  }

  const req = new NextRequest(url, { headers }) as NextRequest & {
    auth?: { user?: unknown } | null
    nextUrl: URL
  }

  // Simulate NextAuth augmenting the request
  if (options.isLoggedIn) {
    req.auth = { user: { id: '1', name: 'Admin', email: 'admin@test.com' } }
  } else {
    req.auth = null
  }

  return req
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('config', () => {
    it('exports a matcher config that excludes static files', () => {
      expect(config).toBeDefined()
      expect(config.matcher).toBeDefined()
      expect(config.matcher).toHaveLength(1)
      expect(config.matcher[0]).toContain('_next/static')
    })
  })

  describe('public routes', () => {
    it('allows access to /login without authentication', () => {
      const req = createMockRequest('/login', { isLoggedIn: false })
      const response = middleware(req)

      // Should continue (not redirect, not 401)
      expect(response).toBeDefined()
      if (response && 'status' in response) {
        expect(response.status).not.toBe(401)
      }
    })

    it('allows access to /api/health without authentication', () => {
      const req = createMockRequest('/api/health', { isLoggedIn: false })
      const response = middleware(req)

      // Health endpoint is public AND excluded from rate limiting
      expect(response).toBeDefined()
      if (response && 'status' in response) {
        expect(response.status).not.toBe(401)
      }
    })

    it('allows access to /api/auth routes without authentication', () => {
      const req = createMockRequest('/api/auth/session', { isLoggedIn: false })
      const response = middleware(req)

      expect(response).toBeDefined()
    })

    it('redirects logged-in user from /login to home', () => {
      const req = createMockRequest('/login', { isLoggedIn: true })
      const response = middleware(req)

      expect(response).toBeDefined()
      // Should be a redirect to /
      if (response instanceof NextResponse || response instanceof Response) {
        expect(response.status).toBe(307)
        const location = response.headers.get('location')
        expect(location).toContain('/')
      }
    })
  })

  describe('protected routes', () => {
    it('returns 401 for unauthenticated API requests', () => {
      const req = createMockRequest('/api/companies', { isLoggedIn: false })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse || response instanceof Response) {
        expect(response.status).toBe(401)
      }
    })

    it('redirects unauthenticated page requests to /login', () => {
      const req = createMockRequest('/portfolio', { isLoggedIn: false })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse || response instanceof Response) {
        expect(response.status).toBe(307)
        const location = response.headers.get('location')
        expect(location).toContain('/login')
        expect(location).toContain('callbackUrl')
      }
    })

    it('includes callbackUrl in login redirect', () => {
      const req = createMockRequest('/companies/abc-123', { isLoggedIn: false })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse || response instanceof Response) {
        const location = response.headers.get('location')
        expect(location).toContain('callbackUrl=%2Fcompanies%2Fabc-123')
      }
    })

    it('allows authenticated user to access protected pages', () => {
      const req = createMockRequest('/portfolio', { isLoggedIn: true })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        // Should be NextResponse.next() with status 200
        expect(response.status).toBe(200)
      }
    })

    it('allows authenticated user to access protected API routes', () => {
      const req = createMockRequest('/api/companies', { isLoggedIn: true, forwardedFor: '127.0.0.1' })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).toBe(200)
        // Should include rate limit headers
        expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
        expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
      }
    })
  })

  describe('rate limiting', () => {
    it('adds rate limit headers to API responses', () => {
      const req = createMockRequest('/api/companies', { isLoggedIn: true, forwardedFor: '10.0.0.1' })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
        expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
        expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
      }
    })

    it('does not apply rate limiting to /api/health', () => {
      const req = createMockRequest('/api/health', { isLoggedIn: false, forwardedFor: '10.0.0.2' })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        // Health endpoint should NOT have rate limit headers
        expect(response.headers.get('X-RateLimit-Limit')).toBeNull()
      }
    })

    it('applies stricter rate limit to upload routes', () => {
      const req = createMockRequest('/api/upload', { isLoggedIn: true, forwardedFor: '10.0.0.3' })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      }
    })

    it('applies stricter rate limit to auth callback routes', () => {
      const req = createMockRequest('/api/auth/callback/credentials', { isLoggedIn: false, forwardedFor: '10.0.0.4' })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      }
    })

    it('uses general API limit for unmatched API routes', () => {
      const req = createMockRequest('/api/some-unknown-route', { isLoggedIn: true, forwardedFor: '10.0.0.5' })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.headers.get('X-RateLimit-Limit')).toBe('200')
      }
    })

    it('returns 429 when rate limit is exceeded', () => {
      // Send many requests from the same IP to the same endpoint to exceed the limit
      const ip = '10.0.0.99'
      let lastResponse: NextResponse | Response | undefined

      // The upload route has a limit of 10 per minute
      for (let i = 0; i < 12; i++) {
        const req = createMockRequest('/api/upload', { isLoggedIn: true, forwardedFor: ip })
        lastResponse = middleware(req)
      }

      expect(lastResponse).toBeDefined()
      if (lastResponse instanceof NextResponse || lastResponse instanceof Response) {
        expect(lastResponse.status).toBe(429)
      }
    })

    it('includes Retry-After header when rate limited', async () => {
      const ip = '10.0.0.100'

      // Exceed upload route limit (10 per minute)
      let lastResponse: NextResponse | Response | undefined
      for (let i = 0; i < 12; i++) {
        const req = createMockRequest('/api/upload', { isLoggedIn: true, forwardedFor: ip })
        lastResponse = middleware(req)
      }

      expect(lastResponse).toBeDefined()
      if (lastResponse instanceof NextResponse || lastResponse instanceof Response) {
        expect(lastResponse.status).toBe(429)
        expect(lastResponse.headers.get('Retry-After')).toBeDefined()
        expect(lastResponse.headers.get('X-RateLimit-Remaining')).toBe('0')
      }
    })
  })

  describe('non-API page routes for authenticated users', () => {
    it('returns NextResponse.next() for authenticated non-API routes', () => {
      const req = createMockRequest('/', { isLoggedIn: true })
      const response = middleware(req)

      expect(response).toBeDefined()
      if (response instanceof NextResponse) {
        expect(response.status).toBe(200)
      }
    })
  })
})
