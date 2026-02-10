'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { TagList } from '../profile-fields'
import {
  SalesHandoverProfile,
  SalesWatchOut,
  SalesDeadline,
  PromisedCapability,
  Stakeholder,
  createEmptySalesHandoverProfile,
  SALES_HANDOVER_SECTION_CONFIG,
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

export function SalesHandoverTab({ designWeekId, className }: SalesHandoverTabProps) {
  const [profile, setProfile] = useState<SalesHandoverProfile>(createEmptySalesHandoverProfile())
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['context', 'watchOuts', 'deadlines', 'specialNotes', 'stakeholders'])
  )

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
          setProfile(data.profile)
        }
        if (data.checklist) {
          setChecklist(data.checklist)
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

      {/* Info banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Sales Handover</strong> captures the deal context, watch-outs, deadlines, and special notes from the sales team. Upload sales documents (proposals, SOWs) via the upload section above — AI will automatically extract relevant information.
        </p>
      </div>

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
                    'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
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
            onChange={(val) =>
              updateProfile((p) => ({ ...p, context: { ...p.context, dealSummary: val } }))
            }
          />
          <TextArea
            label="Client Motivation"
            placeholder="Why does the client want this? What's driving the decision?"
            value={profile.context.clientMotivation}
            onChange={(val) =>
              updateProfile((p) => ({ ...p, context: { ...p.context, clientMotivation: val } }))
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Contract Type"
              placeholder="e.g., 12-month SaaS, pilot, expansion"
              value={profile.context.contractType}
              onChange={(val) =>
                updateProfile((p) => ({ ...p, context: { ...p.context, contractType: val } }))
              }
            />
            <TextInput
              label="Contract Value"
              placeholder="e.g., EUR 50k/year"
              value={profile.context.contractValue}
              onChange={(val) =>
                updateProfile((p) => ({ ...p, context: { ...p.context, contractValue: val } }))
              }
            />
          </div>
          <TextInput
            label="Sales Owner"
            placeholder="Who handled the sale?"
            value={profile.context.salesOwner}
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
}: {
  label: string
  placeholder: string
  value: string
  onChange: (val: string) => void
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
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}

function TextArea({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (val: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
      />
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
