import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { SupportDashboardClient } from '@/components/support/support-dashboard-client'
import { computeHealthScore, type SupportDE, type HealthTrend } from '@/components/support/types'

export const metadata: Metadata = {
  title: 'Support Dashboard | OCC',
  description: 'Monitor Digital Employee health and manage support operations',
}

// Force dynamic rendering — DB queries can't run at build time
export const dynamic = 'force-dynamic'

// Shape returned by Prisma findMany with includes
interface PrismaDE {
  id: string
  name: string
  description: string | null
  status: string
  channels: string[]
  companyId: string
  currentJourneyPhase: string
  trackerStatus: string
  riskLevel: string
  blocker: string | null
  goLiveDate: Date | null
  updatedAt: Date
  company: { id: string; name: string }
  designWeek: {
    id: string
    _count: {
      scopeItems: number
      integrations: number
      scenarios: number
      escalationRules: number
    }
  } | null
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

function generateHealthTrend(
  deId: string,
  healthScore: number,
  trackerStatus: string
): HealthTrend {
  const hash = simpleHash(deId)

  // Determine direction based on tracker status
  const direction: HealthTrend['direction'] =
    trackerStatus === 'ON_TRACK'
      ? 'up'
      : trackerStatus === 'ATTENTION' || trackerStatus === 'BLOCKED'
      ? 'down'
      : 'stable'

  // Generate a deterministic delta based on DE id (range: -15 to +10)
  const rawDelta = (hash % 26) - 15 // -15 to +10
  const delta =
    direction === 'up'
      ? Math.abs(rawDelta) || 3 // ensure positive for up, min 3
      : direction === 'down'
      ? -(Math.abs(rawDelta) || 5) // ensure negative for down, min -5
      : 0

  // Generate 7 deterministic history data points around healthScore
  const history: number[] = []
  for (let i = 0; i < 7; i++) {
    const pointHash = simpleHash(`${deId}-${i}`)
    const noise = ((pointHash % 21) - 10) // -10 to +10
    let baseOffset: number
    if (direction === 'up') {
      // Trend upward: earlier points lower, later points higher
      baseOffset = Math.round(((i - 6) / 6) * Math.abs(delta) * 1.5)
    } else if (direction === 'down') {
      // Trend downward: earlier points higher, later points lower
      baseOffset = Math.round(((6 - i) / 6) * Math.abs(delta) * 1.5)
    } else {
      // Stable: flat with small noise
      baseOffset = 0
    }
    const value = Math.max(0, Math.min(100, healthScore + baseOffset + noise))
    history.push(value)
  }

  return { direction, delta, history }
}

async function getSupportData(): Promise<{
  digitalEmployees: SupportDE[]
  companies: string[]
}> {
  const des = (await prisma.digitalEmployee.findMany({
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      designWeek: {
        select: {
          id: true,
          _count: {
            select: {
              scopeItems: true,
              integrations: true,
              scenarios: true,
              escalationRules: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })) as unknown as PrismaDE[]

  const digitalEmployees: SupportDE[] = des.map((de: PrismaDE) => {
    const healthScore = computeHealthScore({
      trackerStatus: de.trackerStatus,
      riskLevel: de.riskLevel,
      status: de.status,
      blocker: de.blocker,
    })

    const healthTrend = generateHealthTrend(de.id, healthScore, de.trackerStatus)

    return {
      id: de.id,
      name: de.name,
      description: de.description,
      status: de.status as SupportDE['status'],
      channels: de.channels as string[],
      companyId: de.company.id,
      companyName: de.company.name,
      currentJourneyPhase: de.currentJourneyPhase,
      trackerStatus: de.trackerStatus as SupportDE['trackerStatus'],
      riskLevel: de.riskLevel as SupportDE['riskLevel'],
      blocker: de.blocker,
      goLiveDate: de.goLiveDate?.toISOString() ?? null,
      updatedAt: de.updatedAt.toISOString(),
      healthScore,
      escalationRuleCount: de.designWeek?._count.escalationRules ?? 0,
      scopeItemCount: de.designWeek?._count.scopeItems ?? 0,
      integrationCount: de.designWeek?._count.integrations ?? 0,
      scenarioCount: de.designWeek?._count.scenarios ?? 0,
      healthTrend,
    }
  })

  // Extract unique company names for filter dropdown
  const companies = Array.from(new Set(des.map((de: PrismaDE) => de.company.name))).sort()

  return { digitalEmployees, companies }
}

export default async function SupportPage() {
  const { digitalEmployees, companies } = await getSupportData()

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-1 rounded-full bg-gray-900" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Support Dashboard
            </h1>
          </div>
          <p className="text-sm text-gray-500 pl-4 ml-0">
            Monitor Digital Employee health, track issues, and manage escalations
          </p>
          <div className="pl-4 mt-2 flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-refreshing
            </span>
            <span>|</span>
            <span>Last updated: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Dashboard content */}
        <SupportDashboardClient
          digitalEmployees={digitalEmployees}
          companies={companies}
        />
      </div>
    </div>
  )
}
