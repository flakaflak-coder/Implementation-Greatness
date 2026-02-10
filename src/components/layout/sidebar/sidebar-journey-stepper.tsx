'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Check, Circle, ArrowLeft } from 'lucide-react'
import * as Icons from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/providers/sidebar-provider'
import { JOURNEY_PHASES } from '@/lib/journey-phases'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface JourneyPhase {
  id: string
  phaseType: string
  status: string
  order: number
}

interface SidebarJourneyStepperProps {
  phases: JourneyPhase[]
  currentPhase: string
  companyId: string
  digitalEmployeeId: string
  designWeekPhase?: number
}

function getPhaseStatus(phase: JourneyPhase | undefined) {
  if (!phase) return 'NOT_STARTED'
  return phase.status
}

function getPhaseUrl(
  phaseType: string,
  companyId: string,
  digitalEmployeeId: string
) {
  const baseUrl = `/companies/${companyId}/digital-employees/${digitalEmployeeId}`
  const phaseMap: Record<string, string> = {
    SALES_HANDOVER: 'sales-handover',
    KICKOFF: 'kickoff',
    DESIGN_WEEK: 'design-week',
    ONBOARDING: 'onboarding',
    UAT: 'uat',
    GO_LIVE: 'go-live',
    HYPERCARE: 'hypercare',
    HANDOVER_TO_SUPPORT: 'handover',
  }
  return `${baseUrl}/${phaseMap[phaseType] || phaseType.toLowerCase()}`
}

export function SidebarJourneyStepper({
  phases,
  currentPhase,
  companyId,
  digitalEmployeeId,
  designWeekPhase = 1,
}: SidebarJourneyStepperProps) {
  const pathname = usePathname()
  const { isCollapsed } = useSidebar()

  const phaseMap = phases.reduce(
    (acc, phase) => {
      acc[phase.phaseType] = phase
      return acc
    },
    {} as Record<string, JourneyPhase>
  )

  const completedCount = phases.filter((p) => p.status === 'COMPLETE').length
  const progressPercent = Math.round((completedCount / JOURNEY_PHASES.length) * 100)

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/companies"
              aria-label="Back to Companies"
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
            Back to Companies
          </TooltipContent>
        </Tooltip>

        {JOURNEY_PHASES.map((phase) => {
          const status = getPhaseStatus(phaseMap[phase.type])
          const isActive = currentPhase === phase.type
          const url = getPhaseUrl(phase.type, companyId, digitalEmployeeId)
          const IconComponent = Icons[phase.icon as keyof typeof Icons] as React.ComponentType<{
            className?: string
          }>

          return (
            <Tooltip key={phase.type}>
              <TooltipTrigger asChild>
                <Link
                  href={url}
                  aria-label={`${phase.label} - ${status.replace('_', ' ')}`}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200',
                    status === 'COMPLETE' && 'bg-emerald-50 text-emerald-600',
                    isActive && status !== 'COMPLETE' && 'bg-[#FDF3EC] text-[#C2703E] shadow-sm',
                    status === 'NOT_STARTED' && !isActive && 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                  )}
                >
                  {status === 'COMPLETE' ? (
                    <Check className="h-4 w-4" />
                  ) : IconComponent ? (
                    <IconComponent className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white border-gray-800">
                <div>
                  <p className="font-medium">{phase.label}</p>
                  <p className="text-xs text-gray-400">{status.replace('_', ' ')}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Link
        href="/companies"
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Companies
      </Link>

      {/* Section label */}
      <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Journey Phases
      </p>

      {/* Phase list */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gray-200" />

        <div className="space-y-1">
          {JOURNEY_PHASES.map((phase) => {
            const status = getPhaseStatus(phaseMap[phase.type])
            const isActive = currentPhase === phase.type
            const url = getPhaseUrl(phase.type, companyId, digitalEmployeeId)
            const isCurrentPath = pathname.includes(url.split('/').pop() || '')
            const IconComponent = Icons[phase.icon as keyof typeof Icons] as React.ComponentType<{
              className?: string
            }>

            const hasSubPhases = 'hasSubPhases' in phase && phase.hasSubPhases

            const stepContent = (
              <div
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 relative',
                  isCurrentPath && 'bg-[#FDF3EC]',
                  !isCurrentPath && 'hover:bg-gray-100'
                )}
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white flex-shrink-0',
                    status === 'COMPLETE' && 'border-emerald-500 bg-emerald-500',
                    status === 'IN_PROGRESS' && 'border-[#C2703E]',
                    status === 'BLOCKED' && 'border-red-500',
                    status === 'NOT_STARTED' && 'border-gray-300',
                    isActive && status !== 'COMPLETE' && 'border-[#C2703E] ring-2 ring-[#F5E6DA] shadow-sm'
                  )}
                >
                  {status === 'COMPLETE' ? (
                    <Check className="h-3 w-3 text-white" />
                  ) : IconComponent ? (
                    <IconComponent
                      className={cn(
                        'h-3 w-3',
                        status === 'IN_PROGRESS' && 'text-[#C2703E]',
                        status === 'BLOCKED' && 'text-red-500',
                        status === 'NOT_STARTED' && 'text-gray-400'
                      )}
                    />
                  ) : (
                    <Circle className="h-3 w-3 text-gray-400" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'font-medium',
                    status === 'COMPLETE' && 'text-emerald-600',
                    isActive && status !== 'COMPLETE' && 'text-[#C2703E]',
                    status === 'NOT_STARTED' && !isActive && 'text-gray-500'
                  )}
                >
                  {phase.label}
                </span>
              </div>
            )

            if (hasSubPhases && 'subPhases' in phase) {
              return (
                <Collapsible key={phase.type} defaultOpen={isActive || isCurrentPath}>
                  <CollapsibleTrigger asChild>
                    <Link href={url}>{stepContent}</Link>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-9 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
                      {phase.subPhases.map((subPhase) => {
                        const isSubPhaseComplete = designWeekPhase > subPhase.order
                        const isSubPhaseCurrent = designWeekPhase === subPhase.order
                        const subPhaseUrl = `${url}/${subPhase.label.toLowerCase().replace(/\s+/g, '-')}`

                        return (
                          <Link
                            key={subPhase.order}
                            href={subPhaseUrl}
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                              pathname.includes(subPhaseUrl) && 'bg-[#FDF3EC]',
                              !pathname.includes(subPhaseUrl) && 'hover:bg-gray-100'
                            )}
                          >
                            <div
                              className={cn(
                                'h-2 w-2 rounded-full',
                                isSubPhaseComplete && 'bg-emerald-500',
                                isSubPhaseCurrent && 'bg-[#FDF3EC]0 shadow-sm',
                                !isSubPhaseComplete && !isSubPhaseCurrent && 'bg-gray-300'
                              )}
                            />
                            <span
                              className={cn(
                                isSubPhaseComplete && 'text-emerald-600',
                                isSubPhaseCurrent && 'text-[#C2703E]',
                                !isSubPhaseComplete && !isSubPhaseCurrent && 'text-gray-500'
                              )}
                            >
                              {subPhase.label}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            }

            return (
              <Link key={phase.type} href={url}>
                {stepContent}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-3 pt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Journey Progress</span>
          <span className="text-[#C2703E] font-medium">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C2703E] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
