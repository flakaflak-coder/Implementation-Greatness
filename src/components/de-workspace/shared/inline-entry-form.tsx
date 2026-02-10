'use client'

import { useState } from 'react'
import { Plus, Save, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ExtractedItemType } from '@prisma/client'

// Human-readable labels for item types
const ITEM_TYPE_LABELS: Record<string, string> = {
  STAKEHOLDER: 'Stakeholder',
  GOAL: 'Goal / Objective',
  BUSINESS_CASE: 'Business Case',
  KPI_TARGET: 'KPI Target',
  VOLUME_EXPECTATION: 'Volume Expectation',
  COST_PER_CASE: 'Cost per Case',
  PEAK_PERIODS: 'Peak Periods',
  CHANNEL: 'Channel',
  CHANNEL_VOLUME: 'Channel Volume',
  CHANNEL_SLA: 'Channel SLA',
  CHANNEL_RULE: 'Channel Rule',
  SKILL_ANSWER: 'Skill: Answer Questions',
  SKILL_ROUTE: 'Skill: Route/Escalate',
  SKILL_APPROVE_REJECT: 'Skill: Approve/Reject',
  SKILL_REQUEST_INFO: 'Skill: Request Information',
  SKILL_NOTIFY: 'Skill: Send Notifications',
  SKILL_OTHER: 'Skill: Other',
  KNOWLEDGE_SOURCE: 'Knowledge Source',
  BRAND_TONE: 'Brand Tone',
  COMMUNICATION_STYLE: 'Communication Style',
  RESPONSE_TEMPLATE: 'Response Template',
  HAPPY_PATH_STEP: 'Happy Path Step',
  EXCEPTION_CASE: 'Exception Case',
  CASE_TYPE: 'Case Type',
  DOCUMENT_TYPE: 'Document Type',
  BUSINESS_RULE: 'Business Rule',
  ESCALATION_TRIGGER: 'Escalation Trigger',
  GUARDRAIL_NEVER: 'Guardrail: Never Do',
  GUARDRAIL_ALWAYS: 'Guardrail: Always Do',
  FINANCIAL_LIMIT: 'Financial Limit',
  LEGAL_RESTRICTION: 'Legal Restriction',
  TIMELINE_CONSTRAINT: 'Timeline Constraint',
  SYSTEM_INTEGRATION: 'System Integration',
  DATA_FIELD: 'Data Field',
  SECURITY_REQUIREMENT: 'Security Requirement',
  COMPLIANCE_REQUIREMENT: 'Compliance Requirement',
  API_ENDPOINT: 'API Endpoint',
  ERROR_HANDLING: 'Error Handling',
  TECHNICAL_CONTACT: 'Technical Contact',
}

interface InlineEntryFormProps {
  designWeekId: string
  availableTypes: ExtractedItemType[]
  defaultType?: ExtractedItemType
  placeholder?: string
  onSuccess: () => void
  className?: string
}

export function InlineEntryForm({
  designWeekId,
  availableTypes,
  defaultType,
  placeholder = 'Type to add a new item...',
  onSuccess,
  className,
}: InlineEntryFormProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [content, setContent] = useState('')
  const [itemType, setItemType] = useState<ExtractedItemType | ''>(defaultType || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Content is required')
      return
    }

    const typeToUse = itemType || defaultType || availableTypes[0]
    if (!typeToUse) {
      setError('Please select a type')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/extracted-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designWeekId,
          type: typeToUse,
          content: content.trim(),
          isManual: true,
          status: 'APPROVED',
        }),
      })

      const data = await response.json()

      if (data.success) {
        setContent('')
        setItemType(defaultType || '')
        setIsExpanded(false)
        onSuccess()
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setContent('')
    setItemType(defaultType || '')
    setError(null)
    setIsExpanded(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  // Collapsed state - just show the add button/input hint
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'w-full flex items-center gap-2 p-3 rounded-lg border-2 border-dashed',
          'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
          'text-gray-500 hover:text-gray-700 transition-all',
          'text-sm text-left',
          className
        )}
      >
        <Plus className="w-4 h-4 flex-shrink-0" />
        <span>{placeholder}</span>
      </button>
    )
  }

  // Expanded state - show the form
  return (
    <div
      className={cn(
        'p-3 rounded-lg border-2 border-[#E8D5C4] bg-[#FDF3EC]/30 space-y-3',
        className
      )}
    >
      {/* Type selector (only if multiple types available) */}
      {availableTypes.length > 1 && !defaultType && (
        <Select
          value={itemType}
          onValueChange={(value) => setItemType(value as ExtractedItemType)}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {ITEM_TYPE_LABELS[type] || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Content input */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder(itemType || defaultType || availableTypes[0])}
        className="bg-white min-h-[80px] resize-none"
        autoFocus
      />

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Cmd+Enter</kbd> to save
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="bg-[#C2703E] hover:bg-[#A05A32] text-white"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

// Helper to get contextual placeholder
function getPlaceholder(itemType: ExtractedItemType | undefined): string {
  switch (itemType) {
    case 'STAKEHOLDER':
      return 'e.g., John Smith - Claims Manager, responsible for approving high-value claims'
    case 'GOAL':
      return 'e.g., Reduce average claims processing time from 48h to under 4h'
    case 'HAPPY_PATH_STEP':
      return 'e.g., Verify customer identity using policy number and date of birth'
    case 'EXCEPTION_CASE':
      return 'e.g., If claim amount exceeds €10,000, escalate to senior claims handler'
    case 'GUARDRAIL_NEVER':
      return 'e.g., Never promise specific settlement amounts or timelines'
    case 'GUARDRAIL_ALWAYS':
      return 'e.g., Always verify identity before discussing claim details'
    case 'SYSTEM_INTEGRATION':
      return 'e.g., Salesforce CRM - Read customer data, write case updates'
    case 'DATA_FIELD':
      return 'e.g., claim_id (string), claim_amount (decimal), claim_date (date)'
    case 'CHANNEL':
      return 'e.g., Email - claims@company.com, 70% of volume'
    case 'KPI_TARGET':
      return 'e.g., 80% automation rate within 3 months of go-live'
    default:
      return 'Describe the item in detail...'
  }
}
