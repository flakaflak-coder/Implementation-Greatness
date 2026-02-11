'use client'

import { useState } from 'react'
import { Send, Sparkles, Check, X, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { type TimelineDE } from './gantt-timeline'

interface FeedbackChange {
  deId: string
  deName: string
  companyName: string
  field: string
  fieldLabel: string
  oldValue: string | number | null
  newValue: string | number | null
}

interface FeedbackResult {
  success: boolean
  changes: FeedbackChange[]
  explanation: string
  warnings?: string[]
}

interface PortfolioFeedbackWidgetProps {
  digitalEmployees: TimelineDE[]
  onChangesApplied?: () => void
  className?: string
}

export function PortfolioFeedbackWidget({
  digitalEmployees,
  onChangesApplied,
  className,
}: PortfolioFeedbackWidgetProps) {
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FeedbackResult | null>(null)
  const [applying, setApplying] = useState(false)

  const handleSubmit = async () => {
    if (!feedback.trim() || digitalEmployees.length === 0) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/portfolio/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: feedback.trim(),
          section: 'global',
          digitalEmployees: digitalEmployees.map((de) => ({
            id: de.id,
            name: de.name,
            companyName: de.company.name,
            trackerStatus: de.trackerStatus,
            riskLevel: de.riskLevel,
            percentComplete: de.percentComplete,
            startWeek: de.startWeek,
            endWeek: de.endWeek,
            goLiveWeek: de.goLiveWeek,
            blocker: de.blocker,
            thisWeekActions: de.thisWeekActions,
            ownerClient: de.ownerClient,
            ownerFreedayProject: de.ownerFreedayProject,
            ownerFreedayEngineering: de.ownerFreedayEngineering,
          })),
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        changes: [],
        explanation: 'An error occurred while processing your feedback.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!result || result.changes.length === 0) return

    setApplying(true)
    try {
      const response = await fetch('/api/portfolio/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: result.changes }),
      })

      if (response.ok) {
        setResult(null)
        setFeedback('')
        onChangesApplied?.()
      }
    } catch (error) {
      console.error('Error applying changes:', error)
    } finally {
      setApplying(false)
    }
  }

  const handleCancel = () => {
    setResult(null)
  }

  const examplePrompts = [
    'Acme Insurance is blocked on API access',
    'Move BankCo to week 12 go-live',
    'Sophie is overloaded, reassign TechCorp to Jan',
    'Mark all UAT items as high risk',
  ]

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#C2703E] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">AI Assistant</h3>
          <p className="text-xs text-gray-500">Update projects with natural language</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Input area */}
        {!result && (
          <div className="space-y-3">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder='E.g. "Acme DE is blocked on API access" or "Shift TechCorp 2 weeks forward"'
              className="min-h-[80px] resize-none text-sm"
              disabled={loading}
            />
            {!feedback && !loading && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-400">Try:</span>
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setFeedback(prompt)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-full px-3 py-1 cursor-pointer transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {digitalEmployees.length} DE{digitalEmployees.length !== 1 ? 's' : ''} available
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!feedback.trim() || loading}
                size="sm"
                className="bg-[#C2703E] hover:bg-[#A05A32]"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Analyze
              </Button>
            </div>
          </div>
        )}

        {/* Result preview */}
        {result && (
          <div className="space-y-4">
            {/* Explanation */}
            <div className="text-sm text-gray-700">{result.explanation}</div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  {result.warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Changes list */}
            {result.changes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Proposed Changes</p>
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                  {result.changes.map((change, i) => (
                    <div key={i} className="px-3 py-2 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{change.deName}</span>
                          <span className="text-xs text-gray-400 ml-2">({change.companyName})</span>
                        </div>
                        <span className="text-xs text-gray-500">{change.fieldLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded line-through">
                          {formatValue(change.oldValue)}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                          {formatValue(change.newValue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleApply}
                disabled={applying || result.changes.length === 0}
                size="sm"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              >
                {applying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Apply
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '(empty)'
  if (typeof value === 'number') return value.toString()
  // Format enum values
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
