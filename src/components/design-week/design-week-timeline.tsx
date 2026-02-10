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
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {phases.map((phase) => {
        const isSelected = selectedPhase === phase.number
        const hasData = phase.completedSessions > 0

        return (
          <button
            key={phase.number}
            onClick={() => onPhaseSelect(phase.number)}
            className={cn(
              'group flex flex-col items-center flex-1 transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2703E] focus-visible:ring-offset-2 rounded-xl p-2',
            )}
          >
            {/* Topic circle */}
            <div className="relative mb-2">
              {/* Selection ring */}
              {isSelected && (
                <div className="absolute inset-0 -m-1.5 rounded-full border-2 border-[#C2703E] bg-[#FDF3EC]" />
              )}

              <div
                className={cn(
                  'relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
                  'border-2',
                  hasData
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isSelected
                    ? 'bg-[#C2703E] border-[#C2703E] text-white'
                    : 'bg-white border-gray-300 text-gray-400 group-hover:border-gray-400',
                )}
              >
                {hasData ? (
                  <Check className="w-5 h-5" strokeWidth={3} />
                ) : (
                  <span className="text-lg font-semibold">{phase.number}</span>
                )}
              </div>
            </div>

            {/* Topic name */}
            <p
              className={cn(
                'text-sm font-medium transition-colors text-center',
                isSelected ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-700',
                hasData && 'text-emerald-600'
              )}
            >
              {phase.name}
            </p>
          </button>
        )
      })}
    </div>
  )
}
