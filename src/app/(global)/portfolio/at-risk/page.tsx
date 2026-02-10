'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  OctagonX,
  ShieldAlert,
  Key,
  User,
  ArrowRight,
  CircleCheck,
  BarChart3,
  Users,
  Lightbulb,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Types matching the /api/portfolio/timeline response
interface TimelineDE {
  id: string
  name: string
  company: { id: string; name: string }
  trafficLight: 'green' | 'yellow' | 'red'
  trackerStatus: 'ON_TRACK' | 'ATTENTION' | 'BLOCKED' | 'TO_PLAN'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  blocker: string | null
  assignedTo: string | null
  currentStage: string
  startWeek: number | null
  endWeek: number | null
  goLiveWeek: number | null
  prerequisites: {
    total: number
    received: number
    blocked: number
  }
  issues: string[]
}

interface TimelineCompany {
  id: string
  name: string
  digitalEmployees: TimelineDE[]
}

interface TimelineData {
  summary: {
    total: number
    byTrafficLight: { green: number; yellow: number; red: number }
    byTrackerStatus: { onTrack: number; attention: number; blocked: number; toPlan: number }
    byRiskLevel: { low: number; medium: number; high: number }
    prerequisitesBlocked: number
  }
  companies: TimelineCompany[]
}

type SeverityFilter = 'all' | 'critical' | 'attention' | 'blocked' | 'prereq'

// Mesh gradient styles - same as portfolio page
const MESH_GRADIENTS = {
  rose: `
    radial-gradient(at 0% 0%, hsla(350, 90%, 65%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(320, 85%, 60%, 1) 0px, transparent 50%),
    radial-gradient(at 80% 100%, hsla(0, 90%, 60%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 80%, hsla(340, 90%, 55%, 1) 0px, transparent 50%),
    linear-gradient(135deg, hsl(345, 85%, 60%), hsl(0, 80%, 55%))
  `,
  amber: `
    radial-gradient(at 0% 0%, hsla(35, 95%, 60%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(15, 90%, 60%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 100%, hsla(350, 85%, 65%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(25, 95%, 55%, 1) 0px, transparent 50%),
    linear-gradient(135deg, hsl(30, 90%, 55%), hsl(10, 85%, 60%))
  `,
  gray: `
    radial-gradient(at 0% 0%, hsla(220, 15%, 55%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 0%, hsla(240, 10%, 45%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 100%, hsla(200, 15%, 50%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(220, 20%, 60%, 1) 0px, transparent 50%),
    linear-gradient(135deg, hsl(220, 15%, 50%), hsl(240, 10%, 55%))
  `,
  sienna: `
    radial-gradient(at 0% 0%, hsla(20, 65%, 55%, 1) 0px, transparent 50%),
    radial-gradient(at 80% 0%, hsla(25, 70%, 50%, 1) 0px, transparent 50%),
    radial-gradient(at 100% 100%, hsla(15, 60%, 45%, 1) 0px, transparent 50%),
    radial-gradient(at 0% 80%, hsla(30, 75%, 55%, 1) 0px, transparent 50%),
    linear-gradient(135deg, hsl(20, 65%, 50%), hsl(15, 60%, 45%))
  `,
}

// Stat card with vibrant mesh gradient header -- clickable for filtering
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
      aria-label={onClick ? `Filter by ${label}, ${value} items` : undefined}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100/50 transition-all duration-300 text-left w-full',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C2703E]',
        active && 'ring-2 ring-offset-2 ring-[#C2703E]'
      )}
    >
      {/* Vibrant mesh gradient header */}
      <div className="relative h-20 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: MESH_GRADIENTS[meshGradient] }}
        />
        <div
          className="absolute inset-0 opacity-50 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute bottom-3 right-3 w-9 h-9 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center">
          <Icon className="w-5 h-5 text-white drop-shadow-md" />
        </div>
      </div>
      <div className="p-4">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{label}</p>
      </div>
    </Component>
  )
}

// Traffic light dot component
function TrafficLightDot({ color }: { color: 'green' | 'yellow' | 'red' }) {
  return (
    <div
      className={cn(
        'w-3 h-3 rounded-full shadow-sm',
        color === 'green' && 'bg-emerald-500 shadow-emerald-200',
        color === 'yellow' && 'bg-amber-400 shadow-amber-200',
        color === 'red' && 'bg-red-500 shadow-red-200'
      )}
    />
  )
}

// Risk level badge
function RiskBadge({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  return (
    <Badge
      variant={
        level === 'HIGH' ? 'destructive' : level === 'MEDIUM' ? 'warning' : 'secondary'
      }
    >
      {level === 'HIGH' ? 'High Risk' : level === 'MEDIUM' ? 'Medium Risk' : 'Low Risk'}
    </Badge>
  )
}

// Stage label helper
function formatStage(stage: string): string {
  const stageLabels: Record<string, string> = {
    design_week: 'Design Week',
    configuration: 'Configuration',
    uat: 'UAT',
    live: 'Live',
  }
  return stageLabels[stage] || stage
}

// Generate actionable next steps based on DE state
function getNextSteps(de: TimelineDE): string[] {
  const steps: string[] = []

  if (de.trackerStatus === 'BLOCKED' && de.blocker) {
    steps.push(`Resolve blocker: ${de.blocker}`)
  }

  if (de.prerequisites.blocked > 0) {
    steps.push(`Follow up on ${de.prerequisites.blocked} blocked prerequisite${de.prerequisites.blocked !== 1 ? 's' : ''}`)
  }

  if (de.prerequisites.total > 0 && de.prerequisites.received < de.prerequisites.total) {
    const pending = de.prerequisites.total - de.prerequisites.received - de.prerequisites.blocked
    if (pending > 0) {
      steps.push(`Chase ${pending} pending prerequisite${pending !== 1 ? 's' : ''} from client`)
    }
  }

  if (!de.assignedTo) {
    steps.push('Assign an implementation lead')
  }

  if (de.riskLevel === 'HIGH' && de.trafficLight === 'red') {
    steps.push('Schedule escalation call with stakeholders')
  }

  if (de.trafficLight === 'yellow' && de.issues.length > 0) {
    steps.push('Review and address flagged issues')
  }

  if (de.goLiveWeek && de.trackerStatus === 'BLOCKED') {
    steps.push('Consider adjusting go-live date if blocker persists')
  }

  if (steps.length === 0) {
    steps.push('Review DE workspace for detailed status')
  }

  return steps.slice(0, 3) // Max 3 steps to keep it actionable
}

// Severity sort order for at-risk DEs (red first, then yellow)
function severityOrder(de: TimelineDE): number {
  let score = 0
  if (de.trafficLight === 'red') score += 100
  else if (de.trafficLight === 'yellow') score += 50
  if (de.riskLevel === 'HIGH') score += 30
  else if (de.riskLevel === 'MEDIUM') score += 15
  if (de.trackerStatus === 'BLOCKED') score += 20
  if (de.prerequisites.blocked > 0) score += 10
  return -score // negative for descending sort
}

export default function AtRiskPage() {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/portfolio/timeline')
      const result = await response.json()
      if (result.success) {
        setTimelineData(result.data)
        setError(null)
      } else {
        setError('Failed to fetch portfolio data')
      }
    } catch {
      setError('Failed to fetch portfolio data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter and flatten DEs that are at risk
  const atRiskDEs = useMemo(() => {
    if (!timelineData) return []

    const allDEs: TimelineDE[] = []
    for (const company of timelineData.companies) {
      for (const de of company.digitalEmployees) {
        allDEs.push(de)
      }
    }

    // Filter: trafficLight !== 'green' OR trackerStatus is ATTENTION/BLOCKED OR riskLevel is MEDIUM/HIGH
    const filtered = allDEs.filter(
      (de) =>
        de.trafficLight !== 'green' ||
        de.trackerStatus === 'ATTENTION' ||
        de.trackerStatus === 'BLOCKED' ||
        de.riskLevel === 'MEDIUM' ||
        de.riskLevel === 'HIGH'
    )

    // Sort by severity (worst first)
    return filtered.sort((a, b) => severityOrder(a) - severityOrder(b))
  }, [timelineData])

  // Apply severity filter
  const filteredDEs = useMemo(() => {
    if (severityFilter === 'all') return atRiskDEs
    if (severityFilter === 'critical') return atRiskDEs.filter(de => de.trafficLight === 'red')
    if (severityFilter === 'attention') return atRiskDEs.filter(de => de.trafficLight === 'yellow')
    if (severityFilter === 'blocked') return atRiskDEs.filter(de => de.trackerStatus === 'BLOCKED')
    if (severityFilter === 'prereq') return atRiskDEs.filter(de => de.prerequisites.blocked > 0)
    return atRiskDEs
  }, [atRiskDEs, severityFilter])

  // Summary counts
  const summary = useMemo(() => {
    if (!timelineData) {
      return { total: 0, red: 0, yellow: 0, blocked: 0, prereqBlocked: 0 }
    }
    return {
      total: timelineData.summary.total,
      red: timelineData.summary.byTrafficLight.red,
      yellow: timelineData.summary.byTrafficLight.yellow,
      blocked: timelineData.summary.byTrackerStatus.blocked,
      prereqBlocked: timelineData.summary.prerequisitesBlocked,
    }
  }, [timelineData])

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/portfolio">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/80 backdrop-blur-sm border-gray-200/50 hover:bg-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Portfolio
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">At-Risk Overview</h1>
              <p className="text-gray-500 text-sm mt-1">
                Digital Employees that need attention or are blocked
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
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 text-white text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            At Risk
            {(summary.red + summary.yellow) > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/20 text-white text-xs font-bold ml-1">
                {summary.red + summary.yellow}
              </span>
            )}
          </div>
          <Link href="/portfolio/capacity">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium transition-all hover:bg-[#FDF3EC] hover:border-[#E8D5C4] hover:text-[#C2703E]">
              <Users className="w-4 h-4" />
              Capacity
            </div>
          </Link>
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
        ) : (
          <>
            {/* Summary stat cards -- clickable for filtering */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Critical"
                value={summary.red}
                icon={OctagonX}
                meshGradient="rose"
                onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
                active={severityFilter === 'critical'}
              />
              <StatCard
                label="Attention"
                value={summary.yellow}
                icon={AlertTriangle}
                meshGradient="amber"
                onClick={() => setSeverityFilter(severityFilter === 'attention' ? 'all' : 'attention')}
                active={severityFilter === 'attention'}
              />
              <StatCard
                label="Blocked"
                value={summary.blocked}
                icon={ShieldAlert}
                meshGradient="gray"
                onClick={() => setSeverityFilter(severityFilter === 'blocked' ? 'all' : 'blocked')}
                active={severityFilter === 'blocked'}
              />
              <StatCard
                label="Prereq Blocked"
                value={summary.prereqBlocked}
                icon={Key}
                meshGradient="sienna"
                onClick={() => setSeverityFilter(severityFilter === 'prereq' ? 'all' : 'prereq')}
                active={severityFilter === 'prereq'}
              />
            </div>

            {/* Active filter indicator */}
            {severityFilter !== 'all' && (
              <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50">
                <span className="text-sm text-gray-500">
                  Showing {filteredDEs.length} of {atRiskDEs.length} at-risk items
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSeverityFilter('all')}
                  className="text-xs hover:bg-gray-100 ml-auto"
                >
                  Clear filter
                </Button>
              </div>
            )}

            {/* At-risk DE cards */}
            {filteredDEs.length === 0 ? (
              <Card className="border-dashed border-2 bg-white/50 backdrop-blur-sm">
                <CardContent className="py-16 text-center">
                  <CircleCheck className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {severityFilter !== 'all' ? 'No matches for this filter' : 'All clear!'}
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {severityFilter !== 'all'
                      ? 'No Digital Employees match this severity level. Try a different filter or view all at-risk items.'
                      : 'No Digital Employees are at risk right now. Everything is running smoothly.'}
                  </p>
                  {severityFilter !== 'all' ? (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setSeverityFilter('all')}
                    >
                      Show all at-risk items
                    </Button>
                  ) : (
                    <Link href="/portfolio">
                      <Button variant="outline" className="mt-4">
                        Back to Portfolio
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Showing {filteredDEs.length} Digital Employee{filteredDEs.length !== 1 ? 's' : ''} that need attention
                </p>
                {filteredDEs.map((de) => {
                  const nextSteps = getNextSteps(de)
                  return (
                    <Card
                      key={de.id}
                      className="transition-all duration-200 hover:shadow-md hover:border-gray-300 bg-white/80 backdrop-blur-sm"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: DE info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <TrafficLightDot color={de.trafficLight} />
                              <Link
                                href={`/companies/${de.company.id}/digital-employees/${de.id}`}
                                className="group"
                              >
                                <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-[#C2703E] transition-colors">
                                  {de.name}
                                </h3>
                              </Link>
                              <RiskBadge level={de.riskLevel} />
                              {de.trackerStatus === 'BLOCKED' && (
                                <Badge variant="destructive">Blocked</Badge>
                              )}
                              {de.trackerStatus === 'ATTENTION' && (
                                <Badge variant="warning">Attention</Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                              <span className="font-medium text-gray-700">
                                {de.company.name}
                              </span>
                              <span className="text-gray-300">|</span>
                              <span>{formatStage(de.currentStage)}</span>
                              {de.assignedTo && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />
                                    {de.assignedTo}
                                  </span>
                                </>
                              )}
                              {de.goLiveWeek && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    Go-live W{de.goLiveWeek}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Blocker reason */}
                            {de.blocker && (
                              <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                                <OctagonX className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-red-700">{de.blocker}</p>
                              </div>
                            )}

                            {/* Issues list (from auto-detected issues, excluding blocker which is shown above) */}
                            {de.issues.length > 0 && !de.blocker && (
                              <div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-amber-700">
                                  {de.issues.join(' / ')}
                                </p>
                              </div>
                            )}

                            {/* Prerequisites status */}
                            {de.prerequisites.total > 0 && (
                              <div className="mt-3 flex items-center gap-2">
                                <Key className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  Prerequisites: {de.prerequisites.received} of{' '}
                                  {de.prerequisites.total} received
                                </span>
                                {de.prerequisites.blocked > 0 && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    {de.prerequisites.blocked} blocked
                                  </Badge>
                                )}
                                {/* Progress bar for prerequisites */}
                                <div className="flex-1 max-w-32 h-1.5 rounded-full bg-gray-100 overflow-hidden ml-2">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      de.prerequisites.blocked > 0 ? 'bg-red-400' : 'bg-emerald-400'
                                    )}
                                    style={{ width: `${de.prerequisites.total > 0 ? (de.prerequisites.received / de.prerequisites.total) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Actionable next steps */}
                            <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                  Suggested Actions
                                </span>
                              </div>
                              <ul className="space-y-1">
                                {nextSteps.map((step, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200/60 text-blue-700 text-[10px] font-bold mt-0.5 shrink-0">
                                      {i + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Right: action link */}
                          <div className="flex flex-col items-center gap-2 self-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  href={`/companies/${de.company.id}/digital-employees/${de.id}`}
                                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FDF3EC] text-[#C2703E] hover:bg-[#C2703E] hover:text-white transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Open DE workspace</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
