'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  MessageSquare,
  User,
  Loader2,
  Undo2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignOff {
  id: string
  designWeekId: string
  stakeholder: string
  role: string
  status: 'PENDING' | 'APPROVED' | 'NEEDS_CHANGES'
  comments: string | null
  createdAt: string
  updatedAt: string
}

interface SignOffTabProps {
  designWeekId: string
}

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  SignOff['status'],
  { label: string; variant: 'warning' | 'success' | 'destructive'; icon: typeof Clock }
> = {
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  APPROVED: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  NEEDS_CHANGES: { label: 'Needs Changes', variant: 'destructive', icon: XCircle },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SignOffTab({ designWeekId }: SignOffTabProps) {
  const [signOffs, setSignOffs] = useState<SignOff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Add form state
  const [formStakeholder, setFormStakeholder] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formComments, setFormComments] = useState('')

  // -------------------------------------------------------------------------
  // Fetch sign-offs
  // -------------------------------------------------------------------------

  const fetchSignOffs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/design-weeks/${designWeekId}/sign-offs`)
      if (!response.ok) {
        throw new Error('Failed to fetch sign-offs')
      }
      const data = await response.json()
      setSignOffs(data.signOffs)
    } catch (err) {
      console.error('Error fetching sign-offs:', err)
      setError(err instanceof Error ? err.message : 'Failed to load sign-offs')
    } finally {
      setLoading(false)
    }
  }, [designWeekId])

  useEffect(() => {
    fetchSignOffs()
  }, [fetchSignOffs])

  // -------------------------------------------------------------------------
  // Create sign-off
  // -------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!formStakeholder.trim() || !formRole.trim()) {
      toast.error('Stakeholder name and role are required')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/design-weeks/${designWeekId}/sign-offs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholder: formStakeholder.trim(),
          role: formRole.trim(),
          comments: formComments.trim() || null,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to create sign-off')
      }

      const data = await response.json()
      setSignOffs((prev) => [data.signOff, ...prev])
      setFormStakeholder('')
      setFormRole('')
      setFormComments('')
      setShowAddForm(false)
      toast.success(`Added ${data.signOff.stakeholder} for sign-off`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add stakeholder')
    } finally {
      setSubmitting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Update sign-off status
  // -------------------------------------------------------------------------

  const handleUpdateStatus = async (signOffId: string, status: SignOff['status'], comments?: string) => {
    try {
      setUpdatingId(signOffId)
      const body: Record<string, unknown> = { status }
      if (comments !== undefined) body.comments = comments

      const response = await fetch(
        `/api/design-weeks/${designWeekId}/sign-offs/${signOffId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update sign-off')
      }

      const data = await response.json()
      setSignOffs((prev) =>
        prev.map((s) => (s.id === signOffId ? data.signOff : s))
      )

      const statusLabel = STATUS_CONFIG[status].label.toLowerCase()
      toast.success(`Sign-off marked as ${statusLabel}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update sign-off')
    } finally {
      setUpdatingId(null)
    }
  }

  // -------------------------------------------------------------------------
  // Delete sign-off
  // -------------------------------------------------------------------------

  const handleDelete = async (signOffId: string) => {
    try {
      setDeletingId(signOffId)
      const response = await fetch(
        `/api/design-weeks/${designWeekId}/sign-offs/${signOffId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to delete sign-off')
      }

      setSignOffs((prev) => prev.filter((s) => s.id !== signOffId))
      setConfirmDeleteId(null)
      toast.success('Sign-off removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete sign-off')
    } finally {
      setDeletingId(null)
    }
  }

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const approvedCount = signOffs.filter((s) => s.status === 'APPROVED').length
  const totalCount = signOffs.length
  const allApproved = totalCount > 0 && approvedCount === totalCount
  const progressPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        <span className="ml-2 text-stone-500">Loading sign-offs...</span>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>{error}</span>
        <Button variant="ghost" size="sm" className="ml-4" onClick={fetchSignOffs}>
          Retry
        </Button>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Success banner when all approved */}
      {allApproved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-700">
              All stakeholders approved! Design Week is ready to proceed.
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {approvedCount} of {totalCount} stakeholder{totalCount !== 1 ? 's' : ''} signed off.
            </p>
          </div>
        </div>
      )}

      {/* Progress summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Stakeholder Sign-Offs</CardTitle>
            <span className="text-sm font-medium text-stone-600">
              {approvedCount} of {totalCount} approved
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress bar */}
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                allApproved ? 'bg-emerald-500' : 'bg-amber-500'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-stone-500 mt-1.5">
            {totalCount === 0
              ? 'No stakeholders added yet. Add stakeholders who need to approve the Design Week.'
              : allApproved
                ? 'All stakeholders have given their approval.'
                : `${totalCount - approvedCount} stakeholder${totalCount - approvedCount !== 1 ? 's' : ''} remaining.`}
          </p>
        </CardContent>
      </Card>

      {/* Sign-off cards */}
      {signOffs.map((signOff) => {
        const config = STATUS_CONFIG[signOff.status]
        const StatusIcon = config.icon
        const isUpdating = updatingId === signOff.id
        const isDeleting = deletingId === signOff.id
        const isConfirmingDelete = confirmDeleteId === signOff.id

        return (
          <Card key={signOff.id} className="relative">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-4">
                {/* Stakeholder info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-stone-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-stone-900 truncate">
                        {signOff.stakeholder}
                      </p>
                      <Badge variant={config.variant} className="shrink-0">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{signOff.role}</p>

                    {/* Comments */}
                    {signOff.comments && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-stone-600">{signOff.comments}</p>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-400">
                      <span>
                        Created {new Date(signOff.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {signOff.updatedAt !== signOff.createdAt && (
                        <span>
                          Updated {new Date(signOff.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {signOff.status === 'PENDING' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(signOff.id, 'APPROVED')}
                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(signOff.id, 'NEEDS_CHANGES')}
                        className="text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                        )}
                        Request Changes
                      </Button>
                    </>
                  )}

                  {(signOff.status === 'APPROVED' || signOff.status === 'NEEDS_CHANGES') && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(signOff.id, 'PENDING')}
                      className="text-stone-600 border-stone-200 hover:bg-stone-50"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Undo2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Undo
                    </Button>
                  )}

                  {/* Delete button */}
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isDeleting}
                        onClick={() => handleDelete(signOff.id)}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Confirm'
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleting}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-stone-400 hover:text-red-600"
                      onClick={() => setConfirmDeleteId(signOff.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Empty state */}
      {signOffs.length === 0 && !showAddForm && (
        <div className="py-8 text-center border-2 border-dashed border-stone-200 rounded-lg">
          <User className="h-8 w-8 text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-500">No stakeholders added yet.</p>
          <p className="text-xs text-stone-400 mt-1">
            Add the stakeholders who need to approve the Design Week outcome.
          </p>
        </div>
      )}

      {/* Add stakeholder inline form */}
      {showAddForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Add Stakeholder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Stakeholder Name
                </label>
                <input
                  type="text"
                  value={formStakeholder}
                  onChange={(e) => setFormStakeholder(e.target.value)}
                  placeholder="e.g., Marcus Chen"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  placeholder="e.g., Head of Operations"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Comments <span className="text-stone-400">(optional)</span>
              </label>
              <textarea
                value={formComments}
                onChange={(e) => setFormComments(e.target.value)}
                placeholder="Any notes about what this stakeholder should review..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent resize-y"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={submitting}
                onClick={() => {
                  setShowAddForm(false)
                  setFormStakeholder('')
                  setFormRole('')
                  setFormComments('')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={submitting || !formStakeholder.trim() || !formRole.trim()}
                onClick={handleCreate}
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add stakeholder button */}
      {!showAddForm && (
        <Button
          variant="outline"
          className="w-full border-dashed border-2 border-stone-300 text-stone-600 hover:border-stone-400 hover:bg-stone-50"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Stakeholder
        </Button>
      )}
    </div>
  )
}
