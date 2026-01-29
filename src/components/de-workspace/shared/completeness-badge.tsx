'use client'

import { cn } from '@/lib/utils'

interface CompletenessBadgeProps {
  percentage: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function CompletenessBadge({
  percentage,
  size = 'md',
  showLabel = true,
  className,
}: CompletenessBadgeProps) {
  const getColor = () => {
    if (percentage >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (percentage >= 50) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getProgressColor = () => {
    if (percentage >= 80) return 'bg-emerald-500'
    if (percentage >= 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  }

  const progressWidth = {
    sm: 'w-8 h-1',
    md: 'w-12 h-1.5',
    lg: 'w-16 h-2',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        getColor(),
        sizeClasses[size],
        className
      )}
    >
      <div className={cn('rounded-full bg-gray-200 overflow-hidden', progressWidth[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', getProgressColor())}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      {showLabel && <span>{percentage}%</span>}
    </div>
  )
}

// Circular progress variant
interface CircularProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function CircularProgress({
  percentage,
  size = 40,
  strokeWidth = 4,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  const getColor = () => {
    if (percentage >= 80) return 'text-emerald-500'
    if (percentage >= 50) return 'text-amber-500'
    return 'text-red-500'
  }

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-500', getColor())}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-gray-700">{percentage}%</span>
    </div>
  )
}
