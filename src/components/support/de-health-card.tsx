'use client'

import {
  AlertTriangle,
  Bot,
  Building2,
  ChevronRight,
  Clock,
  Flag,
  Network,
  Shield,
  Workflow,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  getHealthStatus,
  getHealthColor,
  getHealthLabel,
  formatJourneyPhase,
  formatRelativeTime,
  type SupportDE,
} from './types'
import { TrendIndicator } from './trend-indicator'

interface DEHealthCardProps {
  de: SupportDE
  onSelect: (de: SupportDE) => void
}

function HealthIndicator({ score }: { score: number }) {
  const status = getHealthStatus(score)
  const ringColor =
    status === 'healthy'
      ? 'border-emerald-400'
      : status === 'attention'
      ? 'border-amber-400'
      : 'border-red-400'
  const bgColor =
    status === 'healthy'
      ? 'bg-emerald-500'
      : status === 'attention'
      ? 'bg-amber-500'
      : 'bg-red-500'
  const textColor =
    status === 'healthy'
      ? 'text-emerald-700'
      : status === 'attention'
      ? 'text-amber-700'
      : 'text-red-700'

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'relative h-12 w-12 rounded-full border-[3px] flex items-center justify-center',
          ringColor
        )}
      >
        <span className={cn('text-sm font-bold', textColor)}>{score}</span>
        {/* Pulsing dot for critical */}
        {status === 'critical' && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className={cn('relative inline-flex rounded-full h-3 w-3', bgColor)} />
          </span>
        )}
      </div>
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-wider',
          getHealthColor(status)
        )}
      >
        {getHealthLabel(status)}
      </span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'LIVE':
      return (
        <Badge variant="success" className="text-[10px] px-1.5 py-0">
          Live
        </Badge>
      )
    case 'DESIGN':
      return (
        <Badge variant="info" className="text-[10px] px-1.5 py-0">
          Design
        </Badge>
      )
    case 'ONBOARDING':
      return (
        <Badge variant="warning" className="text-[10px] px-1.5 py-0">
          Onboarding
        </Badge>
      )
    case 'PAUSED':
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          Paused
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {status}
        </Badge>
      )
  }
}

function TrackerBadge({ trackerStatus }: { trackerStatus: string }) {
  switch (trackerStatus) {
    case 'BLOCKED':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5">
          <Shield className="h-3 w-3" />
          Blocked
        </span>
      )
    case 'ATTENTION':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
          <Flag className="h-3 w-3" />
          Needs Attention
        </span>
      )
    default:
      return null
  }
}

export function DEHealthCard({ de, onSelect }: DEHealthCardProps) {
  const healthStatus = getHealthStatus(de.healthScore)
  const isCritical = healthStatus === 'critical'
  const needsAttention = healthStatus === 'attention'

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-md cursor-pointer',
        isCritical && 'border-red-200 ring-1 ring-red-100',
        needsAttention && 'border-amber-200',
        !isCritical && !needsAttention && 'border-gray-200'
      )}
      onClick={() => onSelect(de)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(de)
        }
      }}
      aria-label={`View details for ${de.name} - Health score ${de.healthScore}`}
    >
      {/* Critical alert bar */}
      {isCritical && (
        <div className="bg-red-50 border-b border-red-200 rounded-t-xl px-4 py-1.5 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
          <span className="text-xs font-medium text-red-700">Needs immediate attention</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Health score indicator */}
          <HealthIndicator score={de.healthScore} />

          {/* DE info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {de.name}
                  </h3>
                  <StatusBadge status={de.status} />
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-500 truncate">{de.companyName}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 mt-0.5" />
            </div>

            {/* Metadata row */}
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <Workflow className="h-3 w-3" />
                {formatJourneyPhase(de.currentJourneyPhase)}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(de.updatedAt)}
              </span>
              <TrackerBadge trackerStatus={de.trackerStatus} />
              {de.healthTrend && (
                <TrendIndicator trend={de.healthTrend} />
              )}
            </div>

            {/* Blocker notice */}
            {de.blocker && (
              <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                <p className="text-[11px] text-red-700 font-medium line-clamp-2">
                  Blocker: {de.blocker}
                </p>
              </div>
            )}

            {/* Quick stats */}
            <div className="flex items-center gap-3 mt-2.5 text-[11px] text-gray-400">
              <span className="flex items-center gap-1" title="Scope items">
                <Bot className="h-3 w-3" />
                {de.scopeItemCount} scope
              </span>
              <span className="flex items-center gap-1" title="Integrations">
                <Network className="h-3 w-3" />
                {de.integrationCount} integrations
              </span>
              <span className="flex items-center gap-1" title="Escalation rules">
                <AlertTriangle className="h-3 w-3" />
                {de.escalationRuleCount} rules
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
