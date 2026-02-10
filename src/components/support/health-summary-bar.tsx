'use client'

import { Activity, AlertTriangle, CheckCircle2, HeartPulse, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HealthSummary } from './types'

interface HealthSummaryBarProps {
  summary: HealthSummary
}

export function HealthSummaryBar({ summary }: HealthSummaryBarProps) {
  const { total, healthy, attention, critical, averageScore } = summary

  const avgStatus =
    averageScore >= 80 ? 'healthy' : averageScore >= 60 ? 'attention' : 'critical'
  const avgColor =
    avgStatus === 'healthy'
      ? 'text-emerald-600'
      : avgStatus === 'attention'
      ? 'text-amber-500'
      : 'text-red-600'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Total Live DEs */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Live DEs</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Healthy */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-emerald-700">{healthy}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Healthy</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Attention */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-amber-700">{attention}</p>
            <p className="text-xs text-amber-600 mt-0.5">Attention</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Critical */}
      <div className={cn(
        'rounded-xl border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        critical > 0
          ? 'border-red-300 bg-red-50/50 ring-1 ring-red-200'
          : 'border-red-200 bg-red-50/30'
      )}>
        <div className="flex items-center justify-between">
          <div>
            <p className={cn(
              'text-2xl font-bold',
              critical > 0 ? 'text-red-700' : 'text-red-400'
            )}>
              {critical}
            </p>
            <p className={cn(
              'text-xs mt-0.5',
              critical > 0 ? 'text-red-600 font-medium' : 'text-red-400'
            )}>
              Critical
            </p>
          </div>
          <div className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center',
            critical > 0 ? 'bg-red-100' : 'bg-red-50'
          )}>
            <XCircle className={cn(
              'h-5 w-5',
              critical > 0 ? 'text-red-600' : 'text-red-300'
            )} />
          </div>
        </div>
      </div>

      {/* Average Score */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn('text-2xl font-bold', avgColor)}>
              {total > 0 ? averageScore : '--'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Avg. Health Score</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Activity className="h-5 w-5 text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  )
}
