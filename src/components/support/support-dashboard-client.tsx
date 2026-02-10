'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Bot,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HealthSummaryBar } from './health-summary-bar'
import { DEHealthCard } from './de-health-card'
import { DEDetailPanel } from './de-detail-panel'
import {
  getHealthStatus,
  type SupportDE,
  type HealthStatus,
  type HealthSummary,
  type SortField,
  type SortDirection,
} from './types'

interface SupportDashboardClientProps {
  digitalEmployees: SupportDE[]
  companies: string[]
}

export function SupportDashboardClient({
  digitalEmployees,
  companies,
}: SupportDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'all'>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('healthScore')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedDE, setSelectedDE] = useState<SupportDE | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Compute health summary
  const healthSummary = useMemo<HealthSummary>(() => {
    const des = digitalEmployees
    const total = des.length
    const healthy = des.filter((d) => getHealthStatus(d.healthScore) === 'healthy').length
    const attention = des.filter((d) => getHealthStatus(d.healthScore) === 'attention').length
    const critical = des.filter((d) => getHealthStatus(d.healthScore) === 'critical').length
    const averageScore =
      total > 0 ? Math.round(des.reduce((sum, d) => sum + d.healthScore, 0) / total) : 0

    return { total, healthy, attention, critical, averageScore }
  }, [digitalEmployees])

  // Extract unique stages
  const stages = useMemo(() => {
    const uniqueStages = new Set(digitalEmployees.map((d) => d.currentJourneyPhase))
    return Array.from(uniqueStages).sort()
  }, [digitalEmployees])

  // Filter and sort
  const filteredDEs = useMemo(() => {
    let result = [...digitalEmployees]

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (de) =>
          de.name.toLowerCase().includes(query) ||
          de.companyName.toLowerCase().includes(query) ||
          de.status.toLowerCase().includes(query) ||
          de.currentJourneyPhase.toLowerCase().replace(/_/g, ' ').includes(query)
      )
    }

    // Health filter
    if (healthFilter !== 'all') {
      result = result.filter((de) => getHealthStatus(de.healthScore) === healthFilter)
    }

    // Company filter
    if (companyFilter !== 'all') {
      result = result.filter((de) => de.companyName === companyFilter)
    }

    // Stage filter
    if (stageFilter !== 'all') {
      result = result.filter((de) => de.currentJourneyPhase === stageFilter)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'healthScore':
          comparison = a.healthScore - b.healthScore
          break
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'companyName':
          comparison = a.companyName.localeCompare(b.companyName)
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [digitalEmployees, searchQuery, healthFilter, companyFilter, stageFilter, sortField, sortDirection])

  const handleSelectDE = useCallback((de: SupportDE) => {
    setSelectedDE(de)
    setDetailOpen(true)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false)
    // Delay clearing DE to allow exit animation
    setTimeout(() => setSelectedDE(null), 300)
  }, [])

  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setHealthFilter('all')
    setCompanyFilter('all')
    setStageFilter('all')
    setSortField('healthScore')
    setSortDirection('asc')
  }, [])

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    healthFilter !== 'all' ||
    companyFilter !== 'all' ||
    stageFilter !== 'all'

  const formatStage = (stage: string) =>
    stage
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')

  return (
    <div className="space-y-6">
      {/* Health Summary */}
      <HealthSummaryBar summary={healthSummary} />

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search by DE name, company, or status..."
          className="pl-12 h-12 text-base bg-white border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-xl focus-visible:ring-2"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Filters and sort bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </div>

        {/* Health filter */}
        <Select
          value={healthFilter}
          onValueChange={(v) => setHealthFilter(v as HealthStatus | 'all')}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Health Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="healthy">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Healthy
              </span>
            </SelectItem>
            <SelectItem value="attention">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Attention
              </span>
            </SelectItem>
            <SelectItem value="critical">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Critical
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Company filter */}
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company} value={company}>
                {company}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stage filter */}
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {formatStage(stage)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Sort */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <ArrowDownWideNarrow className="h-3.5 w-3.5" />
          Sort
        </div>
        <Select
          value={sortField}
          onValueChange={(v) => setSortField(v as SortField)}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="healthScore">Health Score</SelectItem>
            <SelectItem value="updatedAt">Last Updated</SelectItem>
            <SelectItem value="companyName">Company</SelectItem>
            <SelectItem value="name">DE Name</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleSortDirection}
          aria-label={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {sortDirection === 'asc' ? (
            <ArrowUpWideNarrow className="h-4 w-4" />
          ) : (
            <ArrowDownWideNarrow className="h-4 w-4" />
          )}
        </Button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <>
            <div className="h-6 w-px bg-gray-200" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-gray-500 hover:text-gray-700"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear all
            </Button>
          </>
        )}
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery.trim() && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-gray-200"
              onClick={() => setSearchQuery('')}
            >
              Search: &ldquo;{searchQuery}&rdquo;
              <X className="h-3 w-3" />
            </Badge>
          )}
          {healthFilter !== 'all' && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-gray-200"
              onClick={() => setHealthFilter('all')}
            >
              Health: {healthFilter}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {companyFilter !== 'all' && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-gray-200"
              onClick={() => setCompanyFilter('all')}
            >
              Company: {companyFilter}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {stageFilter !== 'all' && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-gray-200"
              onClick={() => setStageFilter('all')}
            >
              Stage: {formatStage(stageFilter)}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filteredDEs.length === digitalEmployees.length
            ? `Showing all ${filteredDEs.length} Digital Employees`
            : `Showing ${filteredDEs.length} of ${digitalEmployees.length} Digital Employees`}
        </p>
      </div>

      {/* DE Cards Grid */}
      {filteredDEs.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDEs.map((de) => (
            <DEHealthCard key={de.id} de={de} onSelect={handleSelectDE} />
          ))}
        </div>
      )}

      {/* Detail Panel */}
      <DEDetailPanel de={selectedDE} open={detailOpen} onClose={handleCloseDetail} />
    </div>
  )
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean
  onClear: () => void
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-16 px-8 text-center">
      <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      {hasFilters ? (
        <>
          <p className="text-sm font-medium text-gray-600">
            No Digital Employees match your filters
          </p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Try adjusting your search criteria or clearing the filters
          </p>
          <Button variant="outline" size="sm" onClick={onClear}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            Clear all filters
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-600">No Digital Employees yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Digital Employees will appear here once they are created and tracked
          </p>
        </>
      )}
    </div>
  )
}
