'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Bot,
  Plus,
  ArrowRight,
  RefreshCw,
  Trash2,
  Mail,
  Phone,
  User,
  Compass,
  Flag,
  Check,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Target,
  Milestone,
  CalendarDays,
  CheckCircle2,
  Rocket,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

interface JourneyPhase {
  id: string
  phaseType: string
  status: string
  order: number
  completedAt: string | null
}

interface DigitalEmployee {
  id: string
  name: string
  description: string | null
  status: 'DESIGN' | 'ONBOARDING' | 'LIVE' | 'PAUSED'
  channels: string[]
  currentJourneyPhase: string
  goLiveDate: string | null
  sortOrder: number
  designWeek: {
    id: string
    status: string
    currentPhase: number
  } | null
  journeyPhases: JourneyPhase[]
}

interface CompanyMilestone {
  id: string
  title: string
  description: string | null
  status: 'UPCOMING' | 'IN_PROGRESS' | 'ACHIEVED' | 'BLOCKED'
  targetDate: string | null
  completedAt: string | null
  gatingCriteria: string | null
  order: number
}

interface Company {
  id: string
  name: string
  industry: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  vision: string | null
  journeyStartDate: string | null
  journeyTargetDate: string | null
  digitalEmployees: DigitalEmployee[]
  milestones: CompanyMilestone[]
}

// ============================================
// HELPERS
// ============================================

const STATUS_CONFIG = {
  DESIGN: { label: 'Design', color: 'bg-[#F5E6DA] text-[#A05A32] border-[#E8D5C4]' },
  ONBOARDING: { label: 'Onboarding', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  LIVE: { label: 'Live', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  PAUSED: { label: 'Paused', color: 'bg-gray-100 text-gray-600 border-gray-200' },
} as const

const MILESTONE_STATUS_CONFIG = {
  UPCOMING: { label: 'Upcoming', icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-300' },
  IN_PROGRESS: { label: 'In Progress', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  ACHIEVED: { label: 'Achieved', icon: Check, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  BLOCKED: { label: 'Blocked', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
} as const

const JOURNEY_PHASE_LABELS: Record<string, string> = {
  SALES_HANDOVER: 'Handover',
  KICKOFF: 'Kickoff',
  DESIGN_WEEK: 'Design',
  ONBOARDING: 'Build',
  UAT: 'UAT',
  GO_LIVE: 'Go Live',
  HYPERCARE: 'Hypercare',
  HANDOVER_TO_SUPPORT: 'Support',
}

function getJourneyProgress(de: DigitalEmployee): number {
  if (!de.journeyPhases.length) {
    // Fallback based on status
    switch (de.status) {
      case 'DESIGN': return 20
      case 'ONBOARDING': return 50
      case 'LIVE': return 100
      case 'PAUSED': return 0
      default: return 0
    }
  }
  const completed = de.journeyPhases.filter(p => p.status === 'COMPLETE').length
  return Math.round((completed / 8) * 100)
}

function getOverallProgress(des: DigitalEmployee[]): number {
  if (!des.length) return 0
  const total = des.reduce((sum, de) => sum + getJourneyProgress(de), 0)
  return Math.round(total / des.length)
}

// ============================================
// VISION BANNER COMPONENT
// ============================================

function VisionBanner({
  company,
  onSave,
}: {
  company: Company
  onSave: (vision: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(company.vision || '')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  const handleSave = async () => {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  if (!company.vision && !editing) {
    return (
      <button
        onClick={() => { setDraft(''); setEditing(true) }}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 hover:border-[#E8D5C4] p-8 text-center transition-colors group"
      >
        <Compass className="w-8 h-8 mx-auto mb-3 text-gray-300 group-hover:text-[#C2703E] transition-colors" />
        <p className="text-sm font-medium text-gray-400 group-hover:text-[#C2703E] transition-colors">
          What do you want to achieve together with {company.name}?
        </p>
        <p className="text-xs text-gray-300 mt-1">Click to add a shared vision</p>
      </button>
    )
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-[#E8D5C4] bg-[#FDF3EC]/50 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Compass className="w-4 h-4 text-[#C2703E]" />
          <span className="text-sm font-medium text-[#C2703E]">Shared Vision</span>
        </div>
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g., Reduce call volume by 30% through a phased AI assistant rollout, starting with internal support (L1) and growing to autonomous task handling (L3) within 12 months."
          className="min-h-[80px] bg-white border-[#E8D5C4] focus:border-[#C2703E] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) handleSave()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">Cmd+Enter to save, Esc to cancel</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-[#FAF9F6] p-6 group relative">
      <button
        onClick={() => { setDraft(company.vision || ''); setEditing(true) }}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-white/80"
      >
        <Pencil className="w-3.5 h-3.5 text-gray-400" />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <Compass className="w-4 h-4 text-[#C2703E]" />
        <span className="text-xs font-medium text-[#C2703E] uppercase tracking-wide">Shared Vision</span>
      </div>
      <p className="text-gray-700 leading-relaxed">{company.vision}</p>
    </div>
  )
}

// ============================================
// JOURNEY TIMELINE COMPONENT
// ============================================

function JourneyTimeline({
  digitalEmployees,
  milestones,
  companyId,
}: {
  digitalEmployees: DigitalEmployee[]
  milestones: CompanyMilestone[]
  companyId: string
}) {
  if (!digitalEmployees.length && !milestones.length) {
    return (
      <div className="text-center py-12 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
        <div className="w-16 h-16 rounded-2xl bg-[#FDF3EC] flex items-center justify-center mx-auto mb-4">
          <Bot className="w-8 h-8 text-[#D4956A]" />
        </div>
        <p className="font-semibold text-gray-700 mb-1">No Digital Employees yet</p>
        <p className="text-sm text-gray-500 mb-4 max-w-xs mx-auto">
          Create your first Digital Employee to kick off the Design Week process
        </p>
        <p className="text-xs text-gray-400">
          Use the &quot;Add DE&quot; button above to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {digitalEmployees.map((de, index) => (
        <DEJourneyRow key={de.id} de={de} companyId={companyId} index={index} />
      ))}
    </div>
  )
}

function DEJourneyRow({
  de,
  companyId,
  index,
}: {
  de: DigitalEmployee
  companyId: string
  index: number
}) {
  const progress = getJourneyProgress(de)
  const statusConfig = STATUS_CONFIG[de.status]
  const currentPhaseLabel = JOURNEY_PHASE_LABELS[de.currentJourneyPhase] || de.currentJourneyPhase

  // Build phase progress from journeyPhases
  const phases = [
    'SALES_HANDOVER', 'KICKOFF', 'DESIGN_WEEK', 'ONBOARDING', 'UAT', 'GO_LIVE', 'HYPERCARE', 'HANDOVER_TO_SUPPORT',
  ]
  const phaseStatusMap: Record<string, string> = {}
  de.journeyPhases.forEach(p => { phaseStatusMap[p.phaseType] = p.status })

  return (
    <Link
      href={`/companies/${companyId}/digital-employees/${de.id}`}
      className="block rounded-lg border border-gray-100 hover:border-[#E8D5C4] bg-white hover:bg-[#FDF3EC]/30 p-4 transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-500 group-hover:bg-[#F5E6DA] group-hover:text-[#C2703E] transition-colors">
            {index + 1}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-[#A05A32] transition-colors">
              {de.name}
            </h3>
            {de.description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{de.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#C2703E] transition-colors" />
        </div>
      </div>

      {/* Phase progress bar */}
      <div className="flex gap-0.5">
        {phases.map((phase) => {
          const status = phaseStatusMap[phase]
          const isCurrent = de.currentJourneyPhase === phase
          let bgColor = 'bg-gray-100' // not started
          if (status === 'COMPLETE') bgColor = 'bg-emerald-400'
          else if (status === 'IN_PROGRESS' || isCurrent) bgColor = 'bg-[#C2703E]'
          else if (status === 'BLOCKED') bgColor = 'bg-red-400'

          return (
            <div key={phase} className="flex-1 group/phase relative">
              <div className={`h-1.5 rounded-full ${bgColor} transition-colors`} />
              {isCurrent && (
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-[10px] font-medium text-[#C2703E]">
                    {JOURNEY_PHASE_LABELS[phase]}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="h-4" /> {/* Spacer for current phase label */}
    </Link>
  )
}

// ============================================
// MILESTONES COMPONENT
// ============================================

function MilestonesSection({
  milestones,
  companyId,
  onAdd,
  onUpdate,
  onDelete,
}: {
  milestones: CompanyMilestone[]
  companyId: string
  onAdd: (data: { title: string; description?: string; gatingCriteria?: string; targetDate?: string }) => Promise<void>
  onUpdate: (id: string, data: Partial<CompanyMilestone>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCriteria, setNewCriteria] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    await onAdd({
      title: newTitle,
      description: newDescription || undefined,
      gatingCriteria: newCriteria || undefined,
    })
    setNewTitle('')
    setNewDescription('')
    setNewCriteria('')
    setAdding(false)
    setSaving(false)
  }

  const achieved = milestones.filter(m => m.status === 'ACHIEVED').length
  const total = milestones.length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Milestones</h3>
          {total > 0 && (
            <span className="text-xs text-gray-400">{achieved}/{total} achieved</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>

      {adding && (
        <div className="mb-4 rounded-lg border border-[#E8D5C4] bg-[#FDF3EC]/50 p-4 space-y-3">
          <Input
            placeholder="Milestone title, e.g. 'Level 1 proven stable'"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="bg-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) handleAdd()
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <Textarea
            placeholder="What needs to be true? e.g. 'Correctheid >=95%, coverage >=80%, NPS >=7'"
            value={newCriteria}
            onChange={(e) => setNewCriteria(e.target.value)}
            className="bg-white min-h-[60px] resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving || !newTitle.trim()}>
              {saving ? 'Adding...' : 'Add Milestone'}
            </Button>
          </div>
        </div>
      )}

      {milestones.length === 0 && !adding ? (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-lg border-2 border-dashed border-gray-200 hover:border-[#E8D5C4] p-6 text-center transition-colors group"
        >
          <Flag className="w-6 h-6 mx-auto mb-2 text-gray-300 group-hover:text-[#C2703E] transition-colors" />
          <p className="text-sm text-gray-400 group-hover:text-[#C2703E] transition-colors">
            Add gating milestones
          </p>
          <p className="text-xs text-gray-300 mt-0.5">Define what needs to be proven before moving to the next step</p>
        </button>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MilestoneCard({
  milestone,
  onUpdate,
  onDelete,
}: {
  milestone: CompanyMilestone
  onUpdate: (id: string, data: Partial<CompanyMilestone>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const config = MILESTONE_STATUS_CONFIG[milestone.status]
  const Icon = config.icon
  const [expanded, setExpanded] = useState(false)

  const cycleStatus = async () => {
    const statusOrder: CompanyMilestone['status'][] = ['UPCOMING', 'IN_PROGRESS', 'ACHIEVED', 'BLOCKED']
    const currentIdx = statusOrder.indexOf(milestone.status)
    const nextStatus = statusOrder[(currentIdx + 1) % statusOrder.length]
    await onUpdate(milestone.id, {
      status: nextStatus,
      ...(nextStatus === 'ACHIEVED' ? { completedAt: new Date().toISOString() } : { completedAt: null }),
    } as Partial<CompanyMilestone>)
  }

  return (
    <div className={`rounded-lg border p-3 transition-colors ${config.bg}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={cycleStatus}
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            milestone.status === 'ACHIEVED'
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : milestone.status === 'IN_PROGRESS'
              ? 'border-blue-400 bg-blue-100'
              : milestone.status === 'BLOCKED'
              ? 'border-red-400 bg-red-100'
              : 'border-gray-300 bg-white'
          }`}
          title={`Status: ${config.label}. Click to change.`}
        >
          {milestone.status === 'ACHIEVED' && <Check className="w-3 h-3" />}
          {milestone.status === 'BLOCKED' && <X className="w-3 h-3 text-red-500" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${
              milestone.status === 'ACHIEVED' ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}>
              {milestone.title}
            </h4>
            <div className="flex items-center gap-1">
              {milestone.targetDate && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {new Date(milestone.targetDate).toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {milestone.gatingCriteria && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-0.5 rounded hover:bg-white/50"
                >
                  {expanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  }
                </button>
              )}
              <button
                onClick={() => onDelete(milestone.id)}
                className="p-0.5 rounded hover:bg-white/50 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3 text-gray-300 hover:text-red-400" />
              </button>
            </div>
          </div>

          {expanded && milestone.gatingCriteria && (
            <div className="mt-2 text-xs text-gray-500 bg-white/60 rounded p-2 border border-gray-100">
              <span className="font-medium text-gray-600">Gating criteria: </span>
              {milestone.gatingCriteria}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// CLIENT PROGRESS CARD COMPONENT
// ============================================

const CLIENT_PHASE_LABELS: Record<string, string> = {
  SALES_HANDOVER: 'Getting Started',
  KICKOFF: 'Kickoff Meetings',
  DESIGN_WEEK: 'Design Week',
  ONBOARDING: 'Building & Configuration',
  UAT: 'Testing',
  GO_LIVE: 'Going Live',
  HYPERCARE: 'Early Support',
  HANDOVER_TO_SUPPORT: 'Fully Operational',
}

const PHASE_ORDER = [
  'SALES_HANDOVER',
  'KICKOFF',
  'DESIGN_WEEK',
  'ONBOARDING',
  'UAT',
  'GO_LIVE',
  'HYPERCARE',
  'HANDOVER_TO_SUPPORT',
]

function getNextPhaseLabel(currentPhase: string): string {
  const idx = PHASE_ORDER.indexOf(currentPhase)
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return 'Wrapping Up'
  return CLIENT_PHASE_LABELS[PHASE_ORDER[idx + 1]] || 'Next Phase'
}

function getCurrentPhase(des: DigitalEmployee[]): string {
  if (!des.length) return 'SALES_HANDOVER'

  // Count how many DEs are in each phase
  const phaseCounts: Record<string, number> = {}
  des.forEach((de) => {
    const phase = de.currentJourneyPhase
    phaseCounts[phase] = (phaseCounts[phase] || 0) + 1
  })

  // Return the most common phase; ties broken by latest phase in order
  let maxCount = 0
  let dominantPhase = 'SALES_HANDOVER'
  for (const phase of PHASE_ORDER) {
    if ((phaseCounts[phase] || 0) >= maxCount && phaseCounts[phase]) {
      maxCount = phaseCounts[phase]
      dominantPhase = phase
    }
  }
  return dominantPhase
}

function getActionItems(company: Company): number {
  let count = 0
  // Blocked milestones
  count += company.milestones.filter((m) => m.status === 'BLOCKED').length
  // DEs pending sign-off
  count += company.digitalEmployees.filter(
    (de) => de.designWeek?.status === 'PENDING_SIGNOFF'
  ).length
  return count
}

interface ActivityItem {
  type: 'completed' | 'in_progress' | 'blocked'
  label: string
}

function getRecentActivity(company: Company): ActivityItem[] {
  const items: ActivityItem[] = []

  company.digitalEmployees.forEach((de) => {
    // Completed journey phases
    const completedPhases = de.journeyPhases
      .filter((p) => p.status === 'COMPLETE')
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0
        return dateB - dateA
      })

    if (completedPhases.length > 0) {
      const latestCompleted = completedPhases[0]
      const phaseLabel =
        CLIENT_PHASE_LABELS[latestCompleted.phaseType] ||
        latestCompleted.phaseType
      items.push({
        type: 'completed',
        label: `${phaseLabel} completed for ${de.name}`,
      })
    }

    // In-progress phases
    const inProgressPhases = de.journeyPhases.filter(
      (p) => p.status === 'IN_PROGRESS'
    )
    inProgressPhases.forEach((p) => {
      const phaseLabel = CLIENT_PHASE_LABELS[p.phaseType] || p.phaseType
      items.push({
        type: 'in_progress',
        label: `${phaseLabel} in progress for ${de.name}`,
      })
    })
  })

  // Blocked milestones
  company.milestones
    .filter((m) => m.status === 'BLOCKED')
    .forEach((m) => {
      items.push({
        type: 'blocked',
        label: `Waiting on: ${m.title}`,
      })
    })

  // Limit to 4 items for readability
  return items.slice(0, 4)
}

function ClientProgressCard({ company }: { company: Company }) {
  const progress = getOverallProgress(company.digitalEmployees)
  const currentPhase = getCurrentPhase(company.digitalEmployees)
  const currentPhaseLabel = CLIENT_PHASE_LABELS[currentPhase] || currentPhase
  const nextStepLabel = getNextPhaseLabel(currentPhase)
  const actionCount = getActionItems(company)
  const activity = getRecentActivity(company)
  const deCount = company.digitalEmployees.length

  const summaryText =
    deCount === 1
      ? `We're in the ${currentPhaseLabel} phase for your Digital Employee`
      : `We're in the ${currentPhaseLabel} phase for ${deCount} Digital Employees`

  return (
    <Card className="overflow-hidden border-0 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      {/* Gradient top border */}
      <div className="h-1 bg-linear-to-r from-[#C2703E] via-[#D4956A] to-[#C2703E]" />

      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-[#C2703E]" />
          <CardTitle className="text-lg text-gray-900">
            Implementation Progress
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress bar + percentage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Overall completion
            </span>
            <span className="text-2xl font-bold text-[#C2703E]">
              {progress}%
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-[#C2703E] to-[#D4956A] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">{summaryText}</p>
        </div>

        {/* Three info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Current Phase */}
          <div className="rounded-lg border border-[#F5E6DA] bg-[#FDF3EC] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[#C2703E]" />
              <span className="text-xs font-medium text-[#A05A32] uppercase tracking-wide">
                Current Phase
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {currentPhaseLabel}
            </p>
          </div>

          {/* Next Step */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                Next Step
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {nextStepLabel}
            </p>
          </div>

          {/* Needs From You */}
          <div
            className={cn(
              'rounded-lg border p-4',
              actionCount > 0
                ? 'border-red-200 bg-red-50'
                : 'border-emerald-100 bg-emerald-50'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {actionCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              <span
                className={cn(
                  'text-xs font-medium uppercase tracking-wide',
                  actionCount > 0 ? 'text-red-700' : 'text-emerald-700'
                )}
              >
                Needs From You
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {actionCount > 0
                ? `${actionCount} item${actionCount !== 1 ? 's' : ''}`
                : 'All clear'}
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        {activity.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Recent Activity
            </h4>
            <div className="space-y-2">
              {activity.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  {item.type === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  )}
                  {item.type === 'in_progress' && (
                    <ArrowRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  {item.type === 'blocked' && (
                    <Clock className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// PROGRESS SUMMARY COMPONENT
// ============================================

function ProgressSummary({ digitalEmployees, milestones }: { digitalEmployees: DigitalEmployee[], milestones: CompanyMilestone[] }) {
  const totalDEs = digitalEmployees.length
  const liveDEs = digitalEmployees.filter(de => de.status === 'LIVE').length
  const designDEs = digitalEmployees.filter(de => de.status === 'DESIGN').length
  const onboardingDEs = digitalEmployees.filter(de => de.status === 'ONBOARDING').length
  const achievedMilestones = milestones.filter(m => m.status === 'ACHIEVED').length
  const overallProgress = getOverallProgress(digitalEmployees)

  if (!totalDEs) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
        <div className="text-2xl font-bold text-gray-900">{totalDEs}</div>
        <div className="text-xs text-gray-500">Digital Employees</div>
      </div>
      <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
        <div className="text-2xl font-bold text-emerald-700">{liveDEs}</div>
        <div className="text-xs text-emerald-600">Live</div>
      </div>
      <div className="rounded-lg bg-[#FDF3EC] border border-[#F5E6DA] p-3 text-center">
        <div className="text-2xl font-bold text-[#A05A32]">{designDEs + onboardingDEs}</div>
        <div className="text-xs text-[#C2703E]">In Progress</div>
      </div>
      <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
        <div className="text-2xl font-bold text-amber-700">{achievedMilestones}/{milestones.length || 0}</div>
        <div className="text-xs text-amber-600">Milestones</div>
      </div>
    </div>
  )
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newDEDialogOpen, setNewDEDialogOpen] = useState(false)
  const [creatingDE, setCreatingDE] = useState(false)
  const [newDE, setNewDE] = useState({ name: '', description: '' })
  const [contactExpanded, setContactExpanded] = useState(false)

  const fetchCompany = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${id}`)
      const result = await response.json()
      if (result.success) {
        setCompany(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to fetch company')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompany()
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        router.push('/companies')
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to delete company')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleCreateDE = async () => {
    if (!newDE.name) return
    setCreatingDE(true)
    try {
      const response = await fetch('/api/digital-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: id,
          name: newDE.name,
          description: newDE.description || undefined,
        }),
      })
      const result = await response.json()
      if (result.success) {
        setNewDE({ name: '', description: '' })
        setNewDEDialogOpen(false)
        fetchCompany()
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to create Digital Employee')
    } finally {
      setCreatingDE(false)
    }
  }

  const handleSaveVision = async (vision: string) => {
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vision }),
      })
      const result = await response.json()
      if (result.success) {
        setCompany(prev => prev ? { ...prev, vision } : prev)
      }
    } catch {
      setError('Failed to save vision')
    }
  }

  const handleAddMilestone = async (data: { title: string; description?: string; gatingCriteria?: string; targetDate?: string }) => {
    try {
      const response = await fetch(`/api/companies/${id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (result.success) {
        fetchCompany()
      }
    } catch {
      setError('Failed to add milestone')
    }
  }

  const handleUpdateMilestone = async (milestoneId: string, data: Partial<CompanyMilestone>) => {
    try {
      const response = await fetch(`/api/companies/${id}/milestones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: milestoneId, ...data }),
      })
      const result = await response.json()
      if (result.success) {
        fetchCompany()
      }
    } catch {
      setError('Failed to update milestone')
    }
  }

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      const response = await fetch(`/api/companies/${id}/milestones?milestoneId=${milestoneId}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        fetchCompany()
      }
    } catch {
      setError('Failed to delete milestone')
    }
  }

  // Loading state
  if (loading && !company) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gray-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-50 border border-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Not found state
  if (!company) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">Company not found</h2>
          <p className="text-gray-500 mb-4">{error || 'The company you are looking for does not exist.'}</p>
          <Button asChild>
            <Link href="/companies">Back to Companies</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-900 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/companies" className="hover:text-gray-900 transition-colors">
          Companies
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{company.name}</span>
      </nav>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="float-right"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Company header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#FDF3EC] flex items-center justify-center">
            <Building2 className="w-7 h-7 text-[#C2703E]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {company.industry && (
                <span className="text-sm text-gray-500">{company.industry}</span>
              )}
              {(company.contactName || company.contactEmail) && (
                <button
                  onClick={() => setContactExpanded(!contactExpanded)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                >
                  <User className="w-3 h-3" />
                  {company.contactName || company.contactEmail}
                  {contactExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchCompany} variant="ghost" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Company</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {company.name}? This will also delete all
                  {company.digitalEmployees.length > 0 && ` ${company.digitalEmployees.length}`} Digital Employee{company.digitalEmployees.length !== 1 ? 's' : ''} and their data.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Company'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Expanded contact info */}
      {contactExpanded && (
        <div className="mb-6 rounded-lg bg-gray-50 border border-gray-100 p-4 flex items-center gap-6 text-sm">
          {company.contactName && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              {company.contactName}
            </div>
          )}
          {company.contactEmail && (
            <a href={`mailto:${company.contactEmail}`} className="flex items-center gap-2 text-blue-600 hover:underline">
              <Mail className="w-4 h-4 text-gray-400" />
              {company.contactEmail}
            </a>
          )}
          {company.contactPhone && (
            <a href={`tel:${company.contactPhone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
              <Phone className="w-4 h-4 text-gray-400" />
              {company.contactPhone}
            </a>
          )}
        </div>
      )}

      {/* Vision Banner */}
      <div className="mb-6">
        <VisionBanner company={company} onSave={handleSaveVision} />
      </div>

      {/* Client-Friendly Progress */}
      {company.digitalEmployees.length > 0 && (
        <div className="mb-6">
          <ClientProgressCard company={company} />
        </div>
      )}

      {/* Progress summary */}
      <div className="mb-6">
        <ProgressSummary digitalEmployees={company.digitalEmployees} milestones={company.milestones} />
      </div>

      {/* Main content: Journey + Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journey Timeline (2/3) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Journey Roadmap</h3>
              <Badge variant="secondary" className="text-xs">
                {company.digitalEmployees.length}
              </Badge>
            </div>
            <Dialog open={newDEDialogOpen} onOpenChange={setNewDEDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add DE
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Digital Employee</DialogTitle>
                  <DialogDescription>
                    Add a new Digital Employee for {company.name}. This will automatically create a Design Week.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="de-name">Name *</Label>
                    <Input
                      id="de-name"
                      placeholder="e.g., Claims Intake Agent"
                      value={newDE.name}
                      onChange={(e) => setNewDE(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="de-description">Description</Label>
                    <Textarea
                      id="de-description"
                      placeholder="What does this Digital Employee do?"
                      value={newDE.description}
                      onChange={(e) => setNewDE(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewDEDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateDE} disabled={creatingDE || !newDE.name}>
                    {creatingDE ? 'Creating...' : 'Create DE'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <JourneyTimeline
            digitalEmployees={company.digitalEmployees}
            milestones={company.milestones}
            companyId={company.id}
          />
        </div>

        {/* Milestones sidebar (1/3) */}
        <div>
          <MilestonesSection
            milestones={company.milestones}
            companyId={company.id}
            onAdd={handleAddMilestone}
            onUpdate={handleUpdateMilestone}
            onDelete={handleDeleteMilestone}
          />
        </div>
      </div>
    </div>
  )
}
