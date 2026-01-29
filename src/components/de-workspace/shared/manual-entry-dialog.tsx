'use client'

import { useState } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { ExtractedItemType } from '@prisma/client'
import {
  BUSINESS_PROFILE_MAPPING,
  TECHNICAL_PROFILE_MAPPING,
  BUSINESS_SECTION_METADATA,
  TECHNICAL_SECTION_METADATA,
  type BusinessProfileSection,
  type TechnicalProfileSection,
} from '../types'

// Get all item types for a profile type
const BUSINESS_ITEM_TYPES = Object.values(BUSINESS_PROFILE_MAPPING).flat()
const TECHNICAL_ITEM_TYPES = Object.values(TECHNICAL_PROFILE_MAPPING).flat()

// Human-readable labels for item types
const ITEM_TYPE_LABELS: Record<string, string> = {
  // Business Profile Types
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
  // Technical Profile Types
  SYSTEM_INTEGRATION: 'System Integration',
  DATA_FIELD: 'Data Field',
  SECURITY_REQUIREMENT: 'Security Requirement',
  COMPLIANCE_REQUIREMENT: 'Compliance Requirement',
  API_ENDPOINT: 'API Endpoint',
  ERROR_HANDLING: 'Error Handling',
  TECHNICAL_CONTACT: 'Technical Contact',
}

interface ManualEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  designWeekId: string
  profileType: 'business' | 'technical'
  preselectedSection?: BusinessProfileSection | TechnicalProfileSection
  onSuccess: () => void
}

export function ManualEntryDialog({
  open,
  onOpenChange,
  designWeekId,
  profileType,
  preselectedSection,
  onSuccess,
}: ManualEntryDialogProps) {
  const [content, setContent] = useState('')
  const [itemType, setItemType] = useState<ExtractedItemType | ''>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get available item types based on profile type
  const availableTypes = profileType === 'business' ? BUSINESS_ITEM_TYPES : TECHNICAL_ITEM_TYPES
  const sectionMetadata = profileType === 'business' ? BUSINESS_SECTION_METADATA : TECHNICAL_SECTION_METADATA
  const profileMapping = profileType === 'business' ? BUSINESS_PROFILE_MAPPING : TECHNICAL_PROFILE_MAPPING

  // If a section is preselected, filter types to that section
  const filteredTypes = preselectedSection
    ? (profileMapping as Record<string, ExtractedItemType[]>)[preselectedSection] || availableTypes
    : availableTypes

  // Group types by section for better UX
  const typesBySection = Object.entries(profileMapping).map(([section, types]) => ({
    section,
    label: (sectionMetadata as Record<string, { title: string }>)[section]?.title || section,
    types: types.filter((t) => filteredTypes.includes(t)),
  })).filter(group => group.types.length > 0)

  const handleSave = async () => {
    if (!content.trim() || !itemType) {
      setError('Please fill in the content and select a type')
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
          type: itemType,
          content: content.trim(),
          notes: notes.trim() || null,
          isManual: true,
          status: 'APPROVED', // Manual entries are auto-approved
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Reset form
        setContent('')
        setItemType('')
        setNotes('')
        onOpenChange(false)
        onSuccess()
      } else {
        setError(data.error || 'Failed to save item')
      }
    } catch {
      setError('Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setContent('')
    setItemType('')
    setNotes('')
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-500" />
            Add {profileType === 'business' ? 'Business' : 'Technical'} Profile Item
          </DialogTitle>
          <DialogDescription>
            Manually add an item that wasn't captured by AI extraction.
            {preselectedSection && (
              <Badge variant="secondary" className="ml-2">
                {(sectionMetadata as Record<string, { title: string }>)[preselectedSection]?.title}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="itemType">Item Type *</Label>
            <Select value={itemType} onValueChange={(value) => setItemType(value as ExtractedItemType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select item type..." />
              </SelectTrigger>
              <SelectContent>
                {typesBySection.map((group) => (
                  <div key={group.section}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                      {group.label}
                    </div>
                    {group.types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ITEM_TYPE_LABELS[type] || type}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder={getPlaceholder(itemType)}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-gray-500">
              Describe the item clearly and specifically
            </p>
          </div>

          {/* Notes (optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Additional context or source reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Manual entry indicator */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Manual Entry:</strong> This item will be marked as manually entered
              (not AI-extracted) and will be auto-approved.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !content.trim() || !itemType}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Add Item
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper to get placeholder text based on item type
function getPlaceholder(itemType: ExtractedItemType | ''): string {
  switch (itemType) {
    case 'STAKEHOLDER':
      return 'e.g., John Smith - Claims Manager, responsible for approving high-value claims'
    case 'GOAL':
      return 'e.g., Reduce average claims processing time from 48h to under 4h'
    case 'HAPPY_PATH_STEP':
      return 'e.g., Step 3: Verify customer identity using policy number and date of birth'
    case 'EXCEPTION_CASE':
      return 'e.g., If the claim amount exceeds €10,000, escalate to senior claims handler'
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
