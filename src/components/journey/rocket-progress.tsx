'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface RocketProgressProps {
  progress: number // 0-100
  label?: string
  showPercentage?: boolean
  animate?: boolean
  variant?: 'dark' | 'light'
  className?: string
}

export function RocketProgress({
  progress,
  label,
  showPercentage = true,
  animate = true,
  variant = 'light', // Accepted but not used
  className,
}: RocketProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(animate ? 0 : progress)

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setDisplayProgress(progress)
    }
  }, [progress, animate])

  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, displayProgress))

  // Determine bar color based on progress
  const getBarColor = () => {
    if (clampedProgress >= 80) return 'bg-emerald-500'
    if (clampedProgress >= 50) return 'bg-[#C2703E]'
    return 'bg-stone-400'
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Label and percentage */}
      <div className="flex items-center justify-between mb-2">
        {label && (
          <span className="text-[13px] font-medium text-stone-600">{label}</span>
        )}
        {showPercentage && (
          <span className="text-[13px] font-bold text-stone-900">
            {Math.round(clampedProgress)}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000 ease-out',
            getBarColor()
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}
