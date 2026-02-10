'use client'

import Link from 'next/link'
import { ArrowRight, AlertCircle, Clock, User, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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

export function DesignWeekOverviewCard({ designWeek, className }: DesignWeekOverviewCardProps) {
  const config = TRAFFIC_LIGHT_CONFIG[designWeek.trafficLight]

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
        {/* Header: Traffic light + Company/DE name */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            {/* Traffic light dot */}
            <div className={cn('w-3 h-3 rounded-full mt-1.5 flex-shrink-0', config.dot)} />
            <div>
              <p className="text-sm text-gray-500 font-medium">{designWeek.company.name}</p>
              <h3 className="font-semibold text-gray-900">{designWeek.digitalEmployee.name}</h3>
            </div>
          </div>
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
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-gray-400" />
            <span>
              Sessions: {designWeek.sessions.uploaded}/{designWeek.sessions.expected}
            </span>
          </div>
          <span className="text-gray-300">|</span>
          <span>{designWeek.scopeCompleteness}% scope</span>
          <span className="text-gray-300">|</span>
          {(() => {
            const trendConfig = TREND_CONFIG[designWeek.trend]
            const TrendIcon = trendConfig.icon
            return (
              <div className={cn('flex items-center gap-1', trendConfig.color)}>
                <TrendIcon className="w-4 h-4" />
                <span>{trendConfig.label}</span>
              </div>
            )
          })()}
        </div>

        {/* Issues (for yellow/red) */}
        {designWeek.issues.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {designWeek.issues.map((issue, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
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

        {/* Footer: Assigned + Last updated + Link */}
        <div className="flex items-center justify-between">
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
