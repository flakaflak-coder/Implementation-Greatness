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
  type BusinessProfileSection,
  BUSINESS_SECTION_METADATA,
  BUSINESS_PROFILE_MAPPING,
} from '../types'
import { BusinessRuleSection, type BusinessRule } from '../entities'

interface BusinessProfileTabProps {
  designWeekId: string
  items: Record<BusinessProfileSection, ExtractedItemWithSession[]>
  completeness: ProfileCompleteness['business']
  onEditItem?: (item: ExtractedItemWithSession) => void
  onApproveItem?: (item: ExtractedItemWithSession) => void
  onRefresh: () => void
  className?: string
  // Structured business rules
  businessRules?: BusinessRule[]
  onAddBusinessRule?: (rule: BusinessRule) => void
  onUpdateBusinessRule?: (rule: BusinessRule) => void
  onDeleteBusinessRule?: (id: string) => void
}

export function BusinessProfileTab({
  designWeekId,
  items,
  completeness,
  onEditItem,
  onApproveItem,
  onRefresh,
  className,
  businessRules = [],
  onAddBusinessRule,
  onUpdateBusinessRule,
  onDeleteBusinessRule,
}: BusinessProfileTabProps) {
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Set<BusinessProfileSection>>(
    new Set(['identity', 'businessContext']) // Default expanded
  )

  const toggleSection = (section: BusinessProfileSection) => {
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

  const sections: BusinessProfileSection[] = [
    'identity',
    'businessContext',
    'channels',
    'skills',
    'process',
    'guardrails',
    'kpis',
  ]

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with overall completeness */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Business Profile</h2>
          <p className="text-sm text-gray-500">
            Define what the Digital Employee does and how it operates
          </p>
        </div>
        <div className="flex items-center gap-4">
          <CompletenessBadge percentage={completeness.overall} size="lg" />
          <GenerateDocButton
            designWeekId={designWeekId}
            documentType="DE_DESIGN"
            disabled={completeness.overall < 50}
            onGenerate={onRefresh}
          />
        </div>
      </div>

      {/* Structured Business Rules */}
      {onAddBusinessRule && onUpdateBusinessRule && (
        <BusinessRuleSection
          rules={businessRules}
          onAdd={onAddBusinessRule}
          onUpdate={onUpdateBusinessRule}
          onDelete={onDeleteBusinessRule}
        />
      )}

      {/* Profile Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const metadata = BUSINESS_SECTION_METADATA[section]
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
              availableTypes={BUSINESS_PROFILE_MAPPING[section]}
              onRefresh={onRefresh}
            >
              {sectionItems.length === 0 ? (
                <EmptySection
                  metadata={metadata}
                  designWeekId={designWeekId}
                  availableTypes={BUSINESS_PROFILE_MAPPING[section]}
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

      {/* Bottom document generation (if scrolled) */}
      {completeness.overall >= 50 && (
        <div className="sticky bottom-4 flex justify-end">
          <GenerateDocButton
            designWeekId={designWeekId}
            documentType="DE_DESIGN"
            onGenerate={onRefresh}
            className="shadow-lg"
          />
        </div>
      )}
    </div>
  )
}
