'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Download,
  Loader2,
  AlertTriangle,
  Languages,
  RefreshCw,
  Clock,
  Cpu,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DocumentType =
  | 'DE_DESIGN'
  | 'SOLUTION_DESIGN'
  | 'TEST_PLAN'
  | 'PERSONA_DESIGN'
  | 'MONITORING'
  | 'ROLLOUT_PLAN'

type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED'

type Language = 'en' | 'nl' | 'de' | 'fr' | 'es'

type ExportType =
  | 'design'
  | 'meet'
  | 'test-plan'
  | 'process'
  | 'executive'
  | 'technical'
  | 'persona'
  | 'monitoring'
  | 'rollout'

interface GeneratedDocument {
  id: string
  type: DocumentType
  version: number
  status: DocumentStatus
  content: string
  generatedAt: string
  inputTokens: number | null
  outputTokens: number | null
  latencyMs: number | null
  missingFields: string[]
}

interface DocumentsTabProps {
  designWeekId: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOCUMENT_TYPES: Array<{
  type: DocumentType
  label: string
  description: string
  estimatedTime: string
}> = [
  {
    type: 'DE_DESIGN',
    label: 'DE Design',
    description: 'Client-facing Digital Employee design document with goals, process, and scope',
    estimatedTime: '30-60s',
  },
  {
    type: 'SOLUTION_DESIGN',
    label: 'Solution Design',
    description: 'Internal technical architecture and implementation details',
    estimatedTime: '30-60s',
  },
  {
    type: 'TEST_PLAN',
    label: 'Test Plan',
    description: 'UAT test scenarios and acceptance criteria',
    estimatedTime: '15-30s',
  },
  {
    type: 'PERSONA_DESIGN',
    label: 'Persona Design',
    description: 'Conversational persona, tone of voice, and guardrails',
    estimatedTime: '20-40s',
  },
  {
    type: 'MONITORING',
    label: 'Monitoring',
    description: 'Monitoring framework, dashboards, and alerting strategy',
    estimatedTime: '20-40s',
  },
  {
    type: 'ROLLOUT_PLAN',
    label: 'Rollout Plan',
    description: 'Phased rollout strategy with go/no-go criteria',
    estimatedTime: '20-40s',
  },
]

const LANGUAGES: Array<{ code: Language; label: string; flag: string }> = [
  { code: 'en', label: 'English', flag: 'GB' },
  { code: 'nl', label: 'Nederlands', flag: 'NL' },
  { code: 'de', label: 'Deutsch', flag: 'DE' },
  { code: 'fr', label: 'Francais', flag: 'FR' },
  { code: 'es', label: 'Espanol', flag: 'ES' },
]

const EXPORT_TYPES: Array<{
  type: ExportType
  label: string
  description: string
}> = [
  { type: 'design', label: 'Full Design Doc', description: 'Complete DE design document' },
  { type: 'meet', label: 'Meet Your DE', description: 'One-pager introduction' },
  { type: 'test-plan', label: 'Test Plan', description: 'UAT test cases' },
  { type: 'process', label: 'Process Design', description: 'Process flow and scope' },
  { type: 'executive', label: 'Executive Summary', description: 'Goals, KPIs, stakeholders' },
  { type: 'technical', label: 'Technical Foundation', description: 'Integrations and security' },
  { type: 'persona', label: 'Persona Design', description: 'Tone, personality, guardrails' },
  { type: 'monitoring', label: 'Monitoring', description: 'Dashboards and alerting' },
  { type: 'rollout', label: 'Rollout Plan', description: 'Phased launch strategy' },
]

const STATUS_BADGE_CLASSES: Record<DocumentStatus, string> = {
  DRAFT: 'bg-stone-100 text-stone-700 border-stone-200',
  IN_REVIEW: 'bg-blue-100 text-blue-700 border-blue-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PUBLISHED: 'bg-violet-100 text-violet-700 border-violet-200',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTokenCount(tokens: number | null): string {
  if (tokens === null || tokens === undefined) return '--'
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
  return String(tokens)
}

function formatLatency(ms: number | null): string {
  if (ms === null || ms === undefined) return '--'
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function getDocTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPES.find(d => d.type === type)?.label ?? type
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentsTab({ designWeekId }: DocumentsTabProps) {
  // Document data
  const [documents, setDocuments] = useState<GeneratedDocument[]>([])
  const [allVersions, setAllVersions] = useState<GeneratedDocument[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null) // holds the type being generated
  const [exporting, setExporting] = useState<string | null>(null) // holds the export type being downloaded
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en')
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/design-weeks/${designWeekId}/generate`)
      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }
      const data = await response.json()
      setDocuments(data.documents ?? [])
      setAllVersions(data.allVersions ?? [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [designWeekId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // ---------------------------------------------------------------------------
  // Generation handler
  // ---------------------------------------------------------------------------

  const handleGenerate = async (documentType: DocumentType) => {
    setGenerating(documentType)
    setMissingFields([])

    try {
      const response = await fetch(`/api/design-weeks/${designWeekId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await response.json()

      if (data.missingFields && data.missingFields.length > 0) {
        setMissingFields(data.missingFields)
      }

      toast.success(`${getDocTypeLabel(documentType)} generated`, {
        description: data.usage
          ? `v${data.document.version} -- ${formatTokenCount(data.usage.inputTokens)} in / ${formatTokenCount(data.usage.outputTokens)} out (${formatLatency(data.usage.latencyMs)})`
          : `Version ${data.document.version}`,
      })

      // Refresh document list
      await fetchDocuments()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Generation failed', { description: message })
    } finally {
      setGenerating(null)
    }
  }

  // ---------------------------------------------------------------------------
  // PDF export handler
  // ---------------------------------------------------------------------------

  const handleExportPDF = async (exportType: ExportType) => {
    setExporting(exportType)

    try {
      const response = await fetch(
        `/api/design-weeks/${designWeekId}/export?type=${exportType}&format=pdf&language=${selectedLanguage}&enhanced=true`
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Export failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] ?? `${exportType}-document.pdf`

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)

      // Allow time for download to begin before revoking
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      // Check for missing fields in response header
      const missingFieldsHeader = response.headers.get('X-Missing-Fields')
      if (missingFieldsHeader) {
        try {
          const fields = JSON.parse(missingFieldsHeader) as string[]
          if (fields.length > 0) {
            toast.info('PDF exported with incomplete data', {
              description: `Missing: ${fields.join(', ')}`,
            })
            return
          }
        } catch {
          // Ignore parse errors
        }
      }

      toast.success('PDF downloaded', {
        description: filename,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Export failed', { description: message })
    } finally {
      setExporting(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Version history toggle
  // ---------------------------------------------------------------------------

  const toggleVersionHistory = (type: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  // Map latest document by type for quick access
  const latestByType = new Map<DocumentType, GeneratedDocument>()
  for (const doc of documents) {
    latestByType.set(doc.type, doc)
  }

  // Group all versions by type
  const versionsByType = new Map<DocumentType, GeneratedDocument[]>()
  for (const doc of allVersions) {
    const existing = versionsByType.get(doc.type) ?? []
    existing.push(doc)
    versionsByType.set(doc.type, existing)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        <span className="ml-3 text-sm text-stone-500">Loading documents...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-stone-900">Documents</h2>
        <p className="text-sm text-stone-500 mt-1">
          Generate AI-powered design documents and export professional PDFs
        </p>
      </div>

      {/* Missing fields warning */}
      {missingFields.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50/60">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Generated with incomplete data
            </p>
            <p className="text-sm text-amber-700 mt-1">
              The following information is still missing and may result in placeholder content:
            </p>
            <ul className="mt-2 space-y-1">
              {missingFields.map(field => (
                <li key={field} className="text-sm text-amber-700 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  {field}
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-600 mt-2">
              Upload more session recordings and approve extracted items to fill these gaps.
            </p>
          </div>
        </div>
      )}

      {/* Generate Documents Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4 text-[#C2703E]" />
                Generate Documents
              </CardTitle>
              <CardDescription>
                Generate AI-powered markdown documents from extracted session data
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDocuments}
              disabled={loading}
              className="gap-1.5 text-stone-500"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {DOCUMENT_TYPES.map(docType => {
              const latest = latestByType.get(docType.type)
              const versions = versionsByType.get(docType.type) ?? []
              const isGenerating = generating === docType.type
              const isExpanded = expandedVersions.has(docType.type)

              return (
                <Card
                  key={docType.type}
                  className={cn(
                    'transition-all',
                    latest && 'border-stone-200',
                    isGenerating && 'border-[#D4956A] shadow-sm'
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4 text-stone-500 shrink-0" />
                          <span className="truncate">{docType.label}</span>
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs line-clamp-2">
                          {docType.description}
                        </CardDescription>
                      </div>
                      {latest && (
                        <Badge
                          className={cn(
                            'shrink-0 text-[10px] border',
                            STATUS_BADGE_CLASSES[latest.status]
                          )}
                        >
                          {latest.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Latest version info */}
                    {latest && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeDate(latest.generatedAt)}
                          </span>
                          <span className="font-medium text-stone-600">v{latest.version}</span>
                        </div>

                        {/* Token usage */}
                        {(latest.inputTokens || latest.outputTokens) && (
                          <div className="flex items-center gap-3 text-xs text-stone-400">
                            <span>{formatTokenCount(latest.inputTokens)} in</span>
                            <span>{formatTokenCount(latest.outputTokens)} out</span>
                            {latest.latencyMs && (
                              <span>{formatLatency(latest.latencyMs)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generate button */}
                    <Button
                      onClick={() => handleGenerate(docType.type)}
                      disabled={isGenerating || generating !== null}
                      variant={latest ? 'outline' : 'default'}
                      size="sm"
                      className={cn(
                        'w-full gap-2',
                        !latest && 'bg-[#C2703E] hover:bg-[#A05A32] text-white'
                      )}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          {latest ? 'Regenerate' : 'Generate'}
                        </>
                      )}
                    </Button>

                    {/* Estimated time hint */}
                    {isGenerating && (
                      <p className="text-xs text-stone-400 text-center">
                        Estimated: {docType.estimatedTime}
                      </p>
                    )}

                    {/* Version history (collapsible) */}
                    {versions.length > 1 && (
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={() => toggleVersionHistory(docType.type)}
                      >
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 transition-colors w-full">
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            {versions.length} versions
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-stone-100">
                            {versions.map(version => (
                              <div
                                key={version.id}
                                className="flex items-center justify-between text-xs py-1"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-stone-600">
                                    v{version.version}
                                  </span>
                                  <Badge
                                    className={cn(
                                      'text-[9px] px-1.5 py-0 border',
                                      STATUS_BADGE_CLASSES[version.status]
                                    )}
                                  >
                                    {version.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <span className="text-stone-400">
                                  {formatRelativeDate(version.generatedAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Export PDFs Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4 text-[#C2703E]" />
                Export PDFs
              </CardTitle>
              <CardDescription>
                Download professional PDF documents with AI-enhanced narratives
              </CardDescription>
            </div>

            {/* Language selector */}
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-stone-400" />
              <Select
                value={selectedLanguage}
                onValueChange={(value) => setSelectedLanguage(value as Language)}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-stone-400">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EXPORT_TYPES.map(exportType => {
              const isExportingThis = exporting === exportType.type

              return (
                <button
                  key={exportType.type}
                  onClick={() => handleExportPDF(exportType.type)}
                  disabled={isExportingThis || exporting !== null}
                  className={cn(
                    'group flex items-start gap-3 p-3 rounded-lg border border-stone-200 bg-white text-left',
                    'transition-all hover:border-[#D4956A] hover:shadow-sm',
                    'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-stone-200 disabled:hover:shadow-none'
                  )}
                >
                  <div className={cn(
                    'mt-0.5 p-1.5 rounded-md shrink-0 transition-colors',
                    'bg-stone-100 group-hover:bg-[#FDF3EC]',
                    isExportingThis && 'bg-[#FDF3EC]'
                  )}>
                    {isExportingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#C2703E]" />
                    ) : (
                      <Download className="h-4 w-4 text-stone-500 group-hover:text-[#C2703E]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-700 group-hover:text-stone-900">
                      {exportType.label}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {isExportingThis ? 'Generating PDF...' : exportType.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-stone-400 mt-4 flex items-center gap-1.5">
            <Languages className="h-3 w-3" />
            PDFs will be generated in {LANGUAGES.find(l => l.code === selectedLanguage)?.label ?? 'English'} with AI-enhanced content
          </p>
        </CardContent>
      </Card>

      {/* No documents yet hint */}
      {documents.length === 0 && !loading && (
        <div className="text-center py-8 border border-dashed border-stone-200 rounded-lg">
          <FileText className="h-10 w-10 mx-auto text-stone-300" />
          <h3 className="mt-3 text-sm font-medium text-stone-700">No documents generated yet</h3>
          <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
            Generate your first document above once you have approved extracted items from session recordings.
          </p>
        </div>
      )}
    </div>
  )
}
