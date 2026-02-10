'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check, RefreshCw, FileText, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface StatusUpdateData {
  digitalEmployee: { id: string; name: string }
  company: string
  currentPhase: number
  phaseName: string
  isBlocked: boolean
  blockedReason: string | null
  progress: number
  statusUpdate: string
  shortUpdate: string
  generatedAt: string
}

interface StatusUpdateModalProps {
  digitalEmployeeId: string
  isOpen: boolean
  onClose: () => void
}

export function StatusUpdateModal({ digitalEmployeeId, isOpen, onClose }: StatusUpdateModalProps) {
  const [data, setData] = useState<StatusUpdateData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'full' | 'short' | null>(null)
  const [activeTab, setActiveTab] = useState<'full' | 'short'>('full')

  const fetchStatusUpdate = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/digital-employees/${digitalEmployeeId}/status-update`)
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to generate status update')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && digitalEmployeeId) {
      fetchStatusUpdate()
    }
  }, [isOpen, digitalEmployeeId])

  const copyToClipboard = async (type: 'full' | 'short') => {
    if (!data) return
    const text = type === 'full' ? data.statusUpdate : data.shortUpdate
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      console.error('Failed to copy to clipboard')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C2703E] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Client Status Update</h2>
              <p className="text-sm text-gray-500">Share progress with your client</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-[#C2703E]" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
              <Button variant="outline" onClick={fetchStatusUpdate}>
                Try Again
              </Button>
            </div>
          ) : data ? (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('full')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === 'full'
                      ? 'bg-[#F5E6DA] text-[#A05A32]'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  Full Update
                </button>
                <button
                  onClick={() => setActiveTab('short')}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === 'short'
                      ? 'bg-[#F5E6DA] text-[#A05A32]'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  Quick Summary
                </button>
              </div>

              {/* Status indicator */}
              <div className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4',
                data.isBlocked
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              )}>
                {data.isBlocked ? '⚠️ Blocked' : '✅ On Track'}
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">{data.phaseName}</span>
              </div>

              {/* Content box */}
              <div className="relative">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  {activeTab === 'full' ? (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                        {data.statusUpdate}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-gray-700">{data.shortUpdate}</p>
                  )}
                </div>
              </div>

              {/* Generated timestamp */}
              <p className="text-xs text-gray-400 mt-3">
                Generated: {new Date(data.generatedAt).toLocaleString()}
              </p>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {data && (
          <div className="p-4 border-t flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatusUpdate}
              disabled={loading}
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              Regenerate
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(activeTab)}
              >
                {copied === activeTab ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy {activeTab === 'full' ? 'Full Update' : 'Summary'}
                  </>
                )}
              </Button>
              <Button
                size="sm"
                className="bg-[#C2703E] hover:bg-[#A05A32]"
                onClick={() => {
                  const text = activeTab === 'full' ? data.statusUpdate : data.shortUpdate
                  const mailtoUrl = `mailto:?subject=${encodeURIComponent(`${data.digitalEmployee.name} - Status Update`)}&body=${encodeURIComponent(text)}`
                  window.open(mailtoUrl, '_blank')
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Email to Client
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
