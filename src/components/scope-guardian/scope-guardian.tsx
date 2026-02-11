'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, Filter, CheckCircle2, XCircle, AlertTriangle, ListChecks, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScopeItemCard } from './scope-item-card'
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

interface ScopeItem {
  id: string
  statement: string
  classification: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS'
  skill?: string | null
  conditions?: string | null
  notes?: string | null
  evidence: Evidence[]
}

interface ScopeGuardianProps {
  scopeItems: ScopeItem[]
  skills?: string[]
  onResolve?: (id: string, classification: 'IN_SCOPE' | 'OUT_OF_SCOPE', notes?: string) => void
  onBatchResolve?: (ids: string[], classification: 'IN_SCOPE' | 'OUT_OF_SCOPE') => void
  onUnresolve?: (id: string) => void
  onViewEvidence?: (evidence: Evidence) => void
  className?: string
}

export function ScopeGuardian({
  scopeItems,
  skills = [],
  onResolve,
  onBatchResolve,
  onUnresolve,
  onViewEvidence,
  className,
}: ScopeGuardianProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmBatch, setConfirmBatch] = useState<'IN_SCOPE' | 'OUT_OF_SCOPE' | null>(null)

  // Group items by classification
  const groupedItems = useMemo(() => {
    const filtered = scopeItems.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.statement.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.conditions?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSkill = !selectedSkill || item.skill === selectedSkill
      return matchesSearch && matchesSkill
    })

    return {
      inScope: filtered.filter((i) => i.classification === 'IN_SCOPE'),
      outOfScope: filtered.filter((i) => i.classification === 'OUT_OF_SCOPE'),
      ambiguous: filtered.filter((i) => i.classification === 'AMBIGUOUS'),
    }
  }, [scopeItems, searchQuery, selectedSkill])

  const counts = {
    inScope: scopeItems.filter((i) => i.classification === 'IN_SCOPE').length,
    outOfScope: scopeItems.filter((i) => i.classification === 'OUT_OF_SCOPE')
      .length,
    ambiguous: scopeItems.filter((i) => i.classification === 'AMBIGUOUS').length,
  }

  const totalItems = scopeItems.length

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    const allAmbiguousIds = groupedItems.ambiguous.map((item) => item.id)
    setSelectedIds(new Set(allAmbiguousIds))
  }, [groupedItems.ambiguous])

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        // Exiting selection mode: clear selections
        setSelectedIds(new Set())
      }
      return !prev
    })
  }, [])

  const handleBatchResolve = useCallback(
    (classification: 'IN_SCOPE' | 'OUT_OF_SCOPE') => {
      if (selectedIds.size === 0) return
      setConfirmBatch(classification)
    },
    [selectedIds]
  )

  const handleConfirmBatchResolve = useCallback(() => {
    if (!confirmBatch || selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    onBatchResolve?.(ids, confirmBatch)
    setSelectedIds(new Set())
    setSelectionMode(false)
    setConfirmBatch(null)
  }, [selectedIds, confirmBatch, onBatchResolve])

  // If no scope items exist at all, show an empty state
  if (totalItems === 0) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[#FDF3EC] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-[#D4956A]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No scope items yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-2">
            Scope items are automatically extracted from your session recordings and transcripts.
            Upload a Process Design or Technical session to start building the scope.
          </p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            The AI identifies what the Digital Employee should handle (in scope), what it should not handle (out of scope),
            and items that need clarification (ambiguous).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Introduction text when there are ambiguous items */}
      {counts.ambiguous > 0 && (
        <p className="text-sm text-gray-600">
          The AI extracted {totalItems} scope items from your sessions. <span className="font-medium text-amber-700">{counts.ambiguous} items are ambiguous</span> and
          need your decision before sign-off. Review each item and mark it as In Scope or Out of Scope.
        </p>
      )}

      {/* Header with search, filters, and selection toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search scope items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {skills.length > 0 && (
            <>
              <Filter className="w-4 h-4 text-gray-400" />
              <Select
                value={selectedSkill || 'all'}
                onValueChange={(value) => setSelectedSkill(value === 'all' ? null : value)}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="All Skills" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Skills</SelectItem>
                  {skills.map((skill) => (
                    <SelectItem key={skill} value={skill}>
                      {skill}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {counts.ambiguous > 0 && (
            <Button
              size="sm"
              variant={selectionMode ? 'default' : 'outline'}
              onClick={handleToggleSelectionMode}
              className={cn(
                selectionMode && 'bg-[#C2703E] hover:bg-[#A85D32] text-white'
              )}
            >
              <ListChecks className="w-4 h-4 mr-1" />
              {selectionMode ? 'Exit Select' : 'Select'}
            </Button>
          )}
        </div>
      </div>

      {/* Selection mode controls */}
      {selectionMode && counts.ambiguous > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
          <span className="text-sm text-gray-700">
            {selectedIds.size} of {groupedItems.ambiguous.length} ambiguous items selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSelectAll}
              className="text-sm text-[#C2703E] hover:text-[#A85D32] hover:bg-orange-100"
            >
              Select All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeselectAll}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
          <div>
            <p className="text-2xl font-bold text-green-700">{counts.inScope}</p>
            <p className="text-sm text-green-600">In Scope</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
          <XCircle className="w-8 h-8 text-red-600" />
          <div>
            <p className="text-2xl font-bold text-red-700">{counts.outOfScope}</p>
            <p className="text-sm text-red-600">Out of Scope</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
          <div>
            <p className="text-2xl font-bold text-amber-700">{counts.ambiguous}</p>
            <p className="text-sm text-amber-600">Ambiguous</p>
          </div>
        </div>
      </div>

      {/* Tabs for different classifications */}
      <Tabs defaultValue="ambiguous" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ambiguous" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Ambiguous ({groupedItems.ambiguous.length})
          </TabsTrigger>
          <TabsTrigger value="in-scope" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            In Scope ({groupedItems.inScope.length})
          </TabsTrigger>
          <TabsTrigger value="out-of-scope" className="gap-2">
            <XCircle className="w-4 h-4" />
            Out of Scope ({groupedItems.outOfScope.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ambiguous" className="mt-4 space-y-3">
          {groupedItems.ambiguous.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="font-medium">No ambiguous items!</p>
              <p className="text-sm">All scope items have been resolved.</p>
            </div>
          ) : (
            groupedItems.ambiguous.map((item) => (
              <ScopeItemCard
                key={item.id}
                {...item}
                onResolve={onResolve}
                onViewEvidence={onViewEvidence}
                selectable={selectionMode}
                selected={selectedIds.has(item.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="in-scope" className="mt-4 space-y-3">
          {groupedItems.inScope.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-green-300" />
              </div>
              <p className="font-medium text-gray-700">No in-scope items yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                {searchQuery
                  ? 'No in-scope items match your search. Try different terms.'
                  : 'Items will appear here once scope decisions are made from session extractions or resolved from ambiguous items.'}
              </p>
            </div>
          ) : (
            groupedItems.inScope.map((item) => (
              <ScopeItemCard
                key={item.id}
                {...item}
                onUnresolve={onUnresolve}
                onViewEvidence={onViewEvidence}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="out-of-scope" className="mt-4 space-y-3">
          {groupedItems.outOfScope.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-7 h-7 text-red-300" />
              </div>
              <p className="font-medium text-gray-700">No out-of-scope items yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                {searchQuery
                  ? 'No out-of-scope items match your search. Try different terms.'
                  : 'Items explicitly excluded from the implementation will appear here. This helps prevent scope creep.'}
              </p>
            </div>
          ) : (
            groupedItems.outOfScope.map((item) => (
              <ScopeItemCard
                key={item.id}
                {...item}
                onUnresolve={onUnresolve}
                onViewEvidence={onViewEvidence}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Floating bulk actions bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center gap-3 px-5 py-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {selectedIds.size} selected
            </span>
            <div className="w-px h-6 bg-gray-200" />
            <Button
              size="sm"
              variant="success"
              onClick={() => handleBatchResolve('IN_SCOPE')}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              In Scope
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBatchResolve('OUT_OF_SCOPE')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Out of Scope
            </Button>
            <div className="w-px h-6 bg-gray-200" />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleToggleSelectionMode}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Batch resolve confirmation dialog */}
      <AlertDialog open={confirmBatch !== null} onOpenChange={(open) => { if (!open) setConfirmBatch(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Resolve {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} as {confirmBatch === 'IN_SCOPE' ? 'In Scope' : 'Out of Scope'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedIds.size} ambiguous scope {selectedIds.size === 1 ? 'item' : 'items'} as{' '}
              {confirmBatch === 'IN_SCOPE' ? 'In Scope' : 'Out of Scope'}. You can undo individual items later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBatchResolve}
              className={cn(
                confirmBatch === 'IN_SCOPE'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {confirmBatch === 'IN_SCOPE' ? 'Mark In Scope' : 'Mark Out of Scope'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
