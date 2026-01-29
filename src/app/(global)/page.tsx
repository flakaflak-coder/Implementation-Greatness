'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Target,
  Workflow,
  Gauge,
  Plug,
  AlertCircle,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SessionPhaseData {
  count: number
  processed: number
}

interface DesignWeekProgress {
  overallProgress: number
  sessionsByPhase: Record<number, SessionPhaseData>
  expectedSessions: Record<number, number>
  extractions: {
    scopeItems: number
    scenarios: number
    kpis: number
    integrations: number
    escalationRules: number
  }
  excludedCounts: {
    scopeItems: number
    scenarios: number
    kpis: number
    integrations: number
    escalationRules: number
  }
  scopeCounts: {
    total: number
    inScope: number
    outOfScope: number
    ambiguous: number
    excluded: number
  }
  readiness: Array<{
    label: string
    met: boolean
    critical: boolean
  }>
  isPhaseReady: boolean
  blockers: string[]
}

interface DesignWeek {
  id: string
  digitalEmployee: {
    id: string
    name: string
    company: { id: string; name: string }
  }
  currentPhase: number
  status: string
  ambiguousCount: number
  completenessScore: number
  progress?: DesignWeekProgress
}

interface Company {
  id: string
  name: string
  industry: string | null
  digitalEmployeeCount: number
  activeCount: number
  liveCount: number
}

interface DashboardData {
  stats: {
    totalDigitalEmployees: number
    activeDesignWeeks: number
    liveAgents: number
    itemsNeedResolution: number
  }
  designWeeks: DesignWeek[]
  recentCompanies: Company[]
}

function getPhaseLabel(phase: number): string {
  const labels: Record<number, string> = {
    1: 'Kickoff',
    2: 'Process Design',
    3: 'Technical Deep-dive',
    4: 'Sign-off',
  }
  return labels[phase] || `Phase ${phase}`
}

// Session indicator component
function SessionIndicator({
  phase,
  current,
  expected,
  processed,
  isCurrentPhase,
}: {
  phase: number
  current: number
  expected: number
  processed: number
  isCurrentPhase: boolean
}) {
  const hasAny = current > 0
  const isComplete = current >= expected && processed >= current
  const isProcessing = current > 0 && processed < current

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all ${
              isComplete
                ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                : isProcessing
                ? 'bg-amber-100 text-amber-600 border border-amber-200 animate-pulse'
                : hasAny
                ? 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                : isCurrentPhase
                ? 'bg-gray-100 text-gray-500 border border-gray-300 border-dashed'
                : 'bg-gray-50 text-gray-400 border border-gray-200'
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isProcessing ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <span>P{phase}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-gray-900 border-gray-800 text-white">
          <p className="font-medium">{getPhaseLabel(phase)}</p>
          <p className="text-gray-400 text-xs">
            {current}/{expected} sessions {processed < current && `(${processed} processed)`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Extraction stat component
function ExtractionStat({
  icon: Icon,
  label,
  count,
  excluded,
  ambiguous,
  color,
}: {
  icon: React.ElementType
  label: string
  count: number
  excluded?: number
  ambiguous?: number
  color: string
}) {
  const hasExcluded = excluded && excluded > 0
  const hasAmbiguous = ambiguous && ambiguous > 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 ${color}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">
              {count}
              {hasExcluded && (
                <span className="text-gray-400">/{excluded}</span>
              )}
            </span>
            {hasAmbiguous && (
              <span className="text-amber-500 text-xs font-bold">!</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-gray-900 border-gray-800 text-white">
          <p className="font-medium">{label}</p>
          <p className="text-gray-400 text-xs">
            {count} total
            {hasExcluded && ` (${excluded} excluded from doc)`}
            {hasAmbiguous && ` (${ambiguous} ambiguous)`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Design Week Progress Card component
function DesignWeekProgressCard({ dw }: { dw: DesignWeek }) {
  const [expanded, setExpanded] = useState(false)
  const progress = dw.progress

  return (
    <div className="bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all overflow-hidden">
      {/* Main card content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500 font-medium">
              {dw.digitalEmployee.company.name}
            </p>
            <h3 className="font-semibold text-lg text-gray-900">
              {dw.digitalEmployee.name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {progress?.isPhaseReady === false && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Blocked
              </Badge>
            )}
            <Badge className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-0">
              Phase {dw.currentPhase}: {getPhaseLabel(dw.currentPhase)}
            </Badge>
          </div>
        </div>

        {/* Session progress per phase */}
        {progress && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500 font-medium w-16">Sessions:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((phase) => (
                <SessionIndicator
                  key={phase}
                  phase={phase}
                  current={progress.sessionsByPhase[phase]?.count || 0}
                  expected={progress.expectedSessions[phase] || 1}
                  processed={progress.sessionsByPhase[phase]?.processed || 0}
                  isCurrentPhase={phase === dw.currentPhase}
                />
              ))}
            </div>
          </div>
        )}

        {/* Extraction counts */}
        {progress && (
          <div className="flex items-center gap-4 mb-4 py-3 px-4 bg-gray-50 rounded-lg border border-gray-100">
            <ExtractionStat
              icon={Target}
              label="Scope Items"
              count={progress.extractions.scopeItems}
              excluded={progress.excludedCounts.scopeItems}
              ambiguous={progress.scopeCounts.ambiguous}
              color="text-indigo-600"
            />
            <ExtractionStat
              icon={Workflow}
              label="Scenarios"
              count={progress.extractions.scenarios}
              excluded={progress.excludedCounts.scenarios}
              color="text-violet-600"
            />
            <ExtractionStat
              icon={Gauge}
              label="KPIs"
              count={progress.extractions.kpis}
              excluded={progress.excludedCounts.kpis}
              color="text-blue-600"
            />
            <ExtractionStat
              icon={Plug}
              label="Integrations"
              count={progress.extractions.integrations}
              excluded={progress.excludedCounts.integrations}
              color="text-emerald-600"
            />
            <ExtractionStat
              icon={AlertCircle}
              label="Escalation Rules"
              count={progress.extractions.escalationRules}
              excluded={progress.excludedCounts.escalationRules}
              color="text-orange-600"
            />
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500 font-medium">Overall Progress</span>
            <div className="flex items-center gap-3">
              {progress?.excludedCounts && Object.values(progress.excludedCounts).some(v => v > 0) && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />
                  {Object.values(progress.excludedCounts).reduce((a, b) => a + b, 0)} excluded
                </span>
              )}
              <span className="font-bold text-indigo-600">
                {progress?.overallProgress || dw.completenessScore}%
              </span>
            </div>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progress?.overallProgress || dw.completenessScore}%` }}
            />
          </div>
        </div>

        {/* Alerts and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dw.ambiguousCount > 0 && (
              <div className="flex items-center gap-1 text-sm text-amber-600 font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>{dw.ambiguousCount} ambiguous</span>
              </div>
            )}
            {progress?.blockers && progress.blockers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-gray-500 hover:text-gray-700 h-7 px-2"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide blockers
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    {progress.blockers.length} blocker{progress.blockers.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </div>
          <Button
            asChild
            size="sm"
            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-200/50"
          >
            <Link
              href={`/companies/${dw.digitalEmployee.company.id}/digital-employees/${dw.digitalEmployee.id}`}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Expanded blockers section */}
      {expanded && progress?.blockers && progress.blockers.length > 0 && (
        <div className="px-5 pb-5 pt-0">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 mb-2">
              Blockers for next phase:
            </p>
            <ul className="space-y-1">
              {progress.blockers.map((blocker, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {blocker}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const stats = data?.stats ?? {
    totalDigitalEmployees: 0,
    activeDesignWeeks: 0,
    liveAgents: 0,
    itemsNeedResolution: 0,
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <span className="text-2xl">📊</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <p className="text-gray-500 ml-[60px]">
            Overview of active onboardings and Digital Employees
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          disabled={loading}
          className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Stats overview - Colorful cards with emojis */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-5">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalDigitalEmployees}</p>
                <p className="text-sm font-medium text-gray-500">Digital Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-5">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.activeDesignWeeks}</p>
                <p className="text-sm font-medium text-gray-500">Active Onboardings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-5">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-200/50">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.itemsNeedResolution}</p>
                <p className="text-sm font-medium text-gray-500">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-5">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.liveAgents}</p>
                <p className="text-sm font-medium text-gray-500">Live</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Onboardings */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center justify-between text-gray-900">
                <span className="font-bold">Active Onboardings</span>
                <Badge className="bg-indigo-100 text-indigo-700 border-0 font-semibold">
                  {data?.designWeeks.length ?? 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {loading && !data ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : data?.designWeeks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🤖</span>
                  </div>
                  <p className="text-gray-600 font-medium">No active onboardings</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start a new Digital Employee onboarding to get started
                  </p>
                </div>
              ) : (
                data?.designWeeks.map((dw) => (
                  <DesignWeekProgressCard key={dw.id} dw={dw} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Companies */}
        <div>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center justify-between text-gray-900">
                <span className="font-bold">Recent Companies</span>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium"
                >
                  <Link href="/companies">View all</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {loading && !data ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : data?.recentCompanies.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🏢</span>
                  </div>
                  <p className="text-gray-600 font-medium">No companies yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add a company to get started</p>
                </div>
              ) : (
                data?.recentCompanies.map((company) => (
                  <Link
                    key={company.id}
                    href={`/companies/${company.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200/50 group-hover:shadow-lg group-hover:shadow-blue-300/50 transition-shadow">
                        <span className="text-xl">🏢</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {company.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {company.digitalEmployeeCount} Digital Employee{company.digitalEmployeeCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
