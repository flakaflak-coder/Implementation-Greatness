'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, X, ShieldAlert, ShieldCheck, Banknote } from 'lucide-react'

interface GuardrailsListProps {
  neverRules: string[]
  alwaysRules: string[]
  financialLimits: Array<{ id: string; type: string; amount: number; currency: string }>
  onUpdateNever: (rules: string[]) => void
  onUpdateAlways: (rules: string[]) => void
  onUpdateFinancial: (limits: Array<{ id: string; type: string; amount: number; currency: string }>) => void
  className?: string
}

export function GuardrailsList({
  neverRules,
  alwaysRules,
  financialLimits,
  onUpdateNever,
  onUpdateAlways,
  onUpdateFinancial,
  className,
}: GuardrailsListProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* NEVER Rules */}
      <RuleList
        title="NEVER"
        icon={<ShieldAlert className="h-5 w-5" />}
        rules={neverRules}
        onChange={onUpdateNever}
        color="red"
        placeholder="What should the DE never do?"
        emptyText="No restrictions defined"
      />

      {/* ALWAYS Rules */}
      <RuleList
        title="ALWAYS"
        icon={<ShieldCheck className="h-5 w-5" />}
        rules={alwaysRules}
        onChange={onUpdateAlways}
        color="green"
        placeholder="What must the DE always do?"
        emptyText="No requirements defined"
      />

      {/* Financial Limits */}
      <FinancialLimitsList
        limits={financialLimits}
        onChange={onUpdateFinancial}
      />
    </div>
  )
}

// ============================================
// Rule List Component
// ============================================
interface RuleListProps {
  title: string
  icon: React.ReactNode
  rules: string[]
  onChange: (rules: string[]) => void
  color: 'red' | 'green' | 'amber'
  placeholder: string
  emptyText: string
}

const colorConfig = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    bullet: 'bg-red-500',
    input: 'focus:ring-red-500',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600',
    bullet: 'bg-green-500',
    input: 'focus:ring-green-500',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    bullet: 'bg-amber-500',
    input: 'focus:ring-amber-500',
  },
}

function RuleList({
  title,
  icon,
  rules,
  onChange,
  color,
  placeholder,
  emptyText,
}: RuleListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newRule, setNewRule] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const colors = colorConfig[color]

  const handleAdd = () => {
    if (newRule.trim()) {
      onChange([...rules, newRule.trim()])
      setNewRule('')
      setIsAdding(false)
    }
  }

  const handleRemove = (index: number) => {
    onChange(rules.filter((_, i) => i !== index))
  }

  const handleStartEdit = (index: number) => {
    setEditingIndex(index)
    setEditValue(rules[index])
  }

  const handleSaveEdit = () => {
    if (editValue.trim() && editingIndex !== null) {
      const newRules = [...rules]
      newRules[editingIndex] = editValue.trim()
      onChange(newRules)
    }
    setEditingIndex(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: 'add' | 'edit') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      action === 'add' ? handleAdd() : handleSaveEdit()
    }
    if (e.key === 'Escape') {
      if (action === 'add') {
        setIsAdding(false)
        setNewRule('')
      } else {
        setEditingIndex(null)
        setEditValue('')
      }
    }
  }

  return (
    <div className={cn('rounded-lg border p-4', colors.bg, colors.border)}>
      <div className="flex items-center gap-2 mb-3">
        <div className={colors.icon}>{icon}</div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
      </div>

      {rules.length === 0 && !isAdding ? (
        <p className="text-gray-500 text-sm mb-3">{emptyText}</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {rules.map((rule, index) =>
            editingIndex === index ? (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'edit')}
                  onBlur={handleSaveEdit}
                  autoFocus
                  className={cn(
                    'flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2',
                    colors.input
                  )}
                />
              </li>
            ) : (
              <li
                key={index}
                className="flex items-start gap-2 group cursor-pointer hover:bg-white/50 rounded px-2 py-1 -mx-2"
                onClick={() => handleStartEdit(index)}
              >
                <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', colors.bullet)} />
                <span className="flex-1 text-gray-700">{rule}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(index)
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            )
          )}
        </ul>
      )}

      {isAdding ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'add')}
            placeholder={placeholder}
            autoFocus
            className={cn(
              'flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2',
              colors.input
            )}
          />
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Add
          </button>
          <button
            onClick={() => {
              setIsAdding(false)
              setNewRule('')
            }}
            className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <Plus className="h-4 w-4" />
          Add rule
        </button>
      )}
    </div>
  )
}

// ============================================
// Financial Limits List
// ============================================
interface FinancialLimitsListProps {
  limits: Array<{ id: string; type: string; amount: number; currency: string }>
  onChange: (limits: Array<{ id: string; type: string; amount: number; currency: string }>) => void
}

function FinancialLimitsList({ limits, onChange }: FinancialLimitsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newType, setNewType] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const handleAdd = () => {
    if (newType.trim() && newAmount) {
      onChange([
        ...limits,
        {
          id: `limit-${Date.now()}`,
          type: newType.trim(),
          amount: parseFloat(newAmount),
          currency: 'EUR',
        },
      ])
      setNewType('')
      setNewAmount('')
      setIsAdding(false)
    }
  }

  const handleRemove = (id: string) => {
    onChange(limits.filter((l) => l.id !== id))
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-amber-600">
          <Banknote className="h-5 w-5" />
        </div>
        <h4 className="font-semibold text-gray-900">Financial Limits</h4>
      </div>

      {limits.length === 0 && !isAdding ? (
        <p className="text-gray-500 text-sm mb-3">No financial limits defined</p>
      ) : (
        <div className="space-y-2 mb-3">
          {limits.map((limit) => (
            <div
              key={limit.id}
              className="flex items-center justify-between bg-white/50 rounded-lg px-3 py-2 group"
            >
              <div>
                <span className="text-gray-600">{limit.type}:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {formatCurrency(limit.amount, limit.currency)}
                </span>
              </div>
              <button
                onClick={() => handleRemove(limit.id)}
                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            placeholder="Limit type (e.g., Max approval)"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex items-center gap-1">
            <span className="text-gray-500">EUR</span>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="0.00"
              className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Add
          </button>
          <button
            onClick={() => {
              setIsAdding(false)
              setNewType('')
              setNewAmount('')
            }}
            className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <Plus className="h-4 w-4" />
          Add limit
        </button>
      )}
    </div>
  )
}
