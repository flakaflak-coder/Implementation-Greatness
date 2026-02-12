'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle,
  AlertTriangle,
  Shield,
  CheckSquare,
  XSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Loader2,
  Clipboard,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FlaskConical,
  Rocket,
  CircleDot,
  CircleCheck,
  CircleX,
  CircleMinus,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  type TestPlan,
  type TestCase,
  type TestCaseType,
  type TestCasePriority,
  type TestCaseStatus,
  type LaunchCriterion,
  createEmptyTestPlan,
  TEST_PLAN_SECTION_CONFIG,
  TEST_PRIORITY_CONFIG,
  TEST_STATUS_CONFIG,
} from '../profile-types'

interface TestPlanTabV2Props {
  designWeekId: string
  className?: string
}

// Icon mapping
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle,
  AlertTriangle,
  Shield,
  CheckSquare,
  XSquare,
}

export function TestPlanTabV2({ designWeekId, className }: TestPlanTabV2Props) {
  const [testPlan, setTestPlan] = useState<TestPlan>(createEmptyTestPlan())
  const [launchCriteria, setLaunchCriteria] = useState<LaunchCriterion[]>([])
  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    notRun: 0,
    blocked: 0,
    coveragePercent: 0,
    hasSavedPlan: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load test plan and launch criteria
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const [testPlanRes, profileRes] = await Promise.all([
          fetch(`/api/design-weeks/${designWeekId}/test-plan`),
          fetch(`/api/design-weeks/${designWeekId}/profile`),
        ])
        if (!testPlanRes.ok) throw new Error('Failed to load test plan')
        const testPlanData = await testPlanRes.json()
        setTestPlan(testPlanData.testPlan)
        setStats(testPlanData.stats)

        if (profileRes.ok) {
          const profileData = await profileRes.json()
          if (profileData.profile?.launch?.criteria) {
            setLaunchCriteria(profileData.profile.launch.criteria)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load test plan')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [designWeekId])

  // Auto-save test plan
  const saveTestPlan = useCallback(
    async (updatedPlan: TestPlan) => {
      try {
        setIsSaving(true)
        const response = await fetch(`/api/design-weeks/${designWeekId}/test-plan`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testPlan: updatedPlan }),
        })
        if (!response.ok) throw new Error('Failed to save test plan')

        // Update stats
        const total = updatedPlan.testCases.length
        const passed = updatedPlan.testCases.filter((t) => t.status === 'pass').length
        const failed = updatedPlan.testCases.filter((t) => t.status === 'fail').length
        const notRun = updatedPlan.testCases.filter((t) => t.status === 'not_run').length
        const blocked = updatedPlan.testCases.filter((t) => t.status === 'blocked').length
        setStats({
          total,
          passed,
          failed,
          notRun,
          blocked,
          coveragePercent: total > 0 ? Math.round((passed / total) * 100) : 0,
          hasSavedPlan: true,
        })
      } catch (err) {
        console.error('Failed to save:', err)
      } finally {
        setIsSaving(false)
      }
    },
    [designWeekId]
  )

  // Add a test case
  const handleAddTestCase = (testCase: TestCase) => {
    const updated = {
      ...testPlan,
      testCases: [...testPlan.testCases, testCase],
    }
    setTestPlan(updated)
    saveTestPlan(updated)
  }

  // Update a test case
  const handleUpdateTestCase = (testCase: TestCase) => {
    const updated = {
      ...testPlan,
      testCases: testPlan.testCases.map((tc) => (tc.id === testCase.id ? testCase : tc)),
    }
    setTestPlan(updated)
    saveTestPlan(updated)
  }

  // Delete a test case
  const handleDeleteTestCase = (id: string) => {
    const updated = {
      ...testPlan,
      testCases: testPlan.testCases.filter((tc) => tc.id !== id),
    }
    setTestPlan(updated)
    saveTestPlan(updated)
  }

  // Update test case status
  const handleStatusChange = (id: string, status: TestCaseStatus) => {
    const tc = testPlan.testCases.find((t) => t.id === id)
    if (tc) {
      handleUpdateTestCase({ ...tc, status })
    }
  }

  // Update launch criterion status
  const handleLaunchCriterionStatusChange = async (
    id: string,
    status: LaunchCriterion['status']
  ) => {
    const updated = launchCriteria.map((c) => (c.id === id ? { ...c, status } : c))
    setLaunchCriteria(updated)
    try {
      const profileRes = await fetch(`/api/design-weeks/${designWeekId}/profile`)
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        const updatedProfile = {
          ...profileData.profile,
          launch: { ...(profileData.profile?.launch || {}), criteria: updated },
        }
        await fetch(`/api/design-weeks/${designWeekId}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: updatedProfile }),
        })
      }
    } catch (err) {
      console.error('Failed to save launch criteria:', err)
    }
  }

  // Refresh from extractions
  const handleRefresh = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/design-weeks/${designWeekId}/test-plan`)
      if (!response.ok) throw new Error('Failed to refresh test plan')
      const data = await response.json()
      setTestPlan(data.testPlan)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh')
    } finally {
      setIsLoading(false)
    }
  }

  // Group test cases by type
  const groupedTestCases = testPlan.testCases.reduce(
    (acc, tc) => {
      acc[tc.type] = acc[tc.type] || []
      acc[tc.type].push(tc)
      return acc
    },
    {} as Record<TestCaseType, TestCase[]>
  )

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('p-4', className)}>
        <div className="border-l-2 border-red-400 pl-4 py-6 text-center">
          <div>
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">{error}</p>
            <Button variant="outline" onClick={handleRefresh} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Determine coverage health
  const hasGoodCoverage = stats.coveragePercent >= 80 && stats.failed === 0
  const coverageGaps: string[] = []
  if (!groupedTestCases.happy_path?.length) {
    coverageGaps.push('No happy path tests defined')
  }
  if (!groupedTestCases.exception?.length) {
    coverageGaps.push('No exception handling tests')
  }
  if (!groupedTestCases.guardrail?.length) {
    coverageGaps.push('No guardrail/safety tests')
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-stone-900">Test Plan</h2>
          <p className="text-[11px] uppercase tracking-wider text-stone-400">UAT test cases for Digital Employee validation</p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-sm text-stone-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </div>

      {/* Coverage Summary Card */}
      <div className="rounded-lg border border-stone-200">
        <div className="px-6 pt-6 pb-3">
          <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <Clipboard className="h-4 w-4 text-stone-500" />
            Test Coverage Summary
          </h3>
        </div>
        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-stone-50 rounded-lg">
              <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
              <p className="text-sm text-stone-500">Total Tests</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">{stats.passed}</p>
              <p className="text-sm text-emerald-700">Passed</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-sm text-red-700">Failed</p>
            </div>
            <div className="text-center p-3 bg-stone-50 rounded-lg">
              <p className="text-2xl font-bold text-stone-600">{stats.notRun}</p>
              <p className="text-sm text-stone-500">Not Run</p>
            </div>
            <div className="text-center p-3 bg-stone-50 rounded-lg">
              <p className="text-2xl font-bold text-[#C2703E]">{stats.coveragePercent}%</p>
              <p className="text-sm text-stone-500">Pass Rate</p>
            </div>
          </div>

          {/* Coverage status message */}
          {hasGoodCoverage && stats.total > 0 ? (
            <div className="mt-4 flex items-center gap-2 p-3 border-l-2 border-emerald-400 pl-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-700 font-medium">
                All tests passing! Ready for UAT sign-off.
              </p>
            </div>
          ) : coverageGaps.length > 0 ? (
            <div className="mt-4 p-3 border-l-2 border-amber-400 pl-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">Coverage Gaps Detected</p>
                  <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
                    {coverageGaps.map((gap, index) => (
                      <li key={index}>{gap}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Test Type Breakdown */}
      <div className="grid grid-cols-5 gap-3">
        {(Object.keys(TEST_PLAN_SECTION_CONFIG) as TestCaseType[]).map((type) => {
          const config = TEST_PLAN_SECTION_CONFIG[type]
          const tests = groupedTestCases[type] || []
          return (
            <div key={type} className="text-center rounded-lg border border-stone-200">
              <div className="pt-4 pb-3">
                <p className="text-xl font-bold text-stone-900">{tests.length}</p>
                <p className="text-xs text-stone-500">{type.replace('_', ' ')}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Test Case Sections */}
      <div className="space-y-4">
        {(Object.keys(TEST_PLAN_SECTION_CONFIG) as TestCaseType[]).map((type) => (
          <TestCaseSection
            key={type}
            type={type}
            testCases={groupedTestCases[type] || []}
            onAdd={handleAddTestCase}
            onUpdate={handleUpdateTestCase}
            onDelete={handleDeleteTestCase}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>

      {/* Launch Readiness Section */}
      {launchCriteria.length > 0 && (
        <LaunchReadinessSection
          criteria={launchCriteria}
          onStatusChange={handleLaunchCriterionStatusChange}
        />
      )}

      {/* Empty state */}
      {stats.total === 0 && (
        <div className="rounded-lg border border-dashed border-stone-300">
          <div className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto text-stone-300 mb-4" />
            <h3 className="text-base font-semibold tracking-tight text-stone-900 mb-2">No test cases yet</h3>
            <p className="text-sm text-stone-500 mb-4 max-w-md mx-auto">
              Test cases are generated from happy path steps, exception cases, guardrails, and scope
              items. Complete the Business Profile to auto-generate tests, or add tests manually.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check for Updates
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Test Case Section Component
interface TestCaseSectionProps {
  type: TestCaseType
  testCases: TestCase[]
  onAdd: (testCase: TestCase) => void
  onUpdate: (testCase: TestCase) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TestCaseStatus) => void
}

function TestCaseSection({
  type,
  testCases,
  onAdd,
  onUpdate,
  onDelete,
  onStatusChange,
}: TestCaseSectionProps) {
  const [isExpanded, setIsExpanded] = useState(testCases.length > 0 || type === 'happy_path')
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const config = TEST_PLAN_SECTION_CONFIG[type]
  const IconComponent = ICONS[config.icon] || CheckCircle

  const colorClasses: Record<
    string,
    { accent: string; text: string; headerBg: string }
  > = {
    emerald: {
      accent: 'border-emerald-400',
      text: 'text-emerald-700',
      headerBg: 'bg-emerald-500',
    },
    amber: {
      accent: 'border-amber-400',
      text: 'text-amber-700',
      headerBg: 'bg-amber-500',
    },
    red: {
      accent: 'border-red-400',
      text: 'text-red-700',
      headerBg: 'bg-red-500',
    },
    blue: {
      accent: 'border-blue-400',
      text: 'text-blue-700',
      headerBg: 'bg-blue-500',
    },
    violet: {
      accent: 'border-[#C2703E]',
      text: 'text-[#A05A32]',
      headerBg: 'bg-[#C2703E]',
    },
  }

  const colors = colorClasses[config.color]

  const passedCount = testCases.filter((t) => t.status === 'pass').length
  const failedCount = testCases.filter((t) => t.status === 'fail').length

  const handleSave = (testCase: TestCase) => {
    if (editingId) {
      onUpdate(testCase)
      setEditingId(null)
    } else {
      onAdd(testCase)
      setIsAdding(false)
    }
  }

  return (
    <div className={cn('rounded-lg border-l-2 pl-4', colors.accent)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <IconComponent className={cn('h-5 w-5', colors.text)} />
          <div>
            <h3 className="text-base font-semibold tracking-tight text-stone-900">{config.title}</h3>
            <p className="text-sm text-stone-500">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{testCases.length} tests</Badge>
            {passedCount > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700">{passedCount} passed</Badge>
            )}
            {failedCount > 0 && (
              <Badge className="bg-red-100 text-red-700">{failedCount} failed</Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-stone-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-stone-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {testCases.length === 0 && !isAdding ? (
            <div className="text-center py-8 text-stone-500">
              <IconComponent className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No {config.title.toLowerCase()} yet</p>
              <p className="text-xs text-stone-400 mt-1">Tests will be generated from profile data</p>
            </div>
          ) : (
            testCases.map((testCase) =>
              editingId === testCase.id ? (
                <TestCaseForm
                  key={testCase.id}
                  testCase={testCase}
                  defaultType={type}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <TestCaseCard
                  key={testCase.id}
                  testCase={testCase}
                  onEdit={() => setEditingId(testCase.id)}
                  onDelete={() => onDelete(testCase.id)}
                  onStatusChange={(status) => onStatusChange(testCase.id, status)}
                />
              )
            )
          )}

          {isAdding ? (
            <TestCaseForm
              defaultType={type}
              onSave={handleSave}
              onCancel={() => setIsAdding(false)}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="w-full border-dashed gap-2"
            >
              <Plus className="h-4 w-4" />
              Add {config.title.replace(' Tests', '')} Test
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Test Case Card Component
interface TestCaseCardProps {
  testCase: TestCase
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: TestCaseStatus) => void
}

function TestCaseCard({ testCase, onEdit, onDelete, onStatusChange }: TestCaseCardProps) {
  const priorityConfig = TEST_PRIORITY_CONFIG[testCase.priority]
  const statusConfig = TEST_STATUS_CONFIG[testCase.status]

  const statusIcons: Record<TestCaseStatus, React.ComponentType<{ className?: string }>> = {
    not_run: Clock,
    pass: CheckCircle2,
    fail: XCircle,
    blocked: AlertCircle,
  }
  const StatusIcon = statusIcons[testCase.status]

  return (
    <div className="group hover:shadow-md transition-shadow rounded-lg border border-stone-200">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-stone-900 truncate">{testCase.name}</h4>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={cn('text-xs', priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
              <Select
                value={testCase.status}
                onValueChange={(value) => onStatusChange(value as TestCaseStatus)}
              >
                <SelectTrigger
                  className={cn('h-6 w-auto px-2 text-xs border-0', statusConfig.color)}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEST_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {testCase.steps.length > 0 && (
                <span className="text-xs text-stone-400">
                  {testCase.steps.length} step{testCase.steps.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
              <Edit2 className="w-4 h-4 text-stone-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
        {testCase.expectedResult && (
          <div className="mt-2 text-sm text-stone-600">
            <span className="font-medium text-stone-500">Expected:</span> {testCase.expectedResult}
          </div>
        )}
      </div>
    </div>
  )
}

// Test Case Form Component
interface TestCaseFormProps {
  testCase?: Partial<TestCase>
  defaultType: TestCaseType
  onSave: (testCase: TestCase) => void
  onCancel: () => void
}

function TestCaseForm({ testCase, defaultType, onSave, onCancel }: TestCaseFormProps) {
  const [formData, setFormData] = useState<Partial<TestCase>>({
    name: '',
    type: defaultType,
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

    const cleanedSteps = (formData.steps || []).filter((s) => s.trim())

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
      sourceItemId: testCase?.sourceItemId,
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
    <div className="space-y-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
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

        {/* Priority */}
        <div>
          <Label htmlFor="priority" className="text-sm font-medium">
            Priority
          </Label>
          <Select
            value={formData.priority}
            onValueChange={(value) =>
              setFormData({ ...formData, priority: value as TestCasePriority })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEST_PRIORITY_CONFIG).map(([key, config]) => (
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
            onValueChange={(value) =>
              setFormData({ ...formData, status: value as TestCaseStatus })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TEST_STATUS_CONFIG).map(([key, config]) => (
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
          <Label className="text-sm font-medium">Test Steps</Label>
          <div className="mt-1 space-y-2">
            {(formData.steps || ['']).map((step, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-sm text-stone-500 w-6">{index + 1}.</span>
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
                  <Trash2 className="w-4 h-4 text-stone-400" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addStep} className="ml-8">
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
          {errors.expectedResult && (
            <p className="text-xs text-red-500 mt-1">{errors.expectedResult}</p>
          )}
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

// ============================================
// Launch Readiness Section
// ============================================
interface LaunchReadinessSectionProps {
  criteria: LaunchCriterion[]
  onStatusChange: (id: string, status: LaunchCriterion['status']) => void
}

const launchPhaseLabels: Record<LaunchCriterion['phase'], { label: string; color: string }> = {
  soft_launch: { label: 'Soft Launch', color: 'bg-blue-100 text-blue-700' },
  full_launch: { label: 'Full Launch', color: 'bg-emerald-100 text-emerald-700' },
  hypercare: { label: 'Hypercare', color: 'bg-[#F5E6DA] text-[#A05A32]' },
}

const launchCategoryLabels: Record<LaunchCriterion['category'], string> = {
  technical: 'Technical',
  quality: 'Quality',
  process: 'Process',
  stakeholder: 'Stakeholder',
}

const launchStatusConfig: Record<
  LaunchCriterion['status'],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  pending: { label: 'Pending', icon: CircleDot, color: 'text-stone-400' },
  met: { label: 'Met', icon: CircleCheck, color: 'text-emerald-500' },
  not_met: { label: 'Not Met', icon: CircleX, color: 'text-red-500' },
  waived: { label: 'Waived', icon: CircleMinus, color: 'text-amber-500' },
}

function LaunchReadinessSection({ criteria, onStatusChange }: LaunchReadinessSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Group by phase
  const grouped = criteria.reduce(
    (acc, c) => {
      acc[c.phase] = acc[c.phase] || []
      acc[c.phase].push(c)
      return acc
    },
    {} as Record<string, LaunchCriterion[]>
  )

  const metCount = criteria.filter((c) => c.status === 'met').length
  const totalCount = criteria.length
  const allMet = metCount === totalCount && totalCount > 0

  return (
    <div className={cn('rounded-lg border-l-2 pl-4', allMet ? 'border-emerald-400' : 'border-orange-400')}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Rocket className={cn('h-5 w-5', allMet ? 'text-emerald-600' : 'text-orange-600')} />
          <div>
            <h3 className="text-base font-semibold tracking-tight text-stone-900">Launch Readiness</h3>
            <p className="text-sm text-stone-500">Go/no-go criteria checklist</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {metCount}/{totalCount} met
          </Badge>
          {allMet && (
            <Badge className="bg-emerald-100 text-emerald-700">Ready to launch</Badge>
          )}
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-stone-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-stone-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {(Object.keys(grouped) as LaunchCriterion['phase'][]).map((phase) => {
            const phaseConfig = launchPhaseLabels[phase]
            const phaseCriteria = grouped[phase]
            const phaseMetCount = phaseCriteria.filter((c) => c.status === 'met').length

            return (
              <div key={phase}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded', phaseConfig.color)}>
                    {phaseConfig.label}
                  </span>
                  <span className="text-xs text-stone-400">
                    {phaseMetCount}/{phaseCriteria.length} met
                  </span>
                </div>
                <div className="space-y-1">
                  {phaseCriteria.map((criterion) => {
                    const statusConf = launchStatusConfig[criterion.status]
                    const StatusIcon = statusConf.icon
                    return (
                      <div
                        key={criterion.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 group"
                      >
                        <Select
                          value={criterion.status}
                          onValueChange={(value) =>
                            onStatusChange(criterion.id, value as LaunchCriterion['status'])
                          }
                        >
                          <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent">
                            <StatusIcon className={cn('h-5 w-5', statusConf.color)} />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(launchStatusConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm',
                            criterion.status === 'met' ? 'text-stone-400 line-through' : 'text-stone-900'
                          )}>
                            {criterion.criterion}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {criterion.owner && (
                              <span className="text-xs text-stone-400">Owner: {criterion.owner}</span>
                            )}
                            <span className="text-xs text-stone-300">
                              {launchCategoryLabels[criterion.category]}
                            </span>
                          </div>
                        </div>
                        {criterion.softTarget && criterion.fullTarget && (
                          <div className="text-right text-xs hidden sm:block">
                            <p className="text-blue-600">Soft: {criterion.softTarget}</p>
                            <p className="text-emerald-600">Full: {criterion.fullTarget}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
