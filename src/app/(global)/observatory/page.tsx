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
  Bug,
  Heart,
  Cpu,
  Timer,
  DollarSign,
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

interface RecentError {
  id: string
  message: string
  featureId: string | null
  endpoint: string | null
  count: number
  status: string
  firstSeen: string
  lastSeen: string
}

interface RecentFeedback {
  id: string
  type: string
  content: string
  featureId: string | null
  npsScore: number | null
  status: string
  createdAt: string
}

interface LLMOperation {
  id: string
  pipelineName: string
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  cost: number | null
  success: boolean
  errorMessage: string | null
  timestamp: string
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
    weeklyActiveUsers: number
    totalEvents: number
    dailyEvents: number
    weeklyEvents: number
    topFeatures: Array<{ featureId: string; count: number }>
    recentActivity: Array<{
      featureId: string
      type: string
      timestamp: string
      success: boolean
    }>
  }
  errors: {
    total: number
    new: number
    investigating: number
    resolved: number
    recentErrors: RecentError[]
  }
  feedback: {
    total: number
    new: number
    averageNPS: number | null
    recentFeedback: RecentFeedback[]
  }
  llm: {
    totalOperations: number
    averageLatency: number
    totalCost: number
    successRate: number
    failedOperations: number
    totalInputTokens: number
    totalOutputTokens: number
    operationsByPipeline: Record<string, { count: number; totalLatency: number; totalTokens: number }>
    recentOperations: LLMOperation[]
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

function getFeedbackIcon(type: string) {
  switch (type) {
    case 'BUG':
      return <Bug className="w-4 h-4 text-red-500" />
    case 'FEATURE_REQUEST':
      return <Lightbulb className="w-4 h-4 text-amber-500" />
    case 'PRAISE':
      return <Heart className="w-4 h-4 text-pink-500" />
    case 'COMPLAINT':
      return <AlertCircle className="w-4 h-4 text-orange-500" />
    default:
      return <MessageSquare className="w-4 h-4 text-gray-500" />
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
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
                    {data?.errors.new || 0} new, {data?.errors.investigating || 0} investigating
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#F5E6DA] rounded-lg">
                  <Zap className="w-6 h-6 text-[#C2703E]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">LLM Operations</p>
                  <p className="text-2xl font-bold">{data?.llm.totalOperations || 0}</p>
                  <p className="text-xs text-gray-400">
                    {data?.llm.successRate || 100}% success, {data?.llm.averageLatency || 0}ms avg
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

        {/* Main Tabs */}
        <Tabs defaultValue="features" className="space-y-4">
          <TabsList>
            <TabsTrigger value="features">
              <Code2 className="w-4 h-4 mr-2" />
              Features ({summary?.total})
            </TabsTrigger>
            <TabsTrigger value="llm">
              <Cpu className="w-4 h-4 mr-2" />
              LLM Operations
            </TabsTrigger>
            <TabsTrigger value="errors">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Errors ({data?.errors.total || 0})
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback ({data?.feedback.total || 0})
            </TabsTrigger>
          </TabsList>

          {/* Features Tab */}
          <TabsContent value="features">
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
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
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Feature Inventory
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
          </TabsContent>

          {/* LLM Operations Tab */}
          <TabsContent value="llm">
            <div className="space-y-6">
              {/* LLM Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-[#C2703E]" />
                      <div>
                        <p className="text-sm text-gray-500">Total Operations</p>
                        <p className="text-xl font-bold">{data?.llm.totalOperations || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Timer className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Avg Latency</p>
                        <p className="text-xl font-bold">{data?.llm.averageLatency || 0}ms</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-sm text-gray-500">Total Tokens</p>
                        <p className="text-xl font-bold">
                          {((data?.llm.totalInputTokens || 0) + (data?.llm.totalOutputTokens || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Est. Cost</p>
                        <p className="text-xl font-bold">${data?.llm.totalCost?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Operations by Pipeline */}
              {data?.llm.operationsByPipeline && Object.keys(data.llm.operationsByPipeline).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Operations by Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(data.llm.operationsByPipeline).map(([pipeline, stats]) => (
                        <div key={pipeline} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Cpu className="w-4 h-4 text-[#C2703E]" />
                            <div>
                              <p className="font-medium">{pipeline}</p>
                              <p className="text-xs text-gray-500">
                                Avg latency: {Math.round(stats.totalLatency / stats.count)}ms
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">{stats.count} ops</span>
                            <span className="text-gray-400">{stats.totalTokens.toLocaleString()} tokens</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent LLM Operations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.llm.recentOperations && data.llm.recentOperations.length > 0 ? (
                    <div className="space-y-2">
                      {data.llm.recentOperations.map((op) => (
                        <div
                          key={op.id}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            !op.success ? 'border-red-200 bg-red-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {op.success ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{op.pipelineName}</p>
                              <p className="text-xs text-gray-500">
                                {op.model} • {op.inputTokens + op.outputTokens} tokens
                              </p>
                              {op.errorMessage && (
                                <p className="text-xs text-red-600 mt-1">{op.errorMessage}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">{op.latencyMs}ms</span>
                            <span className="text-gray-400">{formatTimeAgo(op.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Cpu className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No LLM operations yet</p>
                      <p className="text-sm">Operations will appear here once extractions are run</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Error Log
                  </span>
                  <div className="flex gap-2 text-sm font-normal">
                    <Badge variant="destructive">{data?.errors.new || 0} New</Badge>
                    <Badge variant="warning">{data?.errors.investigating || 0} Investigating</Badge>
                    <Badge variant="success">{data?.errors.resolved || 0} Resolved</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data?.errors.recentErrors && data.errors.recentErrors.length > 0 ? (
                  <div className="space-y-3">
                    {data.errors.recentErrors.map((error) => (
                      <div
                        key={error.id}
                        className="p-4 border border-red-200 bg-red-50 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-900">{error.message}</p>
                              <div className="flex gap-4 mt-1 text-xs text-red-700">
                                {error.endpoint && <span>Endpoint: {error.endpoint}</span>}
                                {error.featureId && <span>Feature: {error.featureId}</span>}
                                <span>Occurrences: {error.count}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={error.status === 'NEW' ? 'destructive' : 'warning'}>
                              {error.status}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(error.lastSeen)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-300" />
                    <p className="font-medium">No errors</p>
                    <p className="text-sm">All systems operating normally</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            <div className="space-y-6">
              {/* Feedback Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Total Feedback</p>
                        <p className="text-xl font-bold">{data?.feedback.total || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-sm text-gray-500">New Feedback</p>
                        <p className="text-xl font-bold">{data?.feedback.new || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Average NPS</p>
                        <p className="text-xl font-bold">
                          {data?.feedback?.averageNPS !== null && data?.feedback?.averageNPS !== undefined
                            ? data.feedback.averageNPS.toFixed(1)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.feedback.recentFeedback && data.feedback.recentFeedback.length > 0 ? (
                    <div className="space-y-3">
                      {data.feedback.recentFeedback.map((feedback) => (
                        <div
                          key={feedback.id}
                          className="p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {getFeedbackIcon(feedback.type)}
                              <div>
                                <p className="font-medium">{feedback.content}</p>
                                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                  <span>{feedback.type}</span>
                                  {feedback.featureId && <span>Page: {feedback.featureId}</span>}
                                  {feedback.npsScore !== null && <span>NPS: {feedback.npsScore}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={feedback.status === 'NEW' ? 'secondary' : 'outline'}>
                                {feedback.status}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(feedback.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No feedback yet</p>
                      <p className="text-sm">User feedback will appear here once collected</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Usage Metrics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Usage Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.usage.totalEvents && data.usage.totalEvents > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Daily Active Users</p>
                      <p className="text-2xl font-bold">{data.usage.dailyActiveUsers}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Weekly Active Users</p>
                      <p className="text-2xl font-bold">{data.usage.weeklyActiveUsers}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Events Today</p>
                      <p className="text-2xl font-bold">{data.usage.dailyEvents}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Events This Week</p>
                      <p className="text-2xl font-bold">{data.usage.weeklyEvents}</p>
                    </div>
                  </div>

                  {data.usage.topFeatures && data.usage.topFeatures.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Top Features</p>
                      <div className="space-y-2">
                        {data.usage.topFeatures.slice(0, 5).map((feature, i) => (
                          <div key={feature.featureId} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              {i + 1}. {feature.featureId}
                            </span>
                            <span className="font-medium">{feature.count} uses</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No usage data yet</p>
                  <p className="text-sm">
                    Usage metrics will appear here once the app is in use
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Features</span>
                  <span className="font-bold">{summary?.total || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700">Built & Healthy</span>
                  <span className="font-bold text-green-700">{summary?.built || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700">In Progress</span>
                  <span className="font-bold text-blue-700">{summary?.inProgress || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <span className="text-amber-700">Planned</span>
                  <span className="font-bold text-amber-700">{summary?.planned || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#FDF3EC] rounded-lg">
                  <span className="text-[#A05A32]">LLM Pipelines Active</span>
                  <span className="font-bold text-[#A05A32]">
                    {data?.llm.operationsByPipeline ? Object.keys(data.llm.operationsByPipeline).length : 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  )
}
