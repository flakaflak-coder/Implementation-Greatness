'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ban,
  Loader2,
  Mail,
  Building,
  User,
  Calendar,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react'
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

// Types matching Prisma schema
type PrerequisiteCategory =
  | 'API_CREDENTIALS'
  | 'SYSTEM_ACCESS'
  | 'DOCUMENTATION'
  | 'TEST_DATA'
  | 'SECURITY_APPROVAL'
  | 'LEGAL_APPROVAL'
  | 'INFRASTRUCTURE'
  | 'OTHER'

type PrerequisiteOwner = 'CLIENT' | 'FREEDAY' | 'THIRD_PARTY'

type PrerequisiteStatus =
  | 'PENDING'
  | 'REQUESTED'
  | 'IN_PROGRESS'
  | 'RECEIVED'
  | 'BLOCKED'
  | 'NOT_NEEDED'

type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

interface Prerequisite {
  id: string
  title: string
  description?: string
  category: PrerequisiteCategory
  ownerType: PrerequisiteOwner
  ownerName?: string
  ownerEmail?: string
  status: PrerequisiteStatus
  priority: Priority
  dueDate?: string
  requestedAt?: string
  receivedAt?: string
  blocksPhase?: string
  integrationId?: string
  notes?: string
  createdAt: string
  integration?: {
    id: string
    systemName: string
  }
}

interface PrerequisitesSectionProps {
  designWeekId: string
  className?: string
}

// Labels and colors
const categoryLabels: Record<PrerequisiteCategory, string> = {
  API_CREDENTIALS: 'API Credentials',
  SYSTEM_ACCESS: 'System Access',
  DOCUMENTATION: 'Documentation',
  TEST_DATA: 'Test Data',
  SECURITY_APPROVAL: 'Security Approval',
  LEGAL_APPROVAL: 'Legal Approval',
  INFRASTRUCTURE: 'Infrastructure',
  OTHER: 'Other',
}

const categoryColors: Record<PrerequisiteCategory, string> = {
  API_CREDENTIALS: 'bg-[#F5E6DA] text-[#A05A32]',
  SYSTEM_ACCESS: 'bg-blue-100 text-blue-700',
  DOCUMENTATION: 'bg-cyan-100 text-cyan-700',
  TEST_DATA: 'bg-emerald-100 text-emerald-700',
  SECURITY_APPROVAL: 'bg-rose-100 text-rose-700',
  LEGAL_APPROVAL: 'bg-amber-100 text-amber-700',
  INFRASTRUCTURE: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-700',
}

const ownerLabels: Record<PrerequisiteOwner, string> = {
  CLIENT: 'Client',
  FREEDAY: 'Freeday',
  THIRD_PARTY: 'Third Party',
}

const ownerIcons: Record<PrerequisiteOwner, React.ReactNode> = {
  CLIENT: <Building className="h-3 w-3" />,
  FREEDAY: <User className="h-3 w-3" />,
  THIRD_PARTY: <LinkIcon className="h-3 w-3" />,
}

const statusConfig: Record<PrerequisiteStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: <Clock className="h-3 w-3" /> },
  REQUESTED: { label: 'Requested', color: 'bg-blue-100 text-blue-700', icon: <Mail className="h-3 w-3" /> },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  RECEIVED: { label: 'Received', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> },
  BLOCKED: { label: 'Blocked', color: 'bg-red-100 text-red-700', icon: <AlertCircle className="h-3 w-3" /> },
  NOT_NEEDED: { label: 'Not Needed', color: 'bg-gray-100 text-gray-500', icon: <Ban className="h-3 w-3" /> },
}

const priorityColors: Record<Priority, string> = {
  HIGH: 'border-l-red-500',
  MEDIUM: 'border-l-amber-500',
  LOW: 'border-l-gray-300',
}

export function PrerequisitesSection({ designWeekId, className }: PrerequisitesSectionProps) {
  const [prerequisites, setPrerequisites] = useState<Prerequisite[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Prerequisite | null>(null)

  // Form state for new prerequisite
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState<PrerequisiteCategory>('API_CREDENTIALS')
  const [newOwnerType, setNewOwnerType] = useState<PrerequisiteOwner>('CLIENT')
  const [newOwnerName, setNewOwnerName] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('MEDIUM')

  // Load prerequisites
  useEffect(() => {
    async function loadPrerequisites() {
      try {
        setLoading(true)
        const response = await fetch(`/api/design-weeks/${designWeekId}/prerequisites`)
        if (!response.ok) throw new Error('Failed to load prerequisites')
        const data = await response.json()
        setPrerequisites(data.prerequisites || [])
      } catch (err) {
        console.error('Error loading prerequisites:', err)
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    loadPrerequisites()
  }, [designWeekId])

  // Add prerequisite
  const handleAdd = async () => {
    if (!newTitle.trim()) return

    try {
      setSaving(true)
      const response = await fetch(`/api/design-weeks/${designWeekId}/prerequisites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          category: newCategory,
          ownerType: newOwnerType,
          ownerName: newOwnerName.trim() || undefined,
          priority: newPriority,
        }),
      })
      if (!response.ok) throw new Error('Failed to add prerequisite')
      const data = await response.json()
      setPrerequisites((prev) => [...prev, data.prerequisite])

      // Reset form
      setNewTitle('')
      setNewDescription('')
      setNewCategory('API_CREDENTIALS')
      setNewOwnerType('CLIENT')
      setNewOwnerName('')
      setNewPriority('MEDIUM')
      setIsAdding(false)
    } catch (err) {
      console.error('Error adding prerequisite:', err)
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  // Update status
  const handleStatusChange = async (id: string, status: PrerequisiteStatus) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/design-weeks/${designWeekId}/prerequisites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Failed to update')
      setPrerequisites((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      )
    } catch (err) {
      console.error('Error updating prerequisite:', err)
    } finally {
      setSaving(false)
    }
  }

  // Delete prerequisite with confirmation
  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      setSaving(true)
      const response = await fetch(`/api/design-weeks/${designWeekId}/prerequisites/${deleteConfirm.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete')
      setPrerequisites((prev) => prev.filter((p) => p.id !== deleteConfirm.id))
    } catch (err) {
      console.error('Error deleting prerequisite:', err)
    } finally {
      setSaving(false)
      setDeleteConfirm(null)
    }
  }

  // Calculate summary
  const summary = {
    total: prerequisites.length,
    received: prerequisites.filter((p) => p.status === 'RECEIVED').length,
    blocked: prerequisites.filter((p) => p.status === 'BLOCKED').length,
    pending: prerequisites.filter((p) => ['PENDING', 'REQUESTED', 'IN_PROGRESS'].includes(p.status)).length,
  }
  const readyPercent = summary.total > 0 ? Math.round((summary.received / summary.total) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-orange-200 bg-orange-50/50', className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/30 transition-colors"
      >
        <div className="text-orange-600">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Prerequisites</h3>
            {summary.total > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      readyPercent === 100 ? 'bg-emerald-500' : 'bg-orange-500'
                    )}
                    style={{ width: `${readyPercent}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {summary.received}/{summary.total} ready
                </span>
                {summary.blocked > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                    {summary.blocked} blocked
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Items needed from client or third parties before Build can start
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/50 space-y-3">
          {/* Saving indicator */}
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}

          {/* Prerequisites list */}
          {prerequisites.length === 0 && !isAdding && (
            <p className="text-gray-500 text-sm py-4 text-center">
              No prerequisites defined yet. Add items that need to be received before Build can start.
            </p>
          )}

          {prerequisites.map((prereq) => (
            <div
              key={prereq.id}
              className={cn(
                'p-4 bg-white rounded-lg border border-gray-200 border-l-4 group',
                priorityColors[prereq.priority]
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs px-2 py-0.5 rounded', categoryColors[prereq.category])}>
                      {categoryLabels[prereq.category]}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      {ownerIcons[prereq.ownerType]}
                      {ownerLabels[prereq.ownerType]}
                      {prereq.ownerName && `: ${prereq.ownerName}`}
                    </span>
                    {prereq.integration && (
                      <span className="text-xs text-[#C2703E]">
                        → {prereq.integration.systemName}
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 mt-1">{prereq.title}</h4>
                  {prereq.description && (
                    <p className="text-sm text-gray-600 mt-1">{prereq.description}</p>
                  )}
                  {prereq.dueDate && (
                    <p className="flex items-center gap-1 text-xs text-gray-500 mt-2" suppressHydrationWarning>
                      <Calendar className="h-3 w-3" />
                      Due: {new Date(prereq.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={prereq.status}
                    onChange={(e) => handleStatusChange(prereq.id, e.target.value as PrerequisiteStatus)}
                    className={cn(
                      'text-xs px-2 py-1 rounded border-0 cursor-pointer flex items-center gap-1',
                      statusConfig[prereq.status].color
                    )}
                    aria-label={`Status for ${prereq.title}`}
                  >
                    {Object.entries(statusConfig).map(([value, { label }]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setDeleteConfirm(prereq)}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Delete ${prereq.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add form */}
          {isAdding ? (
            <div className="p-4 bg-white rounded-lg border-2 border-orange-300 space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What is needed? (e.g., 'API key for Salesforce')"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Prerequisite title"
                autoFocus
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Additional details (optional)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Prerequisite description"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as PrerequisiteCategory)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  aria-label="Category"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={newOwnerType}
                  onChange={(e) => setNewOwnerType(e.target.value as PrerequisiteOwner)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  aria-label="Owner type"
                >
                  {Object.entries(ownerLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="Contact name"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  aria-label="Contact name"
                />
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  aria-label="Priority"
                >
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newTitle.trim()}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Prerequisite
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 py-2"
            >
              <Plus className="h-4 w-4" />
              Add prerequisite
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete prerequisite?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
