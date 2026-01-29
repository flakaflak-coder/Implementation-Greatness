'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DesignWeekTimeline, PhaseData, PhaseStatus } from './design-week-timeline'
import { PhaseDetailPanel, Session } from './phase-detail-panel'
import { ScopeSummaryCard } from './scope-summary-card'
import { RocketProgress } from '@/components/journey/rocket-progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Wand2, RefreshCw, Sparkles, Link as LinkIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'

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
      'What\'s the expected volume?',
      'What\'s the timeline expectation?',
      'Any hard constraints or non-negotiables?',
    ],
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
  },
]

export interface DesignWeekData {
  id: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_SIGNOFF' | 'COMPLETE'
  currentPhase: number
  sessions: {
    id: string
    phase: number
    sessionNumber: number
    date: string
    recordingUrl: string | null
    recordingDuration?: number
    processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
    topicsCovered: string[]
    extractedCount?: number
    unresolvedCount?: number
  }[]
  scopeItems: {
    classification: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS'
  }[]
}

interface DesignWeekFlowProps {
  designWeek: DesignWeekData
  onUploadSession?: (phase: number) => void
  onExtractSession?: (sessionId: string) => void
  onRefresh?: () => void
  className?: string
}

export function DesignWeekFlow({
  designWeek,
  onUploadSession,
  onExtractSession,
  onRefresh,
  className,
}: DesignWeekFlowProps) {
  const [selectedPhase, setSelectedPhase] = useState(designWeek.currentPhase)
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [extractDialogOpen, setExtractDialogOpen] = useState(false)
  const [extractingSessionId, setExtractingSessionId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)

  // Build phase data
  const phases: PhaseData[] = PHASE_CONFIG.map((config) => {
    const phaseSessions = designWeek.sessions.filter(s => s.phase === config.number)
    const completedSessions = phaseSessions.filter(s => s.processingStatus === 'COMPLETE').length
    const hasUnresolved = phaseSessions.some(s => (s.unresolvedCount || 0) > 0)

    let status: PhaseStatus = 'upcoming'
    if (designWeek.currentPhase > config.number) {
      status = 'complete'
    } else if (designWeek.currentPhase === config.number) {
      status = 'current'
    }

    return {
      number: config.number,
      name: config.name,
      description: config.description,
      expectedSessions: config.expectedSessions,
      completedSessions,
      status,
      hasUnresolvedItems: hasUnresolved,
    }
  })

  // Get sessions for selected phase
  const selectedPhaseConfig = PHASE_CONFIG.find(p => p.number === selectedPhase)!
  const phaseSessions: Session[] = designWeek.sessions
    .filter(s => s.phase === selectedPhase)
    .map(s => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      date: new Date(s.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      duration: s.recordingDuration
        ? `${Math.floor(s.recordingDuration / 60)}m`
        : undefined,
      status: s.processingStatus.toLowerCase() as 'pending' | 'processing' | 'complete' | 'failed',
      extractedCount: s.extractedCount,
      unresolvedCount: s.unresolvedCount,
      topicsCovered: s.topicsCovered,
    }))

  // Calculate scope stats
  const inScopeCount = designWeek.scopeItems.filter(s => s.classification === 'IN_SCOPE').length
  const outScopeCount = designWeek.scopeItems.filter(s => s.classification === 'OUT_OF_SCOPE').length
  const ambiguousCount = designWeek.scopeItems.filter(s => s.classification === 'AMBIGUOUS').length
  const totalScope = inScopeCount + outScopeCount + ambiguousCount
  const completenessScore = totalScope > 0
    ? Math.round(((inScopeCount + outScopeCount) / totalScope) * 100)
    : 0

  // Calculate overall journey progress for rocket
  const totalExpectedSessions = PHASE_CONFIG.reduce((sum, p) => sum + p.expectedSessions, 0)
  const totalCompletedSessions = designWeek.sessions.filter(s => s.processingStatus === 'COMPLETE').length
  const sessionProgress = totalExpectedSessions > 0
    ? Math.round((totalCompletedSessions / totalExpectedSessions) * 100)
    : 0
  // Combine session progress with scope completion (weighted)
  const overallProgress = Math.round((sessionProgress * 0.6) + (completenessScore * 0.4))

  const handleUpload = () => {
    setUploadDialogOpen(false)
    onUploadSession?.(selectedPhase)
  }

  const handleExtract = async () => {
    if (!extractingSessionId || !transcript.trim()) return
    setIsExtracting(true)
    onExtractSession?.(extractingSessionId)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsExtracting(false)
    setExtractDialogOpen(false)
    setTranscript('')
    setExtractingSessionId(null)
  }

  const openExtractDialog = (sessionId: string) => {
    setExtractingSessionId(sessionId)
    setExtractDialogOpen(true)
  }

  return (
    <div className={cn('space-y-8', className)}>
      {/* Rocket Progress Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <RocketProgress
          progress={overallProgress}
          label="Journey to Launch"
          showPercentage={true}
          animate={true}
        />
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Design Week Progress</h2>
            <p className="text-sm text-gray-500 mt-1">
              Track sessions and extractions across all phases
            </p>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
        <DesignWeekTimeline
          phases={phases}
          selectedPhase={selectedPhase}
          onPhaseSelect={setSelectedPhase}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phase details - 2 columns */}
        <div className="lg:col-span-2 animate-fade-in">
          <PhaseDetailPanel
            phaseNumber={selectedPhaseConfig.number}
            phaseName={selectedPhaseConfig.name}
            description={selectedPhaseConfig.description}
            expectedSessions={selectedPhaseConfig.expectedSessions}
            sessions={phaseSessions}
            standardQuestions={selectedPhaseConfig.standardQuestions}
            selectedSessionId={selectedSessionId}
            onSessionSelect={setSelectedSessionId}
            onUpload={() => setUploadDialogOpen(true)}
            onExtract={openExtractDialog}
          />
        </div>

        {/* Scope summary - 1 column */}
        <div className="lg:col-span-1">
          <ScopeSummaryCard
            inScopeCount={inScopeCount}
            outScopeCount={outScopeCount}
            ambiguousCount={ambiguousCount}
            completenessScore={completenessScore}
            onViewDetails={() => {}}
          />
        </div>
      </div>

      {/* Upload Session Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Upload Session Recording</DialogTitle>
            <DialogDescription className="text-gray-500">
              Upload a recording for {selectedPhaseConfig.name} phase. The system will automatically
              extract scope items, scenarios, and more.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50'
              )}
            >
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-indigo-600" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">
                Drop recording here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports MP3, WAV, MP4, PDF, DOCX
              </p>
            </div>

            {/* Or paste URL */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400 font-medium">Or paste a link</span>
              </div>
            </div>

            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="https://loom.com/share/..."
                className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-gray-100 pt-4">
            <Button
              variant="ghost"
              onClick={() => setUploadDialogOpen(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-200/50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload & Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extract Dialog */}
      <Dialog open={extractDialogOpen} onOpenChange={setExtractDialogOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              AI Extraction
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Paste the transcript from this session. Claude will extract structured information
              including scope items, scenarios, KPIs, and more.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              placeholder="Paste transcript here..."
              className="min-h-[300px] font-mono text-sm bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-indigo-400"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>

          <DialogFooter className="border-t border-gray-100 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setExtractDialogOpen(false)
                setTranscript('')
                setExtractingSessionId(null)
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExtract}
              disabled={isExtracting || !transcript.trim()}
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-200/50 disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Extract Items
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
