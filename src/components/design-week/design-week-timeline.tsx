'use client'

import { cn } from '@/lib/utils'
import { Check, Sparkles, AlertCircle } from 'lucide-react'

export type PhaseStatus = 'complete' | 'current' | 'upcoming' | 'blocked'

export interface PhaseData {
  number: number
  name: string
  description: string
  expectedSessions: number
  completedSessions: number
  status: PhaseStatus
  hasUnresolvedItems?: boolean
}

interface DesignWeekTimelineProps {
  phases: PhaseData[]
  selectedPhase: number
  onPhaseSelect: (phase: number) => void
  className?: string
}

export function DesignWeekTimeline({
  phases,
  selectedPhase,
  onPhaseSelect,
  className,
}: DesignWeekTimelineProps) {
  const currentPhaseIndex = phases.findIndex(p => p.status === 'current')
  const progressPercent = currentPhaseIndex >= 0
    ? ((currentPhaseIndex + 0.5) / phases.length) * 100
    : phases.every(p => p.status === 'complete') ? 100 : 0

  return (
    <div className={cn('relative py-4', className)}>
      {/* Background track */}
      <div className="absolute top-[52px] left-12 right-12 h-1 bg-gray-200 rounded-full" />

      {/* Progress track - vibrant gradient */}
      <div
        className="absolute top-[52px] left-12 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
        style={{ width: `calc(${progressPercent}% - 48px)` }}
      />

      <div className="relative flex items-start justify-between">
        {phases.map((phase) => {
          const isSelected = selectedPhase === phase.number
          const isComplete = phase.status === 'complete'
          const isCurrent = phase.status === 'current'
          const isBlocked = phase.status === 'blocked'

          return (
            <button
              key={phase.number}
              onClick={() => onPhaseSelect(phase.number)}
              className={cn(
                'group flex flex-col items-center flex-1 transition-all duration-200 pt-1',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-xl p-2 -m-2',
              )}
            >
              {/* Phase circle */}
              <div className="relative mb-3">
                {/* Pulse ring for current phase */}
                {isCurrent && (
                  <div className="absolute inset-0 -m-2 rounded-full bg-indigo-400/40 animate-ping" />
                )}

                {/* Selection ring */}
                {isSelected && (
                  <div className="absolute inset-0 -m-2 rounded-full border-2 border-indigo-400 bg-indigo-50" />
                )}

                <div
                  className={cn(
                    'relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300',
                    'shadow-lg border-4 border-white',
                    isComplete && 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-green-200/50',
                    isCurrent && 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-300/50',
                    isBlocked && 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200/50',
                    !isComplete && !isCurrent && !isBlocked && 'bg-white border-gray-200 shadow-gray-200/50',
                  )}
                >
                  {isComplete ? (
                    <Check className="w-7 h-7 text-white" strokeWidth={3} />
                  ) : isCurrent ? (
                    <Sparkles className="w-7 h-7 text-white" />
                  ) : isBlocked ? (
                    <AlertCircle className="w-7 h-7 text-white" />
                  ) : (
                    <span className="text-xl font-bold text-gray-400">{phase.number}</span>
                  )}
                </div>

                {/* Notification dot */}
                {phase.hasUnresolvedItems && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 border-3 border-white flex items-center justify-center shadow-lg">
                    <span className="text-xs font-bold text-white">!</span>
                  </span>
                )}
              </div>

              {/* Phase label */}
              <div className="text-center">
                <p
                  className={cn(
                    'text-sm font-bold transition-colors mb-1',
                    isSelected ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700',
                    isCurrent && 'text-indigo-600',
                    isComplete && 'text-emerald-600'
                  )}
                >
                  {phase.name}
                </p>
                <div className="flex items-center justify-center gap-1.5">
                  <div className="flex -space-x-0.5">
                    {Array.from({ length: phase.expectedSessions }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm',
                          i < phase.completedSessions
                            ? 'bg-emerald-400'
                            : 'bg-gray-200'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    {phase.completedSessions}/{phase.expectedSessions}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
