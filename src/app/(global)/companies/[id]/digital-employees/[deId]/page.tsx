'use client'

import { useState, useEffect, use, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  Upload,
  X,
  RefreshCw,
  Share2,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DEWorkspace } from '@/components/de-workspace'
// StatusUpdateModal removed - now using Freddy for client updates
import { AIAssistantPanel, AssistantTrigger } from '@/components/de-workspace/assistant'
import type { WorkspaceTab, ExtractedItemWithSession } from '@/components/de-workspace/types'
import { groupItemsByProfile, calculateProfileCompleteness } from '@/components/de-workspace/types'
import type { BusinessProfile, TechnicalProfile } from '@/components/de-workspace/profile-types'
import type { ExtractedItem } from '@prisma/client'

interface Evidence {
  id: string
  sourceType: string
  timestampStart: number | null
  timestampEnd: number | null
  quote: string
}

interface ScopeItem {
  id: string
  statement: string
  classification: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS'
  skill: string | null
  conditions: string | null
  notes: string | null
  status: string
  excludeFromDocument: boolean
  evidence: Evidence[]
}

interface Material {
  id: string
  type: string
  filename: string
  mimeType: string
  processed: boolean
}

interface Session {
  id: string
  phase: number
  sessionNumber: number
  date: string
  recordingUrl: string | null
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
  topicsCovered: string[]
  materials: Material[]
  extractedItems?: ExtractedItem[]
}

interface DesignWeek {
  id: string
  status: string
  currentPhase: number
  sessions: Session[]
  scopeItems: ScopeItem[]
}

interface Company {
  id: string
  name: string
}

interface DigitalEmployee {
  id: string
  name: string
  description: string | null
  status: string
  company: Company
  designWeek: DesignWeek | null
}

const PHASES = [
  { number: 1, name: 'Kickoff', sessions: 1, description: 'Goals, stakeholders, success metrics' },
  { number: 2, name: 'Process Design', sessions: 3, description: 'Happy path, exceptions, scope' },
  { number: 3, name: 'Technical', sessions: 3, description: 'Systems, integrations, data' },
  { number: 4, name: 'Sign-off', sessions: 1, description: 'Final confirmations, go/no-go' },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'DESIGN':
      return <Badge variant="info">In Design</Badge>
    case 'ONBOARDING':
      return <Badge variant="warning">Onboarding</Badge>
    case 'LIVE':
      return <Badge variant="success">Live</Badge>
    case 'PAUSED':
      return <Badge variant="secondary">Paused</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}


export default function DigitalEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string; deId: string }>
}) {
  const { id: companyId, deId } = use(params)
  const [de, setDe] = useState<DigitalEmployee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState(1)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('progress')
  const [assistantAutoTrigger, setAssistantAutoTrigger] = useState<'gaps' | 'next-steps' | 'client-update' | undefined>(undefined)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [technicalProfile, setTechnicalProfile] = useState<TechnicalProfile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: Cmd+J to toggle Freddy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setAssistantOpen(prev => !prev)
        // Clear auto-trigger when toggling via keyboard
        if (!assistantOpen) {
          setAssistantAutoTrigger(undefined)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [assistantOpen])

  // Fetch profiles for completeness calculation
  const fetchProfiles = useCallback(async (designWeekId: string) => {
    try {
      const [businessRes, technicalRes] = await Promise.all([
        fetch(`/api/design-weeks/${designWeekId}/profile`),
        fetch(`/api/design-weeks/${designWeekId}/technical-profile`),
      ])

      if (businessRes.ok) {
        const data = await businessRes.json()
        setBusinessProfile(data.profile || null)
      }

      if (technicalRes.ok) {
        const data = await technicalRes.json()
        setTechnicalProfile(data.profile || null)
      }
    } catch (error) {
      console.error('Error fetching profiles for completeness:', error)
    }
  }, [])

  // Calculate profile completeness from extracted items and profiles
  const profileCompleteness = useMemo(() => {
    if (!de?.designWeek) {
      return { business: { overall: 0, sections: {} }, technical: { overall: 0, sections: {} } }
    }

    // Build extracted items with session info
    const extractedItemsWithSession: ExtractedItemWithSession[] = []
    for (const session of de.designWeek.sessions) {
      if (session.extractedItems) {
        for (const item of session.extractedItems) {
          extractedItemsWithSession.push({
            ...item,
            session: {
              id: session.id,
              phase: session.phase,
              sessionNumber: session.sessionNumber,
              date: new Date(session.date),
            },
          })
        }
      }
    }

    // Group items and calculate completeness
    const groupedItems = groupItemsByProfile(extractedItemsWithSession)
    return calculateProfileCompleteness(groupedItems, businessProfile, technicalProfile)
  }, [de?.designWeek, businessProfile, technicalProfile])

  // Fetch profiles when design week changes
  useEffect(() => {
    if (de?.designWeek?.id) {
      fetchProfiles(de.designWeek.id)
    }
  }, [de?.designWeek?.id, fetchProfiles])

  const fetchDE = async (recalculateProgress = false) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/digital-employees/${deId}`)
      const result = await response.json()
      if (result.success) {
        // If requested, recalculate Design Week progress first
        if (recalculateProgress && result.data.designWeek) {
          try {
            const recalcResponse = await fetch(
              `/api/design-weeks/${result.data.designWeek.id}/recalculate-progress`,
              { method: 'POST' }
            )
            const recalcResult = await recalcResponse.json()
            if (recalcResult.success && recalcResult.updated) {
              console.log('[DE Page] Design Week progress updated:', recalcResult.changes)
              // Update the local data with new values
              result.data.designWeek.status = recalcResult.data.status
              result.data.designWeek.currentPhase = recalcResult.data.currentPhase
            }
          } catch (recalcError) {
            console.error('[DE Page] Failed to recalculate progress:', recalcError)
            // Continue anyway - this is not critical
          }
        }

        setDe(result.data)
        setError(null)
        // Set selected phase to current phase
        if (result.data.designWeek) {
          setSelectedPhase(result.data.designWeek.currentPhase)
        }
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to fetch digital employee')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // On initial load, recalculate progress to fix any stale data
    fetchDE(true)
  }, [deId])

  const handleUpload = async (files: FileList) => {
    if (!de?.designWeek || files.length === 0) return

    setUploading(true)
    const formData = new FormData()
    formData.append('designWeekId', de.designWeek.id)
    formData.append('phase', selectedPhase.toString())

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])
    }

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setUploadDialogOpen(false)
        fetchDE() // Refresh data
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to upload session')
      }
    } catch {
      setError('Failed to upload session')
    } finally {
      setUploading(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      const res = await fetch(`/api/digital-employees/${deId}/reset`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setResetDialogOpen(false)
        fetchDE()
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to reset data')
    } finally {
      setResetting(false)
    }
  }


  if (loading && !de) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!de) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">Digital Employee not found</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button asChild>
            <Link href={`/companies/${companyId}`}>Back to Company</Link>
          </Button>
        </div>
      </div>
    )
  }

  const dw = de.designWeek
  const scopeItems = dw?.scopeItems || []
  const sessions = dw?.sessions || []

  // Calculate scope stats
  const inScopeCount = scopeItems.filter(s => s.classification === 'IN_SCOPE').length
  const outScopeCount = scopeItems.filter(s => s.classification === 'OUT_OF_SCOPE').length
  const ambiguousCount = scopeItems.filter(s => s.classification === 'AMBIGUOUS').length
  const totalScope = inScopeCount + outScopeCount + ambiguousCount


  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main content area - shrinks when assistant is open */}
      <div className={`flex-1 overflow-auto transition-all duration-300 ${assistantOpen ? 'mr-0' : ''}`}>
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb navigation */}
          <nav className="flex items-center gap-1.5 text-[13px] text-stone-400 mb-4">
            <Link href="/" className="hover:text-stone-900 transition-colors">
              Dashboard
            </Link>
            <span className="text-stone-300">&middot;</span>
            <Link href={`/companies/${companyId}`} className="hover:text-stone-900 transition-colors">
              {de.company.name}
            </Link>
            <span className="text-stone-300">&middot;</span>
            <span className="text-stone-800 font-medium">{de.name}</span>
          </nav>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fetchDE(true)}
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DE Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#C2703E]/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#C2703E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">{de.name}</h1>
              {getStatusBadge(de.status)}
            </div>
            <p className="text-[13px] text-stone-500">{de.company.name}{de.description ? ` \u2014 ${de.description}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <AssistantTrigger
            onClick={() => {
              setAssistantAutoTrigger(undefined)
              setAssistantOpen(true)
            }}
            hasHints={ambiguousCount > 0}
          />
          <Button
            onClick={() => {
              setAssistantAutoTrigger('client-update')
              setAssistantOpen(true)
            }}
            variant="ghost"
            size="sm"
            title="Draft client update"
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button onClick={() => fetchDE(true)} variant="ghost" size="sm" disabled={loading} title="Refresh data">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setResetDialogOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Reset Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* DE Workspace - Profile-based view with integrated session management */}
      {dw ? (
        <DEWorkspace
          digitalEmployee={{
            ...de,
            company: de.company,
          }}
          designWeek={{
            ...dw,
            sessions: sessions.map(s => ({
              ...s,
              date: new Date(s.date),
              extractedItems: s.extractedItems || [],
            })),
            scopeItems: scopeItems,
          }}
          onUploadSession={(phase) => {
            setSelectedPhase(phase)
            setUploadDialogOpen(true)
          }}
          onRefresh={fetchDE}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : (
        /* No Design Week state -- guide Sophie to get started */
        <div className="mt-4 rounded-lg border border-dashed border-stone-300 p-10 text-center">
          <div className="w-11 h-11 rounded-lg bg-stone-100 flex items-center justify-center mx-auto mb-3">
            <Upload className="w-5 h-5 text-stone-400" />
          </div>
          <h3 className="text-base font-semibold text-stone-900 mb-1">
            No Design Week yet
          </h3>
          <p className="text-sm text-stone-500 max-w-sm mx-auto mb-5">
            A Design Week is automatically created when you add a Digital Employee.
            If this DE was imported or created differently, you may need to initialize it.
          </p>
          <Button onClick={() => fetchDE(true)} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh to check again
          </Button>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => !uploading && setUploadDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Session Recording</DialogTitle>
            <DialogDescription>
              Upload a recording or document from Phase {selectedPhase}: {PHASES[selectedPhase - 1].name}.
              The system will automatically extract scope items, scenarios, and more.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {uploading ? (
              <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-8 text-center">
                <RefreshCw className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-spin" />
                <p className="font-medium text-blue-700">Uploading...</p>
                <p className="text-sm text-blue-600 mt-1">
                  Please wait while your file is being processed
                </p>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="font-medium text-gray-700">Click to upload files</p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports MP3, WAV, MP4, PDF, DOCX
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".mp3,.wav,.m4a,.mp4,.webm,.ogg,.pdf,.docx,.pptx"
                  onChange={(e) => e.target.files && handleUpload(e.target.files)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Data Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Reset Design Week Data
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all data for this Digital Employee, including:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>All uploaded sessions and materials</li>
              <li>All extracted items and raw extractions</li>
              <li>All scope items, scenarios, KPIs</li>
              <li>All integrations and escalation rules</li>
              <li>Business and technical profiles</li>
              <li>Generated documents</li>
            </ul>
            <p className="mt-4 text-sm font-medium text-red-600">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset All Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client updates now handled by Freddy AI assistant */}
        </div>
      </div>

      {/* AI Assistant Panel - embedded sidebar */}
      {dw && (
        <AIAssistantPanel
          context={{
            deId: de.id,
            deName: de.name,
            companyName: de.company.name,
            designWeekId: dw.id,
            currentPhase: dw.currentPhase,
            status: dw.status,
            ambiguousCount,
            sessionsCount: sessions.length,
            scopeItemsCount: totalScope,
            completeness: {
              business: profileCompleteness.business.overall,
              technical: profileCompleteness.technical.overall,
            },
          }}
          uiContext={{ activeTab }}
          isOpen={assistantOpen}
          onClose={() => {
            setAssistantOpen(false)
            setAssistantAutoTrigger(undefined)
          }}
          onNavigate={(tab) => setActiveTab(tab)}
          onUpload={(phase) => {
            setSelectedPhase(phase || dw.currentPhase)
            setUploadDialogOpen(true)
          }}
          onRefresh={fetchDE}
          autoTriggerAction={assistantAutoTrigger}
        />
      )}
    </div>
  )
}
