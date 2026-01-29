'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { UnifiedUpload, UploadHistory } from '@/components/upload'
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
  profileCompleteness: ProfileCompleteness
  pendingItems: ExtractedItemWithSession[]
  ambiguousItems: DEWorkspaceScopeItem[]
  onTabChange: (tab: WorkspaceTab) => void
  onUploadSession: (phase: number) => void
  onExtractSession: (sessionId: string) => void
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
    ],
    icon: MessageSquare,
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
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

// Type for question tracking state
type QuestionTracker = Record<number, Set<number>> // phase -> set of answered question indices

export function ProgressTab({
  designWeek,
  profileCompleteness,
  pendingItems,
  ambiguousItems,
  onTabChange,
  onUploadSession,
  onExtractSession,
  onRefresh,
  className,
}: ProgressTabProps) {
  const [selectedPhase, setSelectedPhase] = useState(designWeek.currentPhase)

  // Track answered questions (persisted in localStorage)
  const [answeredQuestions, setAnsweredQuestions] = useState<QuestionTracker>({})

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

  // Calculate phase data for timeline
  const phases: PhaseData[] = PHASE_CONFIG.map((phase) => {
    const phaseSessions = designWeek.sessions.filter((s) => s.phase === phase.number)
    const completedSessions = phaseSessions.filter((s) => s.processingStatus === 'COMPLETE').length
    const hasUnresolved = ambiguousItems.some((item) => {
      // Check if any ambiguous items are from sessions in this phase
      return phaseSessions.some(() => {
        // This is a simplification - in practice, you'd check evidence links
        return true
      })
    })

    let status: PhaseData['status'] = 'upcoming'
    if (completedSessions >= phase.expectedSessions) {
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
    }
  })

  // Calculate overall progress
  const totalExpectedSessions = PHASE_CONFIG.reduce((sum, p) => sum + p.expectedSessions, 0)
  const totalCompletedSessions = designWeek.sessions.filter(
    (s) => s.processingStatus === 'COMPLETE'
  ).length
  const sessionProgress = (totalCompletedSessions / totalExpectedSessions) * 100

  // Weighted progress: 60% sessions, 40% profile completeness
  const avgProfileCompleteness =
    (profileCompleteness.business.overall + profileCompleteness.technical.overall) / 2
  const overallProgress = Math.round(sessionProgress * 0.6 + avgProfileCompleteness * 0.4)

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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Design Week Progress</CardTitle>
          <CardDescription>Track your progress toward sign-off and go-live</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rocket progress bar */}
          <RocketProgress
            progress={overallProgress}
            label="Overall Completion"
            showPercentage
            animate
          />

          {/* Timeline */}
          <DesignWeekTimeline
            phases={phases}
            selectedPhase={selectedPhase}
            onPhaseSelect={setSelectedPhase}
          />

          {/* Session stats */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
            <span>
              {totalCompletedSessions} of {totalExpectedSessions} sessions completed
            </span>
            <span>
              {designWeek.scopeItems.filter((s) => s.classification !== 'AMBIGUOUS').length} scope
              items confirmed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Phase Details with Sessions and Questions */}
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
                  Phase {selectedPhase}: {selectedPhaseConfig.name}
                </CardTitle>
                <CardDescription>{selectedPhaseConfig.description}</CardDescription>
              </div>
            </div>
{/* Upload button moved to unified upload below */}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Unified Upload - Single drop zone for all content */}
          <UnifiedUpload
            designWeekId={designWeek.id}
            onComplete={onRefresh}
          />

          {/* Upload History - Shows all uploaded files */}
          {designWeek.uploadJobs && designWeek.uploadJobs.length > 0 && (
            <UploadHistory
              uploads={designWeek.uploadJobs}
              onRetry={async (jobId) => {
                await fetch(`/api/upload/${jobId}/retry`, { method: 'POST' })
                onRefresh()
              }}
            />
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
                    onExtract={() => onExtractSession(session.id)}
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
                const { answered, total } = getAnsweredCount(selectedPhase, selectedPhaseConfig.standardQuestions.length)
                return (
                  <Badge
                    variant={answered === total ? 'default' : 'secondary'}
                    className={cn(
                      answered === total && 'bg-emerald-500 hover:bg-emerald-600'
                    )}
                  >
                    {answered}/{total} covered
                  </Badge>
                )
              })()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedPhaseConfig.standardQuestions.map((question, i) => {
                const isAnswered = answeredQuestions[selectedPhase]?.has(i)
                return (
                  <button
                    key={i}
                    onClick={() => toggleQuestion(selectedPhase, i)}
                    className={cn(
                      'flex items-start gap-2 p-2 rounded-lg border text-left transition-all',
                      isAnswered
                        ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    {isAnswered ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', selectedPhaseConfig.text)} />
                    )}
                    <span
                      className={cn(
                        'text-sm',
                        isAnswered ? 'text-emerald-700' : 'text-gray-700'
                      )}
                    >
                      {question}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Click questions to mark them as covered during sessions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completeness Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Business Profile Card */}
        <Card
          className="cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
          onClick={() => onTabChange('business')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                Business Profile
              </CardTitle>
              <CircularProgress percentage={profileCompleteness.business.overall} size={44} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {businessSections.map(([section, data]) => (
                <div key={section} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex items-center gap-2">
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
          className="cursor-pointer hover:border-violet-300 hover:shadow-md transition-all"
          onClick={() => onTabChange('technical')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-500" />
                Technical Profile
              </CardTitle>
              <CircularProgress percentage={profileCompleteness.technical.overall} size={44} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {technicalSections.map(([section, data]) => (
                <div key={section} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex items-center gap-2">
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
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3 gap-2">
              View Technical Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Blockers & Attention Needed */}
      {(pendingItems.length > 0 || ambiguousItems.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Attention Needed
            </CardTitle>
            <CardDescription>
              Items that need review before sign-off
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
                <Badge variant="warning">{pendingItems.length}</Badge>
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
                      Resolve ambiguous items before proceeding to sign-off
                    </p>
                  </div>
                </div>
                <Badge variant="destructive">{ambiguousItems.length}</Badge>
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
                <span className="font-medium">Ready for Sign-off!</span>
              </div>
              <p className="text-center text-sm text-emerald-600 mt-2">
                All profiles are complete and scope items are resolved
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
                profileCompleteness.business.overall < 30 &&
                profileCompleteness.technical.overall < 30
              }
            />
            <p className="text-xs text-gray-500 mt-2">
              Professional PDF with all extracted information
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
