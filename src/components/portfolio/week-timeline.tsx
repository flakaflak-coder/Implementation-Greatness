'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  GripVertical,
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
const STATUS_COLORS: Record<TrackerStatus, { bg: string; bar: string; text: string }> = {
  ON_TRACK: { bg: 'bg-emerald-50', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  ATTENTION: { bg: 'bg-amber-50', bar: 'bg-amber-500', text: 'text-amber-700' },
  BLOCKED: { bg: 'bg-red-50', bar: 'bg-red-500', text: 'text-red-700' },
  TO_PLAN: { bg: 'bg-gray-50', bar: 'bg-gray-400', text: 'text-gray-600' },
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

// Week column header
function WeekHeader({ week, currentWeek }: { week: number; currentWeek: number }) {
  const isCurrentWeek = week === currentWeek
  const isPast = week < currentWeek

  return (
    <div
      className={cn(
        'flex-1 min-w-[60px] text-center text-xs font-medium py-2 border-r border-gray-200 last:border-r-0',
        isCurrentWeek && 'bg-[#FDF3EC] text-[#C2703E]',
        isPast && 'bg-gray-50 text-gray-400'
      )}
    >
      W{week}
      {isCurrentWeek && <div className="text-[10px] font-normal">today</div>}
    </div>
  )
}

// Timeline bar for a DE with drag-and-drop
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
  const [dragOffset, setDragOffset] = useState({ start: 0, end: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef<number>(0)
  const initialStart = useRef<number>(de.startWeek ?? currentWeek)
  const initialEnd = useRef<number>(de.endWeek ?? currentWeek + 8)

  const startWeek = (de.startWeek ?? currentWeek) + dragOffset.start
  const endWeek = (de.endWeek ?? currentWeek + 8) + dragOffset.end
  const goLiveWeek = de.goLiveWeek

  // Calculate position and width
  const barStart = Math.max(0, startWeek - startWeekOffset)
  const barEnd = Math.min(weeksToShow, endWeek - startWeekOffset + 1)
  const barWidth = barEnd - barStart

  const leftPercent = (barStart / weeksToShow) * 100
  const widthPercent = (barWidth / weeksToShow) * 100

  // Calculate go-live marker position
  let goLivePercent: number | null = null
  if (goLiveWeek && goLiveWeek >= startWeekOffset && goLiveWeek <= startWeekOffset + weeksToShow) {
    goLivePercent = ((goLiveWeek - startWeekOffset + 0.5) / weeksToShow) * 100
  }

  const statusConfig = STATUS_COLORS[de.trackerStatus]

  // Convert pixel delta to week delta
  const pixelsToWeeks = useCallback((px: number): number => {
    if (!containerRef.current) return 0
    const containerWidth = containerRef.current.offsetWidth
    const weekWidth = containerWidth / weeksToShow
    return Math.round(px / weekWidth)
  }, [weeksToShow])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'move') => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setDragType(type)
    dragStartX.current = e.clientX
    initialStart.current = de.startWeek ?? currentWeek
    initialEnd.current = de.endWeek ?? currentWeek + 8
  }, [de.startWeek, de.endWeek, currentWeek])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = pixelsToWeeks(e.clientX - dragStartX.current)

      if (dragType === 'move') {
        setDragOffset({ start: delta, end: delta })
      } else if (dragType === 'start') {
        // Don't let start go past end
        const maxDelta = (initialEnd.current - initialStart.current) - 1
        setDragOffset({ start: Math.min(delta, maxDelta), end: 0 })
      } else if (dragType === 'end') {
        // Don't let end go before start
        const minDelta = -(initialEnd.current - initialStart.current) + 1
        setDragOffset({ start: 0, end: Math.max(delta, minDelta) })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setDragType(null)

      const newStart = initialStart.current + dragOffset.start
      const newEnd = initialEnd.current + dragOffset.end

      // Only fire callback if something changed
      if (dragOffset.start !== 0 || dragOffset.end !== 0) {
        onDragEnd?.(de.id, newStart, newEnd)
      }

      setDragOffset({ start: 0, end: 0 })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragType, dragOffset, pixelsToWeeks, onDragEnd, de.id])

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

      {/* Timeline bar */}
      <div
        className={cn(
          'absolute top-1 bottom-1 rounded-md group cursor-grab select-none',
          statusConfig.bar,
          isDragging && 'opacity-80 shadow-lg cursor-grabbing',
          !isDragging && 'transition-all'
        )}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-0 bg-white/30 rounded-md"
          style={{ width: `${de.percentComplete}%` }}
        />

        {/* DE name */}
        <div className="absolute inset-0 flex items-center px-2 overflow-hidden pointer-events-none">
          <span className="text-xs font-medium text-white truncate drop-shadow-sm">
            {de.percentComplete}%
          </span>
        </div>

        {/* Left drag handle (resize start) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center z-10"
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
          <GripVertical className="w-3 h-3 text-white/70" />
        </div>
        {/* Right drag handle (resize end) */}
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center z-10"
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
          <GripVertical className="w-3 h-3 text-white/70" />
        </div>
      </div>

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
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.bar)} />
                <span className="font-medium text-sm text-gray-900 group-hover:text-[#C2703E] truncate">
                  {de.name}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate pl-4">
                {de.company.name}
              </div>
            </Link>
          </div>
        </div>

        {/* Status column */}
        <div className="w-24 flex-shrink-0 px-2 py-2 border-r border-gray-200">
          <Badge
            variant="secondary"
            className={cn('text-[10px] px-1.5', RISK_COLORS[de.riskLevel])}
          >
            {de.riskLevel}
          </Badge>
          {de.blocker && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="w-3 h-3 text-red-500 ml-1 inline" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-xs font-medium mb-1">Blocker:</p>
                <p className="text-xs">{de.blocker}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Timeline column */}
        <div className="flex-1 relative">
          <TimelineBar
            de={de}
            weeksToShow={weeksToShow}
            startWeekOffset={startWeekOffset}
            currentWeek={currentWeek}
            onDragEnd={onWeekChange}
          />
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
        </div>
        <div className="flex items-center gap-2">
          {stats.blocked > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
              {stats.blocked}
            </span>
          )}
          {stats.attention > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
              {stats.attention}
            </span>
          )}
          {stats.onTrack > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
              {stats.onTrack}
            </span>
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
          {Array.from({ length: weeksToShow }).map((_, i) => (
            <WeekHeader
              key={i}
              week={startWeekOffset + i}
              currentWeek={currentWeek}
            />
          ))}
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
