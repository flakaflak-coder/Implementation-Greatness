'use client'

import { useState } from 'react'
import {
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  GripVertical,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
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

// Structured test case entity type (for manual entry)
export interface StructuredTestCase {
  id: string
  name: string
  type: 'happy_path' | 'exception' | 'guardrail' | 'scope' | 'boundary'
  priority: 'critical' | 'high' | 'medium' | 'low'
  preconditions?: string
  steps: string[]
  expectedResult: string
  status: 'not_run' | 'pass' | 'fail' | 'blocked'
  notes?: string
  sourceId?: string // Link to extracted item if auto-generated
}

// Type config
const TEST_TYPES = {
  happy_path: { label: 'Happy Path', color: 'text-emerald-600 bg-emerald-50', description: 'Standard successful flow' },
  exception: { label: 'Exception', color: 'text-amber-600 bg-amber-50', description: 'Error handling scenarios' },
  guardrail: { label: 'Guardrail', color: 'text-red-600 bg-red-50', description: 'Safety and boundary checks' },
  scope: { label: 'Scope', color: 'text-blue-600 bg-blue-50', description: 'In-scope verification' },
  boundary: { label: 'Boundary', color: 'text-[#C2703E] bg-[#FDF3EC]', description: 'Edge case testing' },
} as const

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
} as const

const STATUS_CONFIG = {
  not_run: { label: 'Not Run', color: 'bg-gray-100 text-gray-600', icon: Clock },
  pass: { label: 'Pass', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  fail: { label: 'Fail', color: 'bg-red-100 text-red-700', icon: XCircle },
  blocked: { label: 'Blocked', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
} as const

// Card display component
interface StructuredTestCaseCardProps {
  testCase: StructuredTestCase
  onEdit: () => void
  onDelete?: () => void
  onStatusChange?: (status: StructuredTestCase['status']) => void
  className?: string
}

export function StructuredTestCaseCard({ testCase, onEdit, onDelete, onStatusChange, className }: StructuredTestCaseCardProps) {
  const typeConfig = TEST_TYPES[testCase.type]
  const priorityConfig = PRIORITY_CONFIG[testCase.priority]
  const statusConfig = STATUS_CONFIG[testCase.status]
  const StatusIcon = statusConfig.icon

  return (
    <Card className={cn('group hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', typeConfig.color)}>
              <FlaskConical className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-gray-900 truncate">{testCase.name}</h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className={cn('text-xs', typeConfig.color)}>
                  {typeConfig.label}
                </Badge>
                <Badge variant="secondary" className={cn('text-xs', priorityConfig.color)}>
                  {priorityConfig.label}
                </Badge>
                {onStatusChange ? (
                  <Select
                    value={testCase.status}
                    onValueChange={(value) => onStatusChange(value as StructuredTestCase['status'])}
                  >
                    <SelectTrigger className={cn('h-6 w-auto px-2 text-xs border-0', statusConfig.color)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className={cn('text-xs', statusConfig.color)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
              {testCase.steps.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {testCase.steps.length} step{testCase.steps.length !== 1 ? 's' : ''}
                </p>
              )}
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
        {testCase.expectedResult && (
          <div className="mt-3 pl-13">
            <p className="text-xs font-medium text-gray-500 mb-1">Expected Result</p>
            <p className="text-sm text-gray-700">{testCase.expectedResult}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Form component for editing/creating
interface StructuredTestCaseFormProps {
  testCase?: Partial<StructuredTestCase>
  onSave: (testCase: StructuredTestCase) => void
  onCancel: () => void
}

export function StructuredTestCaseForm({ testCase, onSave, onCancel }: StructuredTestCaseFormProps) {
  const [formData, setFormData] = useState<Partial<StructuredTestCase>>({
    name: '',
    type: 'happy_path',
    priority: 'medium',
    status: 'not_run',
    preconditions: '',
    steps: [''],
    expectedResult: '',
    notes: '',
    ...testCase,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name?.trim()) {
      newErrors.name = 'Test name is required'
    }
    if (!formData.expectedResult?.trim()) {
      newErrors.expectedResult = 'Expected result is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Filter out empty steps
    const cleanedSteps = (formData.steps || []).filter(s => s.trim())

    onSave({
      id: testCase?.id || `tc-${Date.now()}`,
      name: formData.name!,
      type: formData.type!,
      priority: formData.priority!,
      status: formData.status!,
      preconditions: formData.preconditions || undefined,
      steps: cleanedSteps,
      expectedResult: formData.expectedResult!,
      notes: formData.notes || undefined,
      sourceId: testCase?.sourceId,
    })
  }

  const addStep = () => {
    setFormData({ ...formData, steps: [...(formData.steps || []), ''] })
  }

  const updateStep = (index: number, value: string) => {
    const newSteps = [...(formData.steps || [])]
    newSteps[index] = value
    setFormData({ ...formData, steps: newSteps })
  }

  const removeStep = (index: number) => {
    const newSteps = (formData.steps || []).filter((_, i) => i !== index)
    setFormData({ ...formData, steps: newSteps.length > 0 ? newSteps : [''] })
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div className="grid grid-cols-2 gap-4">
        {/* Test Name */}
        <div className="col-span-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Test Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Verify claim submission with valid data"
            className={cn('mt-1', errors.name && 'border-red-500')}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Type */}
        <div>
          <Label htmlFor="type" className="text-sm font-medium">
            Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as StructuredTestCase['type'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEST_TYPES).map(([key, config]) => (
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
            onValueChange={(value) => setFormData({ ...formData, priority: value as StructuredTestCase['priority'] })}
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

        {/* Status */}
        <div>
          <Label htmlFor="status" className="text-sm font-medium">
            Status
          </Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as StructuredTestCase['status'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preconditions */}
        <div className="col-span-2">
          <Label htmlFor="preconditions" className="text-sm font-medium">
            Preconditions
          </Label>
          <Textarea
            id="preconditions"
            value={formData.preconditions || ''}
            onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
            placeholder="What must be true before running this test..."
            rows={2}
            className="mt-1"
          />
        </div>

        {/* Steps */}
        <div className="col-span-2">
          <Label className="text-sm font-medium">
            Test Steps
          </Label>
          <div className="mt-1 space-y-2">
            {(formData.steps || ['']).map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-300" />
                <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                <Input
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                  placeholder={`Step ${index + 1}...`}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStep(index)}
                  className="h-8 w-8 p-0"
                  disabled={(formData.steps || []).length === 1}
                >
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addStep}
              className="ml-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Step
            </Button>
          </div>
        </div>

        {/* Expected Result */}
        <div className="col-span-2">
          <Label htmlFor="expectedResult" className="text-sm font-medium">
            Expected Result <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="expectedResult"
            value={formData.expectedResult || ''}
            onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
            placeholder="What should happen when this test passes..."
            rows={2}
            className={cn('mt-1', errors.expectedResult && 'border-red-500')}
          />
          {errors.expectedResult && <p className="text-xs text-red-500 mt-1">{errors.expectedResult}</p>}
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Notes
          </Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional context, edge cases to consider..."
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
          {testCase?.id ? 'Save Changes' : 'Add Test Case'}
        </Button>
      </div>
    </div>
  )
}

// Section component with list of test cases
interface StructuredTestCaseSectionProps {
  testCases: StructuredTestCase[]
  onAdd: (testCase: StructuredTestCase) => void
  onUpdate: (testCase: StructuredTestCase) => void
  onDelete?: (id: string) => void
  className?: string
}

export function StructuredTestCaseSection({
  testCases,
  onAdd,
  onUpdate,
  onDelete,
  className,
}: StructuredTestCaseSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleSave = (testCase: StructuredTestCase) => {
    if (editingId) {
      onUpdate(testCase)
      setEditingId(null)
    } else {
      onAdd(testCase)
      setIsAdding(false)
    }
  }

  const handleStatusChange = (id: string, status: StructuredTestCase['status']) => {
    const tc = testCases.find(t => t.id === id)
    if (tc) {
      onUpdate({ ...tc, status })
    }
  }

  // Group by status for summary
  const statusCounts = testCases.reduce((acc, tc) => {
    acc[tc.status] = (acc[tc.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className={cn('border rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F5E6DA] flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-[#C2703E]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Structured Test Cases</h3>
            <p className="text-sm text-gray-500">
              {testCases.length} test{testCases.length !== 1 ? 's' : ''} defined
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusCounts.pass > 0 && (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
              {statusCounts.pass} pass
            </Badge>
          )}
          {statusCounts.fail > 0 && (
            <Badge variant="secondary" className="bg-red-50 text-red-700">
              {statusCounts.fail} fail
            </Badge>
          )}
          {statusCounts.not_run > 0 && (
            <Badge variant="secondary" className="bg-gray-50 text-gray-600">
              {statusCounts.not_run} pending
            </Badge>
          )}
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
          {/* Existing test cases */}
          {testCases.map((testCase) =>
            editingId === testCase.id ? (
              <StructuredTestCaseForm
                key={testCase.id}
                testCase={testCase}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <StructuredTestCaseCard
                key={testCase.id}
                testCase={testCase}
                onEdit={() => setEditingId(testCase.id)}
                onDelete={onDelete ? () => onDelete(testCase.id) : undefined}
                onStatusChange={(status) => handleStatusChange(testCase.id, status)}
              />
            )
          )}

          {/* Add new form */}
          {isAdding ? (
            <StructuredTestCaseForm onSave={handleSave} onCancel={() => setIsAdding(false)} />
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Test Case
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
