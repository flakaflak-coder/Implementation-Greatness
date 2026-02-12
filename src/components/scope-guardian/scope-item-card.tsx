'use client'

import { useState } from 'react'
import { FileText, Clock, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Undo2, CheckSquare, Square } from 'lucide-react'
// Card removed — using plain div wrapper
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatTimestamp } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Evidence {
  id: string
  sourceType: 'RECORDING' | 'DOCUMENT'
  timestampStart?: number | null
  timestampEnd?: number | null
  page?: number | null
  quote: string
  sessionNumber?: number
}

interface ScopeItemCardProps {
  id: string
  statement: string
  classification: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS'
  skill?: string | null
  conditions?: string | null
  notes?: string | null
  evidence: Evidence[]
  onResolve?: (id: string, classification: 'IN_SCOPE' | 'OUT_OF_SCOPE', notes?: string) => void
  onUnresolve?: (id: string) => void
  onViewEvidence?: (evidence: Evidence) => void
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export function ScopeItemCard({
  id,
  statement,
  classification,
  skill,
  conditions,
  notes,
  evidence,
  onResolve,
  onUnresolve,
  onViewEvidence,
  selectable = false,
  selected = false,
  onToggleSelect,
}: ScopeItemCardProps) {
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')

  const isAmbiguous = classification === 'AMBIGUOUS'

  const handleResolve = (newClassification: 'IN_SCOPE' | 'OUT_OF_SCOPE') => {
    onResolve?.(id, newClassification, resolutionNotes)
    setShowResolveDialog(false)
    setResolutionNotes('')
  }

  const handleCardClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect(id)
    }
  }

  const getClassificationIcon = () => {
    switch (classification) {
      case 'IN_SCOPE':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'OUT_OF_SCOPE':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'AMBIGUOUS':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />
    }
  }

  const getClassificationBadge = () => {
    switch (classification) {
      case 'IN_SCOPE':
        return <Badge variant="inScope">In Scope</Badge>
      case 'OUT_OF_SCOPE':
        return <Badge variant="outOfScope">Out of Scope</Badge>
      case 'AMBIGUOUS':
        return <Badge variant="ambiguous">Ambiguous</Badge>
    }
  }

  return (
    <>
      <div
        className={cn(
          'rounded-lg border border-stone-200/60 px-4 py-3 transition-all',
          isAmbiguous && 'border-amber-300 bg-amber-50/30',
          selectable && 'cursor-pointer hover:bg-stone-50',
          selectable && selected && 'ring-2 ring-[#C2703E] border-[#C2703E] bg-orange-50/30'
        )}
        onClick={handleCardClick}
      >
          <div className="flex items-start gap-3">
            {/* Selection checkbox */}
            {selectable && (
              <div className="mt-0.5 shrink-0">
                {selected ? (
                  <CheckSquare className="w-5 h-5 text-[#C2703E]" />
                ) : (
                  <Square className="w-5 h-5 text-stone-400" />
                )}
              </div>
            )}

            {/* Classification icon */}
            <div className="mt-0.5">{getClassificationIcon()}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-stone-900">{statement}</p>
                  {conditions && (
                    <p className="text-sm text-stone-600 mt-1">
                      <span className="font-medium">Condition:</span> {conditions}
                    </p>
                  )}
                  {skill && (
                    <Badge variant="secondary" className="mt-2">
                      {skill}
                    </Badge>
                  )}
                </div>
                {getClassificationBadge()}
              </div>

              {/* Notes */}
              {notes && (
                <p className="text-sm text-stone-500 mt-2 italic">{notes}</p>
              )}

              {/* Evidence */}
              {evidence.length > 0 && (
                <div className="mt-3 space-y-2">
                  {evidence.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewEvidence?.(ev)
                      }}
                      className="flex items-start gap-2 text-sm text-stone-600 hover:text-blue-600 transition-colors group w-full text-left"
                    >
                      {ev.sourceType === 'RECORDING' ? (
                        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                      )}
                      <span className="line-clamp-2">
                        {ev.sourceType === 'RECORDING' && ev.timestampStart != null && (
                          <span className="font-medium text-blue-600 group-hover:underline">
                            Session {ev.sessionNumber}, {formatTimestamp(ev.timestampStart)}
                          </span>
                        )}
                        {ev.sourceType === 'DOCUMENT' && ev.page && (
                          <span className="font-medium text-blue-600 group-hover:underline">
                            Page {ev.page}
                          </span>
                        )}
                        {' - "'}
                        {ev.quote.length > 100
                          ? ev.quote.substring(0, 100) + '...'
                          : ev.quote}
                        {'"'}
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Resolve buttons for ambiguous items (hidden in selection mode) */}
              {isAmbiguous && onResolve && !selectable && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-200">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleResolve('IN_SCOPE')
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    In Scope
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleResolve('OUT_OF_SCOPE')
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Out of Scope
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowResolveDialog(true)
                    }}
                  >
                    Needs Discussion
                  </Button>
                </div>
              )}

              {/* Unresolve button for resolved items */}
              {!isAmbiguous && onUnresolve && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-200">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onUnresolve(id)
                    }}
                    className="text-stone-600 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                  >
                    <Undo2 className="w-4 h-4 mr-1" />
                    Move back to Ambiguous
                  </Button>
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Resolve with notes dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Scope Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-stone-50 rounded-lg">
              <p className="text-sm font-medium">{statement}</p>
              {conditions && (
                <p className="text-xs text-stone-500 mt-1">Condition: {conditions}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-stone-600 mb-2">
                Add notes to explain the rationale for this decision. This will be included in the design documents for audit purposes.
              </p>
              <Textarea
                placeholder="e.g., Confirmed with client during Process Design session -- this will be handled by the existing support team instead."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResolveDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="success" onClick={() => handleResolve('IN_SCOPE')}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              In Scope
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleResolve('OUT_OF_SCOPE')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Out of Scope
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
