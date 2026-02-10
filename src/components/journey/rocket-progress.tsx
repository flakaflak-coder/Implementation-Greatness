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
  variant = 'light',
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

  // Calculate rocket position (leaving some padding for start/end icons)
  const rocketPosition = 8 + (clampedProgress / 100) * 84 // 8% to 92%

  const isDark = variant === 'dark'

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className={cn(
            'text-sm font-medium',
            isDark ? 'text-space-200' : 'text-gray-600'
          )}>
            {label}
          </span>
          {showPercentage && (
            <span className="text-sm font-bold text-[#C2703E]">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}

      {/* Progress track */}
      <div className={cn(
        'relative h-14 rounded-full border overflow-hidden',
        isDark
          ? 'bg-space-700/50 border-space-500/50'
          : 'bg-gradient-to-r from-slate-900 via-stone-900 to-stone-950 border-[#C2703E]/20'
      )}>
        {/* Stars background */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white/60 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Progress fill - gradient trail */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#C2703E]/30 via-[#D4956A]/40 to-transparent transition-all duration-1000 ease-out"
          style={{ width: `${rocketPosition}%` }}
        />

        {/* Glowing trail behind rocket */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-transparent via-[#D4956A] to-[#C2703E] rounded-full blur-sm transition-all duration-1000 ease-out"
          style={{
            left: `${Math.max(0, rocketPosition - 20)}%`,
            width: '20%',
            opacity: clampedProgress > 5 ? 1 : 0,
          }}
        />

        {/* Earth (start) */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center">
          <div className="relative">
            {/* Earth glow */}
            <div className="absolute inset-0 -m-1 rounded-full bg-blue-400/30 blur-md" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-emerald-500 shadow-lg shadow-blue-500/30">
              {/* Continents */}
              <div className="absolute top-1.5 left-1.5 w-2.5 h-2 bg-emerald-400/70 rounded-full rotate-12" />
              <div className="absolute bottom-1.5 right-1 w-2 h-1.5 bg-emerald-400/70 rounded-full -rotate-12" />
              <div className="absolute top-3 right-2 w-1.5 h-1 bg-emerald-400/50 rounded-full" />
              {/* Atmosphere */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
            </div>
          </div>
        </div>

        {/* Rocket */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-1000 ease-out z-10"
          style={{ left: `${rocketPosition}%` }}
        >
          <div className="relative">
            {/* Rocket flame */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-6 h-3">
              <div className="absolute inset-0 bg-gradient-to-l from-orange-500 via-yellow-400 to-transparent rounded-full animate-pulse blur-[2px]" />
              <div className="absolute inset-y-0.5 inset-x-0 bg-gradient-to-l from-orange-400 via-yellow-300 to-transparent rounded-full scale-90" />
              <div className="absolute inset-y-1 right-0 left-1 bg-gradient-to-l from-white via-yellow-200 to-transparent rounded-full scale-75" />
            </div>

            {/* Rocket body */}
            <div className="w-10 h-10 flex items-center justify-center text-3xl transform -rotate-90 drop-shadow-[0_0_12px_rgba(255,200,100,0.5)]">
              🚀
            </div>
          </div>
        </div>

        {/* Orbit destination (end) */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center">
          <div className="relative">
            {/* Orbit rings */}
            <div className="absolute inset-0 -m-1 flex items-center justify-center">
              <div className="w-10 h-10 border border-[#D4956A]/40 rounded-full animate-spin" style={{ animationDuration: '10s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 border border-pink-400/30 rounded-full animate-spin" style={{ animationDuration: '7s', animationDirection: 'reverse' }} />
            </div>
            {/* Destination planet/star */}
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#D4956A] via-[#C2703E] to-[#A05A32] shadow-[0_0_20px_rgba(194,112,62,0.6)] flex items-center justify-center">
              {/* Planet shine */}
              <div className="w-2 h-2 bg-white/70 rounded-full -translate-x-0.5 -translate-y-0.5 blur-[1px]" />
            </div>
            {/* Goal text */}
            {clampedProgress >= 100 && (
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-400 whitespace-nowrap animate-bounce">
                Launch!
              </div>
            )}
          </div>
        </div>

        {/* Milestone markers */}
        {[25, 50, 75].map((milestone) => (
          <div
            key={milestone}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-0.5 h-5 transition-colors',
              clampedProgress >= milestone ? 'bg-[#D4956A]/50' : 'bg-white/10'
            )}
            style={{ left: `${8 + (milestone / 100) * 84}%` }}
          />
        ))}
      </div>

      {/* Phase labels below */}
      <div className="flex justify-between mt-2 px-4 text-xs font-medium text-gray-400">
        <span className="flex items-center gap-1">
          <span className="text-base">🌍</span> Start
        </span>
        <span className="flex items-center gap-1">
          <span className="text-base">🎯</span> Launch Ready
        </span>
      </div>
    </div>
  )
}
