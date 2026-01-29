'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Pencil, Check, X } from 'lucide-react'

interface EditableFieldProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  helpText?: string
  multiline?: boolean
  type?: 'text' | 'number' | 'currency'
  unit?: string
  currency?: string
  className?: string
  emptyStateText?: string
}

export function EditableField({
  value,
  onChange,
  label,
  placeholder = 'Click to add...',
  helpText,
  multiline = false,
  type = 'text',
  unit,
  currency = 'EUR',
  className,
  emptyStateText = 'Not set',
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleSave = () => {
    onChange(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const formatDisplayValue = () => {
    if (!value) return null

    if (type === 'currency') {
      const num = parseFloat(value)
      if (isNaN(num)) return value
      return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
      }).format(num)
    }

    if (type === 'number' && unit) {
      return `${value} ${unit}`
    }

    return value
  }

  const displayValue = formatDisplayValue()

  return (
    <div className={cn('group', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {label}
        </label>
      )}

      {isEditing ? (
        <div className="flex items-start gap-2">
          {multiline ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={3}
              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          ) : (
            <div className="flex-1 flex items-center gap-2">
              {type === 'currency' && (
                <span className="text-gray-500">{currency}</span>
              )}
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={type === 'number' || type === 'currency' ? 'number' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {unit && <span className="text-gray-500">{unit}</span>}
            </div>
          )}
          <button
            onClick={handleSave}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Save"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className={cn(
            'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors',
            'border border-transparent hover:border-gray-200 hover:bg-gray-50',
            !displayValue && 'text-gray-400 italic'
          )}
        >
          <span className={cn(multiline && 'whitespace-pre-wrap')}>
            {displayValue || emptyStateText}
          </span>
          <Pencil className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {helpText && !isEditing && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  )
}
