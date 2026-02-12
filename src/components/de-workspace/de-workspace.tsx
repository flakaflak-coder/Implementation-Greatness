'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Rocket, Briefcase, Wrench, ClipboardCheck, Upload, FileSignature, Shield, Zap, X, FileText, CheckCircle2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProgressTab } from './tabs/progress-tab'
import { BusinessProfileTabV2 } from './tabs/business-profile-tab-v2'
import { TechnicalProfileTabV2 } from './tabs/technical-profile-tab-v2'
import { TestPlanTabV2 } from './tabs/test-plan-tab-v2'
import { SalesHandoverTab } from './tabs/sales-handover-tab'
import { ScopeGuardian } from '@/components/scope-guardian/scope-guardian'
import { DocumentsTab } from './tabs/documents-tab'
import { SignOffTab } from './tabs/sign-off-tab'
import { UnifiedUpload, UploadHistory } from '@/components/upload'
import { toast } from 'sonner'
import {
  type DEWorkspaceProps,
  type WorkspaceTab,
  type ExtractedItemWithSession,
  groupItemsByProfile,
  calculateProfileCompleteness,
} from './types'
import type { BusinessProfile, TechnicalProfile } from './profile-types'

const PHASE_NAMES: Record<number, string> = {
  1: 'Kickoff',
  2: 'Process Design',
  3: 'Technical',
  4: 'Sign-off',
}

export function DEWorkspace({
  digitalEmployee,
  designWeek,
  onUploadSession,
  onExtractSession,
  onRefresh,
  activeTab: externalActiveTab,
  onTabChange,
}: DEWorkspaceProps) {
  // Use external tab if provided, otherwise manage internally
  const [internalActiveTab, setInternalActiveTab] = useState<WorkspaceTab>('progress')
  const activeTab = externalActiveTab ?? internalActiveTab

  // Profile state for completeness calculation
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [technicalProfile, setTechnicalProfile] = useState<TechnicalProfile | null>(null)

  // Auto-progress notification: track phase changes
  const previousPhaseRef = useRef(designWeek.currentPhase)
  const previousStatusRef = useRef(designWeek.status)
  const [phaseAdvanceBanner, setPhaseAdvanceBanner] = useState<{
    fromPhase: number
    toPhase: number
    newStatus: string | null
  } | null>(null)

  useEffect(() => {
    const prevPhase = previousPhaseRef.current
    const prevStatus = previousStatusRef.current
    const currentPhase = designWeek.currentPhase
    const currentStatus = designWeek.status

    // Detect phase advancement
    if (currentPhase > prevPhase) {
      setPhaseAdvanceBanner({
        fromPhase: prevPhase,
        toPhase: currentPhase,
        newStatus: currentStatus !== prevStatus ? currentStatus : null,
      })
    }
    // Detect status change to PENDING_SIGNOFF
    else if (currentStatus === 'PENDING_SIGNOFF' && prevStatus !== 'PENDING_SIGNOFF') {
      setPhaseAdvanceBanner({
        fromPhase: prevPhase,
        toPhase: currentPhase,
        newStatus: 'PENDING_SIGNOFF',
      })
    }

    previousPhaseRef.current = currentPhase
    previousStatusRef.current = currentStatus
  }, [designWeek.currentPhase, designWeek.status])

  const setActiveTab = (tab: WorkspaceTab) => {
    setInternalActiveTab(tab)
    onTabChange?.(tab)
  }

  // Create a refresh key that changes when extracted items change
  // This forces V2 tabs to remount and reload their data
  const refreshKey = useMemo(() => {
    const totalItems = designWeek.sessions.reduce(
      (sum, session) => sum + (session.extractedItems?.length || 0),
      0
    )
    return `${designWeek.id}-${totalItems}-${designWeek.sessions.length}`
  }, [designWeek.id, designWeek.sessions])

  // Fetch profile data for completeness calculation
  const fetchProfiles = useCallback(async () => {
    try {
      const [businessRes, technicalRes] = await Promise.all([
        fetch(`/api/design-weeks/${designWeek.id}/profile`),
        fetch(`/api/design-weeks/${designWeek.id}/technical-profile`),
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
  }, [designWeek.id])

  // Load profiles on mount and when design week changes
  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles, refreshKey])

  // Flatten all extracted items from sessions with session info
  const extractedItemsWithSession: ExtractedItemWithSession[] = useMemo(() => {
    const items: ExtractedItemWithSession[] = []

    for (const session of designWeek.sessions) {
      if (session.extractedItems) {
        for (const item of session.extractedItems) {
          items.push({
            ...item,
            session: {
              id: session.id,
              phase: session.phase,
              sessionNumber: session.sessionNumber,
              date: session.date,
            },
          })
        }
      }
    }

    return items
  }, [designWeek.sessions])

  // Group items by profile section
  const groupedItems = useMemo(() => {
    return groupItemsByProfile(extractedItemsWithSession)
  }, [extractedItemsWithSession])

  // Calculate completeness (now includes manual profile entries)
  const profileCompleteness = useMemo(() => {
    return calculateProfileCompleteness(groupedItems, businessProfile, technicalProfile)
  }, [groupedItems, businessProfile, technicalProfile])

  // Get pending items (not yet approved)
  const pendingItems = useMemo(() => {
    return extractedItemsWithSession.filter(
      (item) => item.status === 'PENDING' || item.status === 'NEEDS_CLARIFICATION'
    )
  }, [extractedItemsWithSession])

  // Get ambiguous scope items
  const ambiguousItems = useMemo(() => {
    return designWeek.scopeItems.filter((item) => item.classification === 'AMBIGUOUS')
  }, [designWeek.scopeItems])

  // Tab change handler - refresh profiles when switching to progress tab
  // This ensures completeness reflects any manual edits made in Business/Technical tabs
  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab)
    if (tab === 'progress') {
      fetchProfiles()
    }
  }

  // Scope Guardian: resolve an ambiguous scope item via API
  const handleScopeResolve = async (
    id: string,
    classification: 'IN_SCOPE' | 'OUT_OF_SCOPE',
    notes?: string,
  ) => {
    try {
      const response = await fetch(`/api/scope-items/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classification, notes }),
      })
      if (response.ok) {
        toast.success(`Scope item marked as ${classification === 'IN_SCOPE' ? 'In Scope' : 'Out of Scope'}`)
        onRefresh?.()
      } else {
        const result = await response.json()
        toast.error(result.error || 'Failed to resolve scope item')
      }
    } catch (error) {
      console.error('Failed to resolve scope item:', error)
      toast.error('Failed to resolve scope item')
    }
  }

  // Scope Guardian: unresolve a resolved scope item back to AMBIGUOUS via API
  const handleScopeUnresolve = async (id: string) => {
    try {
      const response = await fetch(`/api/scope-items/${id}/unresolve`, {
        method: 'POST',
      })
      if (response.ok) {
        toast.success('Scope item moved back to Ambiguous')
        onRefresh?.()
      } else {
        const result = await response.json()
        toast.error(result.error || 'Failed to unresolve scope item')
      }
    } catch (error) {
      console.error('Failed to unresolve scope item:', error)
      toast.error('Failed to unresolve scope item')
    }
  }

  // Scope Guardian: batch resolve multiple ambiguous scope items via API
  const handleBatchScopeResolve = async (
    ids: string[],
    classification: 'IN_SCOPE' | 'OUT_OF_SCOPE',
  ) => {
    try {
      const response = await fetch('/api/scope-items/batch-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, classification }),
      })
      if (response.ok) {
        toast.success(`${ids.length} items marked as ${classification === 'IN_SCOPE' ? 'In Scope' : 'Out of Scope'}`)
        onRefresh?.()
      } else {
        const result = await response.json()
        toast.error(result.error || 'Failed to batch resolve scope items')
        onRefresh?.()
      }
    } catch (error) {
      console.error('Failed to batch resolve scope items:', error)
      toast.error('Failed to resolve some scope items')
      onRefresh?.()
    }
  }

  // Map scope items to include evidence (defaults to empty array when absent)
  const scopeItemsForGuardian = useMemo(() => {
    return designWeek.scopeItems.map((item) => ({
      id: item.id,
      statement: item.statement,
      classification: item.classification,
      skill: item.skill,
      conditions: item.conditions,
      notes: item.notes,
      evidence: (item.evidence ?? []).map((ev) => ({
        ...ev,
        sourceType: ev.sourceType as 'RECORDING' | 'DOCUMENT',
      })),
    }))
  }, [designWeek.scopeItems])

  // Extract unique skills for the ScopeGuardian filter
  const uniqueSkills = useMemo(() => {
    const skills = new Set<string>()
    for (const item of designWeek.scopeItems) {
      if (item.skill) {
        skills.add(item.skill)
      }
    }
    return Array.from(skills).sort()
  }, [designWeek.scopeItems])

  return (
    <div className="space-y-8">
      {/* Auto-progress notification banner */}
      {phaseAdvanceBanner && (
        <div className="flex items-center justify-between gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-full">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-emerald-900">
                {phaseAdvanceBanner.newStatus === 'PENDING_SIGNOFF'
                  ? 'Design Week ready for sign-off!'
                  : `Phase advanced to ${PHASE_NAMES[phaseAdvanceBanner.toPhase] || `Phase ${phaseAdvanceBanner.toPhase}`}`}
              </p>
              <p className="text-sm text-emerald-700">
                {phaseAdvanceBanner.newStatus === 'PENDING_SIGNOFF'
                  ? 'Sign-off content was detected in a recent upload. Review the progress tab and prepare for client approval.'
                  : `Based on your recent upload, the system detected ${PHASE_NAMES[phaseAdvanceBanner.toPhase]?.toLowerCase() || ''} content and automatically advanced the phase from ${PHASE_NAMES[phaseAdvanceBanner.fromPhase] || `Phase ${phaseAdvanceBanner.fromPhase}`}.`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPhaseAdvanceBanner(null)}
            className="text-emerald-600 hover:bg-emerald-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Upload Section */}
      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-medium text-stone-700">Upload Sessions & Documents</span>
        </div>
        <UnifiedUpload
          designWeekId={designWeek.id}
          onComplete={onRefresh}
        />

        {/* Upload History */}
        {designWeek.uploadJobs && designWeek.uploadJobs.length > 0 && (
          <div className="mt-3">
            <UploadHistory
              uploads={designWeek.uploadJobs}
              onRetry={async (jobId) => {
                await fetch(`/api/upload/${jobId}/retry`, { method: 'POST' })
                onRefresh?.()
              }}
            />
          </div>
        )}
      </div>

      {/* Tabs Section */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => handleTabChange(value as WorkspaceTab)}
        className="w-full"
      >
        <TabsList className="w-full justify-start mb-8">
        <TabsTrigger value="handover" className="gap-1.5" title="Sales context and client expectations from the sales handover" aria-label="Handover">
          <FileSignature className="h-4 w-4" />
          <span className="hidden sm:inline">Handover</span>
        </TabsTrigger>
        <TabsTrigger value="progress" className="gap-1.5" title="Design Week progress, session guide, and profile completeness overview" aria-label="Progress">
          <Rocket className="h-4 w-4" />
          <span className="hidden sm:inline">Progress</span>
          {pendingItems.length > 0 && (
            <span className="ml-1 w-2 h-2 rounded-full bg-amber-500 inline-block" title={`${pendingItems.length} items need review`} />
          )}
        </TabsTrigger>
        <TabsTrigger value="scope" className="gap-1.5" title="Scope items: what the DE will and will not handle" aria-label="Scope">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Scope</span>
          {ambiguousItems.length > 0 && (
            <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
              {ambiguousItems.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="business" className="gap-1.5" title="Business profile: identity, process, skills, guardrails, KPIs" aria-label="Business Profile">
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Business</span>
          {profileCompleteness.business.overall < 100 && (
            <Badge variant="secondary" className="ml-1">
              {profileCompleteness.business.overall}%
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="technical" className="gap-1.5" title="Technical profile: integrations, data fields, APIs, security" aria-label="Technical Profile">
          <Wrench className="h-4 w-4" />
          <span className="hidden sm:inline">Technical</span>
          {profileCompleteness.technical.overall < 100 && (
            <Badge variant="secondary" className="ml-1">
              {profileCompleteness.technical.overall}%
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="testplan" className="gap-1.5" title="Test plan: test cases, launch criteria, and UAT preparation" aria-label="Test Plan">
          <ClipboardCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Test Plan</span>
        </TabsTrigger>
        <TabsTrigger value="documents" className="gap-1.5" title="Generate and manage design documents, exports, and PDFs" aria-label="Documents">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Documents</span>
        </TabsTrigger>
        <TabsTrigger value="signoff" className="gap-1.5" title="Stakeholder sign-off approvals for Design Week completion" aria-label="Sign-off">
          <CheckCircle2 className="h-4 w-4" />
          <span className="hidden sm:inline">Sign-off</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="handover">
        <SalesHandoverTab key={`handover-${refreshKey}`} designWeekId={designWeek.id} />
      </TabsContent>

      <TabsContent value="progress">
        <ProgressTab
          designWeek={designWeek}
          digitalEmployeeId={digitalEmployee.id}
          profileCompleteness={profileCompleteness}
          pendingItems={pendingItems}
          ambiguousItems={ambiguousItems}
          extractedItems={extractedItemsWithSession}
          onTabChange={handleTabChange}
          onUploadSession={onUploadSession}
          onExtractSession={onExtractSession}
          onRefresh={onRefresh}
        />
      </TabsContent>

      <TabsContent value="scope">
        <ScopeGuardian
          scopeItems={scopeItemsForGuardian}
          skills={uniqueSkills}
          onResolve={handleScopeResolve}
          onUnresolve={handleScopeUnresolve}
          onBatchResolve={handleBatchScopeResolve}
        />
      </TabsContent>

      <TabsContent value="business">
        <BusinessProfileTabV2 key={`business-${refreshKey}`} designWeekId={designWeek.id} />
      </TabsContent>

      <TabsContent value="technical">
        <TechnicalProfileTabV2 key={`technical-${refreshKey}`} designWeekId={designWeek.id} />
      </TabsContent>

      <TabsContent value="testplan">
        <TestPlanTabV2 key={`testplan-${refreshKey}`} designWeekId={designWeek.id} />
      </TabsContent>

      <TabsContent value="documents">
        <DocumentsTab key={`documents-${refreshKey}`} designWeekId={designWeek.id} />
      </TabsContent>

      <TabsContent value="signoff">
        <SignOffTab key={`signoff-${refreshKey}`} designWeekId={designWeek.id} />
      </TabsContent>
      </Tabs>
    </div>
  )
}
