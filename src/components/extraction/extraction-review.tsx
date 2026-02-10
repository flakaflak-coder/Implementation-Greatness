'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Check,
  X,
  MessageSquare,
  AlertCircle,
  User,
  Target,
  BarChart3,
  Clock,
  Workflow,
  AlertTriangle,
  Shield,
  Database,
  Key,
  Bug,
  FileQuestion,
  ThumbsUp,
  Flag,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface ExtractedItem {
  id: string
  type: string
  category: string | null
  content: string
  structuredData: Record<string, unknown> | null
  confidence: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_CLARIFICATION'
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  sourceTimestamp: number | null
  sourceSpeaker: string | null
  sourceQuote: string | null
  createdAt: string
}

interface ExtractionReviewProps {
  sessionId: string
  sessionPhase?: number
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  STAKEHOLDER: { icon: User, color: 'text-blue-500 bg-blue-50', label: 'Stakeholder' },
  GOAL: { icon: Target, color: 'text-green-500 bg-green-50', label: 'Goal' },
  KPI_TARGET: { icon: BarChart3, color: 'text-[#C2703E] bg-[#FDF3EC]', label: 'KPI Target' },
  VOLUME_EXPECTATION: { icon: BarChart3, color: 'text-orange-500 bg-orange-50', label: 'Volume' },
  TIMELINE_CONSTRAINT: { icon: Clock, color: 'text-red-500 bg-red-50', label: 'Timeline' },
  HAPPY_PATH_STEP: { icon: Workflow, color: 'text-emerald-500 bg-emerald-50', label: 'Happy Path' },
  EXCEPTION_CASE: { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50', label: 'Exception' },
  BUSINESS_RULE: { icon: Shield, color: 'text-[#C2703E] bg-[#FDF3EC]', label: 'Business Rule' },
  SCOPE_IN: { icon: Check, color: 'text-green-600 bg-green-50', label: 'In Scope' },
  SCOPE_OUT: { icon: X, color: 'text-red-500 bg-red-50', label: 'Out of Scope' },
  ESCALATION_TRIGGER: { icon: AlertCircle, color: 'text-red-600 bg-red-50', label: 'Escalation' },
  SYSTEM_INTEGRATION: { icon: Database, color: 'text-cyan-500 bg-cyan-50', label: 'Integration' },
  DATA_FIELD: { icon: Database, color: 'text-slate-500 bg-slate-50', label: 'Data Field' },
  API_ENDPOINT: { icon: Key, color: 'text-[#C2703E] bg-[#FDF3EC]', label: 'API' },
  SECURITY_REQUIREMENT: { icon: Shield, color: 'text-rose-500 bg-rose-50', label: 'Security' },
  ERROR_HANDLING: { icon: Bug, color: 'text-orange-600 bg-orange-50', label: 'Error Handling' },
  OPEN_ITEM: { icon: FileQuestion, color: 'text-amber-600 bg-amber-50', label: 'Open Item' },
  DECISION: { icon: ThumbsUp, color: 'text-green-600 bg-green-50', label: 'Decision' },
  APPROVAL: { icon: Check, color: 'text-emerald-600 bg-emerald-50', label: 'Approval' },
  RISK: { icon: Flag, color: 'text-red-600 bg-red-50', label: 'Risk' },
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="outline">Pending Review</Badge>
    case 'APPROVED':
      return <Badge variant="success">Approved</Badge>
    case 'REJECTED':
      return <Badge variant="destructive">Rejected</Badge>
    case 'NEEDS_CLARIFICATION':
      return <Badge variant="warning">Needs Clarification</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatConfidence(confidence: number) {
  const percentage = Math.round(confidence * 100)
  let bgColor = 'bg-green-100 text-green-700 border-green-200'
  let label = 'High'
  if (percentage < 60) {
    bgColor = 'bg-red-100 text-red-700 border-red-200'
    label = 'Low'
  } else if (percentage < 80) {
    bgColor = 'bg-amber-100 text-amber-700 border-amber-200'
    label = 'Med'
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${bgColor}`} title={`${percentage}% confidence`}>
      {percentage}% {label}
    </span>
  )
}

export function ExtractionReview({ sessionId }: ExtractionReviewProps) {
  const { data: session } = useSession()
  const [items, setItems] = useState<ExtractedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchItems()
  }, [sessionId])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/sessions/${sessionId}/extract`)
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      setError('Failed to load extracted items')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (
    itemId: string,
    status: 'APPROVED' | 'REJECTED' | 'NEEDS_CLARIFICATION'
  ) => {
    setUpdating(itemId)
    try {
      const res = await fetch(`/api/extracted-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewNotes: reviewNotes[itemId] || null,
          reviewedBy: session?.user?.name || session?.user?.email || 'Unknown',
        }),
      })

      if (!res.ok) throw new Error('Failed to update')

      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status, reviewNotes: reviewNotes[itemId] || null, reviewedAt: new Date().toISOString() }
            : item
        )
      )
    } catch {
      setError('Failed to update item')
    } finally {
      setUpdating(null)
    }
  }

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  const approveAll = async () => {
    const pendingItems = items.filter((item) => item.status === 'PENDING')
    for (const item of pendingItems) {
      await handleReview(item.id, 'APPROVED')
    }
  }

  const rejectAll = async () => {
    const pendingItems = items.filter((item) => item.status === 'PENDING')
    for (const item of pendingItems) {
      await handleReview(item.id, 'REJECTED')
    }
  }

  // Group items by type
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = []
      }
      acc[item.type].push(item)
      return acc
    },
    {} as Record<string, ExtractedItem[]>
  )

  const pendingCount = items.filter((i) => i.status === 'PENDING').length
  const approvedCount = items.filter((i) => i.status === 'APPROVED').length

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Sparkles className="w-8 h-8 mx-auto mb-2 animate-pulse" />
          Loading extracted items...
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No items extracted yet</p>
          <p className="text-sm">Run extraction on this session to see items here.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-medium">{items.length}</span> items extracted
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-sm">{pendingCount} pending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm">{approvedCount} approved</span>
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={approveAll} className="text-green-600 hover:bg-green-50">
              <Check className="w-4 h-4 mr-2" />
              Approve All ({pendingCount})
            </Button>
            <Button variant="outline" size="sm" onClick={rejectAll} className="text-red-600 hover:bg-red-50">
              <X className="w-4 h-4 mr-2" />
              Reject All
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Grouped items */}
      {Object.entries(groupedItems).map(([type, typeItems]) => {
        const config = TYPE_CONFIG[type] || { icon: FileQuestion, color: 'text-gray-500 bg-gray-50', label: type }
        const Icon = config.icon

        return (
          <Card key={type}>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {config.label}
                <Badge variant="secondary" className="ml-2">
                  {typeItems.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {typeItems.map((item) => {
                  const isExpanded = expandedItems.has(item.id)

                  return (
                    <Collapsible key={item.id} open={isExpanded}>
                      <div className={`border rounded-lg ${item.status === 'PENDING' ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                        <CollapsibleTrigger
                          className="w-full p-3 flex items-start justify-between text-left hover:bg-gray-50/50"
                          onClick={() => toggleExpand(item.id)}
                        >
                          <div className="flex-1 pr-4">
                            <p className="text-sm">{item.content}</p>
                            {item.category && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {item.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {formatConfidence(item.confidence)}
                            {getStatusBadge(item.status)}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-3 pb-3 border-t space-y-3">
                            {/* Source quote */}
                            {item.sourceQuote && (
                              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                                <div className="flex items-center gap-2 text-gray-500 mb-1">
                                  <MessageSquare className="w-3 h-3" />
                                  <span className="text-xs font-medium">Source Quote</span>
                                  {item.sourceSpeaker && (
                                    <span className="text-xs">— {item.sourceSpeaker}</span>
                                  )}
                                </div>
                                <p className="text-gray-700 italic">&quot;{item.sourceQuote}&quot;</p>
                              </div>
                            )}

                            {/* Review notes input */}
                            {item.status === 'PENDING' && (
                              <div>
                                <Textarea
                                  placeholder="Add notes (optional)..."
                                  className="text-sm"
                                  value={reviewNotes[item.id] || ''}
                                  onChange={(e) =>
                                    setReviewNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                                  }
                                />
                              </div>
                            )}

                            {/* Existing review notes */}
                            {item.reviewNotes && item.status !== 'PENDING' && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Review notes:</span> {item.reviewNotes}
                              </div>
                            )}

                            {/* Action buttons */}
                            {item.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:bg-green-50"
                                  onClick={() => handleReview(item.id, 'APPROVED')}
                                  disabled={updating === item.id}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-600 hover:bg-amber-50"
                                  onClick={() => handleReview(item.id, 'NEEDS_CLARIFICATION')}
                                  disabled={updating === item.id}
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  Need Clarification
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleReview(item.id, 'REJECTED')}
                                  disabled={updating === item.id}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
