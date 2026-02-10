'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Key,
  Building2,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type LifecycleStage = 'design_week' | 'configuration' | 'uat' | 'live'
export type TrafficLight = 'green' | 'yellow' | 'red'
export type TrackerStatus = 'ON_TRACK' | 'ATTENTION' | 'BLOCKED' | 'TO_PLAN'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface TimelineDE {
  id: string
  name: string
  company: { id: string; name: string }
  status: string
  currentStage: LifecycleStage
  goLiveDate: string | null
  assignedTo: string | null
  trafficLight: TrafficLight
  issues: string[]
  // Tracker fields
  startWeek: number | null
  endWeek: number | null
  goLiveWeek: number | null
  trackerStatus: TrackerStatus
  riskLevel: RiskLevel
  blocker: string | null
  ownerClient: string | null
  ownerFreedayProject: string | null
  ownerFreedayEngineering: string | null
  thisWeekActions: string | null
  percentComplete: number
  sortOrder: number
  designWeek: {
    id: string
    status: string
    currentPhase: number
    startedAt: string | null
    completedAt: string | null
    progress: number
    sessionProgress: number
    scopeProgress: number
    phaseCompletions: {
      phase: number
      autoCompleted: boolean
      manuallyCompleted: boolean
      completed: boolean
    }[]
    manualCompletions: number[]
  } | null
  prerequisites: {
    total: number
    received: number
    blocked: number
    pending: number
  }
  createdAt: string
}

export interface TimelineCompany {
  id: string
  name: string
  digitalEmployees: TimelineDE[]
}

interface GanttTimelineProps {
  companies: TimelineCompany[]
  onDEClick?: (de: TimelineDE) => void
  className?: string
}

// Stage configuration
const STAGE_CONFIG: Record<LifecycleStage, { label: string; color: string; bg: string }> = {
  design_week: { label: 'Design Week', color: 'text-[#C2703E]', bg: 'bg-[#C2703E]' },
  configuration: { label: 'Configuration', color: 'text-[#6B8F71]', bg: 'bg-[#6B8F71]' },
  uat: { label: 'UAT', color: 'text-amber-700', bg: 'bg-amber-500' },
  live: { label: 'Live', color: 'text-emerald-700', bg: 'bg-emerald-500' },
}

const TRAFFIC_LIGHT_CONFIG: Record<TrafficLight, { dot: string; border: string; label: string }> = {
  green: { dot: 'bg-emerald-500', border: 'border-l-emerald-500', label: 'Healthy' },
  yellow: { dot: 'bg-amber-500', border: 'border-l-amber-500', label: 'Attention' },
  red: { dot: 'bg-red-500', border: 'border-l-red-500', label: 'Critical' },
}

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Calculate days until go-live
function daysUntilGoLive(goLiveDate: string | null): number | null {
  if (!goLiveDate) return null
  const days = Math.ceil((new Date(goLiveDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return days
}

// Progress bar for each stage
function StageProgressBar({
  stage,
  currentStage,
  progress = 0,
}: {
  stage: LifecycleStage
  currentStage: LifecycleStage
  progress?: number
}) {
  const stages: LifecycleStage[] = ['design_week', 'configuration', 'uat', 'live']
  const stageIndex = stages.indexOf(stage)
  const currentIndex = stages.indexOf(currentStage)

  // Determine if this stage is complete, current, or future
  const isComplete = stageIndex < currentIndex || (stage === 'live' && currentStage === 'live')
  const isCurrent = stage === currentStage
  const isFuture = stageIndex > currentIndex

  const stateLabel = isComplete ? 'Complete' : isCurrent ? `In progress (${progress}%)` : 'Upcoming'

  return (
    <div
      className="flex-1 h-6 relative"
      role="img"
      aria-label={`${STAGE_CONFIG[stage].label}: ${stateLabel}`}
    >
      <div
        className={cn(
          'h-full rounded-sm transition-all',
          isComplete && STAGE_CONFIG[stage].bg,
          isCurrent && 'bg-gray-200',
          isFuture && 'bg-gray-100'
        )}
      >
        {isCurrent && (
          <div
            className={cn('h-full rounded-sm transition-all', STAGE_CONFIG[stage].bg)}
            style={{ width: `${progress}%` }}
          />
        )}
      </div>
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center text-[10px] font-medium',
          isComplete || (isCurrent && progress > 50) ? 'text-white' : 'text-gray-500'
        )}
      >
        {STAGE_CONFIG[stage].label}
      </div>
    </div>
  )
}

// Single DE row in the Gantt chart
function DERow({ de, onDEClick }: { de: TimelineDE; onDEClick?: (de: TimelineDE) => void }) {
  const config = TRAFFIC_LIGHT_CONFIG[de.trafficLight]
  const daysLeft = daysUntilGoLive(de.goLiveDate)

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-3 border-l-4 bg-white hover:bg-gray-50 cursor-pointer transition-colors',
        config.border
      )}
      onClick={() => onDEClick?.(de)}
    >
      {/* DE Name and Status */}
      <div className="w-48 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dot)}
            role="img"
            aria-label={`Status: ${config.label}`}
          />
          <span className="font-medium text-gray-900 text-sm truncate">{de.name}</span>
          <span className="sr-only">({config.label})</span>
        </div>
        {de.assignedTo && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 ml-4">
            <User className="w-3 h-3" />
            <span className="truncate">{de.assignedTo}</span>
          </div>
        )}
        {de.blocker && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 mt-1 ml-4 max-w-full">
                <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full truncate max-w-[160px]">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{de.blocker}</span>
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[300px]">
              <p className="text-xs font-medium mb-1">Blocker:</p>
              <p className="text-xs">{de.blocker}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Timeline bars */}
      <div className="flex-1 flex gap-1">
        <StageProgressBar
          stage="design_week"
          currentStage={de.currentStage}
          progress={de.designWeek?.progress || 0}
        />
        <StageProgressBar stage="configuration" currentStage={de.currentStage} progress={0} />
        <StageProgressBar stage="uat" currentStage={de.currentStage} progress={0} />
        <StageProgressBar stage="live" currentStage={de.currentStage} progress={100} />
      </div>

      {/* Prerequisites indicator */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-20 flex-shrink-0 flex items-center gap-1">
            <Key className="w-3.5 h-3.5 text-gray-400" />
            <span
              className={cn(
                'text-xs font-medium',
                de.prerequisites.blocked > 0
                  ? 'text-red-600'
                  : de.prerequisites.pending > 0
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              )}
            >
              {de.prerequisites.received}/{de.prerequisites.total}
            </span>
            {de.prerequisites.blocked > 0 && (
              <AlertTriangle className="w-3 h-3 text-red-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <div className="text-xs">
            <p className="font-medium mb-1">Prerequisites</p>
            <p>✓ {de.prerequisites.received} received</p>
            {de.prerequisites.pending > 0 && <p>⏳ {de.prerequisites.pending} pending</p>}
            {de.prerequisites.blocked > 0 && <p>🚫 {de.prerequisites.blocked} blocked</p>}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Go-live date */}
      <div className="w-24 flex-shrink-0 text-right">
        {de.goLiveDate ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'text-xs',
                  daysLeft !== null && daysLeft < 0
                    ? 'text-red-600 font-medium'
                    : daysLeft !== null && daysLeft < 14
                    ? 'text-amber-600'
                    : 'text-gray-600'
                )}
              >
                <div className="flex items-center justify-end gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(de.goLiveDate)}
                </div>
                {daysLeft !== null && (
                  <div className="text-[10px] mt-0.5">
                    {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go-live: {new Date(de.goLiveDate).toLocaleDateString()}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-xs text-gray-400">No date set</span>
        )}
      </div>

      {/* Issues badge */}
      <div className="w-6 flex-shrink-0">
        {de.issues.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
                {de.issues.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="left">
              <div className="text-xs space-y-1">
                {de.issues.map((issue, i) => (
                  <p key={i}>• {issue}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

// Company group with collapsible DEs
function CompanyGroup({
  company,
  onDEClick,
  defaultExpanded = true,
}: {
  company: TimelineCompany
  onDEClick?: (de: TimelineDE) => void
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Calculate company-level stats
  const stats = useMemo(() => {
    const des = company.digitalEmployees
    return {
      total: des.length,
      red: des.filter(de => de.trafficLight === 'red').length,
      yellow: des.filter(de => de.trafficLight === 'yellow').length,
      green: des.filter(de => de.trafficLight === 'green').length,
    }
  }, [company.digitalEmployees])

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Company header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-900">{company.name}</span>
          <Badge variant="secondary" className="ml-2">
            {stats.total} DE{stats.total !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {stats.red > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-medium"
                  aria-label={`${stats.red} critical`}
                >
                  {stats.red}
                </span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{stats.red} Critical</p></TooltipContent>
            </Tooltip>
          )}
          {stats.yellow > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium"
                  aria-label={`${stats.yellow} attention`}
                >
                  {stats.yellow}
                </span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{stats.yellow} Attention</p></TooltipContent>
            </Tooltip>
          )}
          {stats.green > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"
                  aria-label={`${stats.green} healthy`}
                >
                  {stats.green}
                </span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{stats.green} Healthy</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </button>

      {/* DE rows */}
      {expanded && (
        <div className="divide-y divide-gray-100">
          {company.digitalEmployees.map(de => (
            <Link
              key={de.id}
              href={`/companies/${de.company.id}/digital-employees/${de.id}`}
            >
              <DERow de={de} onDEClick={onDEClick} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Legend for the Gantt chart
function GanttLegend() {
  return (
    <div className="flex items-center gap-6 text-xs text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
      <span className="font-medium text-gray-700">Stages:</span>
      {Object.entries(STAGE_CONFIG).map(([key, config]) => (
        <div key={key} className="flex items-center gap-1.5">
          <div className={cn('w-3 h-3 rounded-sm', config.bg)} />
          <span>{config.label}</span>
        </div>
      ))}
      <span className="text-gray-300">|</span>
      <span className="font-medium text-gray-700">Status:</span>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>On track</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span>Attention</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <span>Critical</span>
      </div>
    </div>
  )
}

// Column headers
function GanttHeader() {
  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-gray-100 text-xs font-medium text-gray-600 rounded-t-lg">
      <div className="w-48 flex-shrink-0">Digital Employee</div>
      <div className="flex-1 flex gap-1 text-center">
        <div className="flex-1">Design Week</div>
        <div className="flex-1">Configuration</div>
        <div className="flex-1">UAT</div>
        <div className="flex-1">Live</div>
      </div>
      <div className="w-20 flex-shrink-0 text-center">Prerequisites</div>
      <div className="w-24 flex-shrink-0 text-right">Go-Live</div>
      <div className="w-6 flex-shrink-0"></div>
    </div>
  )
}

export function GanttTimeline({ companies, onDEClick, className }: GanttTimelineProps) {
  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No Digital Employees to display</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <GanttLegend />
      <GanttHeader />
      <div className="space-y-3">
        {companies.map(company => (
          <CompanyGroup key={company.id} company={company} onDEClick={onDEClick} />
        ))}
      </div>
    </div>
  )
}
