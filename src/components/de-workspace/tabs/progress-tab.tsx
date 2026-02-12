'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Clock,
  FileText,
  CheckCircle2,
  Circle,
  Sparkles,
  Target,
  MessageSquare,
  Cpu,
  Signature,
  Key,
} from 'lucide-react'
import { cn } from '@/lib/utils'
// Card imports removed — using lightweight divs
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RocketProgress } from '@/components/journey/rocket-progress'
import { DesignWeekTimeline, PhaseData, SessionCard, ProcessingStatus } from '@/components/design-week'
// CircularProgress removed — using inline percentage text
import { GenerateDocButton } from '../shared/generate-doc-button'
import { ExportPDFButton } from '../shared/export-pdf-button'
import { MissingQuestionsCard } from '../shared/missing-questions-card'
import type { ExtractedItemType } from '@prisma/client'
import { PrerequisitesGate } from '../prerequisites-gate'
import type {
  ProfileCompleteness,
  ExtractedItemWithSession,
  WorkspaceTab,
  BusinessProfileSection,
  TechnicalProfileSection,
  DEWorkspaceDesignWeek,
  DEWorkspaceScopeItem,
} from '../types'

interface ProgressTabProps {
  designWeek: DEWorkspaceDesignWeek
  digitalEmployeeId: string
  profileCompleteness: ProfileCompleteness
  pendingItems: ExtractedItemWithSession[]
  ambiguousItems: DEWorkspaceScopeItem[]
  extractedItems: ExtractedItemWithSession[]  // All extracted items for auto-coverage
  onTabChange: (tab: WorkspaceTab) => void
  onUploadSession: (phase: number) => void
  onExtractSession?: (sessionId: string) => void
  onRefresh: () => void
  className?: string
}

// Phase configuration with standard questions
const PHASE_CONFIG = [
  {
    number: 1,
    name: 'Kickoff',
    description: 'Align on goals, stakeholders, and expectations for the Digital Employee',
    expectedSessions: 1,
    standardQuestions: [
      'What problem are we solving?',
      'Who are the key stakeholders?',
      'What does success look like?',
      "What's the expected volume?",
      "What's the timeline expectation?",
      'Any hard constraints or non-negotiables?',
    ],
    icon: Target,
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  {
    number: 2,
    name: 'Process Design',
    description: 'Map the detailed workflow, define scope items, and document exceptions',
    expectedSessions: 3,
    standardQuestions: [
      'What triggers this process?',
      'Walk me through a typical case end-to-end',
      'What information is collected at each step?',
      'How does the process end?',
      'What happens if data is missing?',
      'What types of requests do you NOT handle?',
      'When do you escalate?',
      'What are the most common exceptions?',
      "What's the DE's personality and tone of voice?",
      'How should the DE greet users?',
      'What should the DE never say?',
      'What are the exact escalation scripts?',
    ],
    icon: MessageSquare,
    gradient: 'from-[#C2703E] to-[#A05A32]',
    bg: 'bg-[#FDF3EC]',
    text: 'text-[#C2703E]',
    border: 'border-[#E8D5C4]',
  },
  {
    number: 3,
    name: 'Technical',
    description: 'Define integration requirements, data schemas, and system connections',
    expectedSessions: 3,
    standardQuestions: [
      'What systems does this touch?',
      'Where does the data come from?',
      'Where does the data need to go?',
      'What credentials/access do we need?',
      'Any security or compliance requirements?',
      'Who owns the technical relationship?',
      'What monitoring metrics are needed?',
      'What happens when a system goes down?',
    ],
    icon: Cpu,
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
  {
    number: 4,
    name: 'Sign-off',
    description: 'Final validation, scope confirmation, and stakeholder approval',
    expectedSessions: 1,
    standardQuestions: [
      'Is the scope complete and accurate?',
      'Are there any outstanding concerns?',
      'Who is signing off on behalf of the client?',
      'What are the immediate next steps?',
      'What are the go/no-go criteria?',
      "What's the soft launch plan?",
    ],
    icon: Signature,
    gradient: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
  },
]

const PHASES = [
  { number: 1, name: 'Kickoff', expectedSessions: 1, description: 'Goals, stakeholders, success metrics' },
  { number: 2, name: 'Process Design', expectedSessions: 3, description: 'Happy path, exceptions, scope' },
  { number: 3, name: 'Technical', expectedSessions: 3, description: 'Systems, integrations, data' },
  { number: 4, name: 'Sign-off', expectedSessions: 1, description: 'Final confirmations, go/no-go' },
]

// Maps each question to ExtractedItemTypes that indicate it's been covered
// Array index matches standardQuestions index in PHASE_CONFIG
const QUESTION_COVERAGE_MAPPING: Record<number, ExtractedItemType[][]> = {
  // Phase 1 (Kickoff) - 6 questions
  1: [
    ['GOAL', 'BUSINESS_CASE'],           // "What problem are we solving?"
    ['STAKEHOLDER'],                      // "Who are the key stakeholders?"
    ['KPI_TARGET', 'GOAL'],              // "What does success look like?"
    ['VOLUME_EXPECTATION'],              // "What's the expected volume?"
    ['TIMELINE_CONSTRAINT'],             // "What's the timeline expectation?"
    ['BUSINESS_CASE'],                   // "Any hard constraints or non-negotiables?"
  ],
  // Phase 2 (Process Design) - 12 questions
  2: [
    ['CASE_TYPE', 'CHANNEL'],            // "What triggers this process?"
    ['HAPPY_PATH_STEP'],                 // "Walk me through a typical case"
    ['DATA_FIELD', 'DOCUMENT_TYPE'],     // "What information is collected?"
    ['HAPPY_PATH_STEP'],                 // "How does the process end?"
    ['EXCEPTION_CASE'],                  // "What happens if data is missing?"
    ['SCOPE_OUT'],                       // "What types do you NOT handle?"
    ['ESCALATION_TRIGGER'],              // "When do you escalate?"
    ['EXCEPTION_CASE'],                  // "Most common exceptions?"
    ['PERSONA_TRAIT', 'TONE_RULE'],      // "What's the DE's personality and tone?"
    ['EXAMPLE_DIALOGUE', 'COMMUNICATION_STYLE'], // "How should the DE greet users?"
    ['DOS_AND_DONTS', 'GUARDRAIL_NEVER'], // "What should the DE never say?"
    ['ESCALATION_SCRIPT'],               // "What are the exact escalation scripts?"
  ],
  // Phase 3 (Technical) - 8 questions
  3: [
    ['SYSTEM_INTEGRATION'],              // "What systems does this touch?"
    ['DATA_FIELD'],                      // "Where does data come from?"
    ['SYSTEM_INTEGRATION', 'API_ENDPOINT'], // "Where does data need to go?"
    ['SECURITY_REQUIREMENT'],            // "What credentials/access needed?"
    ['COMPLIANCE_REQUIREMENT', 'SECURITY_REQUIREMENT'], // "Security/compliance?"
    ['TECHNICAL_CONTACT', 'STAKEHOLDER'], // "Who owns technical relationship?"
    ['MONITORING_METRIC'],               // "What monitoring metrics are needed?"
    ['ERROR_HANDLING', 'SYSTEM_INTEGRATION'], // "What happens when a system goes down?"
  ],
  // Phase 4 (Sign-off) - 6 questions
  4: [
    ['SCOPE_IN', 'SCOPE_OUT'],           // "Is scope complete?"
    ['OPEN_ITEM', 'RISK'],               // "Outstanding concerns?"
    ['APPROVAL', 'STAKEHOLDER'],         // "Who is signing off?"
    ['DECISION', 'OPEN_ITEM'],           // "Immediate next steps?"
    ['LAUNCH_CRITERION'],                // "What are the go/no-go criteria?"
    ['LAUNCH_CRITERION'],                // "What's the soft launch plan?"
  ],
}

// Type for question tracking state
type QuestionTracker = Record<number, Set<number>> // phase -> set of answered question indices

// Prerequisites summary type
interface PrerequisiteSummary {
  total: number
  received: number
  pending: number
  requested: number
  blocked: number
  inProgress: number
}

export function ProgressTab({
  designWeek,
  digitalEmployeeId,
  profileCompleteness,
  pendingItems,
  ambiguousItems,
  extractedItems,
  onTabChange,
  onUploadSession,
  onExtractSession,
  onRefresh,
  className,
}: ProgressTabProps) {
  const [selectedPhase, setSelectedPhase] = useState(designWeek.currentPhase)

  // Track answered questions (persisted in localStorage)
  const [answeredQuestions, setAnsweredQuestions] = useState<QuestionTracker>({})

  // Prerequisites summary state
  const [prereqSummary, setPrereqSummary] = useState<PrerequisiteSummary | null>(null)

  // Manual phase completions
  const [manualCompletions, setManualCompletions] = useState<number[]>([])

  // Fetch manual phase completions
  useEffect(() => {
    async function fetchPhaseCompletions() {
      try {
        const response = await fetch(`/api/design-weeks/${designWeek.id}/phases`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setManualCompletions(data.data.manualCompletions || [])
          }
        }
      } catch (error) {
        console.error('Failed to fetch phase completions:', error)
      }
    }
    fetchPhaseCompletions()
  }, [designWeek.id])

  // Toggle manual phase completion
  const togglePhaseCompletion = async (phase: number) => {
    const isCurrentlyCompleted = manualCompletions.includes(phase)
    const newCompleted = !isCurrentlyCompleted

    // Optimistic update
    setManualCompletions(prev =>
      newCompleted
        ? [...prev, phase].sort()
        : prev.filter(p => p !== phase)
    )

    try {
      const response = await fetch(`/api/design-weeks/${designWeek.id}/phases`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase, completed: newCompleted }),
      })

      if (!response.ok) {
        // Revert on failure
        setManualCompletions(prev =>
          isCurrentlyCompleted
            ? [...prev, phase].sort()
            : prev.filter(p => p !== phase)
        )
      }
    } catch {
      // Revert on error
      setManualCompletions(prev =>
        isCurrentlyCompleted
          ? [...prev, phase].sort()
          : prev.filter(p => p !== phase)
      )
    }
  }

  // Fetch prerequisites summary
  useEffect(() => {
    async function fetchPrerequisites() {
      try {
        const response = await fetch(`/api/design-weeks/${designWeek.id}/prerequisites`)
        if (response.ok) {
          const data = await response.json()
          const prerequisites = data.prerequisites || []

          // Calculate summary
          const summary: PrerequisiteSummary = {
            total: prerequisites.length,
            received: prerequisites.filter((p: { status: string }) => p.status === 'RECEIVED').length,
            pending: prerequisites.filter((p: { status: string }) => p.status === 'PENDING').length,
            requested: prerequisites.filter((p: { status: string }) => p.status === 'REQUESTED').length,
            blocked: prerequisites.filter((p: { status: string }) => p.status === 'BLOCKED').length,
            inProgress: prerequisites.filter((p: { status: string }) => p.status === 'IN_PROGRESS').length,
          }
          setPrereqSummary(summary)
        }
      } catch (error) {
        console.error('Failed to fetch prerequisites:', error)
      }
    }

    fetchPrerequisites()
  }, [designWeek.id])

  // Load answered questions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`questions-${designWeek.id}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Convert arrays back to Sets
        const tracker: QuestionTracker = {}
        for (const [phase, indices] of Object.entries(parsed)) {
          tracker[Number(phase)] = new Set(indices as number[])
        }
        setAnsweredQuestions(tracker)
      } catch {
        // Ignore parse errors
      }
    }
  }, [designWeek.id])

  // Save answered questions to localStorage
  const saveAnsweredQuestions = useCallback(
    (tracker: QuestionTracker) => {
      // Convert Sets to arrays for JSON serialization
      const serializable: Record<number, number[]> = {}
      for (const [phase, indices] of Object.entries(tracker)) {
        serializable[Number(phase)] = Array.from(indices as Set<number>)
      }
      localStorage.setItem(`questions-${designWeek.id}`, JSON.stringify(serializable))
    },
    [designWeek.id]
  )

  // Toggle a question's answered state
  const toggleQuestion = (phase: number, questionIndex: number) => {
    setAnsweredQuestions((prev) => {
      const next = { ...prev }
      if (!next[phase]) {
        next[phase] = new Set()
      } else {
        next[phase] = new Set(next[phase])
      }

      if (next[phase].has(questionIndex)) {
        next[phase].delete(questionIndex)
      } else {
        next[phase].add(questionIndex)
      }

      saveAnsweredQuestions(next)
      return next
    })
  }

  // Get count of answered questions for a phase
  const getAnsweredCount = (phase: number, totalQuestions: number) => {
    const answered = answeredQuestions[phase]?.size || 0
    return { answered, total: totalQuestions }
  }

  // Compute auto-covered questions based on APPROVED extracted items only
  const autoCoveredQuestions = useMemo(() => {
    const result: QuestionTracker = {}

    // Only count APPROVED items for auto-coverage (pending items aren't confirmed yet)
    const approvedItems = extractedItems.filter(i => i.status === 'APPROVED')
    const approvedItemTypes = new Set(approvedItems.map(i => i.type))

    // For each phase, check which questions are covered by approved items
    Object.entries(QUESTION_COVERAGE_MAPPING).forEach(([phaseStr, questionTypes]) => {
      const phase = parseInt(phaseStr)
      result[phase] = new Set()

      questionTypes.forEach((requiredTypes, questionIndex) => {
        // Question is covered if ANY of the required types exist in approved items
        const isCovered = requiredTypes.some(type => approvedItemTypes.has(type))
        if (isCovered) {
          result[phase].add(questionIndex)
        }
      })
    })

    return result
  }, [extractedItems])

  // Get combined coverage count (manual + auto) for a phase
  const getCombinedCoveredCount = (phase: number, totalQuestions: number) => {
    const manual = answeredQuestions[phase] || new Set()
    const auto = autoCoveredQuestions[phase] || new Set()
    const combined = new Set([...manual, ...auto])
    return { covered: combined.size, total: totalQuestions }
  }

  // Calculate phase data for timeline
  const phases: PhaseData[] = PHASE_CONFIG.map((phase) => {
    const phaseSessions = designWeek.sessions.filter((s) => s.phase === phase.number)
    const completedSessions = phaseSessions.filter((s) => s.processingStatus === 'COMPLETE').length
    const isManuallyCompleted = manualCompletions.includes(phase.number)
    const hasUnresolved = ambiguousItems.some((item) => {
      // Check if any ambiguous items are from sessions in this phase
      return phaseSessions.some(() => {
        // This is a simplification - in practice, you'd check evidence links
        return true
      })
    })

    let status: PhaseData['status'] = 'upcoming'
    if (completedSessions >= phase.expectedSessions || isManuallyCompleted) {
      status = 'complete'
    } else if (phaseSessions.length > 0) {
      status = hasUnresolved ? 'blocked' : 'current'
    } else if (phase.number === designWeek.currentPhase) {
      status = 'current'
    }

    return {
      number: phase.number,
      name: phase.name,
      description: phase.description,
      expectedSessions: phase.expectedSessions,
      completedSessions,
      status,
      hasUnresolvedItems: hasUnresolved,
      isManuallyCompleted,
    }
  })

  // Calculate session stats (informational, not progress-driving)
  const totalCompletedSessions = designWeek.sessions.filter(
    (s) => s.processingStatus === 'COMPLETE'
  ).length

  // Data-centric progress: Based purely on profile completeness
  // Sessions are a means to gather data, not the goal themselves
  // Progress = weighted average of Business (60%) + Technical (40%) profiles
  const overallProgress = Math.round(
    profileCompleteness.business.overall * 0.60 +
    profileCompleteness.technical.overall * 0.40
  )

  // Profile section cards data
  const businessSections = Object.entries(profileCompleteness.business.sections) as [
    BusinessProfileSection,
    typeof profileCompleteness.business.sections[BusinessProfileSection]
  ][]
  const technicalSections = Object.entries(profileCompleteness.technical.sections) as [
    TechnicalProfileSection,
    typeof profileCompleteness.technical.sections[TechnicalProfileSection]
  ][]

  // Get selected phase config
  const selectedPhaseConfig = PHASE_CONFIG.find((p) => p.number === selectedPhase) || PHASE_CONFIG[0]
  const PhaseIcon = selectedPhaseConfig.icon

  // Get sessions for selected phase
  const phaseSessions = designWeek.sessions
    .filter((s) => s.phase === selectedPhase)
    .map((s) => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      date: new Date(s.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: s.processingStatus.toLowerCase() as ProcessingStatus,
      extractedCount: 0, // Will be populated from extractedItems
      unresolvedCount: 0,
      topicsCovered: s.topicsCovered as string[],
    }))

  // Check if this is a brand new design week with no data at all
  const hasNoData = designWeek.sessions.length === 0 &&
    extractedItems.length === 0 &&
    (!designWeek.uploadJobs || designWeek.uploadJobs.length === 0)

  return (
    <div className={cn('space-y-8', className)}>
      {/* Getting Started guide -- shown only when no data exists */}
      {hasNoData && (
        <div className="border border-[#E8D5C4] bg-[#FDF3EC]/30 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C2703E] flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 text-[15px] mb-1">Welcome to Design Week</h3>
              <p className="text-sm text-stone-600 mb-3">
                Start by uploading a session recording or transcript from your Kickoff call.
                The AI will automatically extract goals, stakeholders, KPIs, and more.
              </p>
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2 text-stone-700">
                  <span className="w-5 h-5 rounded-full bg-[#C2703E] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  Upload your Kickoff session recording or transcript above
                </div>
                <div className="flex items-center gap-2 text-stone-600">
                  <span className="w-5 h-5 rounded-full bg-[#C2703E]/50 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  Review extracted items in the Business and Technical tabs
                </div>
                <div className="flex items-center gap-2 text-stone-500">
                  <span className="w-5 h-5 rounded-full bg-[#C2703E]/25 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                  Continue with Process Design, Technical, and Sign-off sessions
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overall Progress — no card wrapper */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold tracking-tight text-stone-900">DE Profile Completeness</h2>
          <span className="text-2xl font-bold tabular-nums text-[#C2703E]">{overallProgress}%</span>
        </div>

        <RocketProgress
          progress={overallProgress}
          animate
        />

        <DesignWeekTimeline
          phases={phases}
          selectedPhase={selectedPhase}
          onPhaseSelect={setSelectedPhase}
          onPhaseToggle={togglePhaseCompletion}
        />

        <div className="flex items-center justify-between text-[13px] text-stone-500 pt-3 border-t border-stone-100">
          <span>
            {extractedItems.filter(i => i.status === 'APPROVED').length} approved items from {totalCompletedSessions} sessions
          </span>
          <span>
            {designWeek.scopeItems.filter((s) => s.classification !== 'AMBIGUOUS').length} scope items confirmed
          </span>
        </div>
      </div>

      {/* Prerequisites Gate - blocks phase transitions when prerequisites are incomplete */}
      <PrerequisitesGate
        digitalEmployeeId={digitalEmployeeId}
        onPhaseTransition={onRefresh}
      />

      {/* Two-column: Session Guide (left) + Profile Summary (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Session Guide */}
        <div className="lg:col-span-3 space-y-5">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br',
                selectedPhaseConfig.gradient
              )}
            >
              <PhaseIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-stone-900">
                {selectedPhaseConfig.name} Session Guide
              </h3>
              <p className="text-[13px] text-stone-500">Topics for {selectedPhaseConfig.name.toLowerCase()} sessions</p>
            </div>
          </div>
          <div className="space-y-5">
          {/* Manual completion toggle */}
          {phaseSessions.length === 0 && (
            <div className={cn(
              'flex items-center justify-between p-3 rounded-lg border',
              manualCompletions.includes(selectedPhase)
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-gray-50 border-gray-200'
            )}>
              <div className="flex items-center gap-3">
                {manualCompletions.includes(selectedPhase) ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {manualCompletions.includes(selectedPhase)
                      ? 'Session held — marked manually'
                      : 'No recordings uploaded yet'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {manualCompletions.includes(selectedPhase)
                      ? 'You can still upload a recording later'
                      : 'Had the session but no recording? Mark it as held'}
                  </p>
                </div>
              </div>
              <Button
                variant={manualCompletions.includes(selectedPhase) ? 'outline' : 'default'}
                size="sm"
                onClick={() => togglePhaseCompletion(selectedPhase)}
                className={cn(
                  manualCompletions.includes(selectedPhase)
                    ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                    : ''
                )}
              >
                {manualCompletions.includes(selectedPhase) ? 'Undo' : 'Mark as Held'}
              </Button>
            </div>
          )}

          {/* Sessions for this phase */}
          {phaseSessions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Uploaded Sessions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {phaseSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    id={session.id}
                    sessionNumber={session.sessionNumber}
                    phaseName={selectedPhaseConfig.name}
                    date={session.date}
                    status={session.status}
                    extractedCount={session.extractedCount}
                    unresolvedCount={session.unresolvedCount}
                    topicsCovered={session.topicsCovered}
                    onExtract={onExtractSession ? () => onExtractSession(session.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Questions to Cover */}
          <div className={cn('rounded-xl border p-4', selectedPhaseConfig.bg, selectedPhaseConfig.border)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className={cn('w-4 h-4', selectedPhaseConfig.text)} />
                <h4 className="font-semibold text-gray-900">Questions to Cover</h4>
              </div>
              {(() => {
                const { covered, total } = getCombinedCoveredCount(selectedPhase, selectedPhaseConfig.standardQuestions.length)
                return (
                  <Badge
                    variant={covered === total ? 'default' : 'secondary'}
                    className={cn(
                      covered === total && 'bg-emerald-500 hover:bg-emerald-600'
                    )}
                  >
                    {covered}/{total} covered
                  </Badge>
                )
              })()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedPhaseConfig.standardQuestions.map((question, i) => {
                const isManuallyAnswered = answeredQuestions[selectedPhase]?.has(i)
                const isAutoCovered = autoCoveredQuestions[selectedPhase]?.has(i)
                const isCovered = isManuallyAnswered || isAutoCovered
                return (
                  <button
                    key={i}
                    onClick={() => !isAutoCovered && toggleQuestion(selectedPhase, i)}
                    disabled={isAutoCovered}
                    className={cn(
                      'flex items-start gap-2 p-2 rounded-lg border text-left transition-all',
                      isCovered
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50',
                      !isAutoCovered && isCovered && 'hover:bg-emerald-100',
                      isAutoCovered && 'cursor-default'
                    )}
                  >
                    {isCovered ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className={cn('w-4 h-4 mt-0.5 shrink-0', selectedPhaseConfig.text)} />
                    )}
                    <span
                      className={cn(
                        'text-sm',
                        isCovered ? 'text-emerald-700' : 'text-gray-700'
                      )}
                    >
                      {question}
                      {isAutoCovered && (
                        <span className="text-xs text-emerald-500 ml-2">(auto)</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-stone-400 mt-3">
              Questions auto-mark when relevant data is extracted and approved.
            </p>
          </div>
          </div>
        </div>

        {/* Right — Profile & Prerequisites */}
        <div className="lg:col-span-2 space-y-4">
          {/* Business Profile */}
          <div
            className="rounded-lg border border-stone-200/60 p-4 cursor-pointer hover:border-[#C2703E]/40 transition-colors"
            onClick={() => onTabChange('business')}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[13px] font-semibold text-stone-900 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#C2703E]" />
                Business Profile
              </h4>
              <span className="text-sm font-bold tabular-nums text-stone-600">{profileCompleteness.business.overall}%</span>
            </div>
            <div className="space-y-1.5">
              {businessSections.map(([section, data]) => (
                <div key={section} className="flex items-center justify-between text-[13px]">
                  <span className="text-stone-500 capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex items-center gap-2">
                    {data.pendingCount > 0 && (
                      <span className="text-[11px] text-amber-500">{data.pendingCount} pending</span>
                    )}
                    <div className="w-12 h-1 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          data.percentage >= 80 ? 'bg-emerald-500' : data.percentage >= 50 ? 'bg-amber-500' : 'bg-stone-300'
                        )}
                        style={{ width: `${data.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 pt-2.5 border-t border-stone-100 text-[13px] text-stone-400 hover:text-[#C2703E] transition-colors flex items-center justify-center gap-1">
              View details <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Technical Profile */}
          <div
            className="rounded-lg border border-stone-200/60 p-4 cursor-pointer hover:border-[#C2703E]/40 transition-colors"
            onClick={() => onTabChange('technical')}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[13px] font-semibold text-stone-900 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-[#C2703E]" />
                Technical Profile
              </h4>
              <span className="text-sm font-bold tabular-nums text-stone-600">{profileCompleteness.technical.overall}%</span>
            </div>
            <div className="space-y-1.5">
              {technicalSections.map(([section, data]) => (
                <div key={section} className="flex items-center justify-between text-[13px]">
                  <span className="text-stone-500 capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex items-center gap-2">
                    {data.pendingCount > 0 && (
                      <span className="text-[11px] text-amber-500">{data.pendingCount} pending</span>
                    )}
                    <div className="w-12 h-1 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          data.percentage >= 80 ? 'bg-emerald-500' : data.percentage >= 50 ? 'bg-amber-500' : 'bg-stone-300'
                        )}
                        style={{ width: `${data.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 pt-2.5 border-t border-stone-100 text-[13px] text-stone-400 hover:text-[#C2703E] transition-colors flex items-center justify-center gap-1">
              View details <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Prerequisites */}
          {prereqSummary && prereqSummary.total > 0 && (
            <div
              className={cn(
                'rounded-lg border p-4 cursor-pointer transition-colors',
                prereqSummary.blocked > 0
                  ? 'border-red-200 bg-red-50/20 hover:border-red-300'
                  : prereqSummary.received === prereqSummary.total
                  ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300'
                  : 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
              )}
              onClick={() => onTabChange('technical')}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-semibold text-stone-900 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-orange-500" />
                  Prerequisites
                </h4>
                {prereqSummary.blocked > 0 ? (
                  <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0">
                    {prereqSummary.blocked} blocked
                  </Badge>
                ) : prereqSummary.received === prereqSummary.total ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] gap-1 px-1.5 py-0">
                    All ready
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px] gap-1 px-1.5 py-0">
                    {prereqSummary.total - prereqSummary.received} pending
                  </Badge>
                )}
              </div>
              <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden mb-2">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    prereqSummary.blocked > 0
                      ? 'bg-red-500'
                      : prereqSummary.received === prereqSummary.total
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  )}
                  style={{
                    width: `${prereqSummary.total > 0 ? (prereqSummary.received / prereqSummary.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-[13px] text-stone-500">
                {prereqSummary.received} of {prereqSummary.total} received
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Missing Questions from AI Analysis */}
      {designWeek.uploadJobs && designWeek.uploadJobs.length > 0 && (
        <MissingQuestionsCard
          uploads={designWeek.uploadJobs.map(job => ({
            id: job.id,
            filename: job.filename,
            classificationResult: job.classificationResult,
            status: job.status,
          }))}
        />
      )}

      {/* Action alerts */}
      {pendingItems.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-stone-900">{pendingItems.length} items pending review</p>
              <p className="text-[13px] text-stone-500">Review in Business or Technical profiles</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTabChange('business')}
            className="text-amber-700 border-amber-200 hover:bg-amber-50 shrink-0"
          >
            Review <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}
      {ambiguousItems.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-stone-900">{ambiguousItems.length} scope items need clarification</p>
              <p className="text-[13px] text-stone-500">Clarify whether items are in or out of scope</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTabChange('scope')}
            className="text-red-700 border-red-200 hover:bg-red-50 shrink-0"
          >
            Resolve <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Ready for Sign-off */}
      {pendingItems.length === 0 &&
        ambiguousItems.length === 0 &&
        profileCompleteness.business.overall >= 80 &&
        profileCompleteness.technical.overall >= 80 && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/30 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">DE Profile Complete</p>
              <p className="text-[13px] text-emerald-600">All required data captured and reviewed — ready for sign-off</p>
            </div>
          </div>
        )}

      {/* Documents */}
      <div className="border-t border-stone-200 pt-6">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-4">Export Documents</h3>
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <ExportPDFButton
              designWeekId={designWeek.id}
              disabled={
                profileCompleteness.business.overall < 50 &&
                profileCompleteness.technical.overall < 50
              }
            />
            <p className="text-xs text-stone-400 mt-1.5">
              {profileCompleteness.business.overall < 50 && profileCompleteness.technical.overall < 50
                ? 'Requires 50%+ completeness'
                : 'Professional PDF export'}
            </p>
          </div>
          <div>
            <GenerateDocButton
              designWeekId={designWeek.id}
              documentType="ALL"
              disabled={
                profileCompleteness.business.overall < 50 ||
                profileCompleteness.technical.overall < 50
              }
              onGenerate={onRefresh}
            />
            {(profileCompleteness.business.overall < 50 ||
              profileCompleteness.technical.overall < 50) && (
              <p className="text-xs text-stone-400 mt-1.5">
                Requires 50%+ on both profiles
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
