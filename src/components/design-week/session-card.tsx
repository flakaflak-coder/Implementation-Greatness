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
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    color: 'text-[#C2703E]',
    bg: 'bg-[#FDF3EC]',
  },
  complete: {
    icon: CheckCircle2,
    label: 'Extracted',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    color: 'text-red-600',
    bg: 'bg-red-50',
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
        'group relative rounded-lg border transition-all duration-200 cursor-pointer bg-white',
        'hover:border-stone-300',
        isSelected ? 'border-[#C2703E]' : 'border-gray-200'
      )}
    >
      <div className="p-3.5">
        {/* Header: phase name + status badge */}
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2">
            <FileAudio className="w-4 h-4 text-stone-500 shrink-0" />
            <h4 className="font-semibold text-sm text-gray-900">
              {phaseName} #{sessionNumber}
            </h4>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0',
              config.bg
            )}
          >
            <StatusIcon
              className={cn(
                'w-3 h-3',
                config.color,
                status === 'processing' && 'animate-spin'
              )}
            />
            <span className={config.color}>{config.label}</span>
          </div>
        </div>

        {/* Date & duration */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-2.5">
          <Clock className="w-3 h-3" />
          <span>{date}</span>
          {duration && (
            <>
              <span>•</span>
              <span>{duration}</span>
            </>
          )}
        </div>

        {/* Extraction stats for completed sessions */}
        {status === 'complete' && (
          <div className="flex items-center gap-3 mb-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C2703E]" />
              <span className="font-semibold text-gray-900">{extractedCount}</span>
              <span className="text-gray-500">items</span>
            </div>
            {unresolvedCount > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold text-amber-600">{unresolvedCount}</span>
                  <span className="text-gray-500">to review</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Topics covered */}
        {topicsCovered.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {topicsCovered.slice(0, 3).map((topic, i) => (
              <span
                key={i}
                className="text-[11px] bg-stone-100 text-stone-600 rounded px-1.5 py-0.5"
              >
                {topic}
              </span>
            ))}
            {topicsCovered.length > 3 && (
              <span className="text-[11px] bg-stone-50 text-stone-400 rounded px-1.5 py-0.5">
                +{topicsCovered.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        {(onPlay || (onExtract && status !== 'processing')) && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
            {onPlay && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onPlay()
                }}
                className="flex-1 h-7 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Play"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
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
                  'flex-1 h-7 text-xs',
                  status === 'complete'
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    : 'text-[#C2703E] hover:text-[#A05A32] hover:bg-[#FDF3EC]'
                )}
              >
                <Wand2 className="w-3.5 h-3.5 mr-1" />
                {status === 'complete' ? 'Re-extract' : 'Extract'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
