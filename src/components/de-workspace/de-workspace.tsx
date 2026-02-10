'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Rocket, Briefcase, Wrench, ClipboardCheck, Upload, FileSignature } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ProgressTab } from './tabs/progress-tab'
import { BusinessProfileTabV2 } from './tabs/business-profile-tab-v2'
import { TechnicalProfileTabV2 } from './tabs/technical-profile-tab-v2'
import { TestPlanTabV2 } from './tabs/test-plan-tab-v2'
import { SalesHandoverTab } from './tabs/sales-handover-tab'
import { UnifiedUpload, UploadHistory } from '@/components/upload'
import {
  type DEWorkspaceProps,
  type WorkspaceTab,
  type ExtractedItemWithSession,
  groupItemsByProfile,
  calculateProfileCompleteness,
} from './types'
import type { BusinessProfile, TechnicalProfile } from './profile-types'

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

  return (
    <div className="space-y-6">
      {/* Centralized Upload Section - Always visible */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Upload Sessions & Documents</CardTitle>
              <CardDescription>
                Drop any recording, transcript, or document. AI will automatically extract and categorize the information.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <UnifiedUpload
            designWeekId={designWeek.id}
            onComplete={onRefresh}
          />

          {/* Upload History */}
          {designWeek.uploadJobs && designWeek.uploadJobs.length > 0 && (
            <UploadHistory
              uploads={designWeek.uploadJobs}
              onRetry={async (jobId) => {
                await fetch(`/api/upload/${jobId}/retry`, { method: 'POST' })
                onRefresh?.()
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as WorkspaceTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5 mb-6">
        <TabsTrigger value="handover" className="gap-2">
          <FileSignature className="h-4 w-4" />
          <span className="hidden sm:inline">Handover</span>
        </TabsTrigger>
        <TabsTrigger value="progress" className="gap-2">
          <Rocket className="h-4 w-4" />
          <span className="hidden sm:inline">Progress</span>
        </TabsTrigger>
        <TabsTrigger value="business" className="gap-2">
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Business</span>
          {profileCompleteness.business.overall < 100 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {profileCompleteness.business.overall}%
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="technical" className="gap-2">
          <Wrench className="h-4 w-4" />
          <span className="hidden sm:inline">Technical</span>
          {profileCompleteness.technical.overall < 100 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {profileCompleteness.technical.overall}%
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="testplan" className="gap-2">
          <ClipboardCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Test Plan</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="handover">
        <SalesHandoverTab key={`handover-${refreshKey}`} designWeekId={designWeek.id} />
      </TabsContent>

      <TabsContent value="progress">
        <ProgressTab
          designWeek={designWeek}
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

      <TabsContent value="business">
        <BusinessProfileTabV2 key={`business-${refreshKey}`} designWeekId={designWeek.id} />
      </TabsContent>

      <TabsContent value="technical">
        <TechnicalProfileTabV2 key={`technical-${refreshKey}`} designWeekId={designWeek.id} />
      </TabsContent>

      <TabsContent value="testplan">
        <TestPlanTabV2 key={`testplan-${refreshKey}`} designWeekId={designWeek.id} />
      </TabsContent>
      </Tabs>
    </div>
  )
}
