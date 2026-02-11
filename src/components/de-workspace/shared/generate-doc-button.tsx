'use client'

import { useState, useEffect, useRef } from 'react'
import { FileOutput, Loader2, Check, Download, Copy, Info, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type DocumentType = 'DE_DESIGN' | 'SOLUTION_DESIGN' | 'TEST_PLAN' | 'ALL'

interface GenerateDocButtonProps {
  designWeekId: string
  documentType: DocumentType
  disabled?: boolean
  onGenerate?: (type: DocumentType) => void
  className?: string
}

const DOC_TYPE_INFO: Record<Exclude<DocumentType, 'ALL'>, { label: string; description: string; estimatedTime: string }> = {
  DE_DESIGN: {
    label: 'Business Document',
    description: 'Client-facing Digital Employee design document',
    estimatedTime: '30-60s',
  },
  SOLUTION_DESIGN: {
    label: 'Technical Document',
    description: 'Internal technical architecture and implementation details',
    estimatedTime: '30-60s',
  },
  TEST_PLAN: {
    label: 'Test Plan',
    description: 'UAT test scenarios and acceptance criteria',
    estimatedTime: '15-30s',
  },
}

const GENERATION_STEPS = [
  'Fetching extracted data...',
  'Generating AI content...',
  'Building document structure...',
  'Finalizing...',
]

export function GenerateDocButton({
  designWeekId,
  documentType,
  disabled = false,
  onGenerate,
  className,
}: GenerateDocButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [progressStep, setProgressStep] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [generateAllProgress, setGenerateAllProgress] = useState<{ current: number; total: number; label: string } | null>(null)

  // Timer ref for elapsed time
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (stepTimerRef.current) clearInterval(stepTimerRef.current)
    }
  }, [])

  const startProgressSimulation = () => {
    setElapsedSeconds(0)
    setProgressStep(GENERATION_STEPS[0])

    // Elapsed time counter
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    // Step rotation
    let stepIndex = 0
    stepTimerRef.current = setInterval(() => {
      stepIndex++
      if (stepIndex < GENERATION_STEPS.length) {
        setProgressStep(GENERATION_STEPS[stepIndex])
      }
    }, 10000) // Advance step every 10s
  }

  const stopProgressSimulation = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current)
      stepTimerRef.current = null
    }
  }

  const handleGenerate = async (type: Exclude<DocumentType, 'ALL'>) => {
    setIsGenerating(true)
    setError(null)
    setMissingFields([])
    startProgressSimulation()

    try {
      const response = await fetch(`/api/design-weeks/${designWeekId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate document')
      }

      const data = await response.json()
      setGeneratedContent(data.document?.content || data.content)
      setShowPreview(true)

      // Capture missing fields from response
      if (data.missingFields && data.missingFields.length > 0) {
        setMissingFields(data.missingFields)
      }

      onGenerate?.(type)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate document')
    } finally {
      stopProgressSimulation()
      setIsGenerating(false)
      setProgressStep('')
    }
  }

  const handleGenerateAll = async () => {
    setIsGenerating(true)
    setError(null)
    setMissingFields([])
    startProgressSimulation()

    const docTypes = ['DE_DESIGN', 'SOLUTION_DESIGN', 'TEST_PLAN'] as const
    const allMissingFields: string[] = []

    try {
      for (let i = 0; i < docTypes.length; i++) {
        const type = docTypes[i]
        const info = DOC_TYPE_INFO[type]
        setGenerateAllProgress({ current: i + 1, total: docTypes.length, label: info.label })
        setProgressStep(`Generating ${info.label}...`)

        const response = await fetch(`/api/design-weeks/${designWeekId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.missingFields) {
            for (const field of data.missingFields) {
              if (!allMissingFields.includes(field)) {
                allMissingFields.push(field)
              }
            }
          }
        }
      }

      if (allMissingFields.length > 0) {
        setMissingFields(allMissingFields)
      }

      onGenerate?.('ALL')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate documents')
    } finally {
      stopProgressSimulation()
      setIsGenerating(false)
      setProgressStep('')
      setGenerateAllProgress(null)
    }
  }

  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent)
    }
  }

  const handleDownload = () => {
    if (generatedContent) {
      const blob = new Blob([generatedContent], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${documentType.toLowerCase()}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const progressIndicator = isGenerating ? (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
        <span>{progressStep}</span>
      </div>
      <p className="text-xs text-gray-400 pl-5">
        {elapsedSeconds}s elapsed
        {generateAllProgress && (
          <span className="ml-2">
            ({generateAllProgress.current}/{generateAllProgress.total} documents)
          </span>
        )}
      </p>
    </div>
  ) : null

  const missingFieldsWarning = missingFields.length > 0 && !error ? (
    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
      <div className="flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-amber-800">
            Generated with incomplete data
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Missing: {missingFields.join(', ')}
          </p>
        </div>
      </div>
    </div>
  ) : null

  const errorDisplay = error ? (
    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-start gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
        <p className="text-xs text-red-600 flex-1">{error}</p>
        <button
          onClick={() => {
            if (documentType === 'ALL') {
              handleGenerateAll()
            } else {
              handleGenerate(documentType)
            }
          }}
          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 shrink-0"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    </div>
  ) : null

  // Single document type button
  if (documentType !== 'ALL') {
    const info = DOC_TYPE_INFO[documentType]
    return (
      <div>
        <Button
          onClick={() => handleGenerate(documentType)}
          disabled={disabled || isGenerating}
          variant="outline"
          className={cn('gap-2', className)}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileOutput className="h-4 w-4" />
          )}
          {isGenerating ? 'Generating...' : `Generate ${info.label}`}
        </Button>

        {progressIndicator}
        {errorDisplay}
        {missingFieldsWarning}

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                {info.label} Generated
              </DialogTitle>
              <DialogDescription>{info.description}</DialogDescription>
            </DialogHeader>

            {missingFields.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Document generated with incomplete data
                    </p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      Missing sections: {missingFields.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4 bg-gray-50 rounded-lg border">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {generatedContent}
              </pre>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // "Generate All" button
  return (
    <div>
      <Button
        onClick={handleGenerateAll}
        disabled={disabled || isGenerating}
        className={cn('gap-2', className)}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileOutput className="h-4 w-4" />
        )}
        {isGenerating
          ? generateAllProgress
            ? `Generating ${generateAllProgress.current}/${generateAllProgress.total}...`
            : 'Generating...'
          : 'Generate All Documents'}
      </Button>

      {progressIndicator}
      {errorDisplay}
      {missingFieldsWarning}
    </div>
  )
}
