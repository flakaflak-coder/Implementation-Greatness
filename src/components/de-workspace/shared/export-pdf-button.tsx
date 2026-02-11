'use client'

import { useState, useRef, useCallback } from 'react'
import { FileDown, Loader2, Globe, Sparkles, Eye, X, Download, AlertTriangle, RefreshCw, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type DocumentLanguage = 'en' | 'nl' | 'de' | 'fr' | 'es'
type DocumentType = 'design' | 'meet' | 'test-plan' | 'process' | 'executive' | 'technical'

const LANGUAGES: Array<{ code: DocumentLanguage; name: string; flag: string }> = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]

const DOCUMENT_TYPES: Array<{ code: DocumentType; name: string; description: string }> = [
  { code: 'design', name: 'Full Design Doc', description: 'Complete DE design document' },
  { code: 'meet', name: 'Meet Your DE', description: 'One-pager introduction' },
  { code: 'executive', name: 'Executive Summary', description: 'Goals, KPIs, stakeholders' },
  { code: 'process', name: 'Process Design', description: 'Process flow & scope' },
  { code: 'technical', name: 'Technical Foundation', description: 'Integrations & security' },
  { code: 'test-plan', name: 'Test Plan', description: 'UAT test cases' },
]

interface ExportPDFButtonProps {
  designWeekId: string
  disabled?: boolean
  className?: string
}

// Estimated generation times by document type (in seconds)
// Error response type from API
interface ExportError {
  error: string
  code: 'DESIGN_WEEK_NOT_FOUND' | 'INVALID_LANGUAGE' | 'INVALID_TYPE' | 'AI_GENERATION_FAILED' | 'PDF_RENDER_FAILED' | 'DATABASE_ERROR' | 'UNKNOWN_ERROR'
  phase?: string
  details?: string
}

// Map error codes to user-friendly messages
const ERROR_MESSAGES: Record<ExportError['code'], { title: string; description: string; canRetry: boolean }> = {
  DESIGN_WEEK_NOT_FOUND: {
    title: 'Design Week Not Found',
    description: 'The design week data could not be found.',
    canRetry: false,
  },
  INVALID_LANGUAGE: {
    title: 'Invalid Language',
    description: 'The selected language is not supported.',
    canRetry: false,
  },
  INVALID_TYPE: {
    title: 'Invalid Document Type',
    description: 'The selected document type is not supported.',
    canRetry: false,
  },
  AI_GENERATION_FAILED: {
    title: 'AI Generation Failed',
    description: 'The AI could not generate content. This may be a temporary issue.',
    canRetry: true,
  },
  PDF_RENDER_FAILED: {
    title: 'PDF Render Failed',
    description: 'Failed to create the PDF document.',
    canRetry: true,
  },
  DATABASE_ERROR: {
    title: 'Database Error',
    description: 'Could not fetch the required data.',
    canRetry: true,
  },
  UNKNOWN_ERROR: {
    title: 'Generation Failed',
    description: 'An unexpected error occurred.',
    canRetry: true,
  },
}

// Timeout for document generation (90 seconds for design docs, 30 seconds for others)
const GENERATION_TIMEOUT: Record<DocumentType, number> = {
  design: 90000,
  meet: 45000,
  'test-plan': 15000,
  process: 15000,
  executive: 15000,
  technical: 15000,
}

const GENERATION_TIMES: Record<DocumentType, { min: number; max: number; steps: string[] }> = {
  design: {
    min: 30,
    max: 60,
    steps: ['Fetching data...', 'Generating AI content...', 'Building narratives...', 'Rendering PDF...']
  },
  meet: {
    min: 15,
    max: 30,
    steps: ['Fetching data...', 'Generating avatar...', 'Writing introduction...', 'Rendering PDF...']
  },
  'test-plan': { min: 2, max: 5, steps: ['Fetching test cases...', 'Rendering PDF...'] },
  process: { min: 2, max: 5, steps: ['Fetching process data...', 'Rendering PDF...'] },
  executive: { min: 2, max: 5, steps: ['Fetching summary data...', 'Rendering PDF...'] },
  technical: { min: 2, max: 5, steps: ['Fetching technical data...', 'Rendering PDF...'] },
}

export function ExportPDFButton({
  designWeekId,
  disabled = false,
  className,
}: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<DocumentLanguage>('en')
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('design')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState<string>('design-document.pdf')
  const [showPreview, setShowPreview] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStep, setProgressStep] = useState('')
  const [missingFields, setMissingFields] = useState<string[]>([])

  // Simulate progress based on estimated time
  const simulateProgress = (docType: DocumentType) => {
    const timing = GENERATION_TIMES[docType]
    const totalDuration = ((timing.min + timing.max) / 2) * 1000 // Use average
    const stepDuration = totalDuration / timing.steps.length
    let currentStep = 0

    setProgress(0)
    setProgressStep(timing.steps[0])

    const interval = setInterval(() => {
      currentStep++
      if (currentStep < timing.steps.length) {
        setProgressStep(timing.steps[currentStep])
        setProgress(Math.round((currentStep / timing.steps.length) * 90)) // Cap at 90% until complete
      }
    }, stepDuration)

    // Also update progress smoothly
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 90))
    }, totalDuration / 50)

    return () => {
      clearInterval(interval)
      clearInterval(progressInterval)
    }
  }

  const generatePdf = useCallback(async (
    docType: DocumentType = selectedDocType,
    language: DocumentLanguage = selectedLanguage
  ): Promise<{ url: string; filename: string; missingFields: string[] } | null> => {
    // Start progress simulation
    const stopProgress = simulateProgress(docType)

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT[docType])

    try {
      const response = await fetch(
        `/api/design-weeks/${designWeekId}/export?type=${docType}&format=pdf&language=${language}&enhanced=true`,
        { signal: controller.signal }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        const data = await response.json() as ExportError
        const errorInfo = ERROR_MESSAGES[data.code] || ERROR_MESSAGES.UNKNOWN_ERROR

        // Create a structured error
        const error = new Error(errorInfo.description) as Error & { code?: string; canRetry?: boolean }
        error.code = data.code
        error.canRetry = errorInfo.canRetry
        throw error
      }

      // Complete the progress
      setProgress(100)
      setProgressStep('Complete!')

      // Read missing fields from response header
      let responseMissingFields: string[] = []
      const missingFieldsHeader = response.headers.get('X-Missing-Fields')
      if (missingFieldsHeader) {
        try {
          responseMissingFields = JSON.parse(missingFieldsHeader) as string[]
        } catch {
          // Ignore parse errors
        }
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || 'design-document.pdf'

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      return { url, filename, missingFields: responseMissingFields }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        const timeoutError = new Error(`Generation timed out after ${GENERATION_TIMEOUT[docType] / 1000}s. The AI may be overloaded - please try again.`) as Error & { code?: string; canRetry?: boolean }
        timeoutError.code = 'TIMEOUT'
        timeoutError.canRetry = true
        throw timeoutError
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
      stopProgress()
    }
  }, [designWeekId, selectedDocType, selectedLanguage, simulateProgress])

  const handlePreview = async () => {
    setIsGeneratingPreview(true)
    setError(null)
    setMissingFields([])
    setProgress(0)
    setProgressStep('')

    try {
      const result = await generatePdf()
      if (result) {
        setPreviewUrl(result.url)
        setPreviewFilename(result.filename)
        setShowPreview(true)
        if (result.missingFields.length > 0) {
          setMissingFields(result.missingFields)
        }
      }
    } catch (err) {
      const error = err as Error & { canRetry?: boolean }
      const errorMessage = error.message || 'Failed to generate preview'
      setError(errorMessage)

      // Show toast with retry option if applicable
      if (error.canRetry) {
        toast.error('Generation failed', {
          description: errorMessage,
          action: {
            label: 'Retry',
            onClick: handlePreview,
          },
        })
      }
    } finally {
      setIsGeneratingPreview(false)
      setTimeout(() => { setProgress(0); setProgressStep('') }, 500)
    }
  }

  const handleDownload = () => {
    if (previewUrl) {
      const a = document.createElement('a')
      a.href = previewUrl
      a.download = previewFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleClosePreview = () => {
    setShowPreview(false)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  // Track background exports
  const backgroundExportRef = useRef<AbortController | null>(null)

  const handleExport = async (background = false) => {
    const docName = DOCUMENT_TYPES.find(d => d.code === selectedDocType)?.name || 'document'

    if (background) {
      // Background export - show toast and don't block UI
      const toastId = toast.loading(`Generating ${docName}...`, {
        description: `Est. ${GENERATION_TIMES[selectedDocType].min}-${GENERATION_TIMES[selectedDocType].max}s`,
      })

      // Run in background
      generatePdfInBackground(selectedDocType, selectedLanguage, toastId, docName)
      return
    }

    // Foreground export (original behavior)
    setIsExporting(true)
    setError(null)
    setMissingFields([])
    setProgress(0)
    setProgressStep('')

    try {
      const result = await generatePdf()
      if (result) {
        if (result.missingFields.length > 0) {
          setMissingFields(result.missingFields)
        }
        const a = document.createElement('a')
        a.href = result.url
        a.download = result.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(result.url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF')
    } finally {
      setIsExporting(false)
      setTimeout(() => { setProgress(0); setProgressStep('') }, 500)
    }
  }

  const generatePdfInBackground = useCallback(async (
    docType: DocumentType,
    language: DocumentLanguage,
    toastId: string | number,
    docName: string
  ) => {
    const timing = GENERATION_TIMES[docType]
    const steps = timing.steps
    let currentStepIndex = 0

    // Update toast with progress
    const updateProgress = () => {
      if (currentStepIndex < steps.length) {
        toast.loading(`${docName}: ${steps[currentStepIndex]}`, {
          id: toastId,
          description: `Step ${currentStepIndex + 1}/${steps.length}`,
        })
        currentStepIndex++
      }
    }

    // Start progress updates
    const stepDuration = ((timing.min + timing.max) / 2 * 1000) / steps.length
    const progressInterval = setInterval(updateProgress, stepDuration)

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT[docType])

    try {
      const response = await fetch(
        `/api/design-weeks/${designWeekId}/export?type=${docType}&format=pdf&language=${language}&enhanced=true`,
        { signal: controller.signal }
      )

      clearInterval(progressInterval)
      clearTimeout(timeoutId)

      if (!response.ok) {
        const data = await response.json() as ExportError
        const errorInfo = ERROR_MESSAGES[data.code] || ERROR_MESSAGES.UNKNOWN_ERROR
        throw new Error(errorInfo.description)
      }

      // Read missing fields from response header
      let bgMissingFields: string[] = []
      const missingFieldsHeader = response.headers.get('X-Missing-Fields')
      if (missingFieldsHeader) {
        try {
          bgMissingFields = JSON.parse(missingFieldsHeader) as string[]
        } catch {
          // Ignore parse errors
        }
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || 'design-document.pdf'

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // Build description with missing fields warning
      const successDescription = bgMissingFields.length > 0
        ? `Generated with gaps in: ${bgMissingFields.join(', ')}`
        : 'Click to download your document'

      // Also update component state so the inline warning persists
      if (bgMissingFields.length > 0) {
        setMissingFields(bgMissingFields)
      }

      // Update toast with download action
      toast.success(`${docName} ready!`, {
        id: toastId,
        description: successDescription,
        action: {
          label: 'Download',
          onClick: () => {
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            // Don't revoke immediately - user might click again
            setTimeout(() => URL.revokeObjectURL(url), 60000)
          },
        },
        duration: 30000, // Keep toast visible for 30s
      })
    } catch (err) {
      clearInterval(progressInterval)
      clearTimeout(timeoutId)

      const isTimeout = err instanceof Error && err.name === 'AbortError'
      const errorMessage = isTimeout
        ? 'Request timed out. The AI may be busy.'
        : err instanceof Error ? err.message : 'Unknown error'

      // Show error toast with retry button
      toast.error(`Failed: ${docName}`, {
        id: toastId,
        description: errorMessage,
        action: {
          label: 'Retry',
          onClick: () => {
            const newToastId = toast.loading(`Retrying ${docName}...`, {
              description: 'Starting generation...',
            })
            generatePdfInBackground(docType, language, newToastId, docName)
          },
        },
        duration: 15000,
      })
    }
  }, [designWeekId])

  return (
    <>
      <div className={cn('flex flex-col', className)}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Document type selector */}
          <Select
            value={selectedDocType}
            onValueChange={(value) => setSelectedDocType(value as DocumentType)}
            disabled={disabled || isExporting || isGeneratingPreview}
          >
            <SelectTrigger className="w-44">
              <FileDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Document" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((doc) => (
                <SelectItem key={doc.code} value={doc.code}>
                  <span className="flex flex-col">
                    <span className="font-medium">{doc.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Language selector */}
          <Select
            value={selectedLanguage}
            onValueChange={(value) => setSelectedLanguage(value as DocumentLanguage)}
            disabled={disabled || isExporting || isGeneratingPreview}
          >
            <SelectTrigger className="w-35">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Preview button */}
          <Button
            onClick={handlePreview}
            disabled={disabled || isExporting || isGeneratingPreview}
            variant="outline"
            className="gap-2"
          >
            {isGeneratingPreview ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Loading...</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Preview</span>
              </>
            )}
          </Button>

          {/* Export button - runs in background */}
          <Button
            onClick={() => handleExport(true)}
            disabled={disabled}
            className="gap-2 bg-[#C2703E] hover:bg-[#A05A32]"
          >
            <Sparkles className="h-4 w-4" />
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
        </div>

        {/* Progress bar during preview generation */}
        {isGeneratingPreview ? (
          <div className="mt-3 space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{progressStep}</span>
              <span className="text-gray-500">{progress}%</span>
            </div>
            <p className="text-xs text-gray-400">
              Est. {GENERATION_TIMES[selectedDocType].min}-{GENERATION_TIMES[selectedDocType].max}s
            </p>
          </div>
        ) : (
          /* Document type description with timing hint */
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#C2703E]" />
            {DOCUMENT_TYPES.find(d => d.code === selectedDocType)?.description}
            <span className="text-gray-400 ml-1">
              (~{GENERATION_TIMES[selectedDocType].min}-{GENERATION_TIMES[selectedDocType].max}s)
            </span>
          </p>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">Generation Failed</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreview}
                className="text-red-600 hover:text-red-700 hover:bg-red-100 gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Missing fields warning */}
        {missingFields.length > 0 && !error && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  Document generated with incomplete data
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Missing sections: {missingFields.join(', ')}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Upload more session recordings to fill in these gaps.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-[#C2703E]" />
                PDF Preview
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button onClick={handleDownload} className="gap-2 bg-[#C2703E] hover:bg-[#A05A32]">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button variant="ghost" size="icon" onClick={handleClosePreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-gray-100 rounded-lg overflow-hidden">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
