'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  Bot,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Flag,
  Hash,
  Network,
  Shield,
  Workflow,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  getHealthStatus,
  getHealthColor,
  getHealthLabel,
  formatJourneyPhase,
  formatRelativeTime,
  type SupportDE,
} from './types'

interface DEDetailPanelProps {
  de: SupportDE | null
  open: boolean
  onClose: () => void
}

function HealthScoreRing({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const status = getHealthStatus(score)
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference
  const strokeColor =
    status === 'healthy'
      ? 'stroke-emerald-500'
      : status === 'attention'
      ? 'stroke-amber-500'
      : 'stroke-red-500'
  const textColor = getHealthColor(status)
  const dim = size === 'lg' ? 100 : 64

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={40 * (dim / 100)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={size === 'lg' ? 6 : 4}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={40 * (dim / 100)}
          fill="none"
          className={strokeColor}
          strokeWidth={size === 'lg' ? 6 : 4}
          strokeDasharray={circumference * (dim / 100)}
          strokeDashoffset={offset * (dim / 100)}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', textColor, size === 'lg' ? 'text-xl' : 'text-sm')}>
          {score}
        </span>
        {size === 'lg' && (
          <span className={cn('text-[10px] font-medium uppercase tracking-wider', textColor)}>
            {getHealthLabel(status)}
          </span>
        )}
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  valueClassName?: string
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={cn('text-sm font-medium text-gray-900 mt-0.5', valueClassName)}>
          {value}
        </p>
      </div>
    </div>
  )
}

export function DEDetailPanel({ de, open, onClose }: DEDetailPanelProps) {
  if (!de) return null

  const healthStatus = getHealthStatus(de.healthScore)
  const channels = de.channels.length > 0 ? de.channels.join(', ') : 'None configured'

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-gray-500" />
            {de.name}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {de.companyName}
          </SheetDescription>
        </SheetHeader>

        {/* Health score hero */}
        <div
          className={cn(
            'rounded-xl border p-5 flex items-center gap-5',
            healthStatus === 'healthy' && 'bg-emerald-50/50 border-emerald-200',
            healthStatus === 'attention' && 'bg-amber-50/50 border-amber-200',
            healthStatus === 'critical' && 'bg-red-50/50 border-red-200'
          )}
        >
          <HealthScoreRing score={de.healthScore} />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Health Score</p>
            <p className="text-xs text-gray-500 mt-1">
              {healthStatus === 'healthy' &&
                'This Digital Employee is performing well. No immediate concerns.'}
              {healthStatus === 'attention' &&
                'Some metrics need attention. Monitor closely.'}
              {healthStatus === 'critical' &&
                'Immediate action required. Multiple issues detected.'}
            </p>
            {de.trackerStatus === 'BLOCKED' && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-700 font-medium">
                <Shield className="h-3.5 w-3.5" />
                Currently blocked
              </div>
            )}
            {de.trackerStatus === 'ATTENTION' && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                <Flag className="h-3.5 w-3.5" />
                Flagged for attention
              </div>
            )}
          </div>
        </div>

        {/* Blocker */}
        {de.blocker && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-sm font-semibold text-red-800">Active Blocker</p>
            </div>
            <p className="text-sm text-red-700">{de.blocker}</p>
          </div>
        )}

        {/* Details */}
        <div className="mt-5 space-y-0">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Details
          </h4>
          <DetailRow
            icon={Workflow}
            label="Current Phase"
            value={formatJourneyPhase(de.currentJourneyPhase)}
          />
          <DetailRow
            icon={Hash}
            label="Status"
            value={de.status}
          />
          <DetailRow
            icon={Clock}
            label="Last Updated"
            value={formatRelativeTime(de.updatedAt)}
          />
          {de.goLiveDate && (
            <DetailRow
              icon={Calendar}
              label="Go-Live Date"
              value={new Date(de.goLiveDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
          )}
          <DetailRow
            icon={Network}
            label="Channels"
            value={channels}
          />
        </div>

        {/* Stats */}
        <div className="mt-5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Configuration Stats
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{de.scopeItemCount}</p>
              <p className="text-[11px] text-gray-500">Scope Items</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{de.integrationCount}</p>
              <p className="text-[11px] text-gray-500">Integrations</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{de.scenarioCount}</p>
              <p className="text-[11px] text-gray-500">Scenarios</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{de.escalationRuleCount}</p>
              <p className="text-[11px] text-gray-500">Escalation Rules</p>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="mt-5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Risk Assessment
          </h4>
          <div className="flex gap-3">
            <div
              className={cn(
                'flex-1 rounded-lg border p-3 text-center',
                de.riskLevel === 'LOW' && 'border-emerald-200 bg-emerald-50',
                de.riskLevel === 'MEDIUM' && 'border-amber-200 bg-amber-50',
                de.riskLevel === 'HIGH' && 'border-red-200 bg-red-50'
              )}
            >
              <p
                className={cn(
                  'text-sm font-semibold',
                  de.riskLevel === 'LOW' && 'text-emerald-700',
                  de.riskLevel === 'MEDIUM' && 'text-amber-700',
                  de.riskLevel === 'HIGH' && 'text-red-700'
                )}
              >
                {de.riskLevel}
              </p>
              <p className="text-[11px] text-gray-500">Risk Level</p>
            </div>
            <div
              className={cn(
                'flex-1 rounded-lg border p-3 text-center',
                de.trackerStatus === 'ON_TRACK' && 'border-emerald-200 bg-emerald-50',
                de.trackerStatus === 'ATTENTION' && 'border-amber-200 bg-amber-50',
                de.trackerStatus === 'BLOCKED' && 'border-red-200 bg-red-50',
                de.trackerStatus === 'TO_PLAN' && 'border-gray-200 bg-gray-50'
              )}
            >
              <p
                className={cn(
                  'text-sm font-semibold',
                  de.trackerStatus === 'ON_TRACK' && 'text-emerald-700',
                  de.trackerStatus === 'ATTENTION' && 'text-amber-700',
                  de.trackerStatus === 'BLOCKED' && 'text-red-700',
                  de.trackerStatus === 'TO_PLAN' && 'text-gray-700'
                )}
              >
                {de.trackerStatus.replace('_', ' ')}
              </p>
              <p className="text-[11px] text-gray-500">Tracker Status</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2">
          <Button asChild className="w-full" size="default">
            <Link
              href={`/companies/${de.companyId}/digital-employees/${de.id}`}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full Workspace
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="default">
            <Link href={`/companies/${de.companyId}`}>
              <Building2 className="h-4 w-4 mr-2" />
              View Company
            </Link>
          </Button>
        </div>

        {de.description && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Description
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">{de.description}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
