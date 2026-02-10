'use client'

import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ui/error-boundary'

export type StageStatus = 'pending' | 'running' | 'complete' | 'error'

export interface PipelineStage {
  id: string
  name: string
  description: string
  status: StageStatus
  percent?: number
  message?: string
  details?: Record<string, unknown>
}

interface PipelineProgressProps {
  stages: PipelineStage[]
  className?: string
}

export function PipelineProgress(props: PipelineProgressProps) {
  return (
    <ErrorBoundary>
      <PipelineProgressInner {...props} />
    </ErrorBoundary>
  )
}

function PipelineProgressInner({ stages, className }: PipelineProgressProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {stages.map((stage, index) => (
        <div key={stage.id} className="relative">
          {/* Connection line */}
          {index < stages.length - 1 && (
            <div
              className={cn(
                'absolute left-[11px] top-6 w-0.5 h-8',
                stage.status === 'complete' ? 'bg-emerald-400' : 'bg-gray-200'
              )}
            />
          )}

          <div className="flex items-start gap-3">
            {/* Status icon */}
            <div className="flex-shrink-0 mt-0.5">
              {stage.status === 'complete' && (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              )}
              {stage.status === 'running' && (
                <div className="relative">
                  <Circle className="h-6 w-6 text-[#F5E6DA]" />
                  <Loader2 className="h-6 w-6 text-[#C2703E] absolute top-0 left-0 animate-spin" />
                </div>
              )}
              {stage.status === 'pending' && (
                <Circle className="h-6 w-6 text-gray-300" />
              )}
              {stage.status === 'error' && (
                <AlertCircle className="h-6 w-6 text-red-500" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'font-medium text-sm',
                    stage.status === 'complete' && 'text-emerald-700',
                    stage.status === 'running' && 'text-[#A05A32]',
                    stage.status === 'pending' && 'text-gray-500',
                    stage.status === 'error' && 'text-red-700'
                  )}
                >
                  {stage.name}
                </span>
                {stage.status === 'running' && stage.percent !== undefined && (
                  <span className="text-xs text-[#C2703E] font-medium">
                    {stage.percent}%
                  </span>
                )}
              </div>

              {stage.status === 'running' && (
                <div className="flex items-center gap-2 mt-0.5">
                  {stage.message && (
                    <p className="text-xs text-gray-500 truncate">
                      {stage.message}
                    </p>
                  )}
                  {stage.details?.entityCount !== undefined && (stage.details.entityCount as number) > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#F5E6DA] text-[#A05A32]">
                      {stage.details.entityCount as number} entities
                    </span>
                  )}
                </div>
              )}

              {stage.status === 'complete' && stage.message && (
                <p className="text-xs text-emerald-600 mt-0.5 truncate">
                  {stage.message}
                </p>
              )}

              {stage.status === 'error' && stage.message && (
                <p className="text-xs text-red-600 mt-0.5">
                  {stage.message}
                </p>
              )}

              {/* Progress bar for running stage */}
              {stage.status === 'running' && stage.percent !== undefined && (
                <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C2703E] rounded-full transition-all duration-300"
                    style={{ width: `${stage.percent}%` }}
                  />
                </div>
              )}

              {/* Details for complete stage */}
              {stage.status === 'complete' && stage.details && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {Object.entries(stage.details).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                    >
                      {formatDetailKey(key)}: {formatDetailValue(value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatDetailKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

function formatDetailValue(value: unknown): string {
  if (typeof value === 'number') {
    return value.toLocaleString()
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }
  return String(value)
}

/**
 * Create pipeline stages from job status
 */
export function createPipelineStages(
  currentStage: string,
  status: string,
  progress?: {
    stage: string
    status: string
    percent: number
    message: string
    details?: Record<string, unknown>
  },
  classification?: { type: string; confidence: number },
  population?: { extractedItems: number; integrations: number }
): PipelineStage[] {
  const stageOrder = [
    'CLASSIFICATION',
    'GENERAL_EXTRACTION',
    'SPECIALIZED_EXTRACTION',
    'TAB_POPULATION',
    'COMPLETE',
  ]

  const stageNames: Record<string, { name: string; description: string }> = {
    CLASSIFICATION: {
      name: 'Classifying Content',
      description: 'Analyzing content type...',
    },
    GENERAL_EXTRACTION: {
      name: 'Extracting Entities',
      description: 'Finding all relevant information...',
    },
    SPECIALIZED_EXTRACTION: {
      name: 'Specialized Analysis',
      description: 'Type-specific extraction...',
    },
    TAB_POPULATION: {
      name: 'Populating Profiles',
      description: 'Adding items to tabs...',
    },
    COMPLETE: {
      name: 'Complete',
      description: 'Processing finished',
    },
  }

  const currentIndex = stageOrder.indexOf(currentStage)

  return stageOrder.slice(0, -1).map((stageId, index) => {
    let stageStatus: StageStatus = 'pending'
    let message: string | undefined
    let details: Record<string, unknown> | undefined
    let percent: number | undefined

    if (index < currentIndex || status === 'COMPLETE') {
      stageStatus = 'complete'

      // Add details for completed stages
      if (stageId === 'CLASSIFICATION' && classification) {
        message = `Classified as: ${formatClassificationType(classification.type)}`
        details = { confidence: `${Math.round(classification.confidence * 100)}%` }
      }
      if (stageId === 'TAB_POPULATION' && population) {
        message = `Added ${population.extractedItems} items`
        details = {
          items: population.extractedItems,
          integrations: population.integrations,
        }
      }
    } else if (index === currentIndex && status !== 'FAILED') {
      stageStatus = 'running'
      if (progress && progress.stage === stageId) {
        percent = progress.percent
        message = progress.message
        // Pass through details like entityCount
        if (progress.details) {
          details = progress.details
        }
      }
    } else if (status === 'FAILED' && index === currentIndex) {
      stageStatus = 'error'
      if (progress) {
        message = progress.message
      }
    }

    return {
      id: stageId,
      name: stageNames[stageId].name,
      description: stageNames[stageId].description,
      status: stageStatus,
      percent,
      message,
      details,
    }
  })
}

function formatClassificationType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}
