'use client'

import { useState } from 'react'
import {
  Scale,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  AlertTriangle,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Business rule entity type
export interface BusinessRule {
  id: string
  name: string
  category: 'validation' | 'calculation' | 'routing' | 'escalation' | 'compliance' | 'other'
  priority: 'critical' | 'high' | 'medium' | 'low'
  condition: string  // The "when" part
  action: string     // The "then" part
  exceptions?: string
  examples?: string
  sourceId?: string // Link to extracted item if auto-generated
}

// Category config
const CATEGORY_CONFIG = {
  validation: { label: 'Validation', icon: ShieldCheck, color: 'text-blue-600 bg-blue-50', description: 'Data validation rules' },
  calculation: { label: 'Calculation', icon: Zap, color: 'text-purple-600 bg-purple-50', description: 'Computation logic' },
  routing: { label: 'Routing', icon: Scale, color: 'text-emerald-600 bg-emerald-50', description: 'Decision routing' },
  escalation: { label: 'Escalation', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50', description: 'Human handoff triggers' },
  compliance: { label: 'Compliance', icon: ShieldCheck, color: 'text-red-600 bg-red-50', description: 'Regulatory requirements' },
  other: { label: 'Other', icon: Info, color: 'text-gray-600 bg-gray-50', description: 'Other business logic' },
} as const

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
} as const

// Card display component
interface BusinessRuleCardProps {
  rule: BusinessRule
  onEdit: () => void
  onDelete?: () => void
  className?: string
}

export function BusinessRuleCard({ rule, onEdit, onDelete, className }: BusinessRuleCardProps) {
  const categoryConfig = CATEGORY_CONFIG[rule.category]
  const priorityConfig = PRIORITY_CONFIG[rule.priority]
  const CategoryIcon = categoryConfig.icon

  return (
    <Card className={cn('group hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', categoryConfig.color)}>
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-gray-900">{rule.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn('text-xs', categoryConfig.color)}>
                  {categoryConfig.label}
                </Badge>
                <Badge variant="secondary" className={cn('text-xs', priorityConfig.color)}>
                  {priorityConfig.label}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
              <Edit2 className="w-4 h-4 text-gray-500" />
            </Button>
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0">
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            )}
          </div>
        </div>

        {/* Rule logic display */}
        <div className="mt-3 pl-13 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-12 shrink-0 pt-0.5">When</span>
            <p className="text-sm text-gray-700">{rule.condition}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-12 shrink-0 pt-0.5">Then</span>
            <p className="text-sm text-gray-700">{rule.action}</p>
          </div>
          {rule.exceptions && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide w-12 shrink-0 pt-0.5">Except</span>
              <p className="text-sm text-gray-600">{rule.exceptions}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Form component for editing/creating
interface BusinessRuleFormProps {
  rule?: Partial<BusinessRule>
  onSave: (rule: BusinessRule) => void
  onCancel: () => void
}

export function BusinessRuleForm({ rule, onSave, onCancel }: BusinessRuleFormProps) {
  const [formData, setFormData] = useState<Partial<BusinessRule>>({
    name: '',
    category: 'validation',
    priority: 'medium',
    condition: '',
    action: '',
    exceptions: '',
    examples: '',
    ...rule,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name?.trim()) {
      newErrors.name = 'Rule name is required'
    }
    if (!formData.condition?.trim()) {
      newErrors.condition = 'Condition (when) is required'
    }
    if (!formData.action?.trim()) {
      newErrors.action = 'Action (then) is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave({
      id: rule?.id || `br-${Date.now()}`,
      name: formData.name!,
      category: formData.category!,
      priority: formData.priority!,
      condition: formData.condition!,
      action: formData.action!,
      exceptions: formData.exceptions || undefined,
      examples: formData.examples || undefined,
      sourceId: rule?.sourceId,
    })
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div className="grid grid-cols-2 gap-4">
        {/* Rule Name */}
        <div className="col-span-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Rule Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Auto-approve claims under $500"
            className={cn('mt-1', errors.name && 'border-red-500')}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="category" className="text-sm font-medium">
            Category <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value as BusinessRule['category'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span>{config.label}</span>
                    <span className="text-xs text-gray-500">{config.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div>
          <Label htmlFor="priority" className="text-sm font-medium">
            Priority <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value as BusinessRule['priority'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Condition (When) */}
        <div className="col-span-2">
          <Label htmlFor="condition" className="text-sm font-medium">
            Condition (When) <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="condition"
            value={formData.condition || ''}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            placeholder="e.g., Claim amount is less than $500 AND claim type is 'standard'"
            rows={2}
            className={cn('mt-1', errors.condition && 'border-red-500')}
          />
          {errors.condition && <p className="text-xs text-red-500 mt-1">{errors.condition}</p>}
        </div>

        {/* Action (Then) */}
        <div className="col-span-2">
          <Label htmlFor="action" className="text-sm font-medium">
            Action (Then) <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="action"
            value={formData.action || ''}
            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
            placeholder="e.g., Auto-approve the claim and send confirmation email"
            rows={2}
            className={cn('mt-1', errors.action && 'border-red-500')}
          />
          {errors.action && <p className="text-xs text-red-500 mt-1">{errors.action}</p>}
        </div>

        {/* Exceptions */}
        <div className="col-span-2">
          <Label htmlFor="exceptions" className="text-sm font-medium">
            Exceptions
          </Label>
          <Textarea
            id="exceptions"
            value={formData.exceptions || ''}
            onChange={(e) => setFormData({ ...formData, exceptions: e.target.value })}
            placeholder="e.g., Unless the claimant has more than 3 claims in the past month"
            rows={2}
            className="mt-1"
          />
        </div>

        {/* Examples */}
        <div className="col-span-2">
          <Label htmlFor="examples" className="text-sm font-medium">
            Examples
          </Label>
          <Textarea
            id="examples"
            value={formData.examples || ''}
            onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
            placeholder="Concrete examples of when this rule applies..."
            rows={2}
            className="mt-1"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          {rule?.id ? 'Save Changes' : 'Add Business Rule'}
        </Button>
      </div>
    </div>
  )
}

// Section component with list of business rules
interface BusinessRuleSectionProps {
  rules: BusinessRule[]
  onAdd: (rule: BusinessRule) => void
  onUpdate: (rule: BusinessRule) => void
  onDelete?: (id: string) => void
  className?: string
}

export function BusinessRuleSection({
  rules,
  onAdd,
  onUpdate,
  onDelete,
  className,
}: BusinessRuleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleSave = (rule: BusinessRule) => {
    if (editingId) {
      onUpdate(rule)
      setEditingId(null)
    } else {
      onAdd(rule)
      setIsAdding(false)
    }
  }

  // Group by category for summary
  const categoryCounts = rules.reduce((acc, rule) => {
    acc[rule.category] = (acc[rule.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const criticalCount = rules.filter(r => r.priority === 'critical').length

  return (
    <div className={cn('border rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Scale className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Business Rules</h3>
            <p className="text-sm text-gray-500">
              {rules.length} rule{rules.length !== 1 ? 's' : ''} defined
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge variant="secondary" className="bg-red-50 text-red-700">
              {criticalCount} critical
            </Badge>
          )}
          {categoryCounts.escalation > 0 && (
            <Badge variant="secondary" className="bg-amber-50 text-amber-700">
              {categoryCounts.escalation} escalation
            </Badge>
          )}
          <Badge variant="secondary" className="bg-gray-50 text-gray-600">
            {rules.length}
          </Badge>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-gray-50/50 border-t space-y-3">
          {/* Existing rules */}
          {rules.map((rule) =>
            editingId === rule.id ? (
              <BusinessRuleForm
                key={rule.id}
                rule={rule}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <BusinessRuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => setEditingId(rule.id)}
                onDelete={onDelete ? () => onDelete(rule.id) : undefined}
              />
            )
          )}

          {/* Add new form */}
          {isAdding ? (
            <BusinessRuleForm onSave={handleSave} onCancel={() => setIsAdding(false)} />
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Business Rule
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
