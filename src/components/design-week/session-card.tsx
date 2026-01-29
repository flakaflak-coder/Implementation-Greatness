'use client'

import { cn } from '@/lib/utils'
import {
  Play,
  FileAudio,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed'

export interface SessionCardProps {
  id: string
  sessionNumber: number
  phaseName: string
  date: string
  duration?: string
  status: ProcessingStatus
  extractedCount?: number
  unresolvedCount?: number
  topicsCovered?: string[]
  isSelected?: boolean
  onSelect?: () => void
  onExtract?: () => void
  onPlay?: () => void
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  complete: {
    icon: CheckCircle2,
    label: 'Extracted',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
}

export function SessionCard({
  sessionNumber,
  phaseName,
  date,
  duration,
  status,
  extractedCount = 0,
  unresolvedCount = 0,
  topicsCovered = [],
  isSelected,
  onSelect,
  onExtract,
  onPlay,
}: SessionCardProps) {
  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative rounded-xl border-2 transition-all duration-200 cursor-pointer bg-white',
        'hover:shadow-lg hover:shadow-gray-200/50',
        isSelected
          ? 'border-indigo-500 shadow-lg shadow-indigo-100 ring-4 ring-indigo-50'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      {/* Top accent bar for selected */}
      {isSelected && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-lg" />
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shadow-sm',
                isSelected
                  ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                  : 'bg-gradient-to-br from-gray-100 to-gray-200'
              )}
            >
              <FileAudio
                className={cn(
                  'w-6 h-6',
                  isSelected ? 'text-white' : 'text-gray-500'
                )}
              />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">
                {phaseName} #{sessionNumber}
              </h4>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{date}</span>
                {duration && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span>{duration}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
              config.bg,
              config.border,
              'border'
            )}
          >
            <StatusIcon
              className={cn(
                'w-3.5 h-3.5',
                config.color,
                status === 'processing' && 'animate-spin'
              )}
            />
            <span className={config.color}>{config.label}</span>
          </div>
        </div>

        {/* Extraction stats for completed sessions */}
        {status === 'complete' && (
          <div className="flex items-center gap-4 mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">{extractedCount}</span>
                <span className="text-xs text-gray-500 ml-1">items</span>
              </div>
            </div>
            {unresolvedCount > 0 && (
              <>
                <div className="h-8 w-px bg-gray-200" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-amber-600">{unresolvedCount}</span>
                    <span className="text-xs text-gray-500 ml-1">to review</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Topics covered */}
        {topicsCovered.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {topicsCovered.slice(0, 3).map((topic, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
              >
                {topic}
              </span>
            ))}
            {topicsCovered.length > 3 && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-400">
                +{topicsCovered.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          {onPlay && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onPlay()
              }}
              className="flex-1 h-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Play
            </Button>
          )}
          {onExtract && status !== 'processing' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onExtract()
              }}
              className={cn(
                'flex-1 h-9',
                status === 'complete'
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'
              )}
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              {status === 'complete' ? 'Re-extract' : 'Extract'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
