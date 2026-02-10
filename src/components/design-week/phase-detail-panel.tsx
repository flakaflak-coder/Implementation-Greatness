'use client'

import { cn } from '@/lib/utils'
import {
  Upload,
  FileAudio,
  Sparkles,
  Target,
  MessageSquare,
  Cpu,
  Signature,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionCard, ProcessingStatus } from './session-card'

export interface Session {
  id: string
  sessionNumber: number
  date: string
  duration?: string
  status: ProcessingStatus
  extractedCount?: number
  unresolvedCount?: number
  topicsCovered?: string[]
}

export interface PhaseDetailPanelProps {
  phaseNumber: number
  phaseName: string
  description: string
  expectedSessions: number
  sessions: Session[]
  standardQuestions: string[]
  selectedSessionId?: string
  onSessionSelect?: (sessionId: string) => void
  onUpload?: () => void
  onExtract?: (sessionId: string) => void
  className?: string
}

const phaseConfig = {
  1: { icon: Target, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  2: { icon: MessageSquare, gradient: 'from-[#C2703E] to-[#A05A32]', bg: 'bg-[#FDF3EC]', text: 'text-[#C2703E]', border: 'border-[#E8D5C4]' },
  3: { icon: Cpu, gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  4: { icon: Signature, gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
}

export function PhaseDetailPanel({
  phaseNumber,
  phaseName,
  description,
  expectedSessions,
  sessions,
  standardQuestions,
  selectedSessionId,
  onSessionSelect,
  onUpload,
  onExtract,
  className,
}: PhaseDetailPanelProps) {
  const config = phaseConfig[phaseNumber as keyof typeof phaseConfig] || phaseConfig[1]
  const PhaseIcon = config.icon
  const completedSessions = sessions.filter(s => s.status === 'complete').length
  const progress = expectedSessions > 0 ? (completedSessions / expectedSessions) * 100 : 0

  return (
    <div className={cn('space-y-6', className)}>
      {/* Phase header card */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm">
        {/* Gradient accent bar */}
        <div className={cn('h-1.5 bg-gradient-to-r', config.gradient)} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center',
                  'bg-gradient-to-br shadow-lg',
                  config.gradient
                )}
              >
                <PhaseIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('text-xs font-bold uppercase tracking-wide', config.text)}>
                    Phase {phaseNumber}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs font-medium text-gray-500">
                    {sessions.length}/{expectedSessions} sessions
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{phaseName}</h2>
              </div>
            </div>
            <Button
              onClick={onUpload}
              className="bg-[#C2703E] hover:bg-[#A05A32] text-white shadow-lg shadow-[#C2703E]/15"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Session
            </Button>
          </div>

          <p className="text-gray-600 mb-5">{description}</p>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-500">Session progress</span>
              <span className="font-bold text-gray-900">
                {completedSessions}/{expectedSessions} complete
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', config.gradient)}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sessions grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Sessions</h3>
        </div>

        {sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                id={session.id}
                sessionNumber={session.sessionNumber}
                phaseName={phaseName}
                date={session.date}
                duration={session.duration}
                status={session.status}
                extractedCount={session.extractedCount}
                unresolvedCount={session.unresolvedCount}
                topicsCovered={session.topicsCovered}
                isSelected={selectedSessionId === session.id}
                onSelect={() => onSessionSelect?.(session.id)}
                onExtract={() => onExtract?.(session.id)}
              />
            ))}

            {/* Add session card */}
            {sessions.length < expectedSessions && (
              <button
                onClick={onUpload}
                className={cn(
                  'rounded-xl border-2 border-dashed border-gray-300 p-6',
                  'flex flex-col items-center justify-center gap-3',
                  'text-gray-400 hover:text-gray-600 hover:border-gray-400 hover:bg-gray-50',
                  'transition-all duration-200 min-h-[180px]'
                )}
              >
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <Plus className="w-7 h-7" />
                </div>
                <span className="font-semibold">Add Session {sessions.length + 1}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center bg-gray-50/50">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileAudio className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">
              No sessions yet
            </h4>
            <p className="text-gray-500 mb-5">
              Upload your first recording to start extracting information
            </p>
            <Button
              onClick={onUpload}
              className="bg-[#C2703E] hover:bg-[#A05A32] text-white shadow-lg shadow-[#C2703E]/15"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Session
            </Button>
          </div>
        )}
      </div>

      {/* Standard questions for this phase */}
      <div className={cn('rounded-2xl border p-6', config.bg, config.border)}>
        <div className="flex items-center gap-2 mb-4">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br', config.gradient)}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-gray-900">Questions to Cover</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {standardQuestions.map((question, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-200 shadow-sm"
            >
              <ArrowRight className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.text)} />
              <span className="text-sm text-gray-700">{question}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
