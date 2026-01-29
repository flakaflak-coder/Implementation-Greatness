'use client'

import { useState, useMemo } from 'react'
import { Rocket, Briefcase, Wrench, ClipboardCheck } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ProgressTab } from './tabs/progress-tab'
import { BusinessProfileTabV2 } from './tabs/business-profile-tab-v2'
import { TechnicalProfileTabV2 } from './tabs/technical-profile-tab-v2'
import { TestPlanTabV2 } from './tabs/test-plan-tab-v2'
import {
  type DEWorkspaceProps,
  type WorkspaceTab,
  type ExtractedItemWithSession,
  groupItemsByProfile,
  calculateProfileCompleteness,
} from './types'

export function DEWorkspace({
  digitalEmployee,
  designWeek,
  onUploadSession,
  onExtractSession,
  onRefresh,
}: DEWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('progress')

  // Create a refresh key that changes when extracted items change
  // This forces V2 tabs to remount and reload their data
  const refreshKey = useMemo(() => {
    const totalItems = designWeek.sessions.reduce(
      (sum, session) => sum + (session.extractedItems?.length || 0),
      0
    )
    return `${designWeek.id}-${totalItems}-${designWeek.sessions.length}`
  }, [designWeek.id, designWeek.sessions])

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

  // Calculate completeness
  const profileCompleteness = useMemo(() => {
    return calculateProfileCompleteness(groupedItems)
  }, [groupedItems])

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

  // Tab change handler
  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab)
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as WorkspaceTab)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-4 mb-6">
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

      <TabsContent value="progress">
        <ProgressTab
          designWeek={designWeek}
          profileCompleteness={profileCompleteness}
          pendingItems={pendingItems}
          ambiguousItems={ambiguousItems}
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
  )
}
