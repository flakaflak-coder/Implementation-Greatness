/**
 * NextAuth.js API Route Handler
 *
 * Handles all authentication endpoints:
 * - GET/POST /api/auth/signin
 * - GET/POST /api/auth/signout
 * - GET /api/auth/session
 * - POST /api/auth/callback/credentials
 */

import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
