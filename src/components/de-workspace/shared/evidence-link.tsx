'use client'

import { useState } from 'react'
import { Play, FileText, Clock, User, Quote, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface EvidenceSource {
  type: 'session' | 'manual'
  sessionId?: string
  sessionPhase?: number
  sessionNumber?: number
  sessionDate?: string
  timestamp?: number | null
  speaker?: string | null
  quote?: string | null
}

interface EvidenceLinkProps {
  source: EvidenceSource
  confidence?: number
  compact?: boolean
  className?: string
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getPhaseName(phase: number): string {
  const phases: Record<number, string> = {
    1: 'Kickoff',
    2: 'Process Design',
    3: 'Technical',
    4: 'Sign-off',
  }
  return phases[phase] || `Phase ${phase}`
}

export function EvidenceLink({ source, confidence, compact = false, className }: EvidenceLinkProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (source.type === 'manual') {
    return (
      <Badge variant="secondary" className={cn('text-xs gap-1', className)}>
        <PenLine className="h-3 w-3" />
        {!compact && 'Manually entered'}
      </Badge>
    )
  }

  const sessionLabel = source.sessionPhase
    ? `${getPhaseName(source.sessionPhase)} ${source.sessionNumber || ''}`
    : 'Session'

  if (compact) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button
            className={cn(
              'inline-flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors',
              className
            )}
          >
            <FileText className="h-3 w-3" />
            {source.timestamp && <span>{formatTimestamp(source.timestamp)}</span>}
          </button>
        </DialogTrigger>
        <EvidenceDialog source={source} confidence={confidence} />
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs',
            'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900',
            'border border-gray-200 transition-all',
            className
          )}
        >
          <FileText className="h-3 w-3" />
          <span className="font-medium">{sessionLabel}</span>
          {source.timestamp && (
            <>
              <span className="text-gray-400">|</span>
              <Clock className="h-3 w-3" />
              <span>{formatTimestamp(source.timestamp)}</span>
            </>
          )}
        </button>
      </DialogTrigger>
      <EvidenceDialog source={source} confidence={confidence} />
    </Dialog>
  )
}

function EvidenceDialog({
  source,
  confidence,
}: {
  source: EvidenceSource
  confidence?: number
}) {
  const sessionLabel = source.sessionPhase
    ? `${getPhaseName(source.sessionPhase)} ${source.sessionNumber || ''}`
    : 'Session'

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-500" />
          Evidence Source
        </DialogTitle>
        <DialogDescription>Where this information was captured</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Session info */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">{sessionLabel}</p>
            {source.sessionDate && (
              <p className="text-sm text-gray-500" suppressHydrationWarning>
                {new Date(source.sessionDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
          {confidence !== undefined && (
            <Badge variant={confidence >= 0.8 ? 'success' : 'warning'}>
              {Math.round(confidence * 100)}% confidence
            </Badge>
          )}
        </div>

        {/* Timestamp */}
        {source.timestamp && (
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="p-2 bg-indigo-50 rounded-full">
              <Clock className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Timestamp</p>
              <p className="text-lg font-mono text-gray-900">{formatTimestamp(source.timestamp)}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto gap-2">
              <Play className="h-4 w-4" />
              Play
            </Button>
          </div>
        )}

        {/* Speaker */}
        {source.speaker && (
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="p-2 bg-violet-50 rounded-full">
              <User className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Speaker</p>
              <p className="text-gray-900">{source.speaker}</p>
            </div>
          </div>
        )}

        {/* Quote */}
        {source.quote && (
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Quote className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">Original Quote</p>
            </div>
            <blockquote className="pl-3 border-l-2 border-indigo-300 text-gray-600 italic">
              "{source.quote}"
            </blockquote>
          </div>
        )}
      </div>
    </DialogContent>
  )
}

// Simple evidence indicator for lists
interface EvidenceIndicatorProps {
  hasEvidence: boolean
  isManual?: boolean
  className?: string
}

export function EvidenceIndicator({ hasEvidence, isManual, className }: EvidenceIndicatorProps) {
  if (isManual) {
    return (
      <div className={cn('flex items-center gap-1 text-gray-400', className)}>
        <PenLine className="h-3 w-3" />
      </div>
    )
  }

  if (hasEvidence) {
    return (
      <div className={cn('flex items-center gap-1 text-indigo-500', className)}>
        <FileText className="h-3 w-3" />
      </div>
    )
  }

  return null
}
