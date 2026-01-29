'use client'

import { useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, FileText, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTimestamp } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Evidence {
  id: string
  sourceType: 'RECORDING' | 'DOCUMENT'
  sourceId: string
  timestampStart?: number | null
  timestampEnd?: number | null
  page?: number | null
  paragraph?: number | null
  quote: string
}

interface EvidenceViewerProps {
  evidence: Evidence
  recordingUrl?: string
  sessionTitle?: string
  onClose?: () => void
  className?: string
}

export function EvidenceViewer({
  evidence,
  recordingUrl,
  sessionTitle,
  onClose,
  className,
}: EvidenceViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const currentTime = evidence.timestampStart || 0

  const isRecording = evidence.sourceType === 'RECORDING'

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isRecording ? (
              <Clock className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            Evidence Source
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
        {sessionTitle && (
          <p className="text-sm text-gray-500">{sessionTitle}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quote */}
        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <p className="text-gray-800 italic">&ldquo;{evidence.quote}&rdquo;</p>
        </div>

        {/* Recording player */}
        {isRecording && recordingUrl && (
          <div className="space-y-3">
            {/* Time range */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {evidence.timestampStart != null &&
                  formatTimestamp(evidence.timestampStart)}
              </span>
              <span>
                {evidence.timestampEnd != null &&
                  formatTimestamp(evidence.timestampEnd)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 bg-gray-200 rounded-full">
              <div
                className="absolute h-full bg-blue-600 rounded-full"
                style={{
                  left: '0%',
                  width: '100%',
                }}
              />
              <div
                className="absolute w-3 h-3 bg-blue-600 rounded-full -mt-0.5 cursor-pointer"
                style={{
                  left: `${
                    evidence.timestampEnd
                      ? ((currentTime - (evidence.timestampStart || 0)) /
                          (evidence.timestampEnd - (evidence.timestampStart || 0))) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="icon">
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button variant="ghost" size="icon">
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Note about video player */}
            <p className="text-xs text-gray-500 text-center">
              Video player integration with{' '}
              <a
                href={recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                recording source
              </a>
            </p>
          </div>
        )}

        {/* Document reference */}
        {!isRecording && evidence.page && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Page {evidence.page}</span>
            {evidence.paragraph && (
              <span>, Paragraph {evidence.paragraph}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
