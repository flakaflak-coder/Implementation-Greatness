'use client'

import { Check, AlertTriangle, HelpCircle, ChevronDown, ChevronRight, Play, FileText } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TestCase } from '../types'

interface TestCaseCardProps {
  testCase: TestCase
  onEdit?: () => void
  className?: string
}

const TYPE_CONFIG: Record<TestCase['type'], { label: string; color: string; icon: typeof Check }> = {
  happy_path: {
    label: 'Happy Path',
    color: 'emerald',
    icon: Check,
  },
  exception: {
    label: 'Exception',
    color: 'amber',
    icon: AlertTriangle,
  },
  guardrail: {
    label: 'Guardrail',
    color: 'red',
    icon: AlertTriangle,
  },
  scope: {
    label: 'Scope',
    color: 'blue',
    icon: Check,
  },
  boundary: {
    label: 'Boundary',
    color: 'sienna',
    icon: HelpCircle,
  },
}

const COVERAGE_CONFIG: Record<TestCase['coverage'], { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  covered: { label: 'Covered', variant: 'success' },
  partial: { label: 'Partial', variant: 'warning' },
  gap: { label: 'Gap', variant: 'destructive' },
}

export function TestCaseCard({ testCase, onEdit, className }: TestCaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const typeConfig = TYPE_CONFIG[testCase.type]
  const coverageConfig = COVERAGE_CONFIG[testCase.coverage]
  const Icon = typeConfig.icon

  const colorClasses: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      iconBg: 'bg-red-100',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100',
    },
    sienna: {
      bg: 'bg-[#FDF3EC]',
      border: 'border-[#E8D5C4]',
      text: 'text-[#A05A32]',
      iconBg: 'bg-[#F5E6DA]',
    },
  }

  const colors = colorClasses[typeConfig.color]

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-3 text-left',
          'hover:bg-gray-50 transition-colors'
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn('p-1.5 rounded', colors.iconBg)}>
            <Icon className={cn('h-4 w-4', colors.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{testCase.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs">
                {typeConfig.label}
              </Badge>
              <Badge variant={coverageConfig.variant} className="text-xs">
                {coverageConfig.label}
              </Badge>
              {testCase.sourceType === 'manual' && (
                <Badge variant="outline" className="text-xs">
                  Manual
                </Badge>
              )}
            </div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t bg-gray-50/50">
          {/* Description */}
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Description
            </p>
            <p className="text-sm text-gray-700">{testCase.description}</p>
          </div>

          {/* Steps */}
          {testCase.steps.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Test Steps
              </p>
              <ol className="list-decimal list-inside space-y-1">
                {testCase.steps.map((step, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Expected Outcome */}
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Expected Outcome
            </p>
            <p className="text-sm text-gray-700">{testCase.expectedOutcome}</p>
          </div>

          {/* Source content (if extracted) */}
          {testCase.sourceContent && (
            <div className="mt-3 p-2 bg-white rounded border">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-3 w-3 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">Source Evidence</p>
              </div>
              <p className="text-xs text-gray-600 italic">"{testCase.sourceContent}"</p>
            </div>
          )}

          {/* Actions */}
          {onEdit && (
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={onEdit}>
                Edit Test Case
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
