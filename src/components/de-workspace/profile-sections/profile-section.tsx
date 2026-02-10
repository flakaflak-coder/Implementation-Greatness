'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CircularProgress } from '../shared/completeness-badge'
import { InlineEntryForm } from '../shared/inline-entry-form'
import type { SectionMetadata, ExtractedItemWithSession } from '../types'
import type { ExtractedItemType } from '@prisma/client'

interface ProfileSectionProps {
  metadata: SectionMetadata
  items: ExtractedItemWithSession[]
  completeness: number
  pendingCount: number
  missingTypes: string[]
  defaultExpanded?: boolean
  // For inline entry form
  designWeekId?: string
  availableTypes?: ExtractedItemType[]
  onRefresh?: () => void
  children: React.ReactNode
  className?: string
}

export function ProfileSection({
  metadata,
  items,
  completeness,
  pendingCount,
  missingTypes,
  defaultExpanded = false,
  designWeekId,
  availableTypes,
  onRefresh,
  children,
  className,
}: ProfileSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Dynamically get the icon component
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    metadata.icon
  ] || LucideIcons.Circle

  const getStatusColor = () => {
    if (completeness >= 80) return 'emerald'
    if (completeness >= 50) return 'amber'
    return 'red'
  }

  const statusColor = getStatusColor()

  const colorClasses: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    indigo: {
      bg: 'bg-[#FDF3EC]',
      border: 'border-[#E8D5C4]',
      text: 'text-[#A05A32]',
      iconBg: 'bg-[#F5E6DA]',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100',
    },
    cyan: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      text: 'text-cyan-700',
      iconBg: 'bg-cyan-100',
    },
    violet: {
      bg: 'bg-[#FDF3EC]',
      border: 'border-[#E8D5C4]',
      text: 'text-[#A05A32]',
      iconBg: 'bg-[#F5E6DA]',
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100',
    },
    rose: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      iconBg: 'bg-rose-100',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      iconBg: 'bg-red-100',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      iconBg: 'bg-orange-100',
    },
  }

  const colors = colorClasses[metadata.color] || colorClasses.indigo

  return (
    <Card className={cn('overflow-hidden transition-all', className)}>
      {/* Colored accent bar */}
      <div className={cn('h-1', colors.bg.replace('50', '400'))} />

      <CardHeader className="pb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left group"
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', colors.iconBg)}>
              <IconComponent className={cn('h-5 w-5', colors.text)} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                {metadata.title}
              </h3>
              <p className="text-sm text-gray-500">{metadata.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Pending items badge */}
            {pendingCount > 0 && (
              <Badge variant="warning" className="text-xs">
                {pendingCount} pending
              </Badge>
            )}

            {/* Items count */}
            <Badge variant="secondary" className="text-xs">
              {items.length} items
            </Badge>

            {/* Completeness indicator */}
            <CircularProgress percentage={completeness} size={36} strokeWidth={3} />

            {/* Expand/collapse chevron */}
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          {/* Missing types warning */}
          {missingTypes.length > 0 && completeness < 100 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Missing information</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Consider adding:{' '}
                    {missingTypes.slice(0, 3).map((type, i) => (
                      <span key={type}>
                        {i > 0 && ', '}
                        <span className="font-medium">{type.replace(/_/g, ' ').toLowerCase()}</span>
                      </span>
                    ))}
                    {missingTypes.length > 3 && ` and ${missingTypes.length - 3} more`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section content (items) */}
          <div className="space-y-3">{children}</div>

          {/* Inline entry form */}
          {designWeekId && availableTypes && availableTypes.length > 0 && onRefresh && (
            <InlineEntryForm
              designWeekId={designWeekId}
              availableTypes={availableTypes}
              defaultType={availableTypes.length === 1 ? availableTypes[0] : undefined}
              placeholder={`Add ${metadata.title.toLowerCase()} item...`}
              onSuccess={onRefresh}
              className="mt-4"
            />
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Empty state for sections with no items
interface EmptySectionProps {
  metadata: SectionMetadata
  designWeekId?: string
  availableTypes?: ExtractedItemType[]
  onRefresh?: () => void
}

export function EmptySection({ metadata, designWeekId, availableTypes, onRefresh }: EmptySectionProps) {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    metadata.icon
  ] || LucideIcons.Circle

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="p-3 bg-gray-100 rounded-full mb-3">
        <IconComponent className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 mb-1">No {metadata.title.toLowerCase()} items yet</p>
      <p className="text-xs text-gray-400 mb-4">
        Items will appear here after session extraction, or add one below
      </p>
      {designWeekId && availableTypes && availableTypes.length > 0 && onRefresh && (
        <InlineEntryForm
          designWeekId={designWeekId}
          availableTypes={availableTypes}
          defaultType={availableTypes.length === 1 ? availableTypes[0] : undefined}
          placeholder={`Add first ${metadata.title.toLowerCase()} item...`}
          onSuccess={onRefresh}
          className="w-full max-w-md"
        />
      )}
    </div>
  )
}
