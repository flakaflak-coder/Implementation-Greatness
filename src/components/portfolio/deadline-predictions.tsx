'use client'

import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Minus,
  ShieldCheck,
  ShieldAlert,
  CircleAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Prediction {
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
}

interface PredictionSummary {
  total: number
  onTrack: number
  atRisk: number
  likelyDelayed: number
  noTarget: number
}

interface DeadlinePredictionsProps {
  predictions: Prediction[]
  summary: PredictionSummary
}

const RISK_CONFIG = {
  on_track: {
    label: 'On Track',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: ShieldCheck,
  },
  at_risk: {
    label: 'At Risk',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: ShieldAlert,
  },
  likely_delayed: {
    label: 'Likely Delayed',
    color: 'bg-red-100 text-red-800 border-red-200',
    dotColor: 'bg-red-500',
    icon: CircleAlert,
  },
  no_target: {
    label: 'No Target',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    dotColor: 'bg-gray-400',
    icon: Minus,
  },
} as const

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function VelocityIndicator({ ratio }: { ratio: number }) {
  if (ratio >= 1.1) {
    return (
      <div className="flex items-center gap-1 text-emerald-600">
        <TrendingUp className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{ratio.toFixed(2)}x</span>
      </div>
    )
  }
  if (ratio >= 0.9) {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Minus className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{ratio.toFixed(2)}x</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-red-600">
      <TrendingDown className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{ratio.toFixed(2)}x</span>
    </div>
  )
}

function DaysAheadBehind({ days, riskStatus }: { days: number; riskStatus: string }) {
  if (riskStatus === 'no_target') {
    return <span className="text-xs text-gray-400">--</span>
  }

  if (days > 0) {
    return (
      <span className="text-xs font-medium text-emerald-600">
        {days}d ahead
      </span>
    )
  }
  if (days < 0) {
    return (
      <span className="text-xs font-medium text-red-600">
        {Math.abs(days)}d behind
      </span>
    )
  }
  return (
    <span className="text-xs font-medium text-gray-500">
      On target
    </span>
  )
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#C2703E] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">
        {completed}/{total}
      </span>
    </div>
  )
}

export function DeadlinePredictions({ predictions, summary }: DeadlinePredictionsProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const hasIssues = summary.atRisk + summary.likelyDelayed > 0

  return (
    <Card className="border-gray-200/50 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left group"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              hasIssues ? 'bg-amber-100' : 'bg-[#FDF3EC]'
            )}>
              <Target className={cn(
                'w-5 h-5',
                hasIssues ? 'text-amber-600' : 'text-[#C2703E]'
              )} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">
                Deadline Predictions
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Go-live forecast based on velocity and blockers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Summary badges */}
            <div className="hidden sm:flex items-center gap-2">
              {summary.onTrack > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700">{summary.onTrack}</span>
                </div>
              )}
              {summary.atRisk > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-amber-700">{summary.atRisk}</span>
                </div>
              )}
              {summary.likelyDelayed > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 border border-red-100">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-700">{summary.likelyDelayed}</span>
                </div>
              )}
              {summary.noTarget > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-xs font-medium text-gray-500">{summary.noTarget}</span>
                </div>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            )}
          </div>
        </button>
      </CardHeader>

      {/* Content */}
      {isExpanded && (
        <CardContent className="pt-0">
          {/* Summary row */}
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-gray-50/80 rounded-xl mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold">{summary.onTrack}</span> on track
              </span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold">{summary.atRisk}</span> at risk
              </span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2">
              <CircleAlert className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold">{summary.likelyDelayed}</span> likely delayed
              </span>
            </div>
            {summary.noTarget > 0 && (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold">{summary.noTarget}</span> no target
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Prediction rows */}
          {predictions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No active implementations to predict</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table header */}
              <div className="hidden lg:grid grid-cols-[1fr_120px_110px_110px_80px_70px_80px_90px] gap-3 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <span>Digital Employee</span>
                <span>Phase</span>
                <span>Target</span>
                <span>Predicted</span>
                <span>Status</span>
                <span>Velocity</span>
                <span>Margin</span>
                <span>Progress</span>
              </div>

              {predictions.map((prediction) => {
                const config = RISK_CONFIG[prediction.riskStatus]
                const RiskIcon = config.icon

                return (
                  <div
                    key={prediction.deId}
                    className={cn(
                      'rounded-xl border px-4 py-3 transition-all hover:shadow-sm',
                      prediction.riskStatus === 'likely_delayed'
                        ? 'border-red-100 bg-red-50/30'
                        : prediction.riskStatus === 'at_risk'
                          ? 'border-amber-100 bg-amber-50/20'
                          : 'border-gray-100 bg-white'
                    )}
                  >
                    {/* Mobile layout */}
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{prediction.deName}</p>
                          <p className="text-xs text-gray-500">{prediction.companyName}</p>
                        </div>
                        <Badge className={cn('text-xs', config.color)}>
                          <RiskIcon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">Phase</span>
                          <p className="text-gray-700 font-medium">{prediction.currentPhase}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Velocity</span>
                          <VelocityIndicator ratio={prediction.velocityRatio} />
                        </div>
                        <div>
                          <span className="text-gray-400">Target</span>
                          <p className="text-gray-700">
                            {prediction.targetGoLive ? formatDate(prediction.targetGoLive) : '--'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Predicted</span>
                          <p className="text-gray-700">{formatDate(prediction.predictedGoLive)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <DaysAheadBehind days={prediction.daysAhead} riskStatus={prediction.riskStatus} />
                        <ProgressBar completed={prediction.completedPhases} total={prediction.totalPhases} />
                      </div>
                      {prediction.blockerCount > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          {prediction.blockerCount} blocker{prediction.blockerCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden lg:grid grid-cols-[1fr_120px_110px_110px_80px_70px_80px_90px] gap-3 items-center">
                      {/* DE Name + Company */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{prediction.deName}</p>
                        <p className="text-xs text-gray-500 truncate">{prediction.companyName}</p>
                      </div>

                      {/* Current Phase */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-700 truncate">{prediction.currentPhase}</span>
                        {prediction.blockerCount > 0 && (
                          <span className="flex items-center gap-0.5 text-red-500" title={`${prediction.blockerCount} blocker(s)`}>
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {/* Target Go-Live */}
                      <span className="text-xs text-gray-600">
                        {prediction.targetGoLive ? formatDate(prediction.targetGoLive) : '--'}
                      </span>

                      {/* Predicted Go-Live */}
                      <span className={cn(
                        'text-xs font-medium',
                        prediction.riskStatus === 'likely_delayed' ? 'text-red-600' :
                          prediction.riskStatus === 'at_risk' ? 'text-amber-600' :
                            'text-gray-700'
                      )}>
                        {formatDate(prediction.predictedGoLive)}
                      </span>

                      {/* Risk Badge */}
                      <Badge className={cn('text-[10px] px-1.5 py-0.5', config.color)}>
                        {config.label}
                      </Badge>

                      {/* Velocity */}
                      <VelocityIndicator ratio={prediction.velocityRatio} />

                      {/* Days Ahead/Behind */}
                      <DaysAheadBehind days={prediction.daysAhead} riskStatus={prediction.riskStatus} />

                      {/* Progress */}
                      <div className="w-full">
                        <ProgressBar completed={prediction.completedPhases} total={prediction.totalPhases} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
