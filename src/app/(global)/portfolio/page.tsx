'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  RefreshCw,
  Filter,
  CircleCheck,
  Check,
  Users,
  LayoutGrid,
  GanttChart,
  Building2,
  Key,
  FileText,
  Settings,
  TestTube,
  Rocket,
  CalendarDays,
  AlertTriangle,
  BarChart3,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DesignWeekOverviewCard,
  type DesignWeekOverview,
} from '@/components/portfolio/design-week-overview-card'
import {
  GanttTimeline,
  type TimelineCompany,
  type TimelineDE,
} from '@/components/portfolio/gantt-timeline'
import { WeekTimeline } from '@/components/portfolio/week-timeline'
import { DeadlinePredictions } from '@/components/portfolio/deadline-predictions'
import { PortfolioFreddy } from '@/components/de-workspace/assistant'

interface PredictionData {
  predictions: {
    deId: string
    deName: string
    companyName: string
    currentPhase: string
    targetGoLive: string | null
    predictedGoLive: string
    velocityRatio: number
    blockerCount: number
    riskStatus: 'on_track' | 'at_risk' | 'likely_delayed' | 'no_target'
    daysAhead: number
    completedPhases: number
    totalPhases: number
  }[]
  summary: {
    total: number
    onTrack: number
    atRisk: number
    likelyDelayed: number
    noTarget: number
  }
}

interface ConsultantWorkload {
  name: string
  total: number
  green: number
  yellow: number
  red: number
}

interface PortfolioData {
  summary: {
    total: number
    green: number
    yellow: number
    red: number
  }
  consultantWorkload: ConsultantWorkload[]
  designWeeks: DesignWeekOverview[]
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
    byTrackerStatus: {
      onTrack: number
      attention: number
      blocked: number
      toPlan: number
    }
    byRiskLevel: {
      low: number
      medium: number
      high: number
    }
    prerequisitesBlocked: number
    companiesCount: number
    currentWeek: number
  }
  companies: TimelineCompany[]
  digitalEmployees: TimelineDE[]
  leads: string[]
  currentWeek: number
}

type ViewMode = 'cards' | 'gantt' | 'weeks'
type FilterType = 'all' | 'issues' | 'prereq-blocked' | 'design_week' | 'configuration' | 'uat'
type GanttSortKey = 'company' | 'status' | 'go-live' | 'progress'

// Mesh gradient styles - organic multi-color blends
const MESH_GRADIENTS = {
  gray: `
    radial-gradient(at 0% 0%, hsla(220, 15%, 55%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(240, 10%, 45%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 100%, hsla(200, 15%, 50%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(220, 20%, 60%, 1) 0px, transparent 50%),
    linear-gradient(135deg, hsl(220, 15%, 50%), hsl(240, 10%, 55%))
  `,
  blue: `
    radial-gradient(at 0% 0%, hsla(280, 85%, 65%, 1) 0px, transparent 50%),
    radial-gradient(at 50% 0%, hsla(250, 90%, 70%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 50%, hsla(220, 90%, 60%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(260, 85%, 55%, 1) 0px, transparent 50%),
    linear-gradient(135deg, hsl(250, 80%, 65%), hsl(220, 85%, 60%))
  `,
  sienna: `
    radial-gradient(at 0% 0%, hsla(20, 65%, 55%, 1) 0px, transparent 50%),
    radial-gradient(at 80% 0%, hsla(25, 70%, 50%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 100%, hsla(15, 60%, 45%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 80%, hsla(30, 75%, 55%, 1) 0px, transparent 50%),
    linear-gradient(135deg, hsl(20, 65%, 50%), hsl(15, 60%, 45%))
  `,
  amber: `
    radial-gradient(at 0% 0%, hsla(35, 95%, 60%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(15, 90%, 60%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 100%, hsla(350, 85%, 65%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(25, 95%, 55%, 1) 0px, transparent 50%),
    linear-gradient(135deg, hsl(30, 90%, 55%), hsl(10, 85%, 60%))
  `,
  rose: `
    radial-gradient(at 0% 0%, hsla(350, 90%, 65%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(320, 85%, 60%, 1) 0px, transparent 50%),
    radial-gradient(at 80% 100%, hsla(0, 90%, 60%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 80%, hsla(340, 90%, 55%, 1) 0px, transparent 50%),
    linear-gradient(135deg, hsl(345, 85%, 60%), hsl(0, 80%, 55%))
  `,
  teal: `
    radial-gradient(at 0% 0%, hsla(160, 85%, 45%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(180, 80%, 50%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 100%, hsla(200, 85%, 55%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(170, 90%, 40%, 1) 0px, transparent 50%),
    linear-gradient(135deg, hsl(165, 80%, 45%), hsl(190, 75%, 50%))
  `,
}

// Stat card with vibrant mesh gradient header
function StatCard({
  label,
  value,
  icon: Icon,
  meshGradient,
  onClick,
  active,
}: {
  label: string
  value: number
  icon: React.ElementType
  meshGradient: keyof typeof MESH_GRADIENTS
  onClick?: () => void
  active?: boolean
}) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      aria-label={onClick ? `Filter by ${label}, ${value} implementations` : undefined}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100/50 transition-all duration-300 text-left w-full',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C2703E]',
        active && 'ring-2 ring-offset-2 ring-[#C2703E]'
      )}
    >
      {/* Vibrant mesh gradient header */}
      <div className="relative h-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: MESH_GRADIENTS[meshGradient] }}
        />
        {/* Grainy noise texture */}
        <div
          className="absolute inset-0 opacity-50 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Icon in header */}
        <div className="absolute bottom-3 right-3 w-9 h-9 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center">
          <Icon className="w-5 h-5 text-white drop-shadow-md" />
        </div>
      </div>
      {/* White content area */}
      <div className="p-4">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{label}</p>
      </div>
    </Component>
  )
}

// Health status card with mesh gradient header and on-track percentage
function HealthCard({ green, yellow, red, total }: { green: number; yellow: number; red: number; total: number }) {
  const onTrackPercent = total > 0 ? Math.round((green / total) * 100) : 0
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100/50 shadow-sm">
      {/* Mesh gradient header */}
      <div className="relative h-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: MESH_GRADIENTS.teal }}
        />
        <div
          className="absolute inset-0 opacity-50 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <p className="text-2xl font-bold text-white drop-shadow-md">{onTrackPercent}%</p>
          <p className="text-xs font-medium text-white/80 drop-shadow-sm">On Track</p>
        </div>
      </div>
      {/* Content */}
      <div className="p-4">
        {/* Stacked bar showing health distribution */}
        {total > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden mb-3">
            {green > 0 && (
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(green / total) * 100}%` }}
              />
            )}
            {yellow > 0 && (
              <div
                className="bg-amber-400 transition-all"
                style={{ width: `${(yellow / total) * 100}%` }}
              />
            )}
            {red > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(red / total) * 100}%` }}
              />
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-0.5" aria-label={`${green} healthy`}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
              <span className="text-xl font-bold text-gray-900">{green}</span>
            </div>
            <span className="text-xs text-gray-500">Healthy</span>
          </div>
          <div className="flex flex-col items-center gap-0.5" aria-label={`${yellow} attention`}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-200" />
              <span className="text-xl font-bold text-gray-900">{yellow}</span>
            </div>
            <span className="text-xs text-gray-500">Attention</span>
          </div>
          <div className="flex flex-col items-center gap-0.5" aria-label={`${red} critical`}>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-200" />
              <span className="text-xl font-bold text-gray-900">{red}</span>
            </div>
            <span className="text-xs text-gray-500">Critical</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('weeks')
  const [cardData, setCardData] = useState<PortfolioData | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedConsultant, setSelectedConsultant] = useState<string | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [ganttSort, setGanttSort] = useState<GanttSortKey>('company')

  // Fetch all data sets
  const fetchData = async () => {
    setLoading(true)
    try {
      const [cardResponse, timelineResponse, predictionResponse] = await Promise.all([
        fetch('/api/portfolio'),
        fetch('/api/portfolio/timeline'),
        fetch('/api/portfolio/predictions'),
      ])

      const cardResult = await cardResponse.json()
      const timelineResult = await timelineResponse.json()
      const predictionResult = await predictionResponse.json()

      if (cardResult.success) {
        setCardData(cardResult.data)
      }
      if (timelineResult.success) {
        setTimelineData(timelineResult.data)
      }
      if (predictionResult.success) {
        setPredictionData(predictionResult.data)
      }
      setError(null)
    } catch {
      setError('Failed to fetch portfolio data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Get unique companies from timeline data
  const companies = useMemo(() => {
    if (!timelineData) return []
    return timelineData.companies.map(c => ({ id: c.id, name: c.name }))
  }, [timelineData])

  // Filter design weeks for card view
  const filteredDesignWeeks = useMemo(() => {
    if (!cardData) return []
    let filtered = cardData.designWeeks

    if (filterType === 'issues') {
      filtered = filtered.filter(dw => dw.trafficLight !== 'green')
    }

    if (selectedConsultant) {
      filtered = filtered.filter(dw => (dw.assignedTo || 'Unassigned') === selectedConsultant)
    }

    return filtered
  }, [cardData, filterType, selectedConsultant])

  // Filter timeline companies
  const filteredTimelineCompanies = useMemo(() => {
    if (!timelineData) return []
    let filteredCompanies = timelineData.companies

    // Filter by company
    if (selectedCompany) {
      filteredCompanies = filteredCompanies.filter(c => c.id === selectedCompany)
    }

    // Filter by consultant
    if (selectedConsultant) {
      filteredCompanies = filteredCompanies
        .map(c => ({
          ...c,
          digitalEmployees: c.digitalEmployees.filter(
            de => de.assignedTo === selectedConsultant
          ),
        }))
        .filter(c => c.digitalEmployees.length > 0)
    }

    // Filter by issues, prerequisites, or stage
    if (filterType === 'issues') {
      filteredCompanies = filteredCompanies
        .map(c => ({
          ...c,
          digitalEmployees: c.digitalEmployees.filter(de => de.trafficLight !== 'green'),
        }))
        .filter(c => c.digitalEmployees.length > 0)
    } else if (filterType === 'prereq-blocked') {
      filteredCompanies = filteredCompanies
        .map(c => ({
          ...c,
          digitalEmployees: c.digitalEmployees.filter(de => de.prerequisites.blocked > 0),
        }))
        .filter(c => c.digitalEmployees.length > 0)
    } else if (filterType === 'design_week' || filterType === 'configuration' || filterType === 'uat') {
      filteredCompanies = filteredCompanies
        .map(c => ({
          ...c,
          digitalEmployees: c.digitalEmployees.filter(de => de.currentStage === filterType),
        }))
        .filter(c => c.digitalEmployees.length > 0)
    }

    return filteredCompanies
  }, [timelineData, filterType, selectedConsultant, selectedCompany])

  // Sort companies/DEs for gantt/week views
  const sortedTimelineCompanies = useMemo(() => {
    if (ganttSort === 'company') return filteredTimelineCompanies

    // For non-company sorts, we flatten DEs, sort them, and re-group
    const allDEs: (TimelineDE & { companyName: string; companyId: string })[] = []
    for (const company of filteredTimelineCompanies) {
      for (const de of company.digitalEmployees) {
        allDEs.push({ ...de, companyName: company.name, companyId: company.id })
      }
    }

    if (ganttSort === 'status') {
      const statusOrder: Record<string, number> = { red: 0, yellow: 1, green: 2 }
      allDEs.sort((a, b) => (statusOrder[a.trafficLight] ?? 2) - (statusOrder[b.trafficLight] ?? 2))
    } else if (ganttSort === 'go-live') {
      allDEs.sort((a, b) => {
        const aWeek = a.goLiveWeek ?? 999
        const bWeek = b.goLiveWeek ?? 999
        return aWeek - bWeek
      })
    } else if (ganttSort === 'progress') {
      allDEs.sort((a, b) => b.percentComplete - a.percentComplete)
    }

    // Re-group by company
    const companyMap = new Map<string, TimelineCompany>()
    for (const de of allDEs) {
      if (!companyMap.has(de.companyId)) {
        companyMap.set(de.companyId, {
          id: de.companyId,
          name: de.companyName,
          digitalEmployees: [],
        })
      }
      companyMap.get(de.companyId)!.digitalEmployees.push(de)
    }

    return Array.from(companyMap.values())
  }, [filteredTimelineCompanies, ganttSort])

  // Summary stats from timeline data
  const summary = timelineData?.summary ?? {
    total: 0,
    byStage: { designWeek: 0, configuration: 0, uat: 0, live: 0 },
    byTrafficLight: { green: 0, yellow: 0, red: 0 },
    byTrackerStatus: { onTrack: 0, attention: 0, blocked: 0, toPlan: 0 },
    byRiskLevel: { low: 0, medium: 0, high: 0 },
    prerequisitesBlocked: 0,
    companiesCount: 0,
    currentWeek: 1,
  }

  const currentWeek = timelineData?.currentWeek ?? 1

  // Handler for week changes (drag-drop)
  const handleWeekChange = async (deId: string, startWeek: number, endWeek: number) => {
    try {
      const response = await fetch('/api/portfolio/timeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deId, startWeek, endWeek }),
      })
      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to update week:', error)
    }
  }

  // Handler for manual phase toggle
  const handlePhaseToggle = async (designWeekId: string, phase: number, completed: boolean) => {
    try {
      const response = await fetch(`/api/design-weeks/${designWeekId}/phases`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase, completed }),
      })
      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to toggle phase:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Portfolio Overview</h1>
            <p className="text-gray-500 text-sm mt-1">
              Track all Digital Employee implementations
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="bg-white/80 backdrop-blur-sm border border-gray-200/50">
                <TabsTrigger value="weeks" className="gap-2 data-[state=active]:bg-white">
                  <CalendarDays className="w-4 h-4" />
                  Weeks
                </TabsTrigger>
                <TabsTrigger value="gantt" className="gap-2 data-[state=active]:bg-white">
                  <GanttChart className="w-4 h-4" />
                  Stages
                </TabsTrigger>
                <TabsTrigger value="cards" className="gap-2 data-[state=active]:bg-white">
                  <LayoutGrid className="w-4 h-4" />
                  Cards
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
        </div>

        {/* Sub-navigation: quick access to At-Risk and Capacity */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#C2703E] text-white text-sm font-medium">
            <BarChart3 className="w-4 h-4" />
            Overview
          </div>
          <Link href="/portfolio/at-risk">
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-700',
              (summary.byTrafficLight.red + summary.byTrafficLight.yellow) > 0
                ? 'border-red-200 bg-red-50/50 text-red-700'
                : 'border-gray-200 bg-white text-gray-600'
            )}>
              <AlertTriangle className="w-4 h-4" />
              At Risk
              {(summary.byTrafficLight.red + summary.byTrafficLight.yellow) > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {summary.byTrafficLight.red + summary.byTrafficLight.yellow}
                </span>
              )}
            </div>
          </Link>
          <Link href="/portfolio/capacity">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium transition-all hover:bg-[#FDF3EC] hover:border-[#E8D5C4] hover:text-[#C2703E]">
              <Users className="w-4 h-4" />
              Capacity
            </div>
          </Link>
        </div>

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

        {/* Summary stats with vibrant mesh gradients - click to filter */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="Total DEs"
            value={summary.total}
            icon={FileText}
            meshGradient="gray"
            onClick={() => setFilterType('all')}
            active={filterType === 'all'}
          />
          <StatCard
            label="Design Week"
            value={summary.byStage.designWeek}
            icon={FileText}
            meshGradient="blue"
            onClick={() => setFilterType(filterType === 'design_week' ? 'all' : 'design_week')}
            active={filterType === 'design_week'}
          />
          <StatCard
            label="Configuration"
            value={summary.byStage.configuration}
            icon={Settings}
            meshGradient="sienna"
            onClick={() => setFilterType(filterType === 'configuration' ? 'all' : 'configuration')}
            active={filterType === 'configuration'}
          />
          <StatCard
            label="UAT"
            value={summary.byStage.uat}
            icon={TestTube}
            meshGradient="amber"
            onClick={() => setFilterType(filterType === 'uat' ? 'all' : 'uat')}
            active={filterType === 'uat'}
          />
          <StatCard
            label="Prereq Blocked"
            value={summary.prerequisitesBlocked}
            icon={Key}
            meshGradient="rose"
            onClick={() => setFilterType(filterType === 'prereq-blocked' ? 'all' : 'prereq-blocked')}
            active={filterType === 'prereq-blocked'}
          />
          <HealthCard
            green={summary.byTrafficLight.green}
            yellow={summary.byTrafficLight.yellow}
            red={summary.byTrafficLight.red}
            total={summary.total}
          />
        </div>

        {/* Deadline Predictions */}
        {predictionData && predictionData.predictions.length > 0 && (
          <div className="mb-8">
            <DeadlinePredictions
              predictions={predictionData.predictions}
              summary={predictionData.summary}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm">
          <Filter className="w-4 h-4 text-gray-400" />

          {/* Issues filter */}
          <button
            onClick={() => setFilterType(filterType === 'issues' ? 'all' : 'issues')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all',
              filterType === 'issues'
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded-md border flex items-center justify-center transition-all',
                filterType === 'issues' ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
              )}
            >
              {filterType === 'issues' && <Check className="w-3 h-3 text-white" />}
            </div>
            Show only issues
          </button>

          {/* Company filter */}
          {companies.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <select
                value={selectedCompany || ''}
                onChange={(e) => setSelectedCompany(e.target.value || null)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8D5C4]"
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lead filter */}
          {timelineData?.leads && timelineData.leads.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <select
                value={selectedConsultant || ''}
                onChange={(e) => setSelectedConsultant(e.target.value || null)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8D5C4]"
              >
                <option value="">All Leads</option>
                {timelineData.leads.map((lead) => (
                  <option key={lead} value={lead}>
                    {lead}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort control + active filters — pushed right */}
          <div className="flex items-center gap-3 ml-auto">
            {/* Sort control (for gantt & week views) */}
            {(viewMode === 'gantt' || viewMode === 'weeks') && (
              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <select
                  value={ganttSort}
                  onChange={(e) => setGanttSort(e.target.value as GanttSortKey)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#E8D5C4]"
                >
                  <option value="company">Sort by Company</option>
                  <option value="status">Sort by Status (worst first)</option>
                  <option value="go-live">Sort by Go-Live (soonest first)</option>
                  <option value="progress">Sort by Progress (most first)</option>
                </select>
              </div>
            )}

            {/* Active filters display */}
            {(filterType !== 'all' || selectedConsultant || selectedCompany) && (
              <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Showing{' '}
                {viewMode === 'cards'
                  ? filteredDesignWeeks.length
                  : filteredTimelineCompanies.reduce((sum, c) => sum + c.digitalEmployees.length, 0)}{' '}
                of {summary.total}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterType('all')
                  setSelectedConsultant(null)
                  setSelectedCompany(null)
                }}
                className="text-xs hover:bg-gray-100"
              >
                Clear filters
              </Button>
            </div>
          )}
          </div>
        </div>

        {/* Content based on view mode */}
        {loading && !cardData && !timelineData ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C2703E]" />
          </div>
        ) : viewMode === 'weeks' ? (
          /* Week Timeline View */
          sortedTimelineCompanies.length === 0 ? (
            <Card className="border-dashed border-2 bg-white/50 backdrop-blur-sm">
              <CardContent className="py-16 text-center">
                {filterType !== 'all' || selectedConsultant || selectedCompany ? (
                  <>
                    <CircleCheck className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      No Digital Employees match your current filters.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setFilterType('all')
                        setSelectedConsultant(null)
                        setSelectedCompany(null)
                      }}
                    >
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-2xl bg-[#FDF3EC] flex items-center justify-center mx-auto mb-4">
                      <Rocket className="w-8 h-8 text-[#C2703E]" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No active implementations
                    </h3>
                    <p className="text-gray-500">
                      Digital Employees will appear here when implementations begin.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4">
              <WeekTimeline
                companies={sortedTimelineCompanies}
                currentWeek={currentWeek}
                onWeekChange={handleWeekChange}
                onPhaseToggle={handlePhaseToggle}
              />
            </div>
          )
        ) : viewMode === 'gantt' ? (
          /* Gantt Timeline View (Stages) */
          sortedTimelineCompanies.length === 0 ? (
            <Card className="border-dashed border-2 bg-white/50 backdrop-blur-sm">
              <CardContent className="py-16 text-center">
                {filterType !== 'all' || selectedConsultant || selectedCompany ? (
                  <>
                    <CircleCheck className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      No Digital Employees match your current filters.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setFilterType('all')
                        setSelectedConsultant(null)
                        setSelectedCompany(null)
                      }}
                    >
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-2xl bg-[#FDF3EC] flex items-center justify-center mx-auto mb-4">
                      <Rocket className="w-8 h-8 text-[#C2703E]" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No active implementations
                    </h3>
                    <p className="text-gray-500">
                      Digital Employees will appear here when implementations begin.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-4">
              <GanttTimeline companies={sortedTimelineCompanies} />
            </div>
          )
        ) : (
          /* Card View */
          filteredDesignWeeks.length === 0 ? (
            <Card className="border-dashed border-2 bg-white/50 backdrop-blur-sm">
              <CardContent className="py-16 text-center">
                {filterType === 'issues' ? (
                  <>
                    <CircleCheck className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">All clear!</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      No Design Weeks need attention right now.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setFilterType('all')}
                    >
                      Show all Design Weeks
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-2xl bg-[#FDF3EC] flex items-center justify-center mx-auto mb-4">
                      <Rocket className="w-8 h-8 text-[#C2703E]" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No active Design Weeks</h3>
                    <p className="text-gray-500">
                      Design Weeks will appear here when implementations begin.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDesignWeeks.map((dw) => (
                <DesignWeekOverviewCard key={dw.id} designWeek={dw} />
              ))}
            </div>
          )
        )}

      </div>

      {/* Freddy AI Assistant - floating button */}
      <PortfolioFreddy onChangesApplied={fetchData} />
    </div>
  )
}
