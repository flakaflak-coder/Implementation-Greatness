'use client'

import { useState, useEffect, use, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  Upload,
  Check,
  AlertTriangle,
  X,
  RefreshCw,
  FileAudio,
  FileText,
  Clock,
  CheckCircle2,
  Play,
  Sparkles,
  Wand2,
  Eye,
  EyeOff,
  Share2,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ExtractionReview } from '@/components/extraction/extraction-review'
import { DEWorkspace } from '@/components/de-workspace'
import { StatusUpdateModal } from '@/components/status-update/status-update-modal'
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

function getProcessingBadge(status: string) {
  switch (status) {
    case 'COMPLETE':
      return <Badge variant="success" className="text-xs">Processed</Badge>
    case 'PROCESSING':
      return <Badge variant="warning" className="text-xs">Processing...</Badge>
    case 'FAILED':
      return <Badge variant="destructive" className="text-xs">Failed</Badge>
    default:
      return <Badge variant="secondary" className="text-xs">Pending</Badge>
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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
  const [, setUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState(1)
  const [resolvingItem, setResolvingItem] = useState<ScopeItem | null>(null)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [extractDialogOpen, setExtractDialogOpen] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)


  const fetchDE = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/digital-employees/${deId}`)
      const result = await response.json()
      if (result.success) {
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
    fetchDE()
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

  const handleResolveScope = async (itemId: string, classification: 'IN_SCOPE' | 'OUT_OF_SCOPE') => {
    try {
      const response = await fetch(`/api/scope-items/${itemId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classification }),
      })

      if (response.ok) {
        setResolvingItem(null)
        fetchDE()
      }
    } catch {
      setError('Failed to resolve scope item')
    }
  }

  const handleToggleExclude = async (itemId: string, currentlyExcluded: boolean) => {
    try {
      const response = await fetch(`/api/scope-items/${itemId}/exclude`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludeFromDocument: !currentlyExcluded }),
      })

      if (response.ok) {
        fetchDE()
      }
    } catch {
      setError('Failed to update scope item')
    }
  }

  const handleExtract = async () => {
    if (!selectedSession || !transcript.trim()) return

    setExtracting(true)
    try {
      const sessionTypeMap: Record<number, string> = {
        1: 'kickoff',
        2: 'process',
        3: 'technical',
        4: 'signoff',
      }
      const res = await fetch(`/api/sessions/${selectedSession.id}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          sessionType: sessionTypeMap[selectedSession.phase] || 'process',
        }),
      })

      const data = await res.json()
      if (data.success) {
        setExtractDialogOpen(false)
        setTranscript('')
        fetchDE()
      } else {
        setError(data.error)
      }
    } catch {
      setError('Extraction failed')
    } finally {
      setExtracting(false)
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

  // Sessions by phase
  const sessionsByPhase = PHASES.map(phase => ({
    ...phase,
    sessions: sessions.filter(s => s.phase === phase.number),
  }))

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href={`/companies/${companyId}`}
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to {de.company.name}
      </Link>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            <X className="w-4 h-4 inline" />
          </button>
        </div>
      )}

      {/* DE Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{de.name}</h1>
              {getStatusBadge(de.status)}
            </div>
            <p className="text-gray-500">{de.company.name}</p>
            {de.description && <p className="text-gray-600 mt-1">{de.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setStatusUpdateOpen(true)} variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share Update
          </Button>
          <Button onClick={fetchDE} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setResetDialogOpen(true)}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Reset Data
          </Button>
        </div>
      </div>

      {/* DE Workspace - Profile-based view with integrated session management */}
      {dw && (
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
          onExtractSession={(sessionId) => {
            const session = sessions.find(s => s.id === sessionId)
            if (session) {
              setSelectedSession(session)
              setExtractDialogOpen(true)
            }
          }}
          onRefresh={fetchDE}
        />
      )}

      {/* Legacy tabs - hidden but kept for reference */}
      {false && (
      <Tabs defaultValue="extraction" className="space-y-6">
        <TabsList>
          <TabsTrigger value="extraction" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Extraction
          </TabsTrigger>
          <TabsTrigger value="sessions">
            Sessions ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="scope">
            Scope Items ({totalScope})
            {ambiguousCount > 0 && (
              <Badge variant="warning" className="ml-2 text-xs">{ambiguousCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* AI Extraction Tab */}
        <TabsContent value="extraction">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Session selector */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Select Session</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {sessions.length > 0 ? (
                    <div className="space-y-2">
                      {sessions.map((session) => {
                        const phaseInfo = PHASES.find(p => p.number === session.phase)
                        const isSelected = selectedSession?.id === session.id

                        return (
                          <button
                            key={session.id}
                            onClick={() => setSelectedSession(session)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{phaseInfo?.name}</span>
                              {session.processingStatus === 'COMPLETE' && (
                                <Badge variant="success" className="text-xs">
                                  Extracted
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(session.date)}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No sessions yet. Upload a session first.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Extraction review */}
            <div className="lg:col-span-3">
              {selectedSession ? (
                <div className="space-y-4">
                  {/* Session header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {PHASES.find(p => p.number === selectedSession?.phase)?.name} - Session {selectedSession?.sessionNumber}
                      </h2>
                      <p className="text-sm text-gray-500">{formatDate(selectedSession?.date ?? new Date().toISOString())}</p>
                    </div>
                    <Dialog open={extractDialogOpen} onOpenChange={setExtractDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Wand2 className="w-4 h-4 mr-2" />
                          {selectedSession?.processingStatus === 'COMPLETE' ? 'Re-extract' : 'Extract'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Extract from Session</DialogTitle>
                          <DialogDescription>
                            Paste the transcript from this session. Claude will extract structured information
                            based on the session type.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Textarea
                            placeholder="Paste transcript here..."
                            className="min-h-[300px] font-mono text-sm"
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setExtractDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleExtract} disabled={extracting || !transcript.trim()}>
                            {extracting ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Extracting...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Extract Items
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Extraction content */}
                  {selectedSession?.processingStatus === 'COMPLETE' ? (
                    <ExtractionReview sessionId={selectedSession?.id ?? ''} />
                  ) : selectedSession?.processingStatus === 'PROCESSING' ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="font-medium">Processing session...</p>
                        <p className="text-sm text-gray-500">This may take a moment.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="font-medium">No extraction yet</p>
                        <p className="text-sm text-gray-500 mb-4">
                          Paste a transcript to extract information from this session.
                        </p>
                        <Button onClick={() => setExtractDialogOpen(true)}>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Start Extraction
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium">Select a session</p>
                    <p className="text-sm text-gray-500">
                      Choose a session from the left to review or start extraction.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Phase {selectedPhase}: {PHASES[selectedPhase - 1].name}
                </CardTitle>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Session
                </Button>
              </div>
              <p className="text-sm text-gray-500">{PHASES[selectedPhase - 1].description}</p>
            </CardHeader>
            <CardContent>
              {sessionsByPhase[selectedPhase - 1].sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileAudio className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No sessions uploaded yet</p>
                  <p className="text-sm">Upload a recording or document to start extracting scope items</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionsByPhase[selectedPhase - 1].sessions.map(session => (
                    <div
                      key={session.id}
                      className="p-4 border rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <FileAudio className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">Session {session.sessionNumber}</h4>
                              {getProcessingBadge(session.processingStatus)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(session.date)}
                              </span>
                              {session.materials.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5" />
                                  {session.materials.length} file{session.materials.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {session.topicsCovered.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {session.topicsCovered.map((topic, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Play className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scope Items Tab */}
        <TabsContent value="scope">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* In Scope */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                  <Check className="w-5 h-5" />
                  In Scope ({inScopeCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scopeItems
                  .filter(s => s.classification === 'IN_SCOPE')
                  .map(item => (
                    <div
                      key={item.id}
                      className={`p-3 border rounded-lg relative group ${
                        item.excludeFromDocument
                          ? 'bg-gray-50 border-gray-300 opacity-60'
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm ${item.excludeFromDocument ? 'text-gray-500 line-through' : 'text-green-900'}`}>
                            {item.statement}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {item.skill && (
                              <Badge variant="secondary" className="text-xs">{item.skill}</Badge>
                            )}
                            {item.excludeFromDocument && (
                              <Badge variant="outline" className="text-xs text-gray-500 border-gray-400">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Excluded
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleToggleExclude(item.id, item.excludeFromDocument)}
                          title={item.excludeFromDocument ? 'Include in document' : 'Exclude from document'}
                        >
                          {item.excludeFromDocument ? (
                            <Eye className="w-4 h-4 text-gray-500" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                {inScopeCount === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No items yet</p>
                )}
              </CardContent>
            </Card>

            {/* Ambiguous - Needs Resolution */}
            <Card className={ambiguousCount > 0 ? 'ring-2 ring-amber-300' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-5 h-5" />
                  Needs Resolution ({ambiguousCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scopeItems
                  .filter(s => s.classification === 'AMBIGUOUS')
                  .map(item => (
                    <div
                      key={item.id}
                      className={`p-3 border rounded-lg relative group ${
                        item.excludeFromDocument
                          ? 'bg-gray-50 border-gray-300 opacity-60'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm ${item.excludeFromDocument ? 'text-gray-500 line-through' : 'text-amber-900'}`}>
                            {item.statement}
                          </p>
                          {item.evidence.length > 0 && !item.excludeFromDocument && (
                            <p className="text-xs text-amber-600 mt-1 italic">
                              &quot;{item.evidence[0].quote.slice(0, 100)}...&quot;
                            </p>
                          )}
                          {item.excludeFromDocument && (
                            <Badge variant="outline" className="text-xs text-gray-500 border-gray-400 mt-2">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Excluded from document
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleToggleExclude(item.id, item.excludeFromDocument)}
                          title={item.excludeFromDocument ? 'Include in document' : 'Exclude from document'}
                        >
                          {item.excludeFromDocument ? (
                            <Eye className="w-4 h-4 text-gray-500" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      {!item.excludeFromDocument && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-green-600 hover:bg-green-50"
                            onClick={() => setResolvingItem(item)}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            In Scope
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-red-600 hover:bg-red-50"
                            onClick={() => handleResolveScope(item.id, 'OUT_OF_SCOPE')}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Out
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                {ambiguousCount === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">All items resolved!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Out of Scope */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <X className="w-5 h-5" />
                  Out of Scope ({outScopeCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scopeItems
                  .filter(s => s.classification === 'OUT_OF_SCOPE')
                  .map(item => (
                    <div
                      key={item.id}
                      className={`p-3 border rounded-lg relative group ${
                        item.excludeFromDocument
                          ? 'bg-gray-50 border-gray-300 opacity-60'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm ${item.excludeFromDocument ? 'text-gray-500 line-through' : 'text-red-900'}`}>
                            {item.statement}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {item.skill && (
                              <Badge variant="secondary" className="text-xs">{item.skill}</Badge>
                            )}
                            {item.excludeFromDocument && (
                              <Badge variant="outline" className="text-xs text-gray-500 border-gray-400">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Excluded
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleToggleExclude(item.id, item.excludeFromDocument)}
                          title={item.excludeFromDocument ? 'Include in document' : 'Exclude from document'}
                        >
                          {item.excludeFromDocument ? (
                            <Eye className="w-4 h-4 text-gray-500" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                {outScopeCount === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No items yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Session Recording</DialogTitle>
            <DialogDescription>
              Upload a recording or document from Phase {selectedPhase}: {PHASES[selectedPhase - 1].name}.
              The system will automatically extract scope items, scenarios, and more.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve confirmation dialog */}
      <Dialog open={!!resolvingItem} onOpenChange={() => setResolvingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm In Scope</DialogTitle>
            <DialogDescription>
              You are marking this item as In Scope. This means the Digital Employee will handle this case.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{resolvingItem?.statement}</p>
              {resolvingItem?.evidence?.[0] && (
                <p className="text-sm text-gray-500 mt-2 italic">
                  Evidence: &quot;{resolvingItem.evidence[0].quote}&quot;
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => resolvingItem && handleResolveScope(resolvingItem.id, 'IN_SCOPE')}
            >
              Confirm In Scope
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

      {/* Status Update Modal */}
      <StatusUpdateModal
        digitalEmployeeId={deId}
        isOpen={statusUpdateOpen}
        onClose={() => setStatusUpdateOpen(false)}
      />
    </div>
  )
}
