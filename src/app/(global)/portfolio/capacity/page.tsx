'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRightLeft,
  RefreshCw,
  Users,
  BarChart3,
  Crown,
  UserCircle,
  Rocket,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

// Workload thresholds
const WORKLOAD_THRESHOLD_HIGH = 5
const WORKLOAD_THRESHOLD_WARNING = 4

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
  warning,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  warning?: string
}) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-5 py-4 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-[#FDF3EC] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#C2703E]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      {warning && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{warning}</p>
          </TooltipContent>
        </Tooltip>
      )}
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

// Visual workload bar with overload indicator
function WorkloadBar({ count, maxCount }: { count: number; maxCount: number }) {
  const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0
  const isOverloaded = count >= WORKLOAD_THRESHOLD_HIGH
  const isWarning = count >= WORKLOAD_THRESHOLD_WARNING && count < WORKLOAD_THRESHOLD_HIGH
  return (
    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          isOverloaded ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-[#C2703E]'
        )}
        style={{ width: `${widthPercent}%` }}
      />
    </div>
  )
}

// Workload status label
function WorkloadStatus({ count }: { count: number }) {
  if (count >= WORKLOAD_THRESHOLD_HIGH) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="text-[10px] gap-1">
            <ShieldAlert className="w-3 h-3" />
            Overloaded
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {count} active DEs exceeds recommended maximum of {WORKLOAD_THRESHOLD_HIGH - 1}.
            Consider reassigning some implementations.
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }
  if (count >= WORKLOAD_THRESHOLD_WARNING) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="warning" className="text-[10px] gap-1">
            <AlertTriangle className="w-3 h-3" />
            High Load
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {count} active DEs is near the recommended maximum.
            Monitor workload and consider redistribution.
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }
  if (count <= 1) {
    return (
      <Badge variant="success" className="text-[10px]">
        Available
      </Badge>
    )
  }
  return null
}

// Single DE mini-row within a consultant card
function DEMiniRow({
  de,
  allConsultants,
  currentConsultant,
  onReassign,
  reassigningDeId,
}: {
  de: ConsultantCapacity['des'][number]
  allConsultants: string[]
  currentConsultant: string
  onReassign: (deId: string, deName: string, newConsultant: string) => void
  reassigningDeId: string | null
}) {
  const stageConfig = STAGE_CONFIG[de.stage]
  const isReassigning = reassigningDeId === de.id
  const otherConsultants = allConsultants.filter((c) => c !== currentConsultant)

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FAF9F6] transition-colors group">
      <Link
        href={`/companies/${de.companyId}/digital-employees/${de.id}`}
        className="flex items-center gap-2 flex-1 min-w-0"
      >
        <div className={cn('w-2 h-2 rounded-full shrink-0', TRAFFIC_LIGHT_DOT[de.trafficLight])} />
        <span className="text-sm font-medium text-gray-800 truncate group-hover:text-[#C2703E] transition-colors">
          {de.name}
        </span>
        <span className="text-xs text-gray-400 truncate shrink-0">
          {de.companyName}
        </span>
      </Link>
      <span className={cn('text-xs font-medium shrink-0', stageConfig.text)}>
        {stageConfig.shortLabel}
      </span>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'shrink-0 p-1 rounded-md transition-colors',
                  'text-gray-400 hover:text-[#C2703E] hover:bg-[#FDF3EC]',
                  'opacity-0 group-hover:opacity-100 focus:opacity-100',
                  isReassigning && 'opacity-100'
                )}
                disabled={isReassigning}
              >
                {isReassigning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Reassign to another lead</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-gray-500">
            Reassign to
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {otherConsultants.length > 0 ? (
            otherConsultants.map((consultant) => (
              <DropdownMenuItem
                key={consultant}
                onClick={() => onReassign(de.id, de.name, consultant)}
                className="cursor-pointer text-sm"
              >
                <UserCircle className="w-4 h-4 mr-2 text-gray-400" />
                {consultant}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-xs text-gray-400">
              No other leads available
            </DropdownMenuItem>
          )}
          {currentConsultant !== 'Unassigned' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onReassign(de.id, de.name, '')}
                className="cursor-pointer text-sm text-gray-500"
              >
                <AlertCircle className="w-4 h-4 mr-2 text-gray-400" />
                Unassign
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Consultant card
function ConsultantCard({
  consultant,
  maxCount,
  isUnassigned = false,
  allConsultants,
  onReassign,
  reassigningDeId,
}: {
  consultant: ConsultantCapacity
  maxCount: number
  isUnassigned?: boolean
  allConsultants: string[]
  onReassign: (deId: string, deName: string, newConsultant: string) => void
  reassigningDeId: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const hasIssues = consultant.byTrafficLight.red > 0 || consultant.byTrafficLight.yellow > 0

  return (
    <Card className={cn(
      'overflow-hidden transition-shadow hover:shadow-md',
      isUnassigned && 'border-dashed',
      consultant.totalDEs >= WORKLOAD_THRESHOLD_HIGH && 'border-red-200',
      consultant.totalDEs >= WORKLOAD_THRESHOLD_WARNING && consultant.totalDEs < WORKLOAD_THRESHOLD_HIGH && 'border-amber-200'
    )}>
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
              <div className="flex items-center gap-2">
                <CardTitle className="text-base truncate">{consultant.name}</CardTitle>
                <WorkloadStatus count={consultant.totalDEs} />
              </div>
              <div className="mt-1">
                <TrafficLightSummary byTrafficLight={consultant.byTrafficLight} />
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={cn(
              'text-3xl font-bold',
              consultant.totalDEs >= WORKLOAD_THRESHOLD_HIGH ? 'text-red-600' :
              consultant.totalDEs >= WORKLOAD_THRESHOLD_WARNING ? 'text-amber-600' : 'text-gray-900'
            )}>
              {consultant.totalDEs}
            </p>
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

        {/* Issue warning if consultant has at-risk DEs */}
        {hasIssues && !isUnassigned && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-700">
              {consultant.byTrafficLight.red > 0 && `${consultant.byTrafficLight.red} critical`}
              {consultant.byTrafficLight.red > 0 && consultant.byTrafficLight.yellow > 0 && ', '}
              {consultant.byTrafficLight.yellow > 0 && `${consultant.byTrafficLight.yellow} needing attention`}
            </span>
          </div>
        )}

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
              <DEMiniRow
                key={de.id}
                de={de}
                allConsultants={allConsultants}
                currentConsultant={consultant.name}
                onReassign={onReassign}
                reassigningDeId={reassigningDeId}
              />
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
  const [reassigningDeId, setReassigningDeId] = useState<string | null>(null)

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

  // All consultant names for the reassign dropdown
  const allConsultantNames = useMemo(() => {
    return assigned.map((c) => c.name)
  }, [assigned])

  // Handle reassigning a DE to a different consultant
  const handleReassign = useCallback(async (deId: string, deName: string, newConsultant: string) => {
    setReassigningDeId(deId)
    try {
      const response = await fetch('/api/portfolio/timeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deId,
          assignedTo: newConsultant || null,
        }),
      })

      const result = await response.json()
      if (result.success) {
        const targetLabel = newConsultant || 'Unassigned'
        toast.success(`Reassigned "${deName}" to ${targetLabel}`)
        await fetchData()
      } else {
        toast.error(result.error || 'Failed to reassign')
      }
    } catch {
      toast.error('Failed to reassign Digital Employee')
    } finally {
      setReassigningDeId(null)
    }
  }, [])

  // Summary metrics
  const totalDEs = timelineData?.summary.total ?? 0
  const leadCount = assigned.length
  const avgPerLead = leadCount > 0 ? (totalDEs / leadCount).toFixed(1) : '0'
  const mostLoaded = assigned.length > 0 ? assigned[0] : null
  const maxCount = mostLoaded?.totalDEs ?? 1
  const overloadedCount = assigned.filter(c => c.totalDEs >= WORKLOAD_THRESHOLD_HIGH).length

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
                Resource load across implementation leads
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

        {/* Sub-navigation */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/portfolio">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium transition-all hover:bg-gray-50">
              <BarChart3 className="w-4 h-4" />
              Overview
            </div>
          </Link>
          <Link href="/portfolio/at-risk">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-700">
              <AlertTriangle className="w-4 h-4" />
              At Risk
            </div>
          </Link>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#C2703E] text-white text-sm font-medium">
            <Users className="w-4 h-4" />
            Capacity
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <SummaryItem
                label="Total DEs"
                value={totalDEs}
                icon={BarChart3}
              />
              <SummaryItem
                label="Implementation Leads"
                value={leadCount}
                icon={Users}
              />
              <SummaryItem
                label="Avg DEs per Lead"
                value={avgPerLead}
                icon={TrendingUp}
                warning={Number(avgPerLead) >= WORKLOAD_THRESHOLD_WARNING ? `Average workload is high (${avgPerLead} per lead)` : undefined}
              />
              <SummaryItem
                label={overloadedCount > 0 ? `Overloaded Leads` : mostLoaded ? `Most Loaded (${mostLoaded.name})` : 'Most Loaded'}
                value={overloadedCount > 0 ? overloadedCount : mostLoaded?.totalDEs ?? 0}
                icon={overloadedCount > 0 ? ShieldAlert : Crown}
                warning={overloadedCount > 0 ? `${overloadedCount} lead${overloadedCount !== 1 ? 's' : ''} with ${WORKLOAD_THRESHOLD_HIGH}+ DEs` : undefined}
              />
            </div>

            {/* Overload alert banner */}
            {overloadedCount > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {overloadedCount} lead{overloadedCount !== 1 ? 's are' : ' is'} overloaded
                  </p>
                  <p className="text-sm text-red-700 mt-0.5">
                    {assigned.filter(c => c.totalDEs >= WORKLOAD_THRESHOLD_HIGH).map(c => c.name).join(', ')}{' '}
                    {overloadedCount === 1 ? 'has' : 'have'} {WORKLOAD_THRESHOLD_HIGH} or more active DEs. Consider reassigning implementations to balance workload.
                  </p>
                </div>
              </div>
            )}

            {/* Unassigned alert */}
            {unassigned && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {unassigned.totalDEs} unassigned DE{unassigned.totalDEs !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    These implementations need an assigned lead. Review and assign to balance the team workload.
                  </p>
                </div>
              </div>
            )}

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
                      allConsultants={allConsultantNames}
                      onReassign={handleReassign}
                      reassigningDeId={reassigningDeId}
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
                    allConsultants={allConsultantNames}
                    onReassign={handleReassign}
                    reassigningDeId={reassigningDeId}
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
