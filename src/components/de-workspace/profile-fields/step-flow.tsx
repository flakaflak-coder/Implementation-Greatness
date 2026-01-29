'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, X, ChevronRight, GripVertical, Pencil } from 'lucide-react'

interface ProcessStep {
  id: string
  order: number
  title: string
  description: string
  isDecisionPoint?: boolean
}

interface StepFlowProps {
  steps: ProcessStep[]
  onAdd: (step: ProcessStep) => void
  onUpdate: (step: ProcessStep) => void
  onRemove: (id: string) => void
  onReorder: (steps: ProcessStep[]) => void
  label?: string
  className?: string
}

export function StepFlow({
  steps,
  onAdd,
  onUpdate,
  onRemove,
  label,
  className,
}: StepFlowProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order)

  const handleAdd = (title: string, description: string) => {
    const newStep: ProcessStep = {
      id: `step-${Date.now()}`,
      order: steps.length + 1,
      title,
      description,
      isDecisionPoint: false,
    }
    onAdd(newStep)
    setIsAdding(false)
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-600 mb-3">
          {label}
        </label>
      )}

      {sortedSteps.length === 0 && !isAdding ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500 mb-3">No steps defined yet</p>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add First Step
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Step Flow Visual */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4">
            {sortedSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {/* Step Circle */}
                <div
                  className={cn(
                    'relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold cursor-pointer transition-all',
                    editingId === step.id
                      ? 'bg-amber-500 text-white ring-4 ring-amber-200'
                      : step.isDecisionPoint
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                  onClick={() => setEditingId(step.id)}
                  title={step.title}
                >
                  {step.order}
                  {step.isDecisionPoint && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">?</span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                {index < sortedSteps.length - 1 && (
                  <ChevronRight className="h-5 w-5 text-gray-300 mx-1 flex-shrink-0" />
                )}
              </div>
            ))}

            {/* Add Step Button */}
            {!isAdding && (
              <>
                {sortedSteps.length > 0 && (
                  <ChevronRight className="h-5 w-5 text-gray-300 mx-1 flex-shrink-0" />
                )}
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Step Details List */}
          <div className="space-y-2">
            {sortedSteps.map((step) =>
              editingId === step.id ? (
                <StepEditForm
                  key={step.id}
                  step={step}
                  onSave={(updated) => {
                    onUpdate(updated)
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                  onRemove={() => {
                    onRemove(step.id)
                    setEditingId(null)
                  }}
                />
              ) : (
                <div
                  key={step.id}
                  onClick={() => setEditingId(step.id)}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {step.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-500 line-clamp-1">{step.description}</p>
                  </div>
                  <Pencil className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                </div>
              )
            )}

            {isAdding && (
              <StepEditForm
                onSave={(step) => handleAdd(step.title, step.description)}
                onCancel={() => setIsAdding(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Step Edit Form
// ============================================
interface StepEditFormProps {
  step?: ProcessStep
  onSave: (step: ProcessStep) => void
  onCancel: () => void
  onRemove?: () => void
}

function StepEditForm({ step, onSave, onCancel, onRemove }: StepEditFormProps) {
  const [title, setTitle] = useState(step?.title || '')
  const [description, setDescription] = useState(step?.description || '')
  const [isDecisionPoint, setIsDecisionPoint] = useState(step?.isDecisionPoint || false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSave({
      id: step?.id || `step-${Date.now()}`,
      order: step?.order || 1,
      title: title.trim(),
      description: description.trim(),
      isDecisionPoint,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white border-2 border-amber-300 rounded-lg space-y-3"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Step title..."
        autoFocus
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What happens in this step?"
        rows={2}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isDecisionPoint}
          onChange={(e) => setIsDecisionPoint(e.target.checked)}
          className="rounded"
        />
        <span className="text-gray-600">This is a decision point</span>
      </label>
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            {step ? 'Update' : 'Add Step'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </form>
  )
}
