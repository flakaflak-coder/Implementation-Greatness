'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileAudio, FileText, FileVideo, X, RefreshCw, CheckCircle2, AlertCircle, Settings2, Check, Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
// Card imports removed — parent provides wrapper
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { PipelineProgress, createPipelineStages } from './pipeline-progress'
import type { ExtractionMode } from '@/lib/pipeline/types'

// Estimate processing time based on file type and size
function estimateProcessingTime(file: File): { min: number; max: number; label: string } {
  const sizeMB = file.size / 1024 / 1024
  const isAudioVideo = file.type.startsWith('audio/') || file.type.startsWith('video/')
  const isDocument = file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')

  if (isAudioVideo) {
    // Audio/video: ~30-60 seconds per 10MB (transcription + extraction)
    const baseMin = 30
    const baseMax = 90
    const sizeMultiplier = Math.max(1, sizeMB / 10)
    return {
      min: Math.round(baseMin * sizeMultiplier),
      max: Math.round(baseMax * sizeMultiplier),
      label: sizeMB > 50 ? 'Large recording - this may take a few minutes' : 'Processing recording...',
    }
  } else if (isDocument) {
    // Documents: faster, ~15-30 seconds base + size factor
    const baseMin = 15
    const baseMax = 45
    const sizeMultiplier = Math.max(1, sizeMB / 5)
    return {
      min: Math.round(baseMin * sizeMultiplier),
      max: Math.round(baseMax * sizeMultiplier),
      label: 'Processing document...',
    }
  }

  // Default fallback
  return { min: 30, max: 120, label: 'Processing...' }
}

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `~${Math.ceil(seconds / 10) * 10}s remaining`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSecs = seconds % 60
  if (remainingSecs === 0) {
    return `~${minutes}m remaining`
  }
  return `~${minutes}m ${Math.ceil(remainingSecs / 10) * 10}s remaining`
}

function formatTimeElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSecs = seconds % 60
  return `${minutes}:${remainingSecs.toString().padStart(2, '0')}`
}

interface UnifiedUploadProps {
  designWeekId: string
  onComplete?: () => void
  className?: string
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

interface JobStatus {
  jobId: string
  status: string
  stage: string
  progress?: {
    stage: string
    status: string
    percent: number
    message: string
    details?: Record<string, unknown>
  }
  classification?: {
    type: string
    confidence: number
    missingQuestions?: string[]
  }
  population?: {
    extractedItems: number
    integrations: number
    businessRules: number
    testCases: number
    warnings: string[]
  }
  error?: string
}

const ACCEPTED_TYPES = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'audio/mp4': ['.m4a'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
}

const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_TYPES).flat().join(', ')

const EXTRACTION_MODES: { value: ExtractionMode; label: string; description: string; recommended?: boolean }[] = [
  { value: 'auto', label: 'Auto', description: 'AI picks the best strategy', recommended: true },
  { value: 'standard', label: 'Standard', description: 'Single-pass extraction' },
  { value: 'exhaustive', label: 'Exhaustive', description: 'Maximum coverage, slower' },
  { value: 'two-pass', label: 'Two-Pass', description: 'Extract then re-check for missed items' },
  { value: 'multi-model', label: 'Multi-Model', description: 'Use both Gemini and Claude' },
  { value: 'section-based', label: 'Section-Based', description: 'Split document into sections first' },
]

export function UnifiedUpload({ designWeekId, onComplete, className }: UnifiedUploadProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>('auto')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [timeEstimate, setTimeEstimate] = useState<{ min: number; max: number; label: string } | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up EventSource and timer on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Timer for tracking elapsed time during processing
  useEffect(() => {
    if (state === 'processing' || state === 'uploading') {
      setElapsedTime(0)
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [])

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const isValidType = Object.keys(ACCEPTED_TYPES).includes(selectedFile.type) ||
      Object.values(ACCEPTED_TYPES).flat().some(ext =>
        selectedFile.name.toLowerCase().endsWith(ext)
      )

    if (!isValidType) {
      setError(`Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS}`)
      return
    }

    setFile(selectedFile)
    setError(null)
    setTimeEstimate(estimateProcessingTime(selectedFile))
    setElapsedTime(0)
    startUpload(selectedFile)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const startUpload = async (uploadFile: File) => {
    setState('uploading')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('designWeekId', designWeekId)
      formData.append('extractionMode', extractionMode)

      const response = await fetch('/api/upload/start', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()
      setJobStatus({ jobId: data.jobId, status: 'QUEUED', stage: 'CLASSIFICATION' })
      setState('processing')

      // Start listening for progress updates
      startStatusStream(data.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setState('error')
    }
  }

  const startStatusStream = (jobId: string) => {
    // Close any existing connection
    eventSourceRef.current?.close()

    const eventSource = new EventSource(`/api/upload/${jobId}/status`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobStatus
        setJobStatus(data)

        if (data.status === 'COMPLETE') {
          setState('complete')
          eventSource.close()
          onComplete?.()
        } else if (data.status === 'FAILED') {
          setState('error')
          setError(data.error || 'Processing failed')
          eventSource.close()
        }
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      if (state === 'processing') {
        setError('Connection lost. Check status manually.')
      }
    }
  }

  const handleRetry = async () => {
    if (!jobStatus?.jobId) return

    setState('processing')
    setError(null)

    try {
      const response = await fetch(`/api/upload/${jobStatus.jobId}/retry`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Retry failed')
      }

      // Restart status stream
      startStatusStream(jobStatus.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed')
      setState('error')
    }
  }

  const handleReset = () => {
    eventSourceRef.current?.close()
    if (timerRef.current) clearInterval(timerRef.current)
    setFile(null)
    setJobStatus(null)
    setState('idle')
    setError(null)
    setElapsedTime(0)
    setTimeEstimate(null)
  }

  const handleCancel = async () => {
    if (!jobStatus?.jobId) {
      handleReset()
      return
    }

    try {
      // Try to cancel the job on the server
      await fetch(`/api/upload/${jobStatus.jobId}/cancel`, {
        method: 'POST',
      })
    } catch {
      // Ignore errors - we'll reset locally anyway
    }

    // Reset local state
    handleReset()
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('audio/')) return FileAudio
    if (mimeType.startsWith('video/')) return FileVideo
    return FileText
  }

  // Render pipeline stages
  const pipelineStages = jobStatus
    ? createPipelineStages(
        jobStatus.stage,
        jobStatus.status,
        jobStatus.progress,
        jobStatus.classification,
        jobStatus.population
      )
    : []

  return (
    <div className={cn('space-y-3', className)}>
        {state === 'idle' && (
          <div className="space-y-3">
            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer',
                isDragging
                  ? 'border-[#C2703E] bg-[#FDF3EC]'
                  : 'border-stone-200 hover:border-stone-300'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <p className="text-sm text-stone-600 mb-1">
                Drop recording, transcript, or document
              </p>
              <p className="text-xs text-stone-400">
                Supports: MP4, MP3, WAV, PDF, DOCX, TXT
              </p>
              <input
                id="file-input"
                type="file"
                accept={Object.keys(ACCEPTED_TYPES).join(',')}
                onChange={handleInputChange}
                className="hidden"
              />
            </div>

            {/* Advanced options - collapsible extraction mode selector */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors group w-full">
                <ChevronRight className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  showAdvanced && 'rotate-90'
                )} />
                <Settings2 className="h-3.5 w-3.5" />
                <span>Advanced options</span>
                {extractionMode !== 'auto' && (
                  <span className="ml-auto text-[10px] text-[#C2703E] bg-[#FDF3EC] px-1.5 py-0.5 rounded font-medium">
                    {EXTRACTION_MODES.find(m => m.value === extractionMode)?.label}
                  </span>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="p-4 bg-[#FDF3EC] rounded-lg border border-[#E8D5C4]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-[#A05A32]">
                      Extraction Mode
                    </p>
                    <span className="text-xs text-[#C2703E] bg-[#F5E6DA] px-2 py-1 rounded">
                      {EXTRACTION_MODES.find(m => m.value === extractionMode)?.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {EXTRACTION_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setExtractionMode(mode.value)}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-all relative',
                          extractionMode === mode.value
                            ? 'border-[#C2703E] bg-white ring-2 ring-[#C2703E] shadow-sm'
                            : 'border-[#F5E6DA] bg-white/50 hover:border-[#C2703E] hover:bg-white'
                        )}
                      >
                        {mode.recommended && (
                          <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                            Recommended
                          </span>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            'font-medium text-sm',
                            extractionMode === mode.value ? 'text-[#A05A32]' : 'text-gray-700'
                          )}>{mode.label}</span>
                          {extractionMode === mode.value && (
                            <Check className="h-4 w-4 text-[#C2703E]" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{mode.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {(state === 'uploading' || state === 'processing') && file && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {(() => {
                const Icon = getFileIcon(file.type)
                return <Icon className="h-8 w-8 text-[#C2703E]" />
              })()}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              {state === 'uploading' && (
                <div className="h-5 w-5 border-2 border-[#C2703E] border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Time estimate banner */}
            {timeEstimate && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#FDF3EC] border border-[#F5E6DA] rounded-lg">
                <Clock className="h-4 w-4 text-[#C2703E]" />
                <div className="flex-1">
                  <p className="text-sm text-[#A05A32]">
                    {state === 'uploading' ? 'Uploading...' : timeEstimate.label}
                  </p>
                  <p className="text-xs text-[#C2703E]">
                    {elapsedTime === 0 ? (
                      `Usually takes ${timeEstimate.min < 60 ? `${timeEstimate.min}-${timeEstimate.max}s` : `${Math.ceil(timeEstimate.min / 60)}-${Math.ceil(timeEstimate.max / 60)} min`}`
                    ) : (
                      <>
                        <span className="font-medium">{formatTimeElapsed(elapsedTime)}</span>
                        {' elapsed'}
                        {elapsedTime < timeEstimate.max && (
                          <span className="text-[#C2703E]/70">
                            {' • '}{formatTimeRemaining(Math.max(0, timeEstimate.max - elapsedTime))}
                          </span>
                        )}
                        {elapsedTime >= timeEstimate.max && (
                          <span className="text-[#C2703E]/70"> • Almost done...</span>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Pipeline progress */}
            {state === 'processing' && (
              <PipelineProgress stages={pipelineStages} />
            )}

            {/* Cancel button */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {state === 'complete' && jobStatus && (
          <div className="space-y-4">
            {/* Success message */}
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-800">
                  Processing Complete!
                </p>
                {jobStatus.population && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Added {jobStatus.population.extractedItems} items,{' '}
                    {jobStatus.population.integrations} integrations,{' '}
                    {jobStatus.population.testCases} test cases
                  </p>
                )}
              </div>
            </div>

            {/* Classification result */}
            {jobStatus.classification && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Classified as</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatClassificationType(jobStatus.classification.type)}
                </p>
                {jobStatus.classification.missingQuestions && jobStatus.classification.missingQuestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-amber-600 font-medium mb-1">
                      Consider asking:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {jobStatus.classification.missingQuestions.slice(0, 3).map((q, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-amber-500">•</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Upload another button */}
            <Button variant="outline" onClick={handleReset} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Another
            </Button>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            {/* Error message */}
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  Processing Failed
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {error || 'An unknown error occurred'}
                </p>
              </div>
            </div>

            {/* Retry/Reset buttons */}
            <div className="flex gap-3">
              {jobStatus && (
                <Button variant="outline" onClick={handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
              <Button variant="outline" onClick={handleReset} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Start Over
              </Button>
            </div>
          </div>
        )}

        {error && state === 'idle' && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
    </div>
  )
}

function formatClassificationType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}
