'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExportPDFButtonProps {
  designWeekId: string
  disabled?: boolean
  className?: string
}

export function ExportPDFButton({
  designWeekId,
  disabled = false,
  className,
}: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)

    try {
      const response = await fetch(`/api/design-weeks/${designWeekId}/export?format=pdf`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export PDF')
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || 'design-document.pdf'

      // Download the PDF
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <Button
        onClick={handleExport}
        disabled={disabled || isExporting}
        variant="default"
        className={cn('gap-2 bg-indigo-600 hover:bg-indigo-700', className)}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        {isExporting ? 'Generating PDF...' : 'Export PDF'}
      </Button>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  )
}
