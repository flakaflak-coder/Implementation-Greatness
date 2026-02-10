'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TestCaseCard } from './test-case-card'
import type { TestCase, TestCaseType } from '../types'

interface TestGroupProps {
  type: TestCaseType
  testCases: TestCase[]
  defaultExpanded?: boolean
  onAddTest?: () => void
  onEditTest?: (testCase: TestCase) => void
  className?: string
}

const GROUP_CONFIG: Record<
  TestCaseType,
  { title: string; description: string; icon: string; color: string }
> = {
  happy_path: {
    title: 'Happy Path Tests',
    description: 'Verify standard workflows complete successfully',
    icon: 'CheckCircle',
    color: 'emerald',
  },
  exception: {
    title: 'Exception Tests',
    description: 'Verify exception scenarios are handled correctly',
    icon: 'AlertTriangle',
    color: 'amber',
  },
  guardrail: {
    title: 'Guardrail Tests',
    description: 'Verify the DE respects boundaries and restrictions',
    icon: 'Shield',
    color: 'red',
  },
  scope: {
    title: 'Scope Tests',
    description: 'Verify in-scope items are handled correctly',
    icon: 'CheckSquare',
    color: 'blue',
  },
  boundary: {
    title: 'Boundary Tests',
    description: 'Verify out-of-scope items are rejected or escalated',
    icon: 'XSquare',
    color: 'sienna',
  },
}

export function TestGroup({
  type,
  testCases,
  defaultExpanded = true,
  onAddTest,
  onEditTest,
  className,
}: TestGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const config = GROUP_CONFIG[type]
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    config.icon
  ] || LucideIcons.Circle

  const coveredCount = testCases.filter((t) => t.coverage === 'covered').length
  const gapCount = testCases.filter((t) => t.coverage === 'gap').length

  const colorClasses: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      headerBg: 'bg-emerald-500',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      headerBg: 'bg-amber-500',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      headerBg: 'bg-red-500',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      headerBg: 'bg-blue-500',
    },
    sienna: {
      bg: 'bg-[#FDF3EC]',
      border: 'border-[#E8D5C4]',
      text: 'text-[#A05A32]',
      headerBg: 'bg-[#C2703E]',
    },
  }

  const colors = colorClasses[config.color]

  return (
    <div className={cn('rounded-xl border overflow-hidden', className)}>
      {/* Color accent bar */}
      <div className={cn('h-1', colors.headerBg)} />

      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-4 text-left',
          'hover:bg-gray-50 transition-colors'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colors.bg)}>
            <IconComponent className={cn('h-5 w-5', colors.text)} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{config.title}</h3>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{testCases.length} tests</Badge>
            {gapCount > 0 && (
              <Badge variant="destructive">{gapCount} gaps</Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {testCases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <IconComponent className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No {config.title.toLowerCase()} yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Tests will be generated from extracted data
              </p>
            </div>
          ) : (
            testCases.map((testCase) => (
              <TestCaseCard
                key={testCase.id}
                testCase={testCase}
                onEdit={onEditTest ? () => onEditTest(testCase) : undefined}
              />
            ))
          )}

          {onAddTest && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddTest}
              className="w-full border-dashed gap-2"
            >
              <Plus className="h-4 w-4" />
              Add {config.title.replace(' Tests', '')} Test
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
