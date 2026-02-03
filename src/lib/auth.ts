/**
 * Authentication Configuration
 *
 * Simple single-user authentication using NextAuth.js credentials provider.
 * User is defined via environment variables for now.
 *
 * Future: Move to database-backed users with roles based on personas:
 * - Sophie (Implementation Lead) - Full access
 * - Priya (Head of Implementation) - Portfolio + analytics
 * - Thomas (Support) - Read + live monitoring
 * - Marcus (Client) - Read-only, own company only
 */

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare, hash } from 'bcryptjs'

// For generating password hashes, run:
// node -e "require('bcryptjs').hash('your-password', 12).then(console.log)"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('[Auth] Missing email or password')
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        // Single user from environment variables
        const adminEmail = process.env.ADMIN_EMAIL
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH

        console.error('[Auth] Checking credentials for:', email)
        console.error('[Auth] Admin email from env:', adminEmail)
        console.error('[Auth] Hash exists:', !!adminPasswordHash, 'Length:', adminPasswordHash?.length)

        if (!adminEmail || !adminPasswordHash) {
          console.error('[Auth] ADMIN_EMAIL and ADMIN_PASSWORD_HASH must be set')
          return null
        }

        // Check email matches
        if (email.toLowerCase() !== adminEmail.toLowerCase()) {
          console.error('[Auth] Email mismatch')
          return null
        }

        // Verify password
        const isValid = await compare(password, adminPasswordHash)
        console.error('[Auth] Password valid:', isValid)
        if (!isValid) {
          return null
        }

        // Return user object (will be available in session)
        return {
          id: '1',
          email: adminEmail,
          name: process.env.ADMIN_NAME || 'Admin',
          role: 'admin', // Future: different roles
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // Add role to JWT token
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
      }
      return token
    },
    // Add role to session
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string
      }
      return session
    },
    // Protect routes
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnLogin = nextUrl.pathname === '/login'
      const isPublicApi = nextUrl.pathname === '/api/health'
      const isAuthApi = nextUrl.pathname.startsWith('/api/auth')

      // Allow health check and auth API routes without auth
      if (isPublicApi || isAuthApi) {
        return true
      }

      // Redirect to login if not authenticated
      if (!isLoggedIn && !isOnLogin) {
        return Response.redirect(new URL('/login', nextUrl))
      }

      // Redirect to home if already logged in and on login page
      if (isLoggedIn && isOnLogin) {
        return Response.redirect(new URL('/', nextUrl))
      }

      return true
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  trustHost: true,
})

/**
 * Helper to generate a password hash
 * Use this to create the ADMIN_PASSWORD_HASH value
 */
export async function generatePasswordHash(password: string): Promise<string> {
  return hash(password, 12)
}

/**
 * Get the current session in server components/actions
 */
export { auth as getSession }
