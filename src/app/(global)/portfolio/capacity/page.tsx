'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  Users,
  BarChart3,
  Crown,
  UserCircle,
  Rocket,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Types matching the timeline API response
type LifecycleStage = 'design_week' | 'configuration' | 'uat' | 'live'
type TrafficLight = 'green' | 'yellow' | 'red'

interface TimelineDE {
  id: string
  name: string
  company: { id: string; name: string }
  currentStage: LifecycleStage
  assignedTo: string | null
  trafficLight: TrafficLight
  startWeek: number | null
  endWeek: number | null
  goLiveWeek: number | null
  trackerStatus: string
  riskLevel: string
}

interface TimelineCompany {
  id: string
  name: string
  digitalEmployees: TimelineDE[]
}

interface TimelineData {
  summary: {
    total: number
    byStage: {
      designWeek: number
      configuration: number
      uat: number
      live: number
    }
    byTrafficLight: {
      green: number
      yellow: number
      red: number
    }
  }
  companies: TimelineCompany[]
  leads: string[]
  currentWeek: number
}

// Per-consultant computed metrics
interface ConsultantCapacity {
  name: string
  totalDEs: number
  byStage: {
    designWeek: number
    configuration: number
    uat: number
    live: number
  }
  byTrafficLight: {
    green: number
    yellow: number
    red: number
  }
  des: {
    id: string
    name: string
    companyName: string
    companyId: string
    stage: LifecycleStage
    trafficLight: TrafficLight
  }[]
}

const STAGE_CONFIG: Record<LifecycleStage, { label: string; shortLabel: string; bg: string; text: string; pill: string }> = {
  design_week: {
    label: 'Design Week',
    shortLabel: 'DW',
    bg: 'bg-[#C2703E]',
    text: 'text-[#C2703E]',
    pill: 'bg-[#FDF3EC] text-[#C2703E]',
  },
  configuration: {
    label: 'Configuration',
    shortLabel: 'Config',
    bg: 'bg-[#6B8F71]',
    text: 'text-[#6B8F71]',
    pill: 'bg-emerald-50 text-[#6B8F71]',
  },
  uat: {
    label: 'UAT',
    shortLabel: 'UAT',
    bg: 'bg-amber-500',
    text: 'text-amber-700',
    pill: 'bg-amber-50 text-amber-700',
  },
  live: {
    label: 'Live',
    shortLabel: 'Live',
    bg: 'bg-emerald-500',
    text: 'text-emerald-700',
    pill: 'bg-emerald-50 text-emerald-700',
  },
}

const TRAFFIC_LIGHT_DOT: Record<TrafficLight, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
}

function buildConsultantCapacities(companies: TimelineCompany[]): {
  assigned: ConsultantCapacity[]
  unassigned: ConsultantCapacity | null
} {
  const consultantMap = new Map<string, ConsultantCapacity>()
  const unassignedDEs: ConsultantCapacity['des'] = []
  const unassignedByStage = { designWeek: 0, configuration: 0, uat: 0, live: 0 }
  const unassignedByTrafficLight = { green: 0, yellow: 0, red: 0 }

  for (const company of companies) {
    for (const de of company.digitalEmployees) {
      const deEntry = {
        id: de.id,
        name: de.name,
        companyName: company.name,
        companyId: company.id,
        stage: de.currentStage,
        trafficLight: de.trafficLight,
      }

      if (!de.assignedTo) {
        unassignedDEs.push(deEntry)
        const stageKey = de.currentStage === 'design_week' ? 'designWeek' : de.currentStage
        unassignedByStage[stageKey]++
        unassignedByTrafficLight[de.trafficLight]++
        continue
      }

      if (!consultantMap.has(de.assignedTo)) {
        consultantMap.set(de.assignedTo, {
          name: de.assignedTo,
          totalDEs: 0,
          byStage: { designWeek: 0, configuration: 0, uat: 0, live: 0 },
          byTrafficLight: { green: 0, yellow: 0, red: 0 },
          des: [],
        })
      }

      const consultant = consultantMap.get(de.assignedTo)!
      consultant.totalDEs++
      const stageKey = de.currentStage === 'design_week' ? 'designWeek' : de.currentStage
      consultant.byStage[stageKey]++
      consultant.byTrafficLight[de.trafficLight]++
      consultant.des.push(deEntry)
    }
  }

  // Sort by workload (most loaded first)
  const assigned = Array.from(consultantMap.values()).sort((a, b) => b.totalDEs - a.totalDEs)

  const unassigned: ConsultantCapacity | null =
    unassignedDEs.length > 0
      ? {
          name: 'Unassigned',
          totalDEs: unassignedDEs.length,
          byStage: unassignedByStage,
          byTrafficLight: unassignedByTrafficLight,
          des: unassignedDEs,
        }
      : null

  return { assigned, unassigned }
}

// Summary stat mini-card
function SummaryItem({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ElementType
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-5 py-4 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-[#FDF3EC] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#C2703E]" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// Stage breakdown pills
function StagePills({ byStage }: { byStage: ConsultantCapacity['byStage'] }) {
  const stages: { key: keyof ConsultantCapacity['byStage']; stage: LifecycleStage }[] = [
    { key: 'designWeek', stage: 'design_week' },
    { key: 'configuration', stage: 'configuration' },
    { key: 'uat', stage: 'uat' },
    { key: 'live', stage: 'live' },
  ]

  return (
    <div className="flex flex-wrap gap-1.5">
      {stages.map(({ key, stage }) => {
        const count = byStage[key]
        if (count === 0) return null
        const config = STAGE_CONFIG[stage]
        return (
          <span
            key={key}
            className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.pill)}
          >
            {config.shortLabel} {count}
          </span>
        )
      })}
    </div>
  )
}

// Traffic light dots with counts
function TrafficLightSummary({ byTrafficLight }: { byTrafficLight: ConsultantCapacity['byTrafficLight'] }) {
  return (
    <div className="flex items-center gap-3">
      {byTrafficLight.green > 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-gray-600">{byTrafficLight.green}</span>
        </div>
      )}
      {byTrafficLight.yellow > 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-xs font-medium text-gray-600">{byTrafficLight.yellow}</span>
        </div>
      )}
      {byTrafficLight.red > 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-gray-600">{byTrafficLight.red}</span>
        </div>
      )}
    </div>
  )
}

// Visual workload bar
function WorkloadBar({ count, maxCount }: { count: number; maxCount: number }) {
  const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0
  return (
    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full bg-[#C2703E] transition-all duration-500"
        style={{ width: `${widthPercent}%` }}
      />
    </div>
  )
}

// Single DE mini-row within a consultant card
function DEMiniRow({ de }: { de: ConsultantCapacity['des'][number] }) {
  const stageConfig = STAGE_CONFIG[de.stage]
  return (
    <Link
      href={`/companies/${de.companyId}/digital-employees/${de.id}`}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FAF9F6] transition-colors group"
    >
      <div className={cn('w-2 h-2 rounded-full shrink-0', TRAFFIC_LIGHT_DOT[de.trafficLight])} />
      <span className="text-sm font-medium text-gray-800 truncate group-hover:text-[#C2703E] transition-colors">
        {de.name}
      </span>
      <span className="text-xs text-gray-400 truncate shrink-0">
        {de.companyName}
      </span>
      <span className={cn('ml-auto text-xs font-medium shrink-0', stageConfig.text)}>
        {stageConfig.shortLabel}
      </span>
    </Link>
  )
}

// Consultant card
function ConsultantCard({
  consultant,
  maxCount,
  isUnassigned = false,
}: {
  consultant: ConsultantCapacity
  maxCount: number
  isUnassigned?: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={cn('overflow-hidden transition-shadow hover:shadow-md', isUnassigned && 'border-dashed')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                isUnassigned ? 'bg-gray-100' : 'bg-[#FDF3EC]'
              )}
            >
              {isUnassigned ? (
                <AlertCircle className="w-5 h-5 text-gray-400" />
              ) : (
                <UserCircle className="w-5 h-5 text-[#C2703E]" />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{consultant.name}</CardTitle>
              <div className="mt-1">
                <TrafficLightSummary byTrafficLight={consultant.byTrafficLight} />
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-gray-900">{consultant.totalDEs}</p>
            <p className="text-xs text-gray-500">
              DE{consultant.totalDEs !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stage pills */}
        <StagePills byStage={consultant.byStage} />

        {/* Workload bar */}
        <WorkloadBar count={consultant.totalDEs} maxCount={maxCount} />

        {/* DE list toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs font-medium text-[#C2703E] hover:text-[#A85C30] transition-colors text-left"
        >
          {expanded ? 'Hide' : 'Show'} {consultant.totalDEs} Digital Employee{consultant.totalDEs !== 1 ? 's' : ''}
        </button>

        {/* Expandable DE list */}
        {expanded && (
          <div className="border-t border-gray-100 pt-2 -mx-2 space-y-0.5">
            {consultant.des.map((de) => (
              <DEMiniRow key={de.id} de={de} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function CapacityPlanningPage() {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/portfolio/timeline')
      const result = await response.json()
      if (result.success) {
        setTimelineData(result.data)
        setError(null)
      } else {
        setError(result.error || 'Failed to load data')
      }
    } catch {
      setError('Failed to fetch capacity data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Compute consultant capacities
  const { assigned, unassigned } = useMemo(() => {
    if (!timelineData) return { assigned: [], unassigned: null }
    return buildConsultantCapacities(timelineData.companies)
  }, [timelineData])

  // Summary metrics
  const totalDEs = timelineData?.summary.total ?? 0
  const leadCount = assigned.length
  const avgPerLead = leadCount > 0 ? (totalDEs / leadCount).toFixed(1) : '0'
  const mostLoaded = assigned.length > 0 ? assigned[0] : null
  const maxCount = mostLoaded?.totalDEs ?? 1

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/portfolio">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-[#FDF3EC]"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Capacity Planning</h1>
              <p className="text-gray-500 text-sm mt-1">
                Resource load across implementation leads per week
              </p>
            </div>
          </div>
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            disabled={loading}
            className="bg-white/80 backdrop-blur-sm border-gray-200/50 hover:bg-white"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              Try Again
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && !timelineData ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C2703E]" />
          </div>
        ) : totalDEs === 0 && !loading ? (
          /* Empty state */
          <Card className="border-dashed border-2 bg-white/50 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#FDF3EC] flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-[#C2703E]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No active implementations
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Digital Employees will appear here when implementations begin. Capacity data is calculated from active DEs.
              </p>
              <Link href="/portfolio">
                <Button variant="outline" className="mt-6">
                  Back to Portfolio
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <SummaryItem
                label="Total DEs"
                value={totalDEs}
                icon={BarChart3}
              />
              <SummaryItem
                label="Avg DEs per Lead"
                value={avgPerLead}
                icon={Users}
              />
              <SummaryItem
                label={mostLoaded ? `Most Loaded (${mostLoaded.name})` : 'Most Loaded'}
                value={mostLoaded?.totalDEs ?? 0}
                icon={Crown}
              />
            </div>

            {/* Consultant cards grid */}
            {assigned.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Implementation Leads ({assigned.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {assigned.map((consultant) => (
                    <ConsultantCard
                      key={consultant.name}
                      consultant={consultant}
                      maxCount={maxCount}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unassigned section */}
            {unassigned && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  Unassigned
                </h2>
                <div className="max-w-md">
                  <ConsultantCard
                    consultant={unassigned}
                    maxCount={maxCount}
                    isUnassigned
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
