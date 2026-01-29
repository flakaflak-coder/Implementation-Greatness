'use client'

import { cn } from '@/lib/utils'
import { getPhaseLabel } from '@/lib/utils'
import { CheckCircle2, Circle, CircleDot } from 'lucide-react'

interface DesignWeekProgressProps {
  currentPhase: number
  status: string
  className?: string
}

export function DesignWeekProgress({
  currentPhase,
  status,
  className,
}: DesignWeekProgressProps) {
  const phases = [1, 2, 3, 4]

  const getPhaseStatus = (phase: number) => {
    if (status === 'COMPLETE') return 'complete'
    if (phase < currentPhase) return 'complete'
    if (phase === currentPhase) return 'current'
    return 'pending'
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {phases.map((phase, index) => (
          <div key={phase} className="flex items-center flex-1">
            {/* Phase indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                  getPhaseStatus(phase) === 'complete' &&
                    'bg-green-600 border-green-600 text-white',
                  getPhaseStatus(phase) === 'current' &&
                    'bg-blue-600 border-blue-600 text-white',
                  getPhaseStatus(phase) === 'pending' &&
                    'bg-white border-gray-300 text-gray-400'
                )}
              >
                {getPhaseStatus(phase) === 'complete' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : getPhaseStatus(phase) === 'current' ? (
                  <CircleDot className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium',
                  getPhaseStatus(phase) === 'complete' && 'text-green-600',
                  getPhaseStatus(phase) === 'current' && 'text-blue-600',
                  getPhaseStatus(phase) === 'pending' && 'text-gray-400'
                )}
              >
                {getPhaseLabel(phase)}
              </span>
            </div>

            {/* Connector line */}
            {index < phases.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2',
                  phase < currentPhase ? 'bg-green-600' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
