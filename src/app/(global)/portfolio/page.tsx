'use client'

import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Filter, CircleAlert, CircleCheck, Circle, Check, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DesignWeekOverviewCard,
  type DesignWeekOverview,
} from '@/components/portfolio/design-week-overview-card'

interface ConsultantWorkload {
  name: string
  total: number
  green: number
  yellow: number
  red: number
}

interface PortfolioData {
  summary: {
    total: number
    green: number
    yellow: number
    red: number
  }
  consultantWorkload: ConsultantWorkload[]
  designWeeks: DesignWeekOverview[]
}

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)
  const [selectedConsultant, setSelectedConsultant] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/portfolio')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to fetch portfolio data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter design weeks based on showOnlyIssues and selectedConsultant
  const filteredDesignWeeks = useMemo(() => {
    if (!data) return []
    let filtered = data.designWeeks

    if (showOnlyIssues) {
      filtered = filtered.filter(dw => dw.trafficLight !== 'green')
    }

    if (selectedConsultant) {
      filtered = filtered.filter(dw =>
        (dw.assignedTo || 'Unassigned') === selectedConsultant
      )
    }

    return filtered
  }, [data, showOnlyIssues, selectedConsultant])

  const summary = data?.summary ?? { total: 0, green: 0, yellow: 0, red: 0 }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-200/50">
              <span className="text-2xl">📈</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Design Week Overview</h1>
          </div>
          <p className="text-gray-500 ml-[60px]">
            Track all active Design Weeks and spot issues early
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          disabled={loading}
          className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <span className="text-lg">📋</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* On Track (Green) */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CircleCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{summary.green}</p>
                <p className="text-sm text-gray-500">On Track</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attention (Yellow) */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Circle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{summary.yellow}</p>
                <p className="text-sm text-gray-500">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical (Red) */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <CircleAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{summary.red}</p>
                <p className="text-sm text-gray-500">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultant Workload */}
      {data?.consultantWorkload && data.consultantWorkload.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Consultant Workload</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {data.consultantWorkload.map((consultant) => (
              <button
                key={consultant.name}
                onClick={() => setSelectedConsultant(
                  selectedConsultant === consultant.name ? null : consultant.name
                )}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-xl border transition-all',
                  selectedConsultant === consultant.name
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                )}
              >
                <span className="font-medium text-gray-900">{consultant.name}</span>
                <div className="flex items-center gap-1.5">
                  {consultant.red > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                      {consultant.red}
                    </span>
                  )}
                  {consultant.yellow > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                      {consultant.yellow}
                    </span>
                  )}
                  {consultant.green > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      {consultant.green}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <Filter className="w-4 h-4 text-gray-400" />
        <button
          onClick={() => setShowOnlyIssues(!showOnlyIssues)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
            showOnlyIssues
              ? 'bg-amber-100 border-amber-300 text-amber-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          <div
            className={cn(
              'w-4 h-4 rounded border flex items-center justify-center transition-all',
              showOnlyIssues
                ? 'bg-amber-500 border-amber-500'
                : 'border-gray-300'
            )}
          >
            {showOnlyIssues && <Check className="w-3 h-3 text-white" />}
          </div>
          Show only issues
        </button>
        {showOnlyIssues && (
          <span className="text-sm text-gray-500">
            Showing {filteredDesignWeeks.length} of {data?.designWeeks.length ?? 0}
          </span>
        )}
        {selectedConsultant && (
          <button
            onClick={() => setSelectedConsultant(null)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-100 border border-indigo-300 text-indigo-700 text-sm font-medium"
          >
            <Users className="w-3.5 h-3.5" />
            {selectedConsultant}
            <span className="ml-1">×</span>
          </button>
        )}
      </div>

      {/* Design Week cards */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : filteredDesignWeeks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            {showOnlyIssues ? (
              <>
                <CircleCheck className="w-16 h-16 mx-auto text-emerald-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">All clear!</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  No Design Weeks need attention right now. All implementations are on track.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowOnlyIssues(false)}
                >
                  Show all Design Weeks
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📈</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No active Design Weeks</h3>
                <p className="text-gray-500">
                  Design Weeks will appear here when implementations begin.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDesignWeeks.map((dw) => (
            <DesignWeekOverviewCard key={dw.id} designWeek={dw} />
          ))}
        </div>
      )}
    </div>
  )
}
