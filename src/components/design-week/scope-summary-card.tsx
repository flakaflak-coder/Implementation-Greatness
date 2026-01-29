'use client'

import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

interface ScopeSummaryCardProps {
  inScopeCount: number
  outScopeCount: number
  ambiguousCount: number
  completenessScore: number
  onViewDetails?: () => void
  className?: string
}

export function ScopeSummaryCard({
  inScopeCount,
  outScopeCount,
  ambiguousCount,
  completenessScore,
  onViewDetails,
  className,
}: ScopeSummaryCardProps) {
  const totalItems = inScopeCount + outScopeCount + ambiguousCount
  const needsAttention = ambiguousCount > 0

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white border shadow-sm',
        needsAttention ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200',
        className
      )}
    >
      {/* Header with gradient */}
      <div className="relative p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Scope Guardian</h3>
              <p className="text-sm text-gray-500">{totalItems} items tracked</p>
            </div>
          </div>
          <button
            onClick={onViewDetails}
            className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Completeness ring */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            {/* Background ring */}
            <svg className="w-36 h-36 transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="60"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="12"
              />
              <circle
                cx="72"
                cy="72"
                r="60"
                fill="none"
                stroke="url(#scope-gradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 60}
                strokeDashoffset={2 * Math.PI * 60 * (1 - completenessScore / 100)}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="scope-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900">{completenessScore}%</span>
              <span className="text-sm font-medium text-gray-500">Complete</span>
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="space-y-3">
          {/* In Scope */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="font-semibold text-emerald-700">In Scope</span>
            </div>
            <span className="text-2xl font-bold text-emerald-600">{inScopeCount}</span>
          </div>

          {/* Out of Scope */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <span className="font-semibold text-red-700">Out of Scope</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{outScopeCount}</span>
          </div>

          {/* Ambiguous - needs attention */}
          <div
            className={cn(
              'flex items-center justify-between p-4 rounded-xl',
              ambiguousCount > 0
                ? 'bg-amber-50 border-2 border-amber-300 shadow-sm shadow-amber-100'
                : 'bg-gray-50 border border-gray-200'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                ambiguousCount > 0 ? 'bg-amber-100' : 'bg-gray-100'
              )}>
                <AlertTriangle
                  className={cn(
                    'w-5 h-5',
                    ambiguousCount > 0 ? 'text-amber-600' : 'text-gray-400'
                  )}
                />
              </div>
              <span
                className={cn(
                  'font-semibold',
                  ambiguousCount > 0 ? 'text-amber-700' : 'text-gray-500'
                )}
              >
                Needs Resolution
              </span>
            </div>
            <span
              className={cn(
                'text-2xl font-bold',
                ambiguousCount > 0 ? 'text-amber-600' : 'text-gray-400'
              )}
            >
              {ambiguousCount}
            </span>
          </div>
        </div>

        {/* Call to action if items need attention */}
        {ambiguousCount > 0 && (
          <button
            onClick={onViewDetails}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold shadow-lg shadow-amber-200/50 hover:from-amber-500 hover:to-orange-600 transition-all"
          >
            Resolve {ambiguousCount} item{ambiguousCount !== 1 ? 's' : ''} now
          </button>
        )}
      </div>
    </div>
  )
}
