'use client'

import { useState, useEffect } from 'react'
import { Save, Plus, X, Trash2 } from 'lucide-react'
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
import type { TestCase, TestCaseType } from '../types'

interface TestCaseEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  testCase?: TestCase | null // null for new test case
  defaultType?: TestCaseType
  onSave: (testCase: TestCase) => void
  onDelete?: (testCaseId: string) => void
}

const TYPE_OPTIONS: { value: TestCaseType; label: string }[] = [
  { value: 'happy_path', label: 'Happy Path' },
  { value: 'exception', label: 'Exception' },
  { value: 'guardrail', label: 'Guardrail' },
  { value: 'scope', label: 'Scope' },
  { value: 'boundary', label: 'Boundary' },
]

export function TestCaseEditDialog({
  open,
  onOpenChange,
  testCase,
  defaultType = 'happy_path',
  onSave,
  onDelete,
}: TestCaseEditDialogProps) {
  const isNew = !testCase

  const [title, setTitle] = useState('')
  const [type, setType] = useState<TestCaseType>(defaultType)
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<string[]>([''])
  const [expectedOutcome, setExpectedOutcome] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset form when testCase changes
  useEffect(() => {
    if (testCase) {
      setTitle(testCase.title)
      setType(testCase.type)
      setDescription(testCase.description)
      setSteps(testCase.steps.length > 0 ? testCase.steps : [''])
      setExpectedOutcome(testCase.expectedOutcome)
    } else {
      setTitle('')
      setType(defaultType)
      setDescription('')
      setSteps([''])
      setExpectedOutcome('')
    }
    setError(null)
  }, [testCase, defaultType, open])

  const handleAddStep = () => {
    setSteps([...steps, ''])
  }

  const handleRemoveStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index))
    }
  }

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...steps]
    newSteps[index] = value
    setSteps(newSteps)
  }

  const handleSave = () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!description.trim()) {
      setError('Description is required')
      return
    }
    if (!expectedOutcome.trim()) {
      setError('Expected outcome is required')
      return
    }

    const filteredSteps = steps.filter((s) => s.trim())

    const updatedTestCase: TestCase = {
      id: testCase?.id || `manual-${Date.now()}`,
      type,
      title: title.trim(),
      description: description.trim(),
      steps: filteredSteps.length > 0 ? filteredSteps : [`Execute: ${title.trim()}`],
      expectedOutcome: expectedOutcome.trim(),
      sourceType: 'manual',
      coverage: 'covered',
    }

    onSave(updatedTestCase)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (testCase && onDelete) {
      onDelete(testCase.id)
      onOpenChange(false)
    }
  }

  const handleClose = () => {
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isNew ? (
              <>
                <Plus className="h-5 w-5 text-[#C2703E]" />
                Add Test Case
              </>
            ) : (
              <>
                <Save className="h-5 w-5 text-[#C2703E]" />
                Edit Test Case
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? 'Create a new test case for the test plan.'
              : 'Modify the test case details below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Verify claim submission happy path"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Test Type *</Label>
            <Select value={type} onValueChange={(value) => setType(value as TestCaseType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what this test validates..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Test Steps</Label>
              <Button variant="ghost" size="sm" onClick={handleAddStep} className="h-7 gap-1">
                <Plus className="h-3 w-3" />
                Add Step
              </Button>
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                  <Input
                    placeholder={`Step ${index + 1}...`}
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    className="flex-1"
                  />
                  {steps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStep(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Expected Outcome */}
          <div className="space-y-2">
            <Label htmlFor="expectedOutcome">Expected Outcome *</Label>
            <Textarea
              id="expectedOutcome"
              placeholder="What should happen when this test passes?"
              value={expectedOutcome}
              onChange={(e) => setExpectedOutcome(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Manual test indicator */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Manual Test Case:</strong> This test will be marked as manually created
              and saved to your browser&apos;s local storage.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {!isNew && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#C2703E] hover:bg-[#A05A32] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isNew ? 'Add Test' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
