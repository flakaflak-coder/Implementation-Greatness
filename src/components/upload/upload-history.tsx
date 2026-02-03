'use client'

import { useState } from 'react'
import {
  FileAudio,
  FileText,
  FileVideo,
  FileImage,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DEWorkspaceUploadJob } from '@/components/de-workspace/types'

interface UploadHistoryProps {
  uploads: DEWorkspaceUploadJob[]
  onRetry?: (jobId: string) => void
  className?: string
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('image/')) return FileImage
  return FileText
}

function getStatusBadge(status: DEWorkspaceUploadJob['status']) {
  switch (status) {
    case 'COMPLETE':
      return (
        <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      )
    case 'FAILED':
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      )
    case 'QUEUED':
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Queued
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      )
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatClassificationType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

export function UploadHistory({ uploads, onRetry, className }: UploadHistoryProps) {
  const [expanded, setExpanded] = useState(false)

  if (!uploads || uploads.length === 0) {
    return null
  }

  // Show last 3 by default, all when expanded
  const displayedUploads = expanded ? uploads : uploads.slice(0, 3)
  const hasMore = uploads.length > 3

  // Count stats
  const stats = {
    total: uploads.length,
    complete: uploads.filter(u => u.status === 'COMPLETE').length,
    processing: uploads.filter(u => !['COMPLETE', 'FAILED'].includes(u.status)).length,
    failed: uploads.filter(u => u.status === 'FAILED').length,
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            Upload History
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">{stats.total} uploads</span>
            {stats.processing > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {stats.processing} processing
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedUploads.map((upload) => {
          const Icon = getFileIcon(upload.mimeType)

          return (
            <div
              key={upload.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                upload.status === 'FAILED'
                  ? 'bg-red-50 border-red-200'
                  : upload.status === 'COMPLETE'
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-blue-50 border-blue-200'
              )}
            >
              <div className={cn(
                'p-2 rounded-lg',
                upload.status === 'FAILED'
                  ? 'bg-red-100'
                  : upload.status === 'COMPLETE'
                  ? 'bg-gray-100'
                  : 'bg-blue-100'
              )}>
                <Icon className={cn(
                  'h-5 w-5',
                  upload.status === 'FAILED'
                    ? 'text-red-600'
                    : upload.status === 'COMPLETE'
                    ? 'text-gray-600'
                    : 'text-blue-600'
                )} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {upload.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(upload.fileSize)} • {formatDate(upload.createdAt)}
                    </p>
                  </div>
                  {getStatusBadge(upload.status)}
                </div>

                {/* Classification result */}
                {upload.classificationResult && (
                  <div className="mt-1">
                    <p className="text-xs text-gray-600">
                      Classified as: <span className="font-medium">{formatClassificationType(upload.classificationResult.type)}</span>
                      {upload.classificationResult.confidence && (
                        <span className="text-gray-400"> ({Math.round(upload.classificationResult.confidence * 100)}% confidence)</span>
                      )}
                    </p>
                    {/* Missing questions warning */}
                    {upload.classificationResult.missingQuestions &&
                     upload.classificationResult.missingQuestions.length > 0 && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-xs font-medium text-amber-700 mb-1">
                          Questions not covered in this session:
                        </p>
                        <ul className="text-xs text-amber-600 space-y-0.5">
                          {upload.classificationResult.missingQuestions.slice(0, 3).map((q: string, i: number) => (
                            <li key={i} className="flex items-start gap-1">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {q}
                            </li>
                          ))}
                          {upload.classificationResult.missingQuestions.length > 3 && (
                            <li className="text-amber-500 italic">
                              +{upload.classificationResult.missingQuestions.length - 3} more questions
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Population result */}
                {upload.populationResult && upload.status === 'COMPLETE' && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Extracted: {upload.populationResult.extractedItems} items, {upload.populationResult.integrations} integrations
                  </p>
                )}

                {/* Error message */}
                {upload.error && (
                  <p className="text-xs text-red-600 mt-1 truncate">
                    Error: {upload.error}
                  </p>
                )}

                {/* Retry button for failed uploads */}
                {upload.status === 'FAILED' && onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 text-xs"
                    onClick={() => onRetry(upload.id)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        {/* Show more/less button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-500 hover:text-gray-700"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {uploads.length - 3} more
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
