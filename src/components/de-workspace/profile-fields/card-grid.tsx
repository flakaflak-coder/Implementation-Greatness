'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, X, Pencil, User, Target, MessageSquare, Sparkles } from 'lucide-react'

// ============================================
// Generic Card Grid
// ============================================
interface CardGridProps<T> {
  items: T[]
  onAdd: (item: T) => void
  onUpdate: (item: T) => void
  onRemove: (id: string) => void
  renderCard: (item: T, onEdit: () => void) => React.ReactNode
  renderForm: (
    onSave: (item: T) => void,
    onCancel: () => void,
    editItem?: T
  ) => React.ReactNode
  label?: string
  emptyText?: string
  columns?: 2 | 3 | 4
  className?: string
}

export function CardGrid<T extends { id: string }>({
  items,
  onAdd,
  onUpdate,
  onRemove,
  renderCard,
  renderForm,
  label,
  emptyText = 'No items added yet',
  columns = 3,
  className,
}: CardGridProps<T>) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  const editingItem = editingId ? items.find((i) => i.id === editingId) : undefined

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-600 mb-3">
          {label}
        </label>
      )}

      {items.length === 0 && !isAdding ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500 mb-3">{emptyText}</p>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add First Item
          </button>
        </div>
      ) : (
        <div className={cn('grid gap-4', gridCols[columns])}>
          {items.map((item) =>
            editingId === item.id ? (
              <div key={item.id} className="bg-white border-2 border-blue-300 rounded-lg p-4">
                {renderForm(
                  (updated) => {
                    onUpdate(updated)
                    setEditingId(null)
                  },
                  () => setEditingId(null),
                  editingItem
                )}
              </div>
            ) : (
              <div key={item.id} className="relative group">
                {renderCard(item, () => setEditingId(item.id))}
                <button
                  onClick={() => onRemove(item.id)}
                  className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                  title="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          )}

          {isAdding ? (
            <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
              {renderForm(
                (item) => {
                  onAdd(item)
                  setIsAdding(false)
                },
                () => setIsAdding(false)
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Stakeholder Card
// ============================================
interface StakeholderCardProps {
  stakeholder: {
    id: string
    name: string
    role: string
    email?: string
    isDecisionMaker?: boolean
  }
  onEdit: () => void
}

export function StakeholderCard({ stakeholder, onEdit }: StakeholderCardProps) {
  return (
    <div
      onClick={onEdit}
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 truncate">{stakeholder.name}</h4>
            {stakeholder.isDecisionMaker && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                DM
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{stakeholder.role}</p>
          {stakeholder.email && (
            <p className="text-xs text-gray-400 truncate mt-1">{stakeholder.email}</p>
          )}
        </div>
        <Pencil className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
      </div>
    </div>
  )
}

// ============================================
// KPI Card
// ============================================
interface KPICardProps {
  kpi: {
    id: string
    name: string
    description?: string
    targetValue: string
    currentValue?: string
    unit: string
  }
  onEdit: () => void
}

export function KPICard({ kpi, onEdit }: KPICardProps) {
  return (
    <div
      onClick={onEdit}
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
          <Target className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900">{kpi.name}</h4>
          {kpi.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{kpi.description}</p>
          )}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-semibold text-emerald-600">
              {kpi.targetValue}
              {kpi.unit}
            </span>
            {kpi.currentValue && (
              <span className="text-sm text-gray-400">
                (now: {kpi.currentValue}
                {kpi.unit})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Channel Card
// ============================================
interface ChannelCardProps {
  channel: {
    id: string
    name: string
    type: string
    volumePercentage: number
    sla: string
  }
  onEdit: () => void
}

export function ChannelCard({ channel, onEdit }: ChannelCardProps) {
  return (
    <div
      onClick={onEdit}
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900">{channel.name}</h4>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-gray-600">
              <span className="font-medium">{channel.volumePercentage}%</span> volume
            </span>
            <span className="text-gray-600">
              SLA: <span className="font-medium">{channel.sla}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Skill Card
// ============================================
interface SkillCardProps {
  skill: {
    id: string
    type: string
    name: string
    description: string
  }
  onEdit: () => void
}

const skillIcons: Record<string, React.ReactNode> = {
  answer: <MessageSquare className="h-5 w-5" />,
  route: <Sparkles className="h-5 w-5" />,
  approve_reject: <Target className="h-5 w-5" />,
  request_info: <MessageSquare className="h-5 w-5" />,
  notify: <MessageSquare className="h-5 w-5" />,
  other: <Sparkles className="h-5 w-5" />,
}

const skillLabels: Record<string, string> = {
  answer: 'Answer Questions',
  route: 'Route Cases',
  approve_reject: 'Approve/Reject',
  request_info: 'Request Info',
  notify: 'Send Notifications',
  other: 'Other',
}

export function SkillCard({ skill, onEdit }: SkillCardProps) {
  return (
    <div
      onClick={onEdit}
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
          {skillIcons[skill.type] || skillIcons.other}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-600 rounded font-medium">
              {skillLabels[skill.type] || skill.type}
            </span>
          </div>
          <h4 className="font-medium text-gray-900 mt-1">{skill.name}</h4>
          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{skill.description}</p>
        </div>
      </div>
    </div>
  )
}
