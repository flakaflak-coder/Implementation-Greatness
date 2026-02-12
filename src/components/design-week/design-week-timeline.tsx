'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export type PhaseStatus = 'complete' | 'current' | 'upcoming' | 'blocked'

export interface PhaseData {
  number: number
  name: string
  description: string
  expectedSessions: number
  completedSessions: number
  status: PhaseStatus
  hasUnresolvedItems?: boolean
  isManuallyCompleted?: boolean
}

interface DesignWeekTimelineProps {
  phases: PhaseData[]
  selectedPhase: number
  onPhaseSelect: (phase: number) => void
  onPhaseToggle?: (phase: number) => void
  className?: string
}

export function DesignWeekTimeline({
  phases,
  selectedPhase,
  onPhaseSelect,
  onPhaseToggle,
  className,
}: DesignWeekTimelineProps) {
  return (
    <div className={cn('flex items-center', className)}>
      {phases.map((phase, index) => {
        const isSelected = selectedPhase === phase.number
        const hasData = phase.completedSessions > 0
        const isManual = phase.isManuallyCompleted && !hasData
        const isComplete = hasData || phase.isManuallyCompleted
        const isLast = index === phases.length - 1

        // Check if previous phase is complete for connector line color
        const prevPhase = index > 0 ? phases[index - 1] : null
        const prevComplete = prevPhase ? (prevPhase.completedSessions > 0 || prevPhase.isManuallyCompleted) : false

        return (
          <div key={phase.number} className="flex items-center flex-1">
            <button
              onClick={() => onPhaseSelect(phase.number)}
              className={cn(
                'flex flex-col items-center gap-2 transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2703E] focus-visible:ring-offset-2 rounded-lg',
              )}
            >
              {/* Phase circle */}
              <div className="relative">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                    'border-2',
                    isSelected && 'ring-2 ring-[#C2703E] ring-offset-2',
                    isComplete
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : hasData
                      ? 'bg-[#C2703E] text-white border-[#C2703E]'
                      : 'bg-white text-stone-400 border-stone-200',
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    <span className="text-sm font-semibold">{phase.number}</span>
                  )}
                </div>

                {/* Manual completion indicator dot */}
                {isManual && (
                  <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-stone-400" />
                )}
              </div>

              {/* Phase name */}
              <p
                className={cn(
                  'text-[11px] font-medium uppercase tracking-wider text-center',
                  isSelected ? 'text-[#C2703E]' : 'text-stone-500',
                )}
              >
                {phase.name}
              </p>
            </button>

            {/* Connecting line */}
            {!isLast && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 transition-colors',
                  isComplete ? 'bg-emerald-400' : 'bg-stone-200',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
