'use client'

import { useState } from 'react'
import { FileOutput, Loader2, Check, Download, Copy } from 'lucide-react'
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

const DOC_TYPE_INFO: Record<Exclude<DocumentType, 'ALL'>, { label: string; description: string }> = {
  DE_DESIGN: {
    label: 'Business Document',
    description: 'Client-facing Digital Employee design document',
  },
  SOLUTION_DESIGN: {
    label: 'Technical Document',
    description: 'Internal technical architecture and implementation details',
  },
  TEST_PLAN: {
    label: 'Test Plan',
    description: 'UAT test scenarios and acceptance criteria',
  },
}

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

  const handleGenerate = async (type: Exclude<DocumentType, 'ALL'>) => {
    setIsGenerating(true)
    setError(null)

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
      setGeneratedContent(data.content)
      setShowPreview(true)
      onGenerate?.(type)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate document')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateAll = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      // Generate all three documents sequentially
      for (const type of ['DE_DESIGN', 'SOLUTION_DESIGN', 'TEST_PLAN'] as const) {
        await fetch(`/api/design-weeks/${designWeekId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        })
      }
      onGenerate?.('ALL')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate documents')
    } finally {
      setIsGenerating(false)
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

  // Single document type button
  if (documentType !== 'ALL') {
    const info = DOC_TYPE_INFO[documentType]
    return (
      <>
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
          Generate {info.label}
        </Button>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                {info.label} Generated
              </DialogTitle>
              <DialogDescription>{info.description}</DialogDescription>
            </DialogHeader>

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

        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </>
    )
  }

  // "Generate All" button
  return (
    <>
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
        Generate All Documents
      </Button>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </>
  )
}
