'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Plus } from 'lucide-react'

interface TagListProps {
  tags: string[]
  onChange: (tags: string[]) => void
  label?: string
  placeholder?: string
  color?: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet'
  maxTags?: number
  className?: string
}

const colorClasses = {
  gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  green: 'bg-green-100 text-green-700 hover:bg-green-200',
  amber: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
  red: 'bg-red-100 text-red-700 hover:bg-red-200',
  violet: 'bg-violet-100 text-violet-700 hover:bg-violet-200',
}

export function TagList({
  tags,
  onChange,
  label,
  placeholder = 'Add tag...',
  color = 'gray',
  maxTags,
  className,
}: TagListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTag, setNewTag] = useState('')

  const handleAdd = () => {
    const trimmed = newTag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setNewTag('')
    setIsAdding(false)
  }

  const handleRemove = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === 'Escape') {
      setNewTag('')
      setIsAdding(false)
    }
  }

  const canAddMore = !maxTags || tags.length < maxTags

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-600 mb-2">
          {label}
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors',
              colorClasses[color]
            )}
          >
            {tag}
            <button
              onClick={() => handleRemove(tag)}
              className="p-0.5 rounded-full hover:bg-black/10 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {canAddMore && (
          <>
            {isAdding ? (
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleAdd}
                  placeholder={placeholder}
                  autoFocus
                  className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  'border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600'
                )}
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
