'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  Rocket,
  Milestone,
  Building2,
  ChevronDown,
  ChevronRight,
  Target,
  MessageSquare,
  Cpu,
  Signature,
  Sparkles,
} from 'lucide-react'
import { startOfISOWeek, setISOWeek, format, getMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type TimelineDE, type TimelineCompany, type TrackerStatus, type RiskLevel } from './gantt-timeline'

interface WeekTimelineProps {
  companies: TimelineCompany[]
  currentWeek: number
  onWeekChange?: (deId: string, startWeek: number, endWeek: number) => Promise<void>
  onPhaseToggle?: (designWeekId: string, phase: number, completed: boolean) => Promise<void>
  className?: string
}

// Design Week phase config
const DW_PHASES = [
  { number: 1, name: 'Kickoff', icon: Target, color: 'text-[#C2703E]', bg: 'bg-[#FDF3EC]' },
  { number: 2, name: 'Process Design', icon: MessageSquare, color: 'text-[#6B8F71]', bg: 'bg-[#EDF4EE]' },
  { number: 3, name: 'Technical', icon: Cpu, color: 'text-orange-600', bg: 'bg-orange-50' },
  { number: 4, name: 'Sign-off', icon: Signature, color: 'text-emerald-600', bg: 'bg-emerald-50' },
]

// Status colors
const STATUS_COLORS: Record<TrackerStatus, { bg: string; bar: string; text: string; label: string }> = {
  ON_TRACK: { bg: 'bg-emerald-50', bar: 'bg-emerald-500', text: 'text-emerald-700', label: 'On Track' },
  ATTENTION: { bg: 'bg-amber-50', bar: 'bg-amber-500', text: 'text-amber-700', label: 'Attention' },
  BLOCKED: { bg: 'bg-red-50', bar: 'bg-red-500', text: 'text-red-700', label: 'Blocked' },
  TO_PLAN: { bg: 'bg-gray-50', bar: 'bg-gray-400', text: 'text-gray-600', label: 'To Plan' },
}

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-red-100 text-red-700',
}

// Generate week labels
function getWeekLabel(week: number, currentWeek: number): string {
  const diff = week - currentWeek
  if (diff === 0) return 'This week'
  if (diff === 1) return 'Next week'
  if (diff === -1) return 'Last week'
  return `W${week}`
}

// Get the Monday date for a given ISO week number
function getWeekMonday(weekNumber: number, year?: number): Date {
  const referenceDate = new Date(year ?? new Date().getFullYear(), 0, 4)
  return startOfISOWeek(setISOWeek(referenceDate, weekNumber))
}

// Format a date as abbreviated month + day (e.g. "Feb 10")
function formatWeekDate(weekNumber: number, year?: number): string {
  const monday = getWeekMonday(weekNumber, year)
  return format(monday, 'MMM d')
}

// Week column header
function WeekHeader({
  week,
  currentWeek,
  isMonthBoundary,
}: {
  week: number
  currentWeek: number
  isMonthBoundary: boolean
}) {
  const isCurrentWeek = week === currentWeek
  const isPast = week < currentWeek
  const dateLabel = formatWeekDate(week)

  return (
    <div
      className={cn(
        'flex-1 min-w-[60px] text-center text-xs font-medium py-1.5 border-r border-gray-200 last:border-r-0',
        isCurrentWeek && 'bg-[#FDF3EC] text-[#C2703E]',
        isPast && 'bg-gray-50 text-gray-400',
        isMonthBoundary && !isCurrentWeek && 'border-l-2 border-l-gray-300'
      )}
    >
      <div>W{week}</div>
      <div className={cn(
        'text-[10px] font-normal',
        isCurrentWeek ? 'text-[#C2703E]/70' : 'text-gray-400'
      )}>
        {isCurrentWeek ? 'today' : dateLabel}
      </div>
    </div>
  )
}

// Timeline bar for a DE — smooth drag with snap-on-release
function TimelineBar({
  de,
  weeksToShow,
  startWeekOffset,
  currentWeek,
  onDragEnd,
}: {
  de: TimelineDE
  weeksToShow: number
  startWeekOffset: number
  currentWeek: number
  onDragEnd?: (deId: string, startWeek: number, endWeek: number) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState<'start' | 'end' | 'move' | null>(null)
  const [rawPixelDelta, setRawPixelDelta] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const rawDeltaRef = useRef(0)
  const dragTypeRef = useRef<'start' | 'end' | 'move' | null>(null)
  const initialStart = useRef(de.startWeek ?? currentWeek)
  const initialEnd = useRef(de.endWeek ?? currentWeek + 8)

  const baseStart = de.startWeek ?? currentWeek
  const baseEnd = de.endWeek ?? currentWeek + 8
  const goLiveWeek = de.goLiveWeek

  // Convert pixels to fractional week delta (smooth, no rounding)
  const pxToWeekDelta = useCallback((px: number): number => {
    if (!containerRef.current) return 0
    return px / (containerRef.current.offsetWidth / weeksToShow)
  }, [weeksToShow])

  // Calculate effective bar position — smooth fractional during drag
  let effectiveStart = baseStart
  let effectiveEnd = baseEnd

  if (isDragging) {
    const fDelta = pxToWeekDelta(rawPixelDelta)
    const iStart = initialStart.current
    const iEnd = initialEnd.current
    const span = iEnd - iStart

    if (dragType === 'move') {
      effectiveStart = iStart + fDelta
      effectiveEnd = iEnd + fDelta
    } else if (dragType === 'start') {
      effectiveStart = iStart + Math.min(fDelta, span - 1)
      effectiveEnd = iEnd
    } else if (dragType === 'end') {
      effectiveStart = iStart
      effectiveEnd = iEnd + Math.max(fDelta, -(span - 1))
    }
  }

  // Snap preview (what week boundaries we'll land on)
  const snappedStart = Math.round(effectiveStart)
  const snappedEnd = Math.round(effectiveEnd)

  // Bar geometry from fractional positions
  const barStart = Math.max(0, effectiveStart - startWeekOffset)
  const barEnd = Math.min(weeksToShow, effectiveEnd - startWeekOffset + 1)
  const barWidth = barEnd - barStart
  const leftPercent = (barStart / weeksToShow) * 100
  const widthPercent = (barWidth / weeksToShow) * 100

  // Go-live marker position
  let goLivePercent: number | null = null
  if (goLiveWeek && goLiveWeek >= startWeekOffset && goLiveWeek <= startWeekOffset + weeksToShow) {
    goLivePercent = ((goLiveWeek - startWeekOffset + 0.5) / weeksToShow) * 100
  }

  const statusConfig = STATUS_COLORS[de.trackerStatus]

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'move') => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setDragType(type)
    dragTypeRef.current = type
    setRawPixelDelta(0)
    rawDeltaRef.current = 0
    dragStartX.current = e.clientX
    initialStart.current = de.startWeek ?? currentWeek
    initialEnd.current = de.endWeek ?? currentWeek + 8
  }, [de.startWeek, de.endWeek, currentWeek])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current
      rawDeltaRef.current = delta
      setRawPixelDelta(delta)
    }

    const handleMouseUp = () => {
      const container = containerRef.current
      if (!container) {
        setIsDragging(false)
        setDragType(null)
        setRawPixelDelta(0)
        rawDeltaRef.current = 0
        return
      }

      const weekWidth = container.offsetWidth / weeksToShow
      const delta = rawDeltaRef.current / weekWidth
      const type = dragTypeRef.current
      const iStart = initialStart.current
      const iEnd = initialEnd.current
      const span = iEnd - iStart

      let newStart: number
      let newEnd: number

      if (type === 'move') {
        const rd = Math.round(delta)
        newStart = iStart + rd
        newEnd = iEnd + rd
      } else if (type === 'start') {
        newStart = iStart + Math.round(Math.min(delta, span - 1))
        newEnd = iEnd
      } else {
        newStart = iStart
        newEnd = iEnd + Math.round(Math.max(delta, -(span - 1)))
      }

      setIsDragging(false)
      setDragType(null)
      setRawPixelDelta(0)
      rawDeltaRef.current = 0

      if (newStart !== iStart || newEnd !== iEnd) {
        onDragEnd?.(de.id, newStart, newEnd)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, weeksToShow, onDragEnd, de.id])

  // Only show bar if it's visible in the current range
  if (barWidth <= 0) {
    return (
      <div ref={containerRef} className="h-8 relative flex items-center justify-center text-xs text-gray-400">
        Out of range
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-8 relative">
      {/* Week grid lines — highlight snap targets during drag */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: weeksToShow }).map((_, i) => {
          const weekNum = i + startWeekOffset
          const isSnapTarget = isDragging && (weekNum === snappedStart || weekNum === snappedEnd)
          return (
            <div
              key={i}
              className={cn(
                'flex-1 border-r border-gray-100 last:border-r-0 transition-colors duration-100',
                weekNum === currentWeek && 'bg-[#FDF3EC]/50',
                isSnapTarget && 'bg-[#C2703E]/10'
              )}
            />
          )
        })}
      </div>

      {/* Timeline bar — smooth positioning during drag, snaps on release */}
      <div
        className={cn(
          'absolute top-1 bottom-1 rounded-md group select-none',
          statusConfig.bar,
          isDragging && 'shadow-lg ring-2 ring-black/10 z-20',
          isDragging && dragType === 'move' && 'cursor-grabbing',
          isDragging && (dragType === 'start' || dragType === 'end') && 'cursor-ew-resize',
          !isDragging && 'cursor-grab hover:shadow-md hover:ring-1 hover:ring-black/5'
        )}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          transition: isDragging ? 'none' : 'left 0.2s ease-out, width 0.2s ease-out, box-shadow 0.15s ease',
        }}
        role="img"
        aria-label={`${de.name}: ${statusConfig.label}, ${de.percentComplete}% complete`}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        {/* Progress fill — DW-specific when in DW, full when complete */}
        <div
          className="absolute inset-0 bg-white/30 rounded-md"
          style={{ width: `${de.currentStage === 'design_week' ? (de.designWeek?.progress ?? de.percentComplete) : 100}%` }}
        />

        {/* DW Phase dots */}
        {de.designWeek && (
          <div className="absolute top-0.5 right-1.5 flex gap-0.5 pointer-events-none z-1">
            {[1, 2, 3, 4].map((phaseNum) => {
              const phaseData = de.designWeek?.phaseCompletions?.find(p => p.phase === phaseNum)
              const isCompleted = phaseData?.completed ?? false
              const isCurrent = de.currentStage === 'design_week' && de.designWeek?.currentPhase === phaseNum
              return (
                <div
                  key={phaseNum}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isCompleted ? 'bg-white' : isCurrent ? 'bg-white/60' : 'bg-white/25'
                  )}
                />
              )
            })}
          </div>
        )}

        {/* Label — shows phase during DW, week range while resizing */}
        <div className="absolute inset-0 flex items-center px-2 overflow-hidden pointer-events-none">
          <span className="text-xs font-medium text-white truncate drop-shadow-sm">
            {isDragging && dragType !== 'move'
              ? `W${snappedStart}\u2013W${snappedEnd}`
              : de.currentStage === 'design_week' && de.designWeek
                ? `${DW_PHASES[(de.designWeek.currentPhase || 1) - 1]?.name ?? 'DW'} \u00b7 ${de.designWeek.progress ?? de.percentComplete}%`
                : de.currentStage !== 'design_week'
                  ? 'DW Complete'
                  : `${de.percentComplete}%`}
          </span>
        </div>

        {/* Left drag handle — wider hit zone, pill indicator */}
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center z-10 rounded-l-md transition-colors',
            isDragging && dragType === 'start'
              ? 'bg-black/20'
              : 'opacity-0 group-hover:opacity-100 hover:bg-black/15'
          )}
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
          <div className="w-0.5 h-3 bg-white/80 rounded-full" />
        </div>

        {/* Right drag handle — wider hit zone, pill indicator */}
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center z-10 rounded-r-md transition-colors',
            isDragging && dragType === 'end'
              ? 'bg-black/20'
              : 'opacity-0 group-hover:opacity-100 hover:bg-black/15'
          )}
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
          <div className="w-0.5 h-3 bg-white/80 rounded-full" />
        </div>
      </div>

      {/* Floating tooltip showing target week range while dragging */}
      {isDragging && (
        <div
          className="absolute -top-7 z-30 bg-gray-900 text-white text-[10px] font-medium px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none"
          style={{
            left: `${leftPercent + widthPercent / 2}%`,
            transform: 'translateX(-50%)',
          }}
        >
          W{snappedStart} → W{snappedEnd}
        </div>
      )}

      {/* Go-live marker */}
      {goLivePercent !== null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#C2703E] z-10"
              style={{ left: `${goLivePercent}%` }}
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-[#C2703E] rounded-full flex items-center justify-center">
                <Rocket className="w-2 h-2 text-white" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Go-live: Week {goLiveWeek}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

// Configuration/Build bar — non-draggable, appears when past Design Week
function ConfigurationBar({
  de,
  weeksToShow,
  startWeekOffset,
  currentWeek,
}: {
  de: TimelineDE
  weeksToShow: number
  startWeekOffset: number
  currentWeek: number
}) {
  const startWeek = de.startWeek ?? currentWeek
  const endWeek = de.endWeek ?? currentWeek + 8

  const barStart = Math.max(0, startWeek - startWeekOffset)
  const barEnd = Math.min(weeksToShow, endWeek - startWeekOffset + 1)
  const barWidth = barEnd - barStart

  if (barWidth <= 0) return null

  const leftPercent = (barStart / weeksToShow) * 100
  const widthPercent = (barWidth / weeksToShow) * 100

  // Estimate config-specific progress
  // DW phases (KICKOFF + DESIGN_WEEK) = 2/8 = 25% of total journey
  // ONBOARDING phase = 1/8 = 12.5% of total
  const configProgress = de.currentStage === 'configuration'
    ? Math.max(0, Math.min(100, Math.round(((de.percentComplete - 25) / 12.5) * 100)))
    : 100

  const stageLabel = de.currentStage === 'configuration'
    ? 'Configuration'
    : de.currentStage === 'uat'
      ? 'UAT'
      : de.currentStage === 'live'
        ? 'Live'
        : 'Build'

  const stageColor = de.currentStage === 'uat'
    ? 'bg-amber-500'
    : de.currentStage === 'live'
      ? 'bg-emerald-500'
      : 'bg-[#6B8F71]'

  return (
    <div className="h-6 relative mt-0.5">
      {/* Week grid lines */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: weeksToShow }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 border-r border-gray-100 last:border-r-0',
              i + startWeekOffset === currentWeek && 'bg-[#FDF3EC]/50'
            )}
          />
        ))}
      </div>

      {/* Stage bar */}
      <div
        className={cn('absolute top-0.5 bottom-0.5 rounded-md', stageColor)}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          transition: 'left 0.2s ease-out, width 0.2s ease-out',
        }}
      >
        <div
          className="absolute inset-0 bg-white/25 rounded-md"
          style={{ width: `${configProgress}%` }}
        />
        <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
          <span className="text-[10px] font-medium text-white truncate drop-shadow-sm">
            {stageLabel}{configProgress < 100 ? ` \u00b7 ${configProgress}%` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

// Phase checkboxes row (expandable under DE)
function PhaseCheckboxes({
  de,
  onPhaseToggle,
}: {
  de: TimelineDE
  onPhaseToggle?: (designWeekId: string, phase: number, completed: boolean) => void
}) {
  const phases = de.designWeek?.phaseCompletions || []

  if (!de.designWeek) {
    return (
      <div className="px-4 py-2 bg-gray-50/50 text-xs text-gray-400 border-b border-gray-100">
        No Design Week linked
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50/80 border-b border-gray-100">
      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide w-20 flex-shrink-0">
        DW Phases
      </span>
      <div className="flex items-center gap-4">
        {DW_PHASES.map(phaseConfig => {
          const phaseData = phases.find(p => p.phase === phaseConfig.number)
          const isCompleted = phaseData?.completed ?? false
          const isAuto = phaseData?.autoCompleted ?? false
          const isManual = phaseData?.manuallyCompleted ?? false
          const Icon = phaseConfig.icon

          return (
            <Tooltip key={phaseConfig.number}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (!onPhaseToggle || !de.designWeek) return
                    // If auto-completed, don't allow unchecking
                    if (isAuto && !isManual) return
                    onPhaseToggle(de.designWeek.id, phaseConfig.number, !isCompleted)
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all',
                    isCompleted
                      ? `${phaseConfig.bg} ${phaseConfig.color}`
                      : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300',
                    isAuto && !isManual && 'cursor-default',
                    !isAuto && !isManual && 'cursor-pointer hover:shadow-sm'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-3.5 h-3.5" />
                  )}
                  <Icon className="w-3 h-3" />
                  <span>{phaseConfig.name}</span>
                  {isAuto && (
                    <Sparkles className="w-2.5 h-2.5 opacity-60" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {phaseConfig.name}:{' '}
                  {isAuto && isManual
                    ? 'Auto-detected & manually confirmed'
                    : isAuto
                    ? 'Auto-detected from upload'
                    : isManual
                    ? 'Manually checked off'
                    : 'Not yet completed - click to mark done'}
                </p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <div className="ml-auto text-[10px] text-gray-400">
        {phases.filter(p => p.completed).length}/4 phases
      </div>
    </div>
  )
}

// DE row in week timeline
function DERow({
  de,
  weeksToShow,
  startWeekOffset,
  currentWeek,
  onWeekChange,
  onPhaseToggle,
}: {
  de: TimelineDE
  weeksToShow: number
  startWeekOffset: number
  currentWeek: number
  onWeekChange?: (deId: string, startWeek: number, endWeek: number) => void
  onPhaseToggle?: (designWeekId: string, phase: number, completed: boolean) => void
}) {
  const [showPhases, setShowPhases] = useState(false)
  const statusConfig = STATUS_COLORS[de.trackerStatus]

  return (
    <div>
      <div
        className={cn(
          'flex items-center border-b border-gray-100 hover:bg-gray-50/50 transition-colors',
          statusConfig.bg
        )}
      >
        {/* DE info column */}
        <div className="w-64 flex-shrink-0 px-3 py-2 border-r border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPhases(!showPhases)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              {showPhases ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
            <Link
              href={`/companies/${de.company.id}/digital-employees/${de.id}`}
              className="group min-w-0 flex-1"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.bar)}
                  aria-label={`Status: ${statusConfig.label}`}
                  role="img"
                />
                <span className="font-medium text-sm text-gray-900 group-hover:text-[#C2703E] truncate">
                  {de.name}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate pl-4">
                {de.company.name}
              </div>
              {de.blocker && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 mt-1 pl-4 max-w-full">
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{de.blocker}</span>
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[300px]">
                    <p className="text-xs font-medium mb-1">Blocker:</p>
                    <p className="text-xs">{de.blocker}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </Link>
          </div>
        </div>

        {/* Status column */}
        <div className="w-24 shrink-0 px-2 py-2 border-r border-gray-200">
          <div className="flex items-center gap-1">
            <Badge
              variant="secondary"
              className={cn('text-[10px] px-1.5', RISK_COLORS[de.riskLevel])}
            >
              {de.riskLevel}
            </Badge>
            {de.blocker && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs font-medium mb-1">Blocker:</p>
                  <p className="text-xs">{de.blocker}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {/* Completion percentage */}
          <div className="mt-1 flex items-center gap-1">
            <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  de.percentComplete >= 75 ? 'bg-emerald-500' :
                  de.percentComplete >= 40 ? 'bg-amber-500' :
                  'bg-gray-400'
                )}
                style={{ width: `${de.percentComplete}%` }}
              />
            </div>
            <span className="text-[9px] font-medium text-gray-500 w-7 text-right">{de.percentComplete}%</span>
          </div>
        </div>

        {/* Timeline column */}
        <div className="flex-1">
          <TimelineBar
            de={de}
            weeksToShow={weeksToShow}
            startWeekOffset={startWeekOffset}
            currentWeek={currentWeek}
            onDragEnd={onWeekChange}
          />
          {de.currentStage !== 'design_week' && (
            <ConfigurationBar
              de={de}
              weeksToShow={weeksToShow}
              startWeekOffset={startWeekOffset}
              currentWeek={currentWeek}
            />
          )}
        </div>
      </div>

      {/* Expandable phase checkboxes */}
      {showPhases && (
        <PhaseCheckboxes de={de} onPhaseToggle={onPhaseToggle} />
      )}
    </div>
  )
}

// Company group
function CompanyGroup({
  company,
  weeksToShow,
  startWeekOffset,
  currentWeek,
  onWeekChange,
  onPhaseToggle,
  defaultExpanded = true,
}: {
  company: TimelineCompany
  weeksToShow: number
  startWeekOffset: number
  currentWeek: number
  onWeekChange?: (deId: string, startWeek: number, endWeek: number) => void
  onPhaseToggle?: (designWeekId: string, phase: number, completed: boolean) => void
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Calculate company stats
  const stats = {
    total: company.digitalEmployees.length,
    blocked: company.digitalEmployees.filter(de => de.trackerStatus === 'BLOCKED').length,
    attention: company.digitalEmployees.filter(de => de.trackerStatus === 'ATTENTION').length,
    onTrack: company.digitalEmployees.filter(de => de.trackerStatus === 'ON_TRACK').length,
  }

  // Average completion across all DEs in this company
  const avgCompletion = company.digitalEmployees.length > 0
    ? Math.round(company.digitalEmployees.reduce((sum, de) => sum + de.percentComplete, 0) / company.digitalEmployees.length)
    : 0

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white mb-3">
      {/* Company header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="font-semibold text-gray-900">{company.name}</span>
          <Badge variant="secondary" className="text-xs">
            {stats.total} DE{stats.total !== 1 ? 's' : ''}
          </Badge>
          {/* Average completion pill */}
          <span className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
            avgCompletion >= 75 ? 'bg-emerald-100 text-emerald-700' :
            avgCompletion >= 40 ? 'bg-amber-100 text-amber-700' :
            'bg-gray-100 text-gray-600'
          )}>
            {avgCompletion}% avg
          </span>
        </div>
        <div className="flex items-center gap-2">
          {stats.blocked > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-medium"
                  aria-label={`${stats.blocked} blocked`}
                >
                  {stats.blocked}
                </span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{stats.blocked} Blocked</p></TooltipContent>
            </Tooltip>
          )}
          {stats.attention > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium"
                  aria-label={`${stats.attention} attention`}
                >
                  {stats.attention}
                </span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{stats.attention} Attention</p></TooltipContent>
            </Tooltip>
          )}
          {stats.onTrack > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"
                  aria-label={`${stats.onTrack} on track`}
                >
                  {stats.onTrack}
                </span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{stats.onTrack} On Track</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </button>

      {/* DE rows */}
      {expanded && (
        <div>
          {company.digitalEmployees.map(de => (
            <DERow
              key={de.id}
              de={de}
              weeksToShow={weeksToShow}
              startWeekOffset={startWeekOffset}
              currentWeek={currentWeek}
              onWeekChange={onWeekChange}
              onPhaseToggle={onPhaseToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Legend
function TimelineLegend() {
  return (
    <div className="flex items-center gap-6 text-xs text-gray-600 px-4 py-2 bg-gray-50 rounded-lg mb-4">
      <span className="font-medium text-gray-700">Status:</span>
      {Object.entries(STATUS_COLORS).map(([status, config]) => (
        <div key={status} className="flex items-center gap-1.5">
          <div className={cn('w-3 h-3 rounded-sm', config.bar)} />
          <span>{status.replace('_', ' ')}</span>
        </div>
      ))}
      <span className="text-gray-300">|</span>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-0.5 bg-[#C2703E]" />
        <Rocket className="w-3 h-3 text-[#C2703E]" />
        <span>Go-live</span>
      </div>
    </div>
  )
}

export function WeekTimeline({
  companies,
  currentWeek,
  onWeekChange,
  onPhaseToggle,
  className,
}: WeekTimelineProps) {
  const weeksToShow = 12
  const startWeekOffset = currentWeek - 2 // Show 2 weeks before current

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Milestone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No Digital Employees to display</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <TimelineLegend />

      {/* Timeline header */}
      <div className="flex items-center border border-gray-200 rounded-t-lg bg-gray-50 overflow-hidden">
        <div className="w-64 flex-shrink-0 px-3 py-2 border-r border-gray-200 text-xs font-medium text-gray-600">
          Digital Employee
        </div>
        <div className="w-24 flex-shrink-0 px-2 py-2 border-r border-gray-200 text-xs font-medium text-gray-600">
          Risk
        </div>
        <div className="flex-1 flex">
          {Array.from({ length: weeksToShow }).map((_, i) => {
            const week = startWeekOffset + i
            const isMonthBoundary = i > 0 && getMonth(getWeekMonday(week)) !== getMonth(getWeekMonday(week - 1))
            return (
              <WeekHeader
                key={i}
                week={week}
                currentWeek={currentWeek}
                isMonthBoundary={isMonthBoundary}
              />
            )
          })}
        </div>
      </div>

      {/* Company groups */}
      <div className="space-y-0">
        {companies.map(company => (
          <CompanyGroup
            key={company.id}
            company={company}
            weeksToShow={weeksToShow}
            startWeekOffset={startWeekOffset}
            currentWeek={currentWeek}
            onWeekChange={onWeekChange}
            onPhaseToggle={onPhaseToggle}
          />
        ))}
      </div>
    </div>
  )
}
