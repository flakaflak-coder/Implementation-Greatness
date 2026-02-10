import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Read version from package.json
import packageJson from '../../../../package.json'

const version: string = packageJson.version

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'
type CheckResult = 'ok' | 'error' | 'warning'

interface CheckDetail {
  status: CheckResult
  message?: string
}

interface HealthResponse {
  status: HealthStatus
  version: string
  timestamp: string
  uptime: number
  checks: {
    database: CheckDetail
    environment: CheckDetail
  }
}

/** Critical environment variables that must be present for the app to run */
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'NEXTAUTH_SECRET'] as const

/** AI-related keys -- the app works without them but with degraded functionality */
const AI_ENV_VARS = ['GEMINI_API_KEY', 'ANTHROPIC_API_KEY'] as const

async function checkDatabase(): Promise<CheckDetail> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'
    return { status: 'error', message }
  }
}

function checkEnvironment(): CheckDetail {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  const missingAI = AI_ENV_VARS.filter((key) => !process.env[key])

  if (missing.length > 0) {
    return {
      status: 'warning',
      message: `Missing critical variables: ${missing.join(', ')}`,
    }
  }

  if (missingAI.length > 0) {
    return {
      status: 'warning',
      message: `Missing AI service keys: ${missingAI.join(', ')} (AI features will be unavailable)`,
    }
  }

  return { status: 'ok' }
}

function deriveStatus(checks: HealthResponse['checks']): { status: HealthStatus; httpCode: number } {
  if (checks.database.status === 'error') {
    return { status: 'unhealthy', httpCode: 503 }
  }

  if (checks.environment.status === 'warning') {
    return { status: 'degraded', httpCode: 200 }
  }

  return { status: 'healthy', httpCode: 200 }
}

// GET /api/health - Health check endpoint
export async function GET() {
  const [database, environment] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkEnvironment()),
  ])

  const checks = { database, environment }
  const { status, httpCode } = deriveStatus(checks)

  const body: HealthResponse = {
    status,
    version,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks,
  }

  return NextResponse.json(body, { status: httpCode })
}
