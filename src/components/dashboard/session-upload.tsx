'use client'

import { useState, useCallback } from 'react'
import { Upload, FileVideo, FileText, X, Loader2, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface UploadedFile {
  id: string
  name: string
  type: 'recording' | 'slides' | 'document'
  size: number
  status: 'uploading' | 'complete' | 'error'
  progress: number
}

interface SessionUploadProps {
  currentPhase: number
  onUploadComplete?: (sessionId: string) => void
  className?: string
}

const phaseLabels: Record<number, string> = {
  1: 'Kickoff',
  2: 'Process Design',
  3: 'Technical Deep-dive',
  4: 'Sign-off',
}

export function SessionUpload({
  currentPhase,
  onUploadComplete,
  className,
}: SessionUploadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [recordingUrl, setRecordingUrl] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const getFileType = (file: File): 'recording' | 'slides' | 'document' => {
    if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      return 'recording'
    }
    if (
      file.type === 'application/pdf' ||
      file.name.endsWith('.pptx') ||
      file.name.endsWith('.ppt')
    ) {
      return 'slides'
    }
    return 'document'
  }

  const simulateUpload = useCallback((fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 30
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: 100, status: 'complete' as const } : f
          )
        )
      } else {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
        )
      }
    }, 200)
  }, [])

  const handleFiles = useCallback((newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: getFileType(file),
      size: file.size,
      status: 'uploading' as const,
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...uploadedFiles])

    uploadedFiles.forEach((uploadFile) => {
      simulateUpload(uploadFile.id)
    })
  }, [simulateUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }, [handleFiles])

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const handleStartProcessing = async () => {
    setIsProcessing(true)

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsProcessing(false)
    setIsOpen(false)
    setFiles([])
    setRecordingUrl('')

    // Call completion handler
    onUploadComplete?.('new-session-id')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const hasContent = files.length > 0 || recordingUrl

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className={className}>
        <Upload className="w-4 h-4 mr-2" />
        Upload Session Recording
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Session Recording</DialogTitle>
            <div className="text-sm text-gray-500">
              Auto-detected phase: {phaseLabels[currentPhase]}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              )}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                Drop recording or materials here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Accepts: MP4, MP3, WAV, PDF, PPTX, DOCX
              </p>
              <label>
                <input
                  type="file"
                  multiple
                  accept="video/*,audio/*,.pdf,.pptx,.ppt,.docx,.doc"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
            </div>

            {/* Or paste URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or paste a recording link:
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="https://loom.com/share/..."
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Supports: Loom, Google Drive, Teams recordings, YouTube
              </p>
            </div>

            {/* Uploaded files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Files:
                </label>
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {file.type === 'recording' ? (
                      <FileVideo className="w-5 h-5 text-blue-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-orange-600" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                        {file.status === 'uploading' && (
                          <div className="flex-1 max-w-[100px] h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}
                        {file.status === 'complete' && (
                          <Badge variant="success" className="text-xs">
                            Uploaded
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Processing info */}
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p>
                Processing typically completes within 10-15 minutes. You&apos;ll receive
                a notification when extractions are ready for review.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartProcessing}
              disabled={!hasContent || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Upload & Process'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
