'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, Bot, FileText, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DigitalEmployee {
  id: string
  name: string
  status: string
  company: { id: string; name: string }
  channels: string[]
  goLiveDate: string | null
  scopeSummary: {
    inScope: number
    outOfScope: number
    ambiguous: number
  }
}

interface ScopeItem {
  id: string
  digitalEmployeeId: string
  digitalEmployeeName: string
  companyName: string
  statement: string
  classification: string
  skill: string | null
  conditions: string | null
  notes: string | null
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'LIVE':
      return <Badge variant="success">Live</Badge>
    case 'DESIGN':
      return <Badge variant="info">In Design</Badge>
    case 'ONBOARDING':
      return <Badge variant="warning">Onboarding</Badge>
    case 'PAUSED':
      return <Badge variant="secondary">Paused</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function SupportPage() {
  const [digitalEmployees, setDigitalEmployees] = useState<DigitalEmployee[]>([])
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('agents')

  const fetchSupportData = useCallback(async (search?: string) => {
    setLoading(true)
    try {
      const url = search
        ? `/api/support?search=${encodeURIComponent(search)}`
        : '/api/support'
      const response = await fetch(url)
      const result = await response.json()
      if (result.success) {
        setDigitalEmployees(result.data.digitalEmployees)
        setScopeItems(result.data.scopeItems)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to fetch support data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSupportData()
  }, [fetchSupportData])

  // Debounced search for scope items
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'scope' && searchQuery) {
        fetchSupportData(searchQuery)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, activeTab, fetchSupportData])

  const liveAgents = digitalEmployees.filter((de) => de.status === 'LIVE')

  // Filter scope items locally for the current search
  const filteredScopeItems = scopeItems.filter(
    (item) =>
      searchQuery === '' ||
      item.statement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.digitalEmployeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Support Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Quick access to scope information and runbooks for all Digital Employees
            </p>
          </div>
          <Button onClick={() => fetchSupportData()} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Global search */}
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search scope items across all Digital Employees..."
              className="pl-10 h-12 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading state */}
        {loading && digitalEmployees.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          /* Tabs */
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="agents">
                <Bot className="w-4 h-4 mr-2" />
                Live Agents ({liveAgents.length})
              </TabsTrigger>
              <TabsTrigger value="scope">
                <FileText className="w-4 h-4 mr-2" />
                Scope Lookup
              </TabsTrigger>
            </TabsList>

            {/* Live Agents Tab */}
            <TabsContent value="agents" className="mt-6">
              {liveAgents.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">No live agents yet</p>
                  <p className="text-sm">Digital Employees will appear here once they go live</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveAgents.map((de) => (
                    <Card key={de.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-gray-500">{de.company.name}</p>
                            <CardTitle className="text-lg">{de.name}</CardTitle>
                          </div>
                          {getStatusBadge(de.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Scope summary */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{de.scopeSummary.inScope} in scope</span>
                          </div>
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>{de.scopeSummary.outOfScope} out of scope</span>
                          </div>
                        </div>

                        {de.scopeSummary.ambiguous > 0 && (
                          <div className="flex items-center gap-1 text-amber-600 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>{de.scopeSummary.ambiguous} ambiguous</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm" className="flex-1">
                            <Link href={`/support/scope/${de.id}`}>
                              View Scope
                            </Link>
                          </Button>
                          <Button asChild size="sm" className="flex-1">
                            <Link href={`/support/runbooks/${de.id}`}>
                              Runbook
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Scope Lookup Tab */}
            <TabsContent value="scope" className="mt-6">
              {searchQuery === '' ? (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">Search for scope items</p>
                  <p className="text-sm">
                    Type a keyword to search across all Digital Employees
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredScopeItems.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>No scope items found matching &ldquo;{searchQuery}&rdquo;</p>
                    </div>
                  ) : (
                    filteredScopeItems.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {item.classification === 'IN_SCOPE' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : item.classification === 'OUT_OF_SCOPE' ? (
                              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium">{item.statement}</p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {item.companyName} &rsaquo; {item.digitalEmployeeName}
                                  </p>
                                  {item.skill && (
                                    <p className="text-xs text-gray-400 mt-1">Skill: {item.skill}</p>
                                  )}
                                </div>
                                <Badge
                                  variant={
                                    item.classification === 'IN_SCOPE'
                                      ? 'inScope'
                                      : item.classification === 'OUT_OF_SCOPE'
                                      ? 'outOfScope'
                                      : 'ambiguous'
                                  }
                                >
                                  {item.classification === 'IN_SCOPE'
                                    ? 'In Scope'
                                    : item.classification === 'OUT_OF_SCOPE'
                                    ? 'Out of Scope'
                                    : 'Ambiguous'}
                                </Badge>
                              </div>
                              <div className="mt-3">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/support/scope/${item.digitalEmployeeId}`}>
                                    View Full Scope
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
    </div>
  )
}
