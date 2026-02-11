import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock bcryptjs
const mockCompare = vi.fn()
const mockHash = vi.fn()
vi.mock('bcryptjs', () => ({
  compare: (...args: unknown[]) => mockCompare(...args),
  hash: (...args: unknown[]) => mockHash(...args),
}))

// Use vi.hoisted so the shared state is available in the hoisted mock factory
const shared = vi.hoisted(() => ({
  config: null as Record<string, unknown> | null,
}))

vi.mock('next-auth', () => {
  return {
    default: (config: Record<string, unknown>) => {
      shared.config = config
      return {
        handlers: {},
        signIn: vi.fn(),
        signOut: vi.fn(),
        auth: vi.fn(),
      }
    },
  }
})

vi.mock('next-auth/providers/credentials', () => {
  return {
    default: (providerConfig: Record<string, unknown>) => ({
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials',
      options: providerConfig,
    }),
  }
})

// Import to trigger module execution and capture config
import { generatePasswordHash } from './auth'

// Type helpers for accessing the captured config
interface AuthConfig {
  providers: Array<{ options: { authorize: (credentials: Record<string, unknown>) => Promise<unknown> } }>
  callbacks: {
    jwt: (params: { token: Record<string, unknown>; user?: Record<string, unknown> }) => Record<string, unknown>
    session: (params: { session: { user?: Record<string, unknown> }; token: Record<string, unknown> }) => { user?: Record<string, unknown> }
    authorized: (params: { auth: { user?: unknown } | null; request: { nextUrl: { pathname: string } } }) => boolean | Response
  }
  pages: { signIn: string }
  session: { strategy: string; maxAge: number }
}

function getConfig(): AuthConfig {
  return shared.config as unknown as AuthConfig
}

describe('Auth Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('captures NextAuth configuration', () => {
    expect(shared.config).not.toBeNull()
  })

  it('configures sign-in page to /login', () => {
    expect(getConfig().pages.signIn).toBe('/login')
  })

  it('uses JWT session strategy', () => {
    expect(getConfig().session.strategy).toBe('jwt')
  })

  it('sets session maxAge to 24 hours', () => {
    expect(getConfig().session.maxAge).toBe(24 * 60 * 60)
  })

  describe('authorize', () => {
    const getAuthorize = () => getConfig().providers[0].options.authorize

    beforeEach(() => {
      process.env.ADMIN_USERNAME = 'admin'
      process.env.ADMIN_PASSWORD_HASH = '$2a$12$hashedpassword'
      process.env.ADMIN_NAME = 'Test Admin'
      // Clear ADMIN_EMAIL so it doesn't interfere
      delete process.env.ADMIN_EMAIL
    })

    it('returns null when credentials are missing', async () => {
      const authorize = getAuthorize()
      const result = await authorize({})
      expect(result).toBeNull()
    })

    it('returns null when username is missing', async () => {
      const authorize = getAuthorize()
      const result = await authorize({ password: 'test123' })
      expect(result).toBeNull()
    })

    it('returns null when password is missing', async () => {
      const authorize = getAuthorize()
      const result = await authorize({ username: 'admin' })
      expect(result).toBeNull()
    })

    it('returns null when ADMIN_USERNAME is not set', async () => {
      delete process.env.ADMIN_USERNAME
      delete process.env.ADMIN_EMAIL
      const authorize = getAuthorize()
      const result = await authorize({ username: 'admin', password: 'test' })
      expect(result).toBeNull()
    })

    it('returns null when ADMIN_PASSWORD_HASH is not set', async () => {
      delete process.env.ADMIN_PASSWORD_HASH
      const authorize = getAuthorize()
      const result = await authorize({ username: 'admin', password: 'test' })
      expect(result).toBeNull()
    })

    it('returns null when username does not match (case-insensitive)', async () => {
      const authorize = getAuthorize()
      const result = await authorize({ username: 'wrong-user', password: 'test' })
      expect(result).toBeNull()
      expect(mockCompare).not.toHaveBeenCalled()
    })

    it('returns null when password is invalid', async () => {
      mockCompare.mockResolvedValue(false)
      const authorize = getAuthorize()
      const result = await authorize({ username: 'admin', password: 'wrong-password' })
      expect(result).toBeNull()
      expect(mockCompare).toHaveBeenCalledWith('wrong-password', '$2a$12$hashedpassword')
    })

    it('returns user object when credentials are valid', async () => {
      mockCompare.mockResolvedValue(true)
      const authorize = getAuthorize()
      const result = await authorize({ username: 'admin', password: 'correct-password' })

      expect(result).toEqual({
        id: '1',
        email: 'admin',
        name: 'Test Admin',
        role: 'admin',
      })
    })

    it('matches username case-insensitively', async () => {
      mockCompare.mockResolvedValue(true)
      const authorize = getAuthorize()
      const result = await authorize({ username: 'ADMIN', password: 'correct-password' })

      expect(result).not.toBeNull()
      expect(result).toEqual(expect.objectContaining({ email: 'admin' }))
    })

    it('falls back to ADMIN_EMAIL when ADMIN_USERNAME is not set', async () => {
      delete process.env.ADMIN_USERNAME
      process.env.ADMIN_EMAIL = 'admin@freeday.ai'
      mockCompare.mockResolvedValue(true)

      const authorize = getAuthorize()
      const result = await authorize({ username: 'admin@freeday.ai', password: 'correct-password' })

      expect(result).not.toBeNull()
      expect(result).toEqual(expect.objectContaining({ email: 'admin@freeday.ai' }))
    })

    it('uses default name "Admin" when ADMIN_NAME is not set', async () => {
      delete process.env.ADMIN_NAME
      mockCompare.mockResolvedValue(true)
      const authorize = getAuthorize()
      const result = await authorize({ username: 'admin', password: 'correct-password' })

      expect(result).toEqual(expect.objectContaining({ name: 'Admin' }))
    })
  })

  describe('JWT callback', () => {
    it('adds role to token when user is provided', () => {
      const jwtCallback = getConfig().callbacks.jwt
      const token = { sub: '1' }
      const user = { role: 'admin' }

      const result = jwtCallback({ token, user })
      expect(result.role).toBe('admin')
    })

    it('preserves token without user', () => {
      const jwtCallback = getConfig().callbacks.jwt
      const token = { sub: '1', role: 'admin' }

      const result = jwtCallback({ token })
      expect(result.role).toBe('admin')
    })
  })

  describe('session callback', () => {
    it('adds role from token to session user', () => {
      const sessionCallback = getConfig().callbacks.session
      const session = { user: { name: 'Admin' } }
      const token = { role: 'admin' }

      const result = sessionCallback({ session, token })
      expect((result.user as Record<string, unknown>).role).toBe('admin')
    })
  })

  describe('authorized callback', () => {
    const getAuthorized = () => getConfig().callbacks.authorized

    it('allows health check API without auth', () => {
      const authorized = getAuthorized()
      const result = authorized({
        auth: null,
        request: { nextUrl: { pathname: '/api/health' } },
      })
      expect(result).toBe(true)
    })

    it('allows auth API routes without auth', () => {
      const authorized = getAuthorized()
      const result = authorized({
        auth: null,
        request: { nextUrl: { pathname: '/api/auth/session' } },
      })
      expect(result).toBe(true)
    })

    it('redirects unauthenticated user to login', () => {
      const authorized = getAuthorized()
      const nextUrl = new URL('http://localhost/portfolio')
      const result = authorized({
        auth: null,
        request: { nextUrl: nextUrl as unknown as { pathname: string } },
      })
      // Should return a Response redirect
      expect(result).toBeInstanceOf(Response)
      if (result instanceof Response) {
        expect(result.status).toBe(302)
      }
    })

    it('redirects logged-in user from login page to home', () => {
      const authorized = getAuthorized()
      const nextUrl = new URL('http://localhost/login')
      const result = authorized({
        auth: { user: { id: '1' } },
        request: { nextUrl: nextUrl as unknown as { pathname: string } },
      })
      expect(result).toBeInstanceOf(Response)
      if (result instanceof Response) {
        expect(result.status).toBe(302)
      }
    })

    it('allows authenticated user to access protected routes', () => {
      const authorized = getAuthorized()
      const result = authorized({
        auth: { user: { id: '1' } },
        request: { nextUrl: { pathname: '/portfolio' } },
      })
      expect(result).toBe(true)
    })
  })
})

describe('generatePasswordHash', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls bcrypt hash with correct arguments', async () => {
    mockHash.mockResolvedValue('$2a$12$hashedresult')

    const result = await generatePasswordHash('my-password')

    expect(mockHash).toHaveBeenCalledWith('my-password', 12)
    expect(result).toBe('$2a$12$hashedresult')
  })
})
