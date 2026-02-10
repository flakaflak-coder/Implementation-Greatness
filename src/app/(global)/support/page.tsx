import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { SupportDashboardClient } from '@/components/support/support-dashboard-client'
import { computeHealthScore, type SupportDE } from '@/components/support/types'

export const metadata: Metadata = {
  title: 'Support Dashboard | OCC',
  description: 'Monitor Digital Employee health and manage support operations',
}

// Revalidate every 30 seconds for near-real-time feel
export const revalidate = 30

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
