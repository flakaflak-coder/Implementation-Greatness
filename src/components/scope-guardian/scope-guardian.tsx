'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  onViewEvidence?: (evidence: Evidence) => void
  className?: string
}

export function ScopeGuardian({
  scopeItems,
  skills = [],
  onResolve,
  onViewEvidence,
  className,
}: ScopeGuardianProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)

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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with search and filters */}
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
        {skills.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedSkill || ''}
              onChange={(e) => setSelectedSkill(e.target.value || null)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="">All Skills</option>
              {skills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

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
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="in-scope" className="mt-4 space-y-3">
          {groupedItems.inScope.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No in-scope items found.</p>
            </div>
          ) : (
            groupedItems.inScope.map((item) => (
              <ScopeItemCard
                key={item.id}
                {...item}
                onViewEvidence={onViewEvidence}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="out-of-scope" className="mt-4 space-y-3">
          {groupedItems.outOfScope.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No out-of-scope items found.</p>
            </div>
          ) : (
            groupedItems.outOfScope.map((item) => (
              <ScopeItemCard
                key={item.id}
                {...item}
                onViewEvidence={onViewEvidence}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
