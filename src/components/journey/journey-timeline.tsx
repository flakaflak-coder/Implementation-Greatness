'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Rocket,
  FileCheck,
  Cog,
  TestTube,
  Zap,
  Heart,
  Headphones,
  Handshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// Type for journey phase
interface JourneyPhase {
  id: string
  label: string
  icon: LucideIcon
  description: string
  subPhases?: { id: number; label: string; description: string }[]
}

// Journey phase configuration
const JOURNEY_PHASES: JourneyPhase[] = [
  {
    id: 'SALES_HANDOVER',
    label: 'Sales Handover',
    icon: Handshake,
    description: 'Initial client information transfer',
  },
  {
    id: 'KICKOFF',
    label: 'Kickoff',
    icon: Rocket,
    description: 'Project initiation and alignment',
  },
  {
    id: 'DESIGN_WEEK',
    label: 'Design Week',
    icon: FileCheck,
    description: 'Requirements gathering and design',
    subPhases: [
      { id: 1, label: 'Kickoff', description: 'Goals, stakeholders, success metrics' },
      { id: 2, label: 'Process Design', description: 'Happy path, exceptions, scope' },
      { id: 3, label: 'Technical', description: 'Systems, integrations, data' },
      { id: 4, label: 'Sign-off', description: 'Final confirmations, go/no-go' },
    ],
  },
  {
    id: 'ONBOARDING',
    label: 'Onboarding',
    icon: Cog,
    description: 'Configuration and setup',
  },
  {
    id: 'UAT',
    label: 'UAT',
    icon: TestTube,
    description: 'User acceptance testing',
  },
  {
    id: 'GO_LIVE',
    label: 'Go Live',
    icon: Zap,
    description: 'Production deployment',
  },
  {
    id: 'HYPERCARE',
    label: 'Hypercare',
    icon: Heart,
    description: 'Intensive support period',
  },
  {
    id: 'HANDOVER_TO_SUPPORT',
    label: 'Handover to Support',
    icon: Headphones,
    description: 'Transition to BAU support',
  },
]

type PhaseStatus = 'complete' | 'current' | 'upcoming' | 'locked' | 'blocked'

interface SubPhaseProgress {
  id: number
  status: PhaseStatus
  sessionsCompleted: number
  sessionsTotal: number
  hasBlockers?: boolean
}

interface PhaseProgress {
  id: string
  status: PhaseStatus
  subPhases?: SubPhaseProgress[]
  completionPercentage?: number
  hasBlockers?: boolean
  blockerMessage?: string
}

interface JourneyTimelineProps {
  currentPhase: string
  phases: PhaseProgress[]
  designWeekPhase?: number
  onPhaseClick?: (phaseId: string) => void
  onSubPhaseClick?: (phaseId: string, subPhaseId: number) => void
  compact?: boolean
}

export function JourneyTimeline({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentPhase,
  phases,
  designWeekPhase = 1,
  onPhaseClick,
  onSubPhaseClick,
  compact = false,
}: JourneyTimelineProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(['DESIGN_WEEK']) // Design Week expanded by default
  )

  const toggleExpand = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  const getPhaseProgress = (phaseId: string): PhaseProgress | undefined => {
    return phases.find((p) => p.id === phaseId)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusIcon = (status: PhaseStatus, hasBlocker?: boolean) => {
    if (hasBlocker) {
      return <AlertCircle className="w-5 h-5 text-amber-500" />
    }
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      case 'current':
        return (
          <div className="relative">
            <Circle className="w-5 h-5 text-cosmic-purple fill-cosmic-purple" />
            <div className="absolute inset-0 animate-ping">
              <Circle className="w-5 h-5 text-cosmic-purple/50" />
            </div>
          </div>
        )
      case 'blocked':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'locked':
        return <Lock className="w-4 h-4 text-space-500" />
      default:
        return <Circle className="w-5 h-5 text-space-500" />
    }
  }

  const getConnectorClass = (status: PhaseStatus) => {
    switch (status) {
      case 'complete':
        return 'bg-emerald-500'
      case 'current':
        return 'bg-gradient-to-b from-cosmic-purple to-space-500'
      default:
        return 'bg-space-600'
    }
  }

  return (
    <div className={cn('relative', compact ? 'space-y-1' : 'space-y-0')}>
      {JOURNEY_PHASES.map((phase, index) => {
        const progress = getPhaseProgress(phase.id)
        const status = progress?.status || 'locked'
        const isExpanded = expandedPhases.has(phase.id)
        const hasSubPhases = 'subPhases' in phase && phase.subPhases && phase.subPhases.length > 0
        const isClickable = status !== 'locked' && onPhaseClick
        const Icon = phase.icon

        return (
          <div key={phase.id} className="relative">
            {/* Connector line */}
            {index < JOURNEY_PHASES.length - 1 && (
              <div
                className={cn(
                  'absolute left-[19px] top-10 w-0.5 transition-all duration-300',
                  getConnectorClass(status),
                  isExpanded && hasSubPhases ? 'h-[calc(100%-2.5rem)]' : 'h-8'
                )}
              />
            )}

            {/* Phase item */}
            <div
              className={cn(
                'relative flex items-start gap-3 p-2 rounded-lg transition-all',
                isClickable && 'cursor-pointer hover:bg-space-700/50',
                status === 'current' && 'bg-cosmic-purple/10 border border-cosmic-purple/30',
                compact && 'py-1.5'
              )}
              onClick={() => {
                if (hasSubPhases) {
                  toggleExpand(phase.id)
                } else if (isClickable) {
                  onPhaseClick(phase.id)
                }
              }}
            >
              {/* Status indicator */}
              <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-space-700 border-2 border-space-500 shrink-0">
                {status === 'current' ? (
                  <Icon className="w-5 h-5 text-cosmic-purple" />
                ) : status === 'complete' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : status === 'locked' ? (
                  <Lock className="w-4 h-4 text-space-500" />
                ) : (
                  <Icon className="w-5 h-5 text-space-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-medium truncate',
                      status === 'current' && 'text-cosmic-purple',
                      status === 'complete' && 'text-space-100',
                      status === 'upcoming' && 'text-space-300',
                      status === 'locked' && 'text-space-500'
                    )}
                  >
                    {phase.label}
                  </span>

                  {/* Expand indicator */}
                  {hasSubPhases && (
                    <button className="p-0.5 hover:bg-space-600 rounded">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-space-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-space-400" />
                      )}
                    </button>
                  )}

                  {/* Status badge */}
                  {status === 'current' && progress?.completionPercentage !== undefined && (
                    <span className="text-xs font-medium text-cosmic-purple bg-cosmic-purple/20 px-1.5 py-0.5 rounded">
                      {progress.completionPercentage}%
                    </span>
                  )}

                  {/* Blocker indicator */}
                  {progress?.hasBlockers && (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                </div>

                {!compact && (
                  <p
                    className={cn(
                      'text-xs mt-0.5 truncate',
                      status === 'locked' ? 'text-space-600' : 'text-space-400'
                    )}
                  >
                    {progress?.blockerMessage || phase.description}
                  </p>
                )}
              </div>
            </div>

            {/* Sub-phases for Design Week */}
            {hasSubPhases && isExpanded && (
              <div className="ml-5 pl-7 border-l-2 border-space-600 mt-1 space-y-1">
                {phase.subPhases?.map((subPhase) => {
                  const subProgress = progress?.subPhases?.find((sp) => sp.id === subPhase.id)
                  const subStatus = subProgress?.status || 'upcoming'
                  const isCurrent = subPhase.id === designWeekPhase && status === 'current'

                  return (
                    <div
                      key={subPhase.id}
                      className={cn(
                        'relative flex items-center gap-3 p-2 rounded-lg transition-all',
                        isCurrent && 'bg-cosmic-purple/10 border border-cosmic-purple/20',
                        onSubPhaseClick && subStatus !== 'locked' && 'cursor-pointer hover:bg-space-700/30'
                      )}
                      onClick={() => {
                        if (onSubPhaseClick && subStatus !== 'locked') {
                          onSubPhaseClick(phase.id, subPhase.id)
                        }
                      }}
                    >
                      {/* Sub-phase indicator */}
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                          subStatus === 'complete' && 'bg-emerald-500/20 text-emerald-500',
                          isCurrent && 'bg-cosmic-purple text-white',
                          subStatus === 'upcoming' && 'bg-space-600 text-space-400',
                          subStatus === 'locked' && 'bg-space-700 text-space-600'
                        )}
                      >
                        {subStatus === 'complete' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          `P${subPhase.id}`
                        )}
                      </div>

                      {/* Sub-phase content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm truncate',
                              isCurrent && 'text-cosmic-purple font-medium',
                              subStatus === 'complete' && 'text-space-200',
                              subStatus === 'upcoming' && 'text-space-400',
                              subStatus === 'locked' && 'text-space-600'
                            )}
                          >
                            {subPhase.label}
                          </span>

                          {/* Session progress */}
                          {subProgress && (
                            <span className="text-xs text-space-500">
                              {subProgress.sessionsCompleted}/{subProgress.sessionsTotal} sessions
                            </span>
                          )}

                          {/* Sub-phase blocker */}
                          {subProgress?.hasBlockers && (
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                          )}
                        </div>

                        {!compact && (
                          <p className="text-xs text-space-500 truncate">{subPhase.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
