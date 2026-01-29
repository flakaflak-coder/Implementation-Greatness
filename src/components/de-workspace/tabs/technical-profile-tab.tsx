'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ProfileSection, EmptySection } from '../profile-sections/profile-section'
import { ProfileField } from '../profile-sections/profile-field'
import { GenerateDocButton } from '../shared/generate-doc-button'
import { CompletenessBadge } from '../shared/completeness-badge'
import {
  type ExtractedItemWithSession,
  type ProfileCompleteness,
  type TechnicalProfileSection,
  TECHNICAL_SECTION_METADATA,
  TECHNICAL_PROFILE_MAPPING,
} from '../types'
import { IntegrationSection, type Integration } from '../entities'

interface TechnicalProfileTabProps {
  designWeekId: string
  items: Record<TechnicalProfileSection, ExtractedItemWithSession[]>
  completeness: ProfileCompleteness['technical']
  onEditItem?: (item: ExtractedItemWithSession) => void
  onApproveItem?: (item: ExtractedItemWithSession) => void
  onRefresh: () => void
  className?: string
  // Structured integrations
  integrations?: Integration[]
  onAddIntegration?: (integration: Integration) => void
  onUpdateIntegration?: (integration: Integration) => void
  onDeleteIntegration?: (id: string) => void
}

export function TechnicalProfileTab({
  designWeekId,
  items,
  completeness,
  onEditItem,
  onApproveItem,
  onRefresh,
  className,
  integrations = [],
  onAddIntegration,
  onUpdateIntegration,
  onDeleteIntegration,
}: TechnicalProfileTabProps) {
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<TechnicalProfileSection>>(
    new Set(['integrations', 'dataFields']) // Default expanded
  )

  const toggleSection = (section: TechnicalProfileSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const sections: TechnicalProfileSection[] = [
    'integrations',
    'dataFields',
    'security',
    'apis',
    'credentials',
  ]

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with overall completeness */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Technical Profile</h2>
          <p className="text-sm text-gray-500">
            Define systems, integrations, and technical requirements
          </p>
        </div>
        <div className="flex items-center gap-4">
          <CompletenessBadge percentage={completeness.overall} size="lg" />
          <GenerateDocButton
            designWeekId={designWeekId}
            documentType="SOLUTION_DESIGN"
            disabled={completeness.overall < 50}
            onGenerate={onRefresh}
          />
        </div>
      </div>

      {/* Technical architecture note */}
      <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
        <p className="text-sm text-violet-700">
          <strong>Technical sessions</strong> are typically attended by a Solution Architect from
          Freeday alongside the Implementation Consultant. Ensure all integration details,
          credentials, and security requirements are captured.
        </p>
      </div>

      {/* Structured Integrations */}
      {onAddIntegration && onUpdateIntegration && (
        <IntegrationSection
          integrations={integrations}
          onAdd={onAddIntegration}
          onUpdate={onUpdateIntegration}
          onDelete={onDeleteIntegration}
        />
      )}

      {/* Profile Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const metadata = TECHNICAL_SECTION_METADATA[section]
          const sectionItems = items[section]
          const sectionCompleteness = completeness.sections[section]
          const pendingCount = sectionItems.filter(
            (i) => i.status === 'PENDING' || i.status === 'NEEDS_CLARIFICATION'
          ).length

          return (
            <ProfileSection
              key={section}
              metadata={metadata}
              items={sectionItems}
              completeness={sectionCompleteness.percentage}
              pendingCount={pendingCount}
              missingTypes={sectionCompleteness.missingTypes}
              defaultExpanded={expandedSections.has(section)}
              designWeekId={designWeekId}
              availableTypes={TECHNICAL_PROFILE_MAPPING[section]}
              onRefresh={onRefresh}
            >
              {sectionItems.length === 0 ? (
                <EmptySection
                  metadata={metadata}
                  designWeekId={designWeekId}
                  availableTypes={TECHNICAL_PROFILE_MAPPING[section]}
                  onRefresh={onRefresh}
                />
              ) : (
                sectionItems.map((item) => (
                  <ProfileField
                    key={item.id}
                    item={item}
                    onEdit={onEditItem ? () => onEditItem(item) : undefined}
                    onApprove={onApproveItem ? () => onApproveItem(item) : undefined}
                  />
                ))
              )}
            </ProfileSection>
          )
        })}
      </div>

      {/* Integration checklist reminder */}
      <div className="p-4 bg-gray-50 border rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Integration Checklist</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li className="flex items-center gap-2">
            <span className={items.integrations.length > 0 ? 'text-emerald-500' : 'text-gray-400'}>
              {items.integrations.length > 0 ? '✓' : '○'}
            </span>
            At least one system integration identified
          </li>
          <li className="flex items-center gap-2">
            <span className={items.dataFields.length >= 3 ? 'text-emerald-500' : 'text-gray-400'}>
              {items.dataFields.length >= 3 ? '✓' : '○'}
            </span>
            Data fields documented (at least 3)
          </li>
          <li className="flex items-center gap-2">
            <span className={items.security.length > 0 ? 'text-emerald-500' : 'text-gray-400'}>
              {items.security.length > 0 ? '✓' : '○'}
            </span>
            Security requirements defined
          </li>
          <li className="flex items-center gap-2">
            <span className={items.credentials.length > 0 ? 'text-emerald-500' : 'text-gray-400'}>
              {items.credentials.length > 0 ? '✓' : '○'}
            </span>
            Technical contacts identified
          </li>
        </ul>
      </div>

      {/* Bottom document generation (if scrolled) */}
      {completeness.overall >= 50 && (
        <div className="sticky bottom-4 flex justify-end">
          <GenerateDocButton
            designWeekId={designWeekId}
            documentType="SOLUTION_DESIGN"
            onGenerate={onRefresh}
            className="shadow-lg"
          />
        </div>
      )}
    </div>
  )
}
