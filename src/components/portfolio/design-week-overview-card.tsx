'use client'

import Link from 'next/link'
import {
  ArrowRight,
  AlertCircle,
  Clock,
  User,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  OctagonX,
  Target,
  MessageSquare,
  Cpu,
  Signature,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type TrafficLight = 'green' | 'yellow' | 'red'
type Trend = 'improving' | 'stable' | 'declining'

export interface DesignWeekOverview {
  id: string
  digitalEmployee: { id: string; name: string }
  company: { id: string; name: string }
  currentPhase: number
  phaseName: string
  status: string
  trafficLight: TrafficLight
  trend: Trend
  issues: string[]
  sessions: { uploaded: number; expected: number }
  scopeCompleteness: number
  ambiguousCount: number
  assignedTo: string | null
  lastUpdated: string
  blockedReason: string | null
}

interface DesignWeekOverviewCardProps {
  designWeek: DesignWeekOverview
  className?: string
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return `${Math.floor(diffDays / 7)}w ago`
}

const TRAFFIC_LIGHT_CONFIG: Record<
  TrafficLight,
  { dot: string; border: string; bg: string; label: string }
> = {
  green: {
    dot: 'bg-emerald-500',
    border: 'border-l-emerald-500',
    bg: 'hover:bg-emerald-50/50',
    label: 'On Track',
  },
  yellow: {
    dot: 'bg-amber-500',
    border: 'border-l-amber-500',
    bg: 'hover:bg-amber-50/50',
    label: 'Needs Attention',
  },
  red: {
    dot: 'bg-red-500',
    border: 'border-l-red-500',
    bg: 'hover:bg-red-50/50',
    label: 'Critical',
  },
}

const TREND_CONFIG: Record<
  Trend,
  { icon: typeof TrendingUp; color: string; label: string }
> = {
  improving: {
    icon: TrendingUp,
    color: 'text-emerald-600',
    label: 'Improving',
  },
  stable: {
    icon: Minus,
    color: 'text-gray-400',
    label: 'Stable',
  },
  declining: {
    icon: TrendingDown,
    color: 'text-red-500',
    label: 'Declining',
  },
}

// Phase indicator configuration
const PHASE_CONFIG = [
  { number: 1, name: 'Kickoff', icon: Target },
  { number: 2, name: 'Process Design', icon: MessageSquare },
  { number: 3, name: 'Technical', icon: Cpu },
  { number: 4, name: 'Sign-off', icon: Signature },
]

// Phase progress dots component
function PhaseProgress({ currentPhase }: { currentPhase: number }) {
  return (
    <div className="flex items-center gap-1">
      {PHASE_CONFIG.map((phase) => {
        const isComplete = phase.number < currentPhase
        const isCurrent = phase.number === currentPhase
        const Icon = phase.icon
        return (
          <Tooltip key={phase.number}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
                  isComplete && 'bg-emerald-100 text-emerald-600',
                  isCurrent && 'bg-[#FDF3EC] text-[#C2703E] ring-1 ring-[#C2703E]/30',
                  !isComplete && !isCurrent && 'bg-gray-100 text-gray-400'
                )}
              >
                <Icon className="w-3 h-3" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                {phase.name}: {isComplete ? 'Complete' : isCurrent ? 'In Progress' : 'Upcoming'}
              </p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

export function DesignWeekOverviewCard({ designWeek, className }: DesignWeekOverviewCardProps) {
  const config = TRAFFIC_LIGHT_CONFIG[designWeek.trafficLight]
  const sessionPercent = designWeek.sessions.expected > 0
    ? Math.round((designWeek.sessions.uploaded / designWeek.sessions.expected) * 100)
    : 0

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-4 transition-all',
        config.border,
        config.bg,
        className
      )}
    >
      <CardContent className="p-4">
        {/* Header: Traffic light + Company/DE name + Phase dots */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            {/* Traffic light dot + label */}
            <div className="flex flex-col items-center gap-0.5 mt-1.5 shrink-0">
              <div
                className={cn('w-3 h-3 rounded-full', config.dot)}
                role="img"
                aria-label={`Status: ${config.label}`}
              />
              <span className={cn(
                'text-[9px] font-medium leading-none',
                designWeek.trafficLight === 'green' && 'text-emerald-600',
                designWeek.trafficLight === 'yellow' && 'text-amber-600',
                designWeek.trafficLight === 'red' && 'text-red-600',
              )}>
                {config.label}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{designWeek.company.name}</p>
              <h3 className="font-semibold text-gray-900">{designWeek.digitalEmployee.name}</h3>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="secondary"
              className={cn(
                'text-xs',
                designWeek.trafficLight === 'red' && 'bg-red-100 text-red-700 border-red-200',
                designWeek.trafficLight === 'yellow' && 'bg-amber-100 text-amber-700 border-amber-200'
              )}
            >
              Phase {designWeek.currentPhase}: {designWeek.phaseName}
            </Badge>
            <PhaseProgress currentPhase={designWeek.currentPhase} />
          </div>
        </div>

        {/* Blocked reason -- prominent if present */}
        {designWeek.blockedReason && (
          <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl mb-3">
            <OctagonX className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 font-medium">{designWeek.blockedReason}</p>
          </div>
        )}

        {/* Progress bars row */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Session progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Sessions
              </span>
              <span className="text-xs font-medium text-gray-700">
                {designWeek.sessions.uploaded}/{designWeek.sessions.expected}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  sessionPercent >= 100 ? 'bg-emerald-500' :
                  sessionPercent >= 50 ? 'bg-[#C2703E]' :
                  'bg-gray-400'
                )}
                style={{ width: `${Math.min(sessionPercent, 100)}%` }}
              />
            </div>
          </div>
          {/* Scope progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Scope</span>
              <span className="text-xs font-medium text-gray-700">
                {designWeek.scopeCompleteness}%
                {designWeek.ambiguousCount > 0 && (
                  <span className="text-amber-600 ml-1">({designWeek.ambiguousCount} ambiguous)</span>
                )}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  designWeek.scopeCompleteness >= 80 ? 'bg-emerald-500' :
                  designWeek.scopeCompleteness >= 50 ? 'bg-[#C2703E]' :
                  'bg-gray-400'
                )}
                style={{ width: `${designWeek.scopeCompleteness}%` }}
              />
            </div>
          </div>
        </div>

        {/* Trend + Issues row */}
        <div className="flex items-center gap-3 mb-3">
          {(() => {
            const trendConfig = TREND_CONFIG[designWeek.trend]
            const TrendIcon = trendConfig.icon
            return (
              <div className={cn('flex items-center gap-1 text-sm', trendConfig.color)}>
                <TrendIcon className="w-4 h-4" />
                <span>{trendConfig.label}</span>
              </div>
            )
          })()}
          {/* Issues (for yellow/red) */}
          {designWeek.issues.length > 0 && (
            <div className="flex flex-wrap gap-1.5 flex-1">
              {designWeek.issues.map((issue, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                    designWeek.trafficLight === 'red'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  )}
                >
                  <AlertCircle className="w-3 h-3" />
                  {issue}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Assigned + Last updated + Link */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {designWeek.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{designWeek.assignedTo}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimeAgo(designWeek.lastUpdated)}</span>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-[#C2703E] hover:text-[#A05A32]">
            <Link
              href={`/companies/${designWeek.company.id}/digital-employees/${designWeek.digitalEmployee.id}`}
            >
              View Details
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
