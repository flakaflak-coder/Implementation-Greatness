'use client'

import { Check, Clock, AlertTriangle, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EvidenceLink } from '../shared/evidence-link'
import type { ExtractedItemWithSession } from '../types'
import type { ReviewStatus } from '@prisma/client'

interface ProfileFieldProps {
  item: ExtractedItemWithSession
  onEdit?: (item: ExtractedItemWithSession) => void
  onApprove?: (item: ExtractedItemWithSession) => void
  onReject?: (item: ExtractedItemWithSession) => void
  className?: string
}

export function ProfileField({ item, onEdit, onApprove, onReject, className }: ProfileFieldProps) {
  const getStatusIcon = (status: ReviewStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Check className="h-3.5 w-3.5 text-emerald-600" />
      case 'PENDING':
        return <Clock className="h-3.5 w-3.5 text-amber-600" />
      case 'NEEDS_CLARIFICATION':
        return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
      case 'REJECTED':
        return <Trash2 className="h-3.5 w-3.5 text-gray-400" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success" className="text-xs">Approved</Badge>
      case 'PENDING':
        return <Badge variant="warning" className="text-xs">Pending Review</Badge>
      case 'NEEDS_CLARIFICATION':
        return <Badge variant="destructive" className="text-xs">Needs Clarification</Badge>
      case 'REJECTED':
        return <Badge variant="secondary" className="text-xs">Rejected</Badge>
      default:
        return null
    }
  }

  const formatType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const isManual = item.sourceQuote === null && item.sourceTimestamp === null

  return (
    <div
      className={cn(
        'group relative p-3 rounded-lg border transition-all',
        item.status === 'APPROVED' && 'bg-white border-gray-200',
        item.status === 'PENDING' && 'bg-amber-50/50 border-amber-200',
        item.status === 'NEEDS_CLARIFICATION' && 'bg-red-50/50 border-red-200',
        item.status === 'REJECTED' && 'bg-gray-50 border-gray-200 opacity-60',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Type label */}
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(item.status)}
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {formatType(item.type)}
            </span>
            {item.confidence && (
              <span className="text-xs text-gray-400">
                {Math.round(item.confidence * 100)}% confidence
              </span>
            )}
          </div>

          {/* Content */}
          <p className="text-sm text-gray-900">{item.content}</p>

          {/* Structured data if present */}
          {item.structuredData && typeof item.structuredData === 'object' && (
            <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
              {Object.entries(item.structuredData as Record<string, unknown>).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-medium">{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Evidence and status row */}
          <div className="flex items-center gap-3 mt-2">
            <EvidenceLink
              source={{
                type: isManual ? 'manual' : 'session',
                sessionId: item.sessionId,
                sessionPhase: item.session?.phase,
                sessionNumber: item.session?.sessionNumber,
                sessionDate: item.session?.date ? new Date(item.session.date).toISOString() : undefined,
                timestamp: item.sourceTimestamp,
                speaker: item.sourceSpeaker,
                quote: item.sourceQuote,
              }}
              confidence={item.confidence}
              compact
            />
            {getStatusBadge(item.status)}
          </div>
        </div>

        {/* Action buttons (show on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.status === 'PENDING' && onApprove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onApprove(item)}
              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item)}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Source quote (if available and not manual) */}
      {item.sourceQuote && !isManual && (
        <div className="mt-3 pl-3 border-l-2 border-indigo-200">
          <p className="text-xs text-gray-500 italic">"{item.sourceQuote}"</p>
        </div>
      )}
    </div>
  )
}

// Compact version for lists
interface ProfileFieldCompactProps {
  item: ExtractedItemWithSession
  onClick?: () => void
  className?: string
}

export function ProfileFieldCompact({ item, onClick, className }: ProfileFieldCompactProps) {
  const getStatusDot = (status: ReviewStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500'
      case 'PENDING':
        return 'bg-amber-500'
      case 'NEEDS_CLARIFICATION':
        return 'bg-red-500'
      case 'REJECTED':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full p-2 rounded-md text-left',
        'hover:bg-gray-50 transition-colors',
        className
      )}
    >
      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', getStatusDot(item.status))} />
      <span className="text-sm text-gray-700 truncate flex-1">{item.content}</span>
      {item.confidence && (
        <span className="text-xs text-gray-400 flex-shrink-0">
          {Math.round(item.confidence * 100)}%
        </span>
      )}
    </button>
  )
}
