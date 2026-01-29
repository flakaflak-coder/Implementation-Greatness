'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  FileText,
  MessageSquare,
  Zap,
  TrendingUp,
  AlertCircle,
  Lightbulb,
} from 'lucide-react'

interface Feature {
  id: string
  name: string
  description: string
  status: 'built' | 'in_progress' | 'planned' | 'deprecated'
  category: string
  healthStatus: 'healthy' | 'degraded' | 'broken' | 'unknown'
  notes?: string
}

interface ObservatoryData {
  timestamp: string
  features: {
    summary: {
      total: number
      built: number
      inProgress: number
      planned: number
      deprecated: number
      healthy: number
      degraded: number
      broken: number
    }
    byCategory: Record<string, Feature[]>
    list: Feature[]
  }
  health: {
    overall: 'healthy' | 'degraded' | 'unhealthy'
    features: {
      healthy: number
      degraded: number
      broken: number
      unknown: number
    }
  }
  usage: {
    dailyActiveUsers: number
    totalEvents: number
  }
  errors: {
    total: number
    new: number
  }
  feedback: {
    total: number
    new: number
    averageNPS: number | null
  }
  llm: {
    totalOperations: number
    averageLatency: number
    successRate: number
  }
}

function getStatusIcon(status: Feature['status']) {
  switch (status) {
    case 'built':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />
    case 'in_progress':
      return <Clock className="w-4 h-4 text-blue-500" />
    case 'planned':
      return <Lightbulb className="w-4 h-4 text-amber-500" />
    case 'deprecated':
      return <AlertTriangle className="w-4 h-4 text-gray-400" />
  }
}

function getHealthBadge(health: Feature['healthStatus']) {
  switch (health) {
    case 'healthy':
      return <Badge variant="success">Healthy</Badge>
    case 'degraded':
      return <Badge variant="warning">Degraded</Badge>
    case 'broken':
      return <Badge variant="destructive">Broken</Badge>
    default:
      return <Badge variant="secondary">Unknown</Badge>
  }
}

function getStatusBadge(status: Feature['status']) {
  switch (status) {
    case 'built':
      return <Badge variant="success">Built</Badge>
    case 'in_progress':
      return <Badge variant="info">In Progress</Badge>
    case 'planned':
      return <Badge variant="secondary">Planned</Badge>
    case 'deprecated':
      return <Badge variant="outline">Deprecated</Badge>
  }
}

export default function ObservatoryPage() {
  const [data, setData] = useState<ObservatoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/observatory')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to fetch observatory data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading && !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-gray-600">{error}</p>
          <Button onClick={fetchData}>Retry</Button>
        </div>
      </div>
    )
  }

  const summary = data?.features.summary

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8" />
              Observatory
            </h1>
            <p className="text-gray-600 mt-1">
              Application monitoring and feature tracking
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'Never'}
            </span>
            <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Code2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Features</p>
                  <p className="text-2xl font-bold">
                    {summary?.built}/{summary?.total}
                  </p>
                  <p className="text-xs text-gray-400">
                    {summary?.inProgress} in progress, {summary?.planned} planned
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  data?.health.overall === 'healthy' ? 'bg-green-100' :
                  data?.health.overall === 'degraded' ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  <Activity className={`w-6 h-6 ${
                    data?.health.overall === 'healthy' ? 'text-green-600' :
                    data?.health.overall === 'degraded' ? 'text-amber-600' : 'text-red-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Health</p>
                  <p className="text-2xl font-bold capitalize">{data?.health.overall}</p>
                  <p className="text-xs text-gray-400">
                    {summary?.healthy} healthy, {summary?.degraded || 0} degraded
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Errors</p>
                  <p className="text-2xl font-bold">{data?.errors.total || 0}</p>
                  <p className="text-xs text-gray-400">
                    {data?.errors.new || 0} new errors
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">LLM Operations</p>
                  <p className="text-2xl font-bold">{data?.llm.totalOperations || 0}</p>
                  <p className="text-xs text-gray-400">
                    {data?.llm.successRate || 100}% success rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Feature Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Progress</span>
                <span className="text-sm font-medium">
                  {summary ? Math.round((summary.built / summary.total) * 100) : 0}%
                </span>
              </div>
              <Progress
                value={summary ? (summary.built / summary.total) * 100 : 0}
                className="h-3"
              />
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Built ({summary?.built})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>In Progress ({summary?.inProgress})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>Planned ({summary?.planned})</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Inventory */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All Features ({summary?.total})
            </TabsTrigger>
            <TabsTrigger value="core">Core</TabsTrigger>
            <TabsTrigger value="design-week">Design Week</TabsTrigger>
            <TabsTrigger value="extraction">Extraction</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          {['all', 'core', 'design-week', 'extraction', 'support', 'admin'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Feature Inventory
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data?.features.list
                      .filter(f => tab === 'all' || f.category === tab)
                      .map((feature) => (
                        <div
                          key={feature.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-4">
                            {getStatusIcon(feature.status)}
                            <div>
                              <p className="font-medium">{feature.name}</p>
                              <p className="text-sm text-gray-500">{feature.description}</p>
                              {feature.notes && (
                                <p className="text-xs text-amber-600 mt-1">{feature.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(feature.status)}
                            {getHealthBadge(feature.healthStatus)}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Feedback & Metrics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Recent Activity (placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Usage Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No usage data yet</p>
                <p className="text-sm">
                  Usage metrics will appear here once the app is in use
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feedback (placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                User Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No feedback yet</p>
                <p className="text-sm">
                  User feedback will appear here once collected
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}
