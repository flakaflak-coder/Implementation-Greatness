'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HealthTrend } from './types'

interface TrendIndicatorProps {
  trend: HealthTrend
}

function Sparkline({ history, direction }: { history: number[]; direction: HealthTrend['direction'] }) {
  if (history.length < 2) return null

  const width = 60
  const height = 20
  const padding = 2

  const min = Math.min(...history)
  const max = Math.max(...history)
  const range = max - min || 1 // avoid division by zero

  const points = history.map((value, index) => {
    const x = padding + (index / (history.length - 1)) * (width - padding * 2)
    const y = padding + (1 - (value - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const polylinePoints = points.join(' ')

  // Build the fill polygon: line points + bottom-right + bottom-left
  const lastX = padding + ((history.length - 1) / (history.length - 1)) * (width - padding * 2)
  const firstX = padding
  const fillPoints = `${polylinePoints} ${lastX},${height - padding} ${firstX},${height - padding}`

  const strokeColor =
    direction === 'up'
      ? 'rgb(16, 185, 129)' // emerald-500
      : direction === 'down'
      ? 'rgb(239, 68, 68)' // red-500
      : 'rgb(156, 163, 175)' // gray-400

  const fillColor =
    direction === 'up'
      ? 'rgba(16, 185, 129, 0.1)'
      : direction === 'down'
      ? 'rgba(239, 68, 68, 0.1)'
      : 'rgba(156, 163, 175, 0.1)'

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <polygon
        points={fillPoints}
        fill={fillColor}
      />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TrendIndicator({ trend }: TrendIndicatorProps) {
  const { direction, delta, history } = trend

  const Icon =
    direction === 'up'
      ? TrendingUp
      : direction === 'down'
      ? TrendingDown
      : Minus

  const iconColor =
    direction === 'up'
      ? 'text-emerald-600'
      : direction === 'down'
      ? 'text-red-600'
      : 'text-gray-400'

  const deltaColor =
    direction === 'up'
      ? 'text-emerald-600'
      : direction === 'down'
      ? 'text-red-600'
      : 'text-gray-400'

  const deltaLabel =
    delta > 0
      ? `+${delta}`
      : delta < 0
      ? `${delta}`
      : '0'

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className={cn('h-3 w-3', iconColor)} />
      <span className={cn('text-[11px] font-medium tabular-nums', deltaColor)}>
        {deltaLabel}
      </span>
      <Sparkline history={history} direction={direction} />
    </span>
  )
}
