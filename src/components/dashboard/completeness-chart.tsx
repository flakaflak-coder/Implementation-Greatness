'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface CompletenessCategory {
  name: string
  score: number
  total: number
  confirmed: number
  ambiguous: number
}

interface CompletenessChartProps {
  categories: CompletenessCategory[]
  overallScore: number
  className?: string
}

export function CompletenessChart({
  categories,
  overallScore,
  className,
}: CompletenessChartProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return '[&>div]:bg-green-600'
    if (score >= 60) return '[&>div]:bg-amber-500'
    return '[&>div]:bg-red-500'
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall score */}
      <div className="flex items-center justify-between pb-4 border-b">
        <span className="text-sm font-medium text-gray-700">Overall</span>
        <span className={cn('text-2xl font-bold', getScoreColor(overallScore))}>
          {overallScore}%
        </span>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{category.name}</span>
              <div className="flex items-center gap-2">
                {category.ambiguous > 0 && (
                  <span className="text-xs text-amber-600">
                    {category.ambiguous} ambiguous
                  </span>
                )}
                <span className={cn('font-medium', getScoreColor(category.score))}>
                  {category.score}%
                </span>
              </div>
            </div>
            <Progress
              value={category.score}
              className={cn('h-2', getProgressColor(category.score))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
