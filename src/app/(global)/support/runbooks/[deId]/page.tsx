'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Printer,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Database,
  Target,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Loader2,
  RefreshCw,
  Workflow,
  Clock,
  Key,
  FileWarning,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

interface RunbookScopeItem {
  id: string
  statement: string
  skill: string | null
  conditions: string | null
  notes: string | null
}

interface RunbookEscalationRule {
  id: string
  trigger: string
  conditionType: string
  threshold: number | null
  keywords: string[]
  action: string
  handoverContext: string[]
  priority: string
}

interface RunbookScenarioStep {
  id: string
  order: number
  actor: string
  action: string
  systemAction: string | null
  decisionPoint: boolean
}

interface RunbookEdgeCase {
  id: string
  condition: string
  handling: string
  escalate: boolean
}

interface RunbookScenario {
  id: string
  name: string
  trigger: string
  actor: string
  expectedOutcome: string | null
  successCriteria: string[]
  skill: string | null
  steps: RunbookScenarioStep[]
  edgeCases: RunbookEdgeCase[]
}

interface RunbookIntegration {
  id: string
  systemName: string
  purpose: string | null
  type: string | null
  endpoint: string | null
  authMethod: string | null
  authOwner: string | null
  fieldsRead: string[]
  fieldsWrite: string[]
  rateLimits: string | null
  onTimeout: string | null
  onAuthFailure: string | null
  onNotFound: string | null
  status: string
}

interface RunbookKPI {
  id: string
  name: string
  description: string | null
  targetValue: string | null
  baselineValue: string | null
  measurementMethod: string | null
  dataSource: string | null
  frequency: string | null
  owner: string | null
}

interface RunbookData {
  digitalEmployee: {
    id: string
    name: string
    description: string | null
    status: string
    channels: string[]
    currentJourneyPhase: string
    goLiveDate: string | null
  }
  company: {
    id: string
    name: string
  }
  hasDesignWeek: boolean
  sections: {
    scope: {
      inScope: RunbookScopeItem[]
      outOfScope: RunbookScopeItem[]
    }
    escalationRules: RunbookEscalationRule[]
    scenarios: RunbookScenario[]
    integrations: RunbookIntegration[]
    kpis: RunbookKPI[]
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

function formatActorLabel(actor: string): string {
  const labels: Record<string, string> = {
    DIGITAL_EMPLOYEE: 'DE',
    CUSTOMER: 'Customer',
    SYSTEM: 'System',
    HUMAN_AGENT: 'Human Agent',
  }
  return labels[actor] || actor
}

function getActorColor(actor: string): string {
  const colors: Record<string, string> = {
    DIGITAL_EMPLOYEE: 'bg-blue-100 text-blue-800',
    CUSTOMER: 'bg-purple-100 text-purple-800',
    SYSTEM: 'bg-gray-100 text-gray-800',
    HUMAN_AGENT: 'bg-amber-100 text-amber-800',
  }
  return colors[actor] || 'bg-gray-100 text-gray-800'
}

function getEscalationActionColor(action: string): string {
  switch (action) {
    case 'ESCALATE_IMMEDIATE':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'ESCALATE_WITH_SUMMARY':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'SAFE_ANSWER':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'END_CONVERSATION':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getEscalationActionLabel(action: string): string {
  const labels: Record<string, string> = {
    ESCALATE_IMMEDIATE: 'Escalate Immediately',
    ESCALATE_WITH_SUMMARY: 'Escalate with Summary',
    SAFE_ANSWER: 'Safe Answer',
    END_CONVERSATION: 'End Conversation',
  }
  return labels[action] || formatStatus(action)
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'HIGH':
      return 'bg-red-100 text-red-700'
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-700'
    case 'LOW':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getIntegrationStatusColor(status: string): string {
  switch (status) {
    case 'READY':
      return 'bg-green-100 text-green-700'
    case 'TESTED':
      return 'bg-emerald-100 text-emerald-700'
    case 'CREDENTIALS_RECEIVED':
      return 'bg-blue-100 text-blue-700'
    case 'SPEC_COMPLETE':
      return 'bg-amber-100 text-amber-700'
    case 'IDENTIFIED':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

function getConditionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    KEYWORD: 'Keyword Match',
    CONFIDENCE: 'Confidence Threshold',
    SCENARIO: 'Scenario-based',
    POLICY: 'Policy Rule',
    TIME: 'Time-based',
  }
  return labels[type] || type
}

// ============================================
// SECTION NAVIGATION
// ============================================

const SECTIONS = [
  { id: 'quick-reference', label: 'Quick Reference', icon: BookOpen },
  { id: 'scope', label: 'Scope', icon: CheckCircle2 },
  { id: 'escalation-rules', label: 'Escalation Rules', icon: Shield },
  { id: 'scenarios', label: 'Scenarios', icon: Workflow },
  { id: 'integrations', label: 'Integrations', icon: Database },
  { id: 'kpis', label: 'KPIs', icon: Target },
] as const

// ============================================
// MAIN COMPONENT
// ============================================

export default function RunbookViewerPage() {
  const params = useParams()
  const deId = params.deId as string

  const [data, setData] = useState<RunbookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set())
  const [activeSection, setActiveSection] = useState<string>('quick-reference')

  const fetchRunbook = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/support/runbooks/${deId}`)
      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to load runbook data')
        return
      }

      setData(result.data)
    } catch {
      setError('Failed to connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [deId])

  useEffect(() => {
    fetchRunbook()
  }, [fetchRunbook])

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = SECTIONS.map((s) => ({
        id: s.id,
        el: document.getElementById(s.id),
      }))

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const { id, el } = sectionElements[i]
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 160) {
            setActiveSection(id)
            return
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleScenario = useCallback((scenarioId: string) => {
    setExpandedScenarios((prev) => {
      const next = new Set(prev)
      if (next.has(scenarioId)) {
        next.delete(scenarioId)
      } else {
        next.add(scenarioId)
      }
      return next
    })
  }, [])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Support
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-4" />
            <p className="text-sm text-gray-500">Loading runbook...</p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Support
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-24">
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center max-w-md">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                Failed to Load Runbook
              </h2>
              <p className="text-sm text-red-600 mb-6">{error}</p>
              <Button onClick={fetchRunbook} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { digitalEmployee, company, hasDesignWeek, sections } = data

  // ============================================
  // NO DESIGN WEEK DATA
  // ============================================

  if (!hasDesignWeek) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-8">
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Support
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center py-24">
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center max-w-md">
              <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                No Runbook Data Available
              </h2>
              <p className="text-sm text-gray-500">
                Complete Design Week for{' '}
                <span className="font-medium text-gray-700">
                  {digitalEmployee.name}
                </span>{' '}
                to generate runbook content.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // MAIN RUNBOOK VIEW
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 print:static print:border-0">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/support"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2 print:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Support
              </Link>
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-1 rounded-full"
                  style={{ backgroundColor: '#C2703E' }}
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                    {digitalEmployee.name}
                  </h1>
                  <p className="text-sm text-gray-500">{company.name} — Support Runbook</p>
                </div>
              </div>
            </div>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="print:hidden"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Sticky section navigation */}
      <div className="sticky top-[73px] z-20 bg-white/90 backdrop-blur-sm border-b border-gray-100 print:hidden">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto py-2 -mx-1" aria-label="Runbook sections">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                    activeSection === section.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  )}
                  onClick={(e) => {
                    e.preventDefault()
                    const el = document.getElementById(section.id)
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {section.label}
                </a>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick Reference Section */}
        <section id="quick-reference" className="scroll-mt-32">
          <QuickReferenceSection de={digitalEmployee} />
        </section>

        {/* Scope Section */}
        <section id="scope" className="scroll-mt-32">
          <ScopeSection scope={sections.scope} />
        </section>

        {/* Escalation Rules Section */}
        <section id="escalation-rules" className="scroll-mt-32">
          <EscalationRulesSection rules={sections.escalationRules} />
        </section>

        {/* Scenarios Section */}
        <section id="scenarios" className="scroll-mt-32">
          <ScenariosSection
            scenarios={sections.scenarios}
            expandedScenarios={expandedScenarios}
            onToggle={toggleScenario}
          />
        </section>

        {/* Integrations Section */}
        <section id="integrations" className="scroll-mt-32">
          <IntegrationsSection integrations={sections.integrations} />
        </section>

        {/* KPIs Section */}
        <section id="kpis" className="scroll-mt-32">
          <KPIsSection kpis={sections.kpis} />
        </section>
      </div>
    </div>
  )
}

// ============================================
// SECTION COMPONENTS
// ============================================

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-5 w-5 text-gray-600" />
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {count !== undefined && (
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      )}
    </div>
  )
}

function EmptySectionMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-8 px-4 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}

// Quick Reference
function QuickReferenceSection({
  de,
}: {
  de: RunbookData['digitalEmployee']
}) {
  return (
    <>
      <SectionHeader icon={BookOpen} title="Quick Reference" />
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {de.description || 'No description available'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Status
                </p>
                <Badge
                  variant={de.status === 'LIVE' ? 'success' : 'secondary'}
                  className="text-xs"
                >
                  {formatStatus(de.status)}
                </Badge>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Channels
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {de.channels.length > 0 ? (
                    de.channels.map((ch) => (
                      <Badge key={ch} variant="outline" className="text-xs">
                        {ch}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">None configured</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Journey Phase
                </p>
                <span className="text-sm text-gray-700">
                  {formatStatus(de.currentJourneyPhase)}
                </span>
              </div>
              {de.goLiveDate && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Go-Live Date
                  </p>
                  <span className="text-sm text-gray-700">
                    {new Date(de.goLiveDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// Scope
function ScopeSection({
  scope,
}: {
  scope: RunbookData['sections']['scope']
}) {
  const totalCount = scope.inScope.length + scope.outOfScope.length

  return (
    <>
      <SectionHeader icon={CheckCircle2} title="Scope" count={totalCount} />
      {totalCount === 0 ? (
        <EmptySectionMessage message="No scope items defined yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* In Scope */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                In Scope ({scope.inScope.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {scope.inScope.length === 0 ? (
                <p className="text-sm text-gray-400 italic">None defined</p>
              ) : (
                <ul className="space-y-2.5">
                  {scope.inScope.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">{item.statement}</p>
                        {item.conditions && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Condition: {item.conditions}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Out of Scope */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                Out of Scope ({scope.outOfScope.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {scope.outOfScope.length === 0 ? (
                <p className="text-sm text-gray-400 italic">None defined</p>
              ) : (
                <ul className="space-y-2.5">
                  {scope.outOfScope.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">{item.statement}</p>
                        {item.conditions && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Condition: {item.conditions}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

// Escalation Rules
function EscalationRulesSection({
  rules,
}: {
  rules: RunbookEscalationRule[]
}) {
  return (
    <>
      <SectionHeader icon={Shield} title="Escalation Rules" count={rules.length} />
      {rules.length === 0 ? (
        <EmptySectionMessage message="No escalation rules defined yet" />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="overflow-hidden">
              <div
                className={cn(
                  'h-1',
                  rule.priority === 'HIGH' && 'bg-red-500',
                  rule.priority === 'MEDIUM' && 'bg-amber-500',
                  rule.priority === 'LOW' && 'bg-green-500'
                )}
              />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-gray-500" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        {rule.trigger}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={cn('text-xs', getPriorityColor(rule.priority))}>
                        {rule.priority}
                      </Badge>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs text-gray-500">
                        {getConditionTypeLabel(rule.conditionType)}
                      </span>
                    </div>
                  </div>
                  <Badge
                    className={cn(
                      'text-xs border shrink-0',
                      getEscalationActionColor(rule.action)
                    )}
                  >
                    {getEscalationActionLabel(rule.action)}
                  </Badge>
                </div>

                {/* Condition details */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Condition Details</p>
                  {rule.conditionType === 'KEYWORD' && rule.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {rule.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 text-xs font-mono bg-white border border-gray-200 rounded text-gray-700"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  {rule.conditionType === 'CONFIDENCE' && rule.threshold !== null && (
                    <p className="text-sm text-gray-700">
                      Confidence below{' '}
                      <span className="font-semibold">{(rule.threshold * 100).toFixed(0)}%</span>
                    </p>
                  )}
                  {rule.conditionType !== 'KEYWORD' &&
                    rule.conditionType !== 'CONFIDENCE' && (
                      <p className="text-sm text-gray-500 italic">
                        {getConditionTypeLabel(rule.conditionType)} trigger
                      </p>
                    )}
                </div>

                {/* Handover context */}
                {rule.handoverContext.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">
                      Handover Context
                    </p>
                    <ul className="space-y-1">
                      {rule.handoverContext.map((ctx, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-gray-600"
                        >
                          <Info className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
                          {ctx}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

// Scenarios
function ScenariosSection({
  scenarios,
  expandedScenarios,
  onToggle,
}: {
  scenarios: RunbookScenario[]
  expandedScenarios: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <>
      <SectionHeader icon={Workflow} title="Scenarios" count={scenarios.length} />
      {scenarios.length === 0 ? (
        <EmptySectionMessage message="No scenarios defined yet" />
      ) : (
        <div className="space-y-3">
          {scenarios.map((scenario) => {
            const isExpanded = expandedScenarios.has(scenario.id)
            return (
              <Card key={scenario.id}>
                <div
                  className="flex items-center justify-between p-5 cursor-pointer select-none"
                  onClick={() => onToggle(scenario.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onToggle(scenario.id)
                    }
                  }}
                  aria-expanded={isExpanded}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {scenario.name}
                      </h3>
                      {scenario.skill && (
                        <Badge variant="secondary" className="text-[10px]">
                          {scenario.skill}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      Trigger: {scenario.trigger}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className="text-xs text-gray-400">
                      {scenario.steps.length} steps
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <CardContent className="pt-0 px-5 pb-5">
                    <div className="border-t border-gray-100 pt-4 space-y-4">
                      {/* Expected outcome */}
                      {scenario.expectedOutcome && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Expected Outcome
                          </p>
                          <p className="text-sm text-gray-700">
                            {scenario.expectedOutcome}
                          </p>
                        </div>
                      )}

                      {/* Steps */}
                      {scenario.steps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Steps
                          </p>
                          <ol className="space-y-2">
                            {scenario.steps.map((step) => (
                              <li
                                key={step.id}
                                className={cn(
                                  'flex items-start gap-3 p-2.5 rounded-lg',
                                  step.decisionPoint
                                    ? 'bg-amber-50 border border-amber-200'
                                    : 'bg-gray-50'
                                )}
                              >
                                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-white border border-gray-200 text-[10px] font-bold text-gray-500 shrink-0 mt-0.5">
                                  {step.order}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span
                                      className={cn(
                                        'inline-flex items-center px-1.5 py-0 text-[10px] font-semibold rounded',
                                        getActorColor(step.actor)
                                      )}
                                    >
                                      {formatActorLabel(step.actor)}
                                    </span>
                                    {step.decisionPoint && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700">
                                        <AlertTriangle className="h-3 w-3" />
                                        Decision Point
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700">{step.action}</p>
                                  {step.systemAction && (
                                    <p className="text-xs text-gray-500 mt-0.5 italic">
                                      System: {step.systemAction}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Edge cases */}
                      {scenario.edgeCases.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Edge Cases
                          </p>
                          <div className="space-y-2">
                            {scenario.edgeCases.map((ec) => (
                              <div
                                key={ec.id}
                                className={cn(
                                  'rounded-lg border p-3',
                                  ec.escalate
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-amber-50 border-amber-200'
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <FileWarning
                                    className={cn(
                                      'h-4 w-4 mt-0.5 shrink-0',
                                      ec.escalate ? 'text-red-500' : 'text-amber-500'
                                    )}
                                  />
                                  <div>
                                    <p className="text-xs font-semibold text-gray-800">
                                      {ec.condition}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-0.5">
                                      {ec.handling}
                                    </p>
                                    {ec.escalate && (
                                      <Badge
                                        variant="destructive"
                                        className="text-[10px] mt-1.5"
                                      >
                                        Requires Escalation
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Success criteria */}
                      {scenario.successCriteria.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1.5">
                            Success Criteria
                          </p>
                          <ul className="space-y-1">
                            {scenario.successCriteria.map((cr, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-xs text-gray-600"
                              >
                                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                {cr}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

// Integrations
function IntegrationsSection({
  integrations,
}: {
  integrations: RunbookIntegration[]
}) {
  return (
    <>
      <SectionHeader icon={Database} title="Integrations" count={integrations.length} />
      {integrations.length === 0 ? (
        <EmptySectionMessage message="No integrations defined yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {integration.systemName}
                    </h3>
                    {integration.purpose && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {integration.purpose}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={cn(
                      'text-[10px] shrink-0',
                      getIntegrationStatusColor(integration.status)
                    )}
                  >
                    {formatStatus(integration.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {integration.type && (
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Type
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Database className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-700">
                          {integration.type}
                        </span>
                      </div>
                    </div>
                  )}
                  {integration.authMethod && (
                    <div>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Auth
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Key className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-700">
                          {integration.authMethod.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error handling */}
                {(integration.onTimeout ||
                  integration.onAuthFailure ||
                  integration.onNotFound) && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Error Handling
                    </p>
                    <div className="space-y-1.5">
                      {integration.onTimeout && (
                        <div className="flex items-start gap-2">
                          <Clock className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[10px] font-medium text-gray-500">
                              Timeout:
                            </span>
                            <span className="text-xs text-gray-700 ml-1">
                              {integration.onTimeout}
                            </span>
                          </div>
                        </div>
                      )}
                      {integration.onAuthFailure && (
                        <div className="flex items-start gap-2">
                          <Key className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[10px] font-medium text-gray-500">
                              Auth Failure:
                            </span>
                            <span className="text-xs text-gray-700 ml-1">
                              {integration.onAuthFailure}
                            </span>
                          </div>
                        </div>
                      )}
                      {integration.onNotFound && (
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[10px] font-medium text-gray-500">
                              Not Found:
                            </span>
                            <span className="text-xs text-gray-700 ml-1">
                              {integration.onNotFound}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

// KPIs
function KPIsSection({ kpis }: { kpis: RunbookKPI[] }) {
  return (
    <>
      <SectionHeader icon={Target} title="KPIs" count={kpis.length} />
      {kpis.length === 0 ? (
        <EmptySectionMessage message="No KPIs defined yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.id}>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {kpi.name}
                </h3>
                {kpi.description && (
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                    {kpi.description}
                  </p>
                )}
                <div className="space-y-2">
                  {kpi.targetValue && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Target
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: '#C2703E' }}
                      >
                        {kpi.targetValue}
                      </span>
                    </div>
                  )}
                  {kpi.baselineValue && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Baseline
                      </span>
                      <span className="text-xs text-gray-600">{kpi.baselineValue}</span>
                    </div>
                  )}
                  {kpi.measurementMethod && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Method
                      </span>
                      <span className="text-xs text-gray-600 text-right max-w-[60%]">
                        {kpi.measurementMethod}
                      </span>
                    </div>
                  )}
                  {kpi.frequency && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Frequency
                      </span>
                      <span className="text-xs text-gray-600">{kpi.frequency}</span>
                    </div>
                  )}
                  {kpi.owner && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Owner
                      </span>
                      <span className="text-xs text-gray-600">{kpi.owner}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
