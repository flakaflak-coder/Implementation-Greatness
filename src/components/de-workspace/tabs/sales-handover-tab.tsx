'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  FileSignature,
  AlertTriangle,
  Calendar,
  Star,
  Users,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Plus,
  X,
  Check,
  Clock,
  Shield,
  Info,
  Sparkles,
  Send,
  CheckCircle2,
  MessageSquare,
  Rocket,
  Circle,
} from 'lucide-react'
import { toast } from 'sonner'
import { TagList } from '../profile-fields'
import { CircularProgress } from '../shared/completeness-badge'
import {
  SalesHandoverProfile,
  SalesWatchOut,
  SalesDeadline,
  PromisedCapability,
  Stakeholder,
  createEmptySalesHandoverProfile,
  SALES_HANDOVER_SECTION_CONFIG,
  calculateHandoverCompleteness,
  type HandoverCompleteness,
  type QualityCheckResult,
} from '../profile-types'

interface SalesHandoverTabProps {
  designWeekId: string
  className?: string
}

interface ChecklistItem {
  id: string
  label: string
  isCompleted: boolean
  completedAt: string | null
  completedBy: string | null
}

// Section colors
const sectionColors: Record<string, string> = {
  blue: 'border-blue-200 bg-blue-50/50',
  amber: 'border-amber-200 bg-amber-50/50',
  rose: 'border-rose-200 bg-rose-50/50',
  violet: 'border-violet-200 bg-violet-50/50',
  emerald: 'border-emerald-200 bg-emerald-50/50',
}

const iconColors: Record<string, string> = {
  blue: 'text-blue-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  violet: 'text-violet-600',
  emerald: 'text-emerald-600',
}

const SectionIcon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    FileSignature: <FileSignature className={className} />,
    AlertTriangle: <AlertTriangle className={className} />,
    Calendar: <Calendar className={className} />,
    Star: <Star className={className} />,
    Users: <Users className={className} />,
  }
  return icons[name] || null
}

// Severity badge colors
const severityColors = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
}

const categoryColors = {
  political: 'bg-purple-100 text-purple-700',
  technical: 'bg-cyan-100 text-cyan-700',
  timeline: 'bg-orange-100 text-orange-700',
  scope: 'bg-emerald-100 text-emerald-700',
  other: 'bg-gray-100 text-gray-700',
}

const deadlineTypeColors = {
  contract: 'bg-red-100 text-red-700',
  go_live: 'bg-green-100 text-green-700',
  milestone: 'bg-blue-100 text-blue-700',
  review: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
}

const priorityColors = {
  must_have: 'bg-red-100 text-red-700',
  should_have: 'bg-amber-100 text-amber-700',
  nice_to_have: 'bg-blue-100 text-blue-700',
}

// Implementation pulse data returned by the API
interface ImplementationPulseData {
  designWeekStatus: string
  currentPhase: number
  phaseName: string
  sessionsProcessed: number
  daysSinceAccepted: number | null
  blockedPrerequisites: number
  pendingPrerequisites: number
  overdueDeadlines: number
  hasBusinessProfile: boolean
  hasTechnicalProfile: boolean
}

export function SalesHandoverTab({ designWeekId, className }: SalesHandoverTabProps) {
  const [profile, setProfile] = useState<SalesHandoverProfile>(createEmptySalesHandoverProfile())
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['context', 'watchOuts', 'deadlines', 'specialNotes', 'stakeholders'])
  )

  // Feature 1: Completeness + AI Quality Check
  const [qualityCheckResult, setQualityCheckResult] = useState<QualityCheckResult | null>(null)
  const [checkingQuality, setCheckingQuality] = useState(false)

  // Feature 2: Handover status flow
  const [transitioning, setTransitioning] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewComment, setReviewComment] = useState('')

  // Feature 3: Implementation pulse
  const [implementationPulse, setImplementationPulse] = useState<ImplementationPulseData | null>(null)

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const response = await fetch(`/api/design-weeks/${designWeekId}/sales-handover`)
        if (!response.ok) {
          throw new Error('Failed to load sales handover profile')
        }
        const data = await response.json()
        if (data.profile) {
          // Ensure backward compat: old profiles may lack handoverStatus
          setProfile({ ...createEmptySalesHandoverProfile(), ...data.profile })
        }
        if (data.checklist) {
          setChecklist(data.checklist)
        }
        if (data.implementationPulse) {
          setImplementationPulse(data.implementationPulse)
        }
      } catch (err) {
        console.error('Error loading sales handover profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [designWeekId])

  // Save profile changes
  const saveProfile = useCallback(
    async (updatedProfile: SalesHandoverProfile) => {
      try {
        setSaving(true)
        const response = await fetch(`/api/design-weeks/${designWeekId}/sales-handover`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: updatedProfile }),
        })
        if (!response.ok) {
          throw new Error('Failed to save profile')
        }
      } catch (err) {
        console.error('Error saving profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to save profile')
      } finally {
        setSaving(false)
      }
    },
    [designWeekId]
  )

  // Update helpers with auto-save
  const updateProfile = useCallback(
    (updater: (prev: SalesHandoverProfile) => SalesHandoverProfile) => {
      setProfile((prev) => {
        const updated = updater(prev)
        saveProfile(updated)
        return updated
      })
    },
    [saveProfile]
  )

  // Toggle checklist item
  const toggleChecklistItem = useCallback(
    async (itemId: string, isCompleted: boolean) => {
      try {
        const response = await fetch(`/api/journey-phases/${itemId}/checklist`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isCompleted }),
        })
        if (response.ok) {
          setChecklist((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? { ...item, isCompleted, completedAt: isCompleted ? new Date().toISOString() : null }
                : item
            )
          )
        }
      } catch (err) {
        console.error('Error toggling checklist item:', err)
      }
    },
    []
  )

  // Completeness calculation (recalculates on profile/checklist changes)
  const completeness: HandoverCompleteness = calculateHandoverCompleteness(profile, checklist)

  // Handover status helpers
  const handoverStatus = profile.handoverStatus || 'draft'
  const isReadOnly = handoverStatus === 'submitted' || handoverStatus === 'accepted'

  // AI Quality Check handler
  const handleQualityCheck = useCallback(async () => {
    setCheckingQuality(true)
    setQualityCheckResult(null)
    try {
      const response = await fetch(`/api/design-weeks/${designWeekId}/sales-handover/quality-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      })
      if (!response.ok) throw new Error('Quality check failed')
      const data = await response.json()
      setQualityCheckResult(data.result)
      toast.success('Quality check complete')
    } catch (err) {
      toast.error('Failed to run quality check')
      console.error(err)
    } finally {
      setCheckingQuality(false)
    }
  }, [designWeekId, profile])

  // Status transition handler (submit, accept, request_changes)
  const handleStatusTransition = useCallback(
    async (action: string, comment?: string) => {
      setTransitioning(true)
      try {
        const response = await fetch(`/api/design-weeks/${designWeekId}/sales-handover`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, comment }),
        })
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Transition failed')
        }
        const data = await response.json()
        setProfile((prev) => ({ ...prev, ...data.profile }))
        toast.success(
          action === 'submit'
            ? 'Handover submitted!'
            : action === 'accept'
              ? 'Handover accepted!'
              : action === 'request_changes'
                ? 'Changes requested'
                : 'Handover resubmitted!'
        )
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update handover status')
      } finally {
        setTransitioning(false)
        setShowReviewDialog(false)
        setReviewComment('')
      }
    },
    [designWeekId]
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading sales handover...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>{error}</span>
      </div>
    )
  }

  const completedCount = checklist.filter((c) => c.isCompleted).length
  const totalCount = checklist.length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 shadow-lg z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}

      {/* Implementation Pulse (shown post-handover) */}
      {implementationPulse && (
        <ImplementationPulse data={implementationPulse} />
      )}

      {/* Status Banner */}
      {handoverStatus === 'submitted' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-700">
                Handover submitted{profile.submittedBy ? ` by ${profile.submittedBy}` : ''}{profile.submittedAt ? ` on ${new Date(profile.submittedAt).toLocaleDateString()}` : ''}
              </p>
              <p className="text-xs text-blue-600">Review the handover and accept, or request changes.</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => handleStatusTransition('accept')}
              disabled={transitioning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept
            </button>
            <button
              onClick={() => setShowReviewDialog(true)}
              disabled={transitioning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <MessageSquare className="h-4 w-4" />
              Request Changes
            </button>
          </div>
        </div>
      )}

      {handoverStatus === 'accepted' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Handover accepted{profile.reviewedBy ? ` by ${profile.reviewedBy}` : ''}{profile.reviewedAt ? ` on ${new Date(profile.reviewedAt).toLocaleDateString()}` : ''}
            </p>
            {profile.reviewComment && (
              <p className="text-xs text-emerald-600 mt-0.5">{profile.reviewComment}</p>
            )}
          </div>
        </div>
      )}

      {handoverStatus === 'changes_requested' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700">
                Changes requested{profile.reviewedBy ? ` by ${profile.reviewedBy}` : ''}{profile.reviewedAt ? ` on ${new Date(profile.reviewedAt).toLocaleDateString()}` : ''}
              </p>
              {profile.reviewComment && (
                <p className="text-xs text-amber-600 mt-0.5">&ldquo;{profile.reviewComment}&rdquo;</p>
              )}
            </div>
          </div>
          <button
            onClick={() => handleStatusTransition('submit')}
            disabled={transitioning || completeness.overall < 60}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            <Send className="h-4 w-4" />
            Resubmit
          </button>
        </div>
      )}

      {/* Review Comment Dialog (inline) */}
      {showReviewDialog && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
          <h4 className="text-sm font-semibold text-amber-800">What changes are needed?</h4>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Describe what needs to be added or changed..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowReviewDialog(false); setReviewComment('') }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleStatusTransition('request_changes', reviewComment)}
              disabled={transitioning || !reviewComment.trim()}
              className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Send Feedback
            </button>
          </div>
        </div>
      )}

      {/* Completeness Meter */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center gap-6">
          {/* Main score */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <CircularProgress percentage={completeness.overall} size={64} strokeWidth={5} />
            <span className="text-xs font-medium text-gray-500">Completeness</span>
          </div>

          {/* Section breakdown */}
          <div className="flex-1 grid grid-cols-3 gap-x-4 gap-y-2">
            {completeness.sections.map((section) => (
              <div key={section.section}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-600">{section.label}</span>
                  <span className="font-medium text-gray-500">{section.percentage}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      section.percentage >= 80
                        ? 'bg-emerald-500'
                        : section.percentage >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    )}
                    style={{ width: `${section.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* AI Quality Check button */}
          <button
            onClick={handleQualityCheck}
            disabled={checkingQuality || completeness.overall < 10}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            {checkingQuality ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Check Quality
          </button>
        </div>
      </div>

      {/* AI Quality Check Result */}
      {qualityCheckResult && (
        <div
          className={cn(
            'p-4 rounded-lg border',
            qualityCheckResult.rating === 'excellent'
              ? 'bg-emerald-50 border-emerald-200'
              : qualityCheckResult.rating === 'good'
                ? 'bg-blue-50 border-blue-200'
                : qualityCheckResult.rating === 'needs_work'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
          )}
        >
          <div className="flex items-start justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Quality Assessment: {qualityCheckResult.rating.replace('_', ' ')}
            </h4>
            <button
              onClick={() => setQualityCheckResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">{qualityCheckResult.summary}</p>
          {qualityCheckResult.missingItems.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Missing:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                {qualityCheckResult.missingItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {qualityCheckResult.suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Suggestions:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                {qualityCheckResult.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Info banner */}
      {handoverStatus === 'draft' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Sales Handover</strong> captures the deal context, watch-outs, deadlines, and special notes from the sales team. Upload sales documents (proposals, SOWs) via the upload section above — AI will automatically extract relevant information.
          </p>
        </div>
      )}

      {/* Handover Checklist */}
      {checklist.length > 0 && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Handover Checklist
            </h3>
            <span className="text-xs font-medium text-gray-500">
              {completedCount}/{totalCount} complete
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full mb-3">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
          <div className="space-y-2">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <button
                  onClick={() => toggleChecklistItem(item.id, !item.isCompleted)}
                  className={cn(
                    'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                    item.isCompleted
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-300 hover:border-blue-400'
                  )}
                >
                  {item.isCompleted && <Check className="h-3 w-3" />}
                </button>
                <span
                  className={cn(
                    'text-sm transition-colors',
                    item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'
                  )}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* All editable sections - locked when submitted/accepted */}
      <div className={cn(isReadOnly && 'pointer-events-none opacity-75', 'space-y-4')}>

      {/* Context & Deal Summary */}
      <CollapsibleSection
        sectionKey="context"
        config={SALES_HANDOVER_SECTION_CONFIG.context}
        expanded={expandedSections.has('context')}
        onToggle={() => toggleSection('context')}
      >
        <div className="space-y-4">
          <TextArea
            label="Deal Summary"
            placeholder="What is this implementation about? Brief overview of the deal..."
            value={profile.context.dealSummary}
            disabled={isReadOnly}
            onChange={(val) =>
              updateProfile((p) => ({ ...p, context: { ...p.context, dealSummary: val } }))
            }
          />
          <TextArea
            label="Client Motivation"
            placeholder="Why does the client want this? What's driving the decision?"
            value={profile.context.clientMotivation}
            disabled={isReadOnly}
            onChange={(val) =>
              updateProfile((p) => ({ ...p, context: { ...p.context, clientMotivation: val } }))
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Contract Type"
              placeholder="e.g., 12-month SaaS, pilot, expansion"
              value={profile.context.contractType}
              disabled={isReadOnly}
              onChange={(val) =>
                updateProfile((p) => ({ ...p, context: { ...p.context, contractType: val } }))
              }
            />
            <TextInput
              label="Contract Value"
              placeholder="e.g., EUR 50k/year"
              value={profile.context.contractValue}
              disabled={isReadOnly}
              onChange={(val) =>
                updateProfile((p) => ({ ...p, context: { ...p.context, contractValue: val } }))
              }
            />
          </div>
          <TextInput
            label="Sales Owner"
            placeholder="Who handled the sale?"
            value={profile.context.salesOwner}
            disabled={isReadOnly}
            onChange={(val) =>
              updateProfile((p) => ({ ...p, context: { ...p.context, salesOwner: val } }))
            }
          />
        </div>
      </CollapsibleSection>

      {/* Watch-Outs */}
      <CollapsibleSection
        sectionKey="watchOuts"
        config={SALES_HANDOVER_SECTION_CONFIG.watchOuts}
        expanded={expandedSections.has('watchOuts')}
        onToggle={() => toggleSection('watchOuts')}
        count={profile.watchOuts.length}
      >
        <div className="space-y-3">
          {profile.watchOuts.map((watchOut, index) => (
            <WatchOutItem
              key={watchOut.id}
              watchOut={watchOut}
              onUpdate={(updated) =>
                updateProfile((p) => ({
                  ...p,
                  watchOuts: p.watchOuts.map((w, i) => (i === index ? updated : w)),
                }))
              }
              onRemove={() =>
                updateProfile((p) => ({
                  ...p,
                  watchOuts: p.watchOuts.filter((_, i) => i !== index),
                }))
              }
            />
          ))}
          <button
            onClick={() =>
              updateProfile((p) => ({
                ...p,
                watchOuts: [
                  ...p.watchOuts,
                  {
                    id: crypto.randomUUID(),
                    description: '',
                    severity: 'warning',
                    category: 'other',
                  },
                ],
              }))
            }
            className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg border-2 border-dashed border-amber-200 w-full justify-center transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Watch-Out
          </button>
        </div>
      </CollapsibleSection>

      {/* Deadlines */}
      <CollapsibleSection
        sectionKey="deadlines"
        config={SALES_HANDOVER_SECTION_CONFIG.deadlines}
        expanded={expandedSections.has('deadlines')}
        onToggle={() => toggleSection('deadlines')}
        count={profile.deadlines.length}
      >
        <div className="space-y-3">
          {profile.deadlines.map((deadline, index) => (
            <DeadlineItem
              key={deadline.id}
              deadline={deadline}
              onUpdate={(updated) =>
                updateProfile((p) => ({
                  ...p,
                  deadlines: p.deadlines.map((d, i) => (i === index ? updated : d)),
                }))
              }
              onRemove={() =>
                updateProfile((p) => ({
                  ...p,
                  deadlines: p.deadlines.filter((_, i) => i !== index),
                }))
              }
            />
          ))}
          <button
            onClick={() =>
              updateProfile((p) => ({
                ...p,
                deadlines: [
                  ...p.deadlines,
                  {
                    id: crypto.randomUUID(),
                    date: '',
                    description: '',
                    type: 'other',
                    isHard: false,
                  },
                ],
              }))
            }
            className="flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg border-2 border-dashed border-rose-200 w-full justify-center transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Deadline
          </button>
        </div>
      </CollapsibleSection>

      {/* Special Notes & Promises */}
      <CollapsibleSection
        sectionKey="specialNotes"
        config={SALES_HANDOVER_SECTION_CONFIG.specialNotes}
        expanded={expandedSections.has('specialNotes')}
        onToggle={() => toggleSection('specialNotes')}
      >
        <div className="space-y-4">
          <TagList
            tags={profile.specialNotes.clientPreferences}
            onChange={(tags) =>
              updateProfile((p) => ({
                ...p,
                specialNotes: { ...p.specialNotes, clientPreferences: tags },
              }))
            }
            label="Client Preferences"
            placeholder="Add preference..."
            color="violet"
          />

          <TextArea
            label="Internal Notes"
            placeholder="Internal-only observations (politics, decision dynamics, etc.)"
            value={profile.specialNotes.internalNotes}
            onChange={(val) =>
              updateProfile((p) => ({
                ...p,
                specialNotes: { ...p.specialNotes, internalNotes: val },
              }))
            }
          />

          {/* Promised Capabilities */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Promised Capabilities
            </label>
            <div className="space-y-2">
              {profile.specialNotes.promisedCapabilities.map((cap, index) => (
                <PromisedCapabilityItem
                  key={cap.id}
                  capability={cap}
                  onUpdate={(updated) =>
                    updateProfile((p) => ({
                      ...p,
                      specialNotes: {
                        ...p.specialNotes,
                        promisedCapabilities: p.specialNotes.promisedCapabilities.map((c, i) =>
                          i === index ? updated : c
                        ),
                      },
                    }))
                  }
                  onRemove={() =>
                    updateProfile((p) => ({
                      ...p,
                      specialNotes: {
                        ...p.specialNotes,
                        promisedCapabilities: p.specialNotes.promisedCapabilities.filter(
                          (_, i) => i !== index
                        ),
                      },
                    }))
                  }
                />
              ))}
              <button
                onClick={() =>
                  updateProfile((p) => ({
                    ...p,
                    specialNotes: {
                      ...p.specialNotes,
                      promisedCapabilities: [
                        ...p.specialNotes.promisedCapabilities,
                        {
                          id: crypto.randomUUID(),
                          description: '',
                          source: '',
                          priority: 'should_have',
                        },
                      ],
                    },
                  }))
                }
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-violet-600 hover:bg-violet-50 rounded-lg border-2 border-dashed border-violet-200 w-full justify-center transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Promise
              </button>
            </div>
          </div>

          <TagList
            tags={profile.specialNotes.knownConstraints}
            onChange={(tags) =>
              updateProfile((p) => ({
                ...p,
                specialNotes: { ...p.specialNotes, knownConstraints: tags },
              }))
            }
            label="Known Constraints"
            placeholder="Add constraint..."
            color="red"
          />
        </div>
      </CollapsibleSection>

      {/* Key Contacts / Stakeholders */}
      <CollapsibleSection
        sectionKey="stakeholders"
        config={SALES_HANDOVER_SECTION_CONFIG.stakeholders}
        expanded={expandedSections.has('stakeholders')}
        onToggle={() => toggleSection('stakeholders')}
        count={profile.stakeholders.length}
      >
        <div className="space-y-3">
          {profile.stakeholders.map((stakeholder, index) => (
            <StakeholderItem
              key={stakeholder.id}
              stakeholder={stakeholder}
              onUpdate={(updated) =>
                updateProfile((p) => ({
                  ...p,
                  stakeholders: p.stakeholders.map((s, i) => (i === index ? updated : s)),
                }))
              }
              onRemove={() =>
                updateProfile((p) => ({
                  ...p,
                  stakeholders: p.stakeholders.filter((_, i) => i !== index),
                }))
              }
            />
          ))}
          <button
            onClick={() =>
              updateProfile((p) => ({
                ...p,
                stakeholders: [
                  ...p.stakeholders,
                  {
                    id: crypto.randomUUID(),
                    name: '',
                    role: '',
                    email: '',
                    isDecisionMaker: false,
                  },
                ],
              }))
            }
            className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg border-2 border-dashed border-emerald-200 w-full justify-center transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </CollapsibleSection>

      </div>{/* End editable sections wrapper */}

      {/* Submit Handover Button */}
      {(handoverStatus === 'draft') && (
        <div className="flex justify-end pt-2">
          <button
            onClick={() => handleStatusTransition('submit')}
            disabled={transitioning || completeness.overall < 60}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {transitioning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Handover
            {completeness.overall < 60 && (
              <span className="text-xs opacity-75">({completeness.overall}% — need 60%)</span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================
// Reusable Form Components
// ============================================

function TextInput({
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed'
        )}
      />
    </div>
  )
}

function TextArea({
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y',
          disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed'
        )}
      />
    </div>
  )
}

// ============================================
// Implementation Pulse Component
// ============================================

function ImplementationPulse({ data }: { data: ImplementationPulseData }) {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    NOT_STARTED: { label: 'Not Started', color: 'bg-gray-100 text-gray-600', icon: <Circle className="h-3 w-3" /> },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: <Clock className="h-3 w-3" /> },
    PENDING_SIGNOFF: { label: 'Pending Sign-off', color: 'bg-amber-100 text-amber-700', icon: <AlertTriangle className="h-3 w-3" /> },
    COMPLETE: { label: 'Complete', color: 'bg-emerald-100 text-emerald-700', icon: <Check className="h-3 w-3" /> },
  }

  const status = statusConfig[data.designWeekStatus] ?? statusConfig.NOT_STARTED
  const hasRedFlags = data.blockedPrerequisites > 0 || data.overdueDeadlines > 0

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        hasRedFlags ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Rocket className="h-4 w-4 text-indigo-600" />
          Implementation Progress
        </h3>
        {data.daysSinceAccepted !== null && (
          <span className="text-xs text-gray-500">
            {data.daysSinceAccepted === 0 ? 'Accepted today' : `${data.daysSinceAccepted}d since handover`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Design Week Status */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Design Week</p>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
              status.color
            )}
          >
            {status.icon} {status.label}
          </span>
        </div>

        {/* Current Phase */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Phase</p>
          <p className="text-sm font-medium text-gray-900">
            {data.currentPhase}/4 — {data.phaseName}
          </p>
        </div>

        {/* Sessions Processed */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Sessions</p>
          <p className="text-sm font-medium text-gray-900">{data.sessionsProcessed} processed</p>
        </div>

        {/* Profile Status */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Profiles</p>
          <div className="flex gap-1">
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                data.hasBusinessProfile ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              )}
            >
              Biz {data.hasBusinessProfile ? '✓' : '—'}
            </span>
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                data.hasTechnicalProfile ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              )}
            >
              Tech {data.hasTechnicalProfile ? '✓' : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Red Flags */}
      {hasRedFlags && (
        <div className="mt-3 pt-3 border-t border-red-200 flex gap-4">
          {data.blockedPrerequisites > 0 && (
            <span className="text-xs font-medium text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {data.blockedPrerequisites} blocked prerequisite(s)
            </span>
          )}
          {data.overdueDeadlines > 0 && (
            <span className="text-xs font-medium text-red-600 flex items-center gap-1">
              <Clock className="h-3 w-3" /> {data.overdueDeadlines} overdue deadline(s)
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Collapsible Section
// ============================================

function CollapsibleSection({
  sectionKey,
  config,
  expanded,
  onToggle,
  count,
  children,
}: {
  sectionKey: string
  config: { title: string; icon: string; color: string; description: string }
  expanded: boolean
  onToggle: () => void
  count?: number
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-lg border', sectionColors[config.color] || 'border-gray-200 bg-gray-50/50')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <SectionIcon name={config.icon} className={cn('h-5 w-5', iconColors[config.color])} />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {config.title}
              {count !== undefined && count > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-500">({count})</span>
              )}
            </h3>
            <p className="text-xs text-gray-500">{config.description}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ============================================
// Watch-Out Item
// ============================================

function WatchOutItem({
  watchOut,
  onUpdate,
  onRemove,
}: {
  watchOut: SalesWatchOut
  onUpdate: (updated: SalesWatchOut) => void
  onRemove: () => void
}) {
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
      <div className="flex items-start gap-2">
        <textarea
          value={watchOut.description}
          onChange={(e) => onUpdate({ ...watchOut, description: e.target.value })}
          placeholder="What should we look out for?"
          rows={2}
          className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
        />
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={watchOut.severity}
          onChange={(e) => onUpdate({ ...watchOut, severity: e.target.value as SalesWatchOut['severity'] })}
          className="text-xs px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={watchOut.category}
          onChange={(e) => onUpdate({ ...watchOut, category: e.target.value as SalesWatchOut['category'] })}
          className="text-xs px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="political">Political</option>
          <option value="technical">Technical</option>
          <option value="timeline">Timeline</option>
          <option value="scope">Scope</option>
          <option value="other">Other</option>
        </select>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', severityColors[watchOut.severity])}>
          {watchOut.severity}
        </span>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', categoryColors[watchOut.category])}>
          {watchOut.category}
        </span>
      </div>
    </div>
  )
}

// ============================================
// Deadline Item
// ============================================

function DeadlineItem({
  deadline,
  onUpdate,
  onRemove,
}: {
  deadline: SalesDeadline
  onUpdate: (updated: SalesDeadline) => void
  onRemove: () => void
}) {
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <input
              type="date"
              value={deadline.date}
              onChange={(e) => onUpdate({ ...deadline, date: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <input
              type="text"
              value={deadline.description}
              onChange={(e) => onUpdate({ ...deadline, description: e.target.value })}
              placeholder="What's the deadline for?"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={deadline.type}
          onChange={(e) => onUpdate({ ...deadline, type: e.target.value as SalesDeadline['type'] })}
          className="text-xs px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <option value="contract">Contract</option>
          <option value="go_live">Go-Live</option>
          <option value="milestone">Milestone</option>
          <option value="review">Review</option>
          <option value="other">Other</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={deadline.isHard}
            onChange={(e) => onUpdate({ ...deadline, isHard: e.target.checked })}
            className="rounded border-gray-300"
          />
          Hard deadline
        </label>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', deadlineTypeColors[deadline.type])}>
          {deadline.type.replace('_', ' ')}
        </span>
        {deadline.isHard && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Hard
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================
// Promised Capability Item
// ============================================

function PromisedCapabilityItem({
  capability,
  onUpdate,
  onRemove,
}: {
  capability: PromisedCapability
  onUpdate: (updated: PromisedCapability) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
      <input
        type="text"
        value={capability.description}
        onChange={(e) => onUpdate({ ...capability, description: e.target.value })}
        placeholder="What was promised?"
        className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <input
        type="text"
        value={capability.source}
        onChange={(e) => onUpdate({ ...capability, source: e.target.value })}
        placeholder="Source"
        className="w-28 px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <select
        value={capability.priority}
        onChange={(e) => onUpdate({ ...capability, priority: e.target.value as PromisedCapability['priority'] })}
        className="text-xs px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        <option value="must_have">Must Have</option>
        <option value="should_have">Should Have</option>
        <option value="nice_to_have">Nice to Have</option>
      </select>
      <button
        onClick={onRemove}
        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ============================================
// Stakeholder Item
// ============================================

function StakeholderItem({
  stakeholder,
  onUpdate,
  onRemove,
}: {
  stakeholder: Stakeholder
  onUpdate: (updated: Stakeholder) => void
  onRemove: () => void
}) {
  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-start gap-2">
        <div className="flex-1 grid grid-cols-3 gap-2">
          <input
            type="text"
            value={stakeholder.name}
            onChange={(e) => onUpdate({ ...stakeholder, name: e.target.value })}
            placeholder="Name"
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            value={stakeholder.role}
            onChange={(e) => onUpdate({ ...stakeholder, role: e.target.value })}
            placeholder="Role"
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="email"
            value={stakeholder.email || ''}
            onChange={(e) => onUpdate({ ...stakeholder, email: e.target.value })}
            placeholder="Email"
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2">
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={stakeholder.isDecisionMaker || false}
            onChange={(e) => onUpdate({ ...stakeholder, isDecisionMaker: e.target.checked })}
            className="rounded border-gray-300"
          />
          Decision maker
        </label>
      </div>
    </div>
  )
}
