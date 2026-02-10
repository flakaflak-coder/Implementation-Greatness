'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  Ban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface BlockingPrerequisite {
  id: string
  title: string
  status: string
  category: string
  priority: string
  ownerType: string
  ownerName: string | null
}

interface JourneyState {
  currentPhase: string
  currentPhaseLabel: string
  nextPhase: string | null
  nextPhaseLabel: string | null
  canAdvance: boolean
  blockingPrerequisites: BlockingPrerequisite[]
}

interface PrerequisitesGateProps {
  digitalEmployeeId: string
  onPhaseTransition?: () => void
  className?: string
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
    case 'REQUESTED':
      return (
        <Badge variant="outline" className="gap-1 text-xs border-blue-200 text-blue-700 bg-blue-50">
          <ArrowRight className="h-3 w-3" />
          Requested
        </Badge>
      )
    case 'IN_PROGRESS':
      return (
        <Badge variant="outline" className="gap-1 text-xs border-[#E8D5C4] text-[#A05A32] bg-[#FDF3EC]">
          <Loader2 className="h-3 w-3" />
          In Progress
        </Badge>
      )
    case 'BLOCKED':
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <Ban className="h-3 w-3" />
          Blocked
        </Badge>
      )
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>
  }
}

function getPriorityIndicator(priority: string) {
  switch (priority) {
    case 'HIGH':
      return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
    case 'MEDIUM':
      return <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
    case 'LOW':
      return <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
    default:
      return null
  }
}

export function PrerequisitesGate({
  digitalEmployeeId,
  onPhaseTransition,
  className,
}: PrerequisitesGateProps) {
  const [journeyState, setJourneyState] = useState<JourneyState | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [confirmForceOpen, setConfirmForceOpen] = useState(false)

  const fetchJourneyState = useCallback(async () => {
    try {
      const response = await fetch(`/api/digital-employees/${digitalEmployeeId}/journey`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setJourneyState(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch journey state:', error)
    } finally {
      setLoading(false)
    }
  }, [digitalEmployeeId])

  useEffect(() => {
    fetchJourneyState()
  }, [fetchJourneyState])

  const handleAdvance = async (force: boolean = false) => {
    if (!journeyState?.nextPhase) return

    setTransitioning(true)
    setConfirmForceOpen(false)

    try {
      const response = await fetch(`/api/digital-employees/${digitalEmployeeId}/journey`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'advance',
          force,
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (data.forced) {
          toast.warning(
            `Advanced to ${data.currentPhaseLabel} with ${data.forcedCount} pending prerequisite${data.forcedCount > 1 ? 's' : ''}`,
            { duration: 5000 }
          )
        } else {
          toast.success(`Advanced to ${data.currentPhaseLabel}`)
        }
        // Refresh journey state
        await fetchJourneyState()
        onPhaseTransition?.()
      } else if (data.blocked) {
        // Should not happen if we already have the state, but handle it
        toast.error(`Cannot advance: ${data.blockedPrerequisites.length} prerequisites are blocking`)
        await fetchJourneyState()
      } else {
        toast.error(data.error || 'Failed to advance phase')
      }
    } catch (error) {
      console.error('Failed to advance phase:', error)
      toast.error('Failed to advance phase')
    } finally {
      setTransitioning(false)
    }
  }

  // Don't render if loading or no journey state
  if (loading) return null

  // Don't render if there's no next phase (at the end of the journey)
  if (!journeyState?.nextPhase) return null

  const { blockingPrerequisites, canAdvance, nextPhaseLabel, currentPhaseLabel } = journeyState
  const hasBlockers = blockingPrerequisites.length > 0

  return (
    <>
      <Card
        className={cn(
          'border transition-all',
          hasBlockers
            ? 'border-amber-200 bg-amber-50/30'
            : 'border-emerald-200 bg-emerald-50/30',
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {hasBlockers ? (
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              )}
              {hasBlockers
                ? `${blockingPrerequisites.length} prerequisite${blockingPrerequisites.length > 1 ? 's' : ''} needed before ${nextPhaseLabel}`
                : `Ready to advance to ${nextPhaseLabel}`}
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                hasBlockers
                  ? 'border-amber-300 text-amber-700 bg-amber-50'
                  : 'border-emerald-300 text-emerald-700 bg-emerald-50'
              )}
            >
              {currentPhaseLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Blocking prerequisites list */}
          {hasBlockers && (
            <div className="space-y-2">
              {blockingPrerequisites.map((prereq) => (
                <div
                  key={prereq.id}
                  className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getPriorityIndicator(prereq.priority)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {prereq.title}
                      </p>
                      {prereq.ownerName && (
                        <p className="text-xs text-gray-500 truncate">
                          {prereq.ownerType === 'CLIENT' ? 'Client' : prereq.ownerType === 'FREEDAY' ? 'Freeday' : 'Third party'}: {prereq.ownerName}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(prereq.status)}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-1">
            {canAdvance ? (
              <Button
                onClick={() => handleAdvance(false)}
                disabled={transitioning}
                className="bg-[#C2703E] hover:bg-[#A05A32] text-white gap-2"
              >
                {transitioning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Advance to {nextPhaseLabel}
              </Button>
            ) : (
              <>
                <Button
                  disabled
                  className="gap-2 opacity-50"
                >
                  <ArrowRight className="h-4 w-4" />
                  Advance to {nextPhaseLabel}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmForceOpen(true)}
                  disabled={transitioning}
                  className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {transitioning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  Continue Anyway
                </Button>
              </>
            )}
          </div>

          {!hasBlockers && (
            <p className="text-xs text-emerald-600">
              All prerequisites for {nextPhaseLabel} have been met. You can safely advance.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Force override confirmation dialog */}
      <AlertDialog open={confirmForceOpen} onOpenChange={setConfirmForceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Skip Prerequisites?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to advance to <strong>{nextPhaseLabel}</strong>?{' '}
                  {blockingPrerequisites.length} prerequisite{blockingPrerequisites.length > 1 ? 's are' : ' is'} still pending:
                </p>
                <ul className="space-y-1.5 pl-1">
                  {blockingPrerequisites.map((prereq) => (
                    <li key={prereq.id} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-gray-700">{prereq.title}</span>
                      <span className="text-gray-400">({prereq.status.toLowerCase().replace('_', ' ')})</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-amber-600 font-medium">
                  This override will be recorded in the journey notes for audit purposes.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAdvance(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Force Advance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
