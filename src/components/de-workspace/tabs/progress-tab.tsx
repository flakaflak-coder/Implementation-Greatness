'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Clock,
  FileText,
  CheckCircle2,
  Circle,
  Upload,
  Sparkles,
  Target,
  MessageSquare,
  Cpu,
  Signature,
  Key,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RocketProgress } from '@/components/journey/rocket-progress'
import { DesignWeekTimeline, PhaseData, SessionCard, ProcessingStatus } from '@/components/design-week'
import { CircularProgress } from '../shared/completeness-badge'
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
    <div className={cn('space-y-6', className)}>
      {/* Getting Started guide -- shown only when no data exists */}
      {hasNoData && (
        <Card className="border-[#E8D5C4] bg-[#FDF3EC]/30">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C2703E] to-[#A05A32] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Welcome to Design Week</h3>
                <p className="text-sm text-gray-600 mb-3">
                  This is where you define the Digital Employee. Start by uploading a session recording or
                  transcript from your Kickoff call. The AI will automatically extract goals, stakeholders,
                  KPIs, and more.
                </p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-[#C2703E] text-white text-xs flex items-center justify-center font-medium">1</span>
                    Upload your Kickoff session recording or transcript above
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-[#C2703E]/60 text-white text-xs flex items-center justify-center font-medium">2</span>
                    Review the AI-extracted items in the Business and Technical tabs
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-[#C2703E]/30 text-white text-xs flex items-center justify-center font-medium">3</span>
                    Continue with Process Design, Technical, and Sign-off sessions
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>DE Profile Completeness</CardTitle>
          <CardDescription>How complete is the Digital Employee definition? Fill in all required data to be ready for sign-off.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rocket progress bar */}
          <RocketProgress
            progress={overallProgress}
            label="Overall Completion"
            showPercentage
            animate
          />

          {/* Session Topic Selector */}
          <DesignWeekTimeline
            phases={phases}
            selectedPhase={selectedPhase}
            onPhaseSelect={setSelectedPhase}
            onPhaseToggle={togglePhaseCompletion}
          />

          {/* Data stats */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
            <span>
              {extractedItems.filter(i => i.status === 'APPROVED').length} approved items from {totalCompletedSessions} sessions
            </span>
            <span>
              {designWeek.scopeItems.filter((s) => s.classification !== 'AMBIGUOUS').length} scope
              items confirmed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Prerequisites Gate - blocks phase transitions when prerequisites are incomplete */}
      <PrerequisitesGate
        digitalEmployeeId={digitalEmployeeId}
        onPhaseTransition={onRefresh}
      />

      {/* Session Planning Guide - Helps Sophie know what to ask when */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br',
                  selectedPhaseConfig.gradient
                )}
              >
                <PhaseIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {selectedPhaseConfig.name} Session Guide
                </CardTitle>
                <CardDescription>Suggested topics and questions for {selectedPhaseConfig.name.toLowerCase()} sessions</CardDescription>
              </div>
            </div>
{/* Upload button moved to unified upload below */}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <p className="text-xs text-gray-500 mt-3">
              Use these as a guide during sessions. Questions auto-mark when relevant data is extracted and approved.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completeness Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Business Profile Card */}
        <Card
          className="cursor-pointer hover:border-[#D4956A] hover:shadow-md transition-all"
          onClick={() => onTabChange('business')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#C2703E]" />
                Business Profile
              </CardTitle>
              <CircularProgress percentage={profileCompleteness.business.overall} size={44} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {businessSections.map(([section, data]) => (
                <div key={section} className="group relative">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</span>
                      {data.missingTypes.length > 0 && (
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {data.pendingCount > 0 && (
                        <span className="text-xs text-amber-500">{data.pendingCount}⏳</span>
                      )}
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            data.percentage >= 80
                              ? 'bg-emerald-500'
                              : data.percentage >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          )}
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8">{data.percentage}%</span>
                    </div>
                  </div>
                  {/* Tooltip on hover showing details */}
                  {data.missingTypes.length > 0 && (
                    <div className="hidden group-hover:block absolute left-0 top-full z-10 mt-1 p-2 bg-gray-900 text-white text-xs rounded shadow-lg max-w-xs">
                      <p className="font-medium mb-1">Missing types:</p>
                      <p>{data.missingTypes.slice(0, 3).map(t => t.replace(/_/g, ' ').toLowerCase()).join(', ')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3 gap-2">
              View Business Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Technical Profile Card */}
        <Card
          className="cursor-pointer hover:border-[#D4956A] hover:shadow-md transition-all"
          onClick={() => onTabChange('technical')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#C2703E]" />
                Technical Profile
              </CardTitle>
              <CircularProgress percentage={profileCompleteness.technical.overall} size={44} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {technicalSections.map(([section, data]) => (
                <div key={section} className="group relative">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</span>
                      {data.missingTypes.length > 0 && (
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {data.pendingCount > 0 && (
                        <span className="text-xs text-amber-500">{data.pendingCount}⏳</span>
                      )}
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                          'h-full rounded-full transition-all',
                          data.percentage >= 80
                            ? 'bg-emerald-500'
                            : data.percentage >= 50
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        )}
                        style={{ width: `${data.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8">{data.percentage}%</span>
                    </div>
                  </div>
                  {/* Tooltip on hover showing details */}
                  {data.missingTypes.length > 0 && (
                    <div className="hidden group-hover:block absolute left-0 top-full z-10 mt-1 p-2 bg-gray-900 text-white text-xs rounded shadow-lg max-w-xs">
                      <p className="font-medium mb-1">Missing types:</p>
                      <p>{data.missingTypes.slice(0, 3).map(t => t.replace(/_/g, ' ').toLowerCase()).join(', ')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3 gap-2">
              View Technical Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Prerequisites Summary Card */}
      {prereqSummary && prereqSummary.total > 0 && (
        <Card
          className={cn(
            'cursor-pointer hover:shadow-md transition-all',
            prereqSummary.blocked > 0
              ? 'border-red-200 hover:border-red-300 bg-red-50/30'
              : prereqSummary.received === prereqSummary.total
              ? 'border-emerald-200 hover:border-emerald-300 bg-emerald-50/30'
              : 'border-amber-200 hover:border-amber-300 bg-amber-50/30'
          )}
          onClick={() => onTabChange('technical')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-orange-500" />
                Prerequisites for Configuration
              </CardTitle>
              {prereqSummary.blocked > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {prereqSummary.blocked} blocked
                </Badge>
              ) : prereqSummary.received === prereqSummary.total ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  All ready
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {prereqSummary.total - prereqSummary.received} pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {prereqSummary.received} of {prereqSummary.total} received
                </span>
                <span className="text-gray-500">
                  {prereqSummary.total > 0
                    ? Math.round((prereqSummary.received / prereqSummary.total) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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
            </div>

            {/* Status breakdown */}
            <div className="flex flex-wrap gap-2 text-xs">
              {prereqSummary.received > 0 && (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                  ✓ {prereqSummary.received} received
                </span>
              )}
              {prereqSummary.requested > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  📨 {prereqSummary.requested} requested
                </span>
              )}
              {prereqSummary.inProgress > 0 && (
                <span className="px-2 py-1 bg-[#F5E6DA] text-[#A05A32] rounded-full">
                  ⏳ {prereqSummary.inProgress} in progress
                </span>
              )}
              {prereqSummary.pending > 0 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                  ⏸ {prereqSummary.pending} pending
                </span>
              )}
              {prereqSummary.blocked > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                  🚫 {prereqSummary.blocked} blocked
                </span>
              )}
            </div>

            <Button variant="ghost" size="sm" className="w-full mt-2 gap-2">
              View Prerequisites in Technical Tab
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

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

      {/* Data Review Needed */}
      {(pendingItems.length > 0 || ambiguousItems.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Data Review Needed
            </CardTitle>
            <CardDescription>
              Confirm or clarify extracted information to complete the DE profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pending review items */}
            {pendingItems.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {pendingItems.length} items pending review
                    </p>
                    <p className="text-sm text-gray-500">
                      Review extracted items in Business or Technical profiles
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">{pendingItems.length}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTabChange('business')}
                    className="text-amber-700 border-amber-200 hover:bg-amber-50"
                  >
                    Review
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Ambiguous scope items */}
            {ambiguousItems.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {ambiguousItems.length} scope items need clarification
                    </p>
                    <p className="text-sm text-gray-500">
                      Clarify whether these items are in or out of scope
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{ambiguousItems.length}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTabChange('scope')}
                    className="text-red-700 border-red-200 hover:bg-red-50"
                  >
                    Resolve
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ready for Sign-off indicator */}
      {pendingItems.length === 0 &&
        ambiguousItems.length === 0 &&
        profileCompleteness.business.overall >= 80 &&
        profileCompleteness.technical.overall >= 80 && (
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-3 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-medium">DE Profile Complete!</span>
              </div>
              <p className="text-center text-sm text-emerald-600 mt-2">
                All required data has been captured and reviewed - ready for sign-off
              </p>
            </CardContent>
          </Card>
        )}

      {/* Document Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Documents</CardTitle>
          <CardDescription>
            Download professional PDF documents or generate markdown
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PDF Export - Primary Action */}
          <div>
            <ExportPDFButton
              designWeekId={designWeek.id}
              disabled={
                profileCompleteness.business.overall < 50 &&
                profileCompleteness.technical.overall < 50
              }
            />
            <p className="text-xs text-gray-500 mt-2">
              {profileCompleteness.business.overall < 50 && profileCompleteness.technical.overall < 50
                ? 'Requires at least 50% profile completeness to export'
                : 'Professional PDF with all extracted information'}
            </p>
          </div>

          {/* Markdown Generation - Secondary */}
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-500 mb-2">Or generate markdown documents:</p>
            <div className="flex flex-wrap gap-3">
              <GenerateDocButton
                designWeekId={designWeek.id}
                documentType="ALL"
                disabled={
                  profileCompleteness.business.overall < 50 ||
                  profileCompleteness.technical.overall < 50
                }
                onGenerate={onRefresh}
              />
            </div>
            {(profileCompleteness.business.overall < 50 ||
              profileCompleteness.technical.overall < 50) && (
              <p className="text-xs text-gray-500 mt-2">
                Complete at least 50% of both profiles to generate markdown
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
