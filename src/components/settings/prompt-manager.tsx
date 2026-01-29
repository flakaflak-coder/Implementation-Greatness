'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sparkles,
  ChevronDown,
  Save,
  RotateCcw,
  FileText,
  Wand2,
  AlertCircle,
  Check
} from 'lucide-react'

interface PromptTemplate {
  id: string
  name: string
  type: string
  description: string | null
  prompt: string
  model: string
  temperature: number
  maxTokens: number
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const PROMPT_TYPE_INFO: Record<string, { label: string; description: string; icon: 'extract' | 'generate' }> = {
  EXTRACT_KICKOFF: {
    label: 'Kickoff Extraction',
    description: 'Extracts stakeholders, goals, KPIs, volumes, and timelines from kickoff sessions',
    icon: 'extract',
  },
  EXTRACT_PROCESS: {
    label: 'Process Extraction',
    description: 'Extracts happy paths, exceptions, business rules, and scope items from process sessions',
    icon: 'extract',
  },
  EXTRACT_TECHNICAL: {
    label: 'Technical Extraction',
    description: 'Extracts integrations, data fields, APIs, and security requirements from technical sessions',
    icon: 'extract',
  },
  EXTRACT_SIGNOFF: {
    label: 'Sign-off Extraction',
    description: 'Extracts open items, decisions, approvals, and risks from sign-off sessions',
    icon: 'extract',
  },
  GENERATE_DE_DESIGN: {
    label: 'DE Design Generation',
    description: 'Generates the client-facing Digital Employee Design document',
    icon: 'generate',
  },
  GENERATE_SOLUTION: {
    label: 'Solution Design Generation',
    description: 'Generates the technical Solution Design document',
    icon: 'generate',
  },
  GENERATE_TEST_PLAN: {
    label: 'Test Plan Generation',
    description: 'Generates the client-facing Test Plan document',
    icon: 'generate',
  },
}

export function PromptManager() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedPrompt, setEditedPrompt] = useState('')
  const [editedTemp, setEditedTemp] = useState(0.3)
  const [editedMaxTokens, setEditedMaxTokens] = useState(4096)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/prompts')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch {
      setError('Failed to load prompt templates')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (template: PromptTemplate) => {
    setEditingId(template.id)
    setEditedPrompt(template.prompt)
    setEditedTemp(template.temperature)
    setEditedMaxTokens(template.maxTokens)
    setError(null)
    setSuccess(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditedPrompt('')
    setError(null)
    setSuccess(null)
  }

  const handleSave = async (template: PromptTemplate) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/prompts/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editedPrompt,
          temperature: editedTemp,
          maxTokens: editedMaxTokens,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save prompt')
      }

      setSuccess('Prompt saved successfully (new version created)')
      await fetchTemplates()
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const extractionTemplates = templates.filter((t) => t.type.startsWith('EXTRACT_'))
  const generationTemplates = templates.filter((t) => t.type.startsWith('GENERATE_'))

  const renderTemplateCard = (template: PromptTemplate) => {
    const info = PROMPT_TYPE_INFO[template.type]
    const isEditing = editingId === template.id

    return (
      <Collapsible key={template.id}>
        <Card className="mb-4">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {info?.icon === 'extract' ? (
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-500" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{info?.label || template.type}</CardTitle>
                    <CardDescription>{info?.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">v{template.version}</Badge>
                  <Badge variant="secondary">{template.model}</Badge>
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt">Prompt</Label>
                    <Textarea
                      id="prompt"
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className="mt-1 font-mono text-sm min-h-[300px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="temperature">Temperature ({editedTemp})</Label>
                      <Input
                        id="temperature"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={editedTemp}
                        onChange={(e) => setEditedTemp(parseFloat(e.target.value))}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Lower = more consistent, Higher = more creative
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="maxTokens">Max Tokens</Label>
                      <Input
                        id="maxTokens"
                        type="number"
                        value={editedMaxTokens}
                        onChange={(e) => setEditedMaxTokens(parseInt(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <Check className="w-4 h-4" />
                      {success}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={() => handleSave(template)} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save New Version'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Current Prompt</Label>
                    <pre className="mt-1 p-3 bg-gray-50 rounded-md text-sm font-mono whitespace-pre-wrap max-h-[200px] overflow-auto">
                      {template.prompt}
                    </pre>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Temperature: {template.temperature}</span>
                    <span>Max Tokens: {template.maxTokens}</span>
                  </div>

                  <Button variant="outline" onClick={() => handleEdit(template)}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Edit Prompt
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Loading prompts...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="extraction" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="extraction" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Extraction Prompts
          </TabsTrigger>
          <TabsTrigger value="generation" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Generation Prompts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="extraction" className="mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Session Extraction Prompts</h3>
            <p className="text-sm text-gray-500">
              These prompts are used to extract information from session transcripts.
              Each session type has its own specialized prompt.
            </p>
          </div>

          {extractionTemplates.length > 0 ? (
            extractionTemplates.map(renderTemplateCard)
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <p>No extraction prompts configured yet.</p>
                <p className="text-sm mt-2">
                  Default prompts will be used. Run an extraction to see them in action.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="generation" className="mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Document Generation Prompts</h3>
            <p className="text-sm text-gray-500">
              These prompts generate the final documents from approved extracted items.
            </p>
          </div>

          {generationTemplates.length > 0 ? (
            generationTemplates.map(renderTemplateCard)
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <p>No generation prompts configured yet.</p>
                <p className="text-sm mt-2">
                  Default prompts will be used. Generate a document to see them in action.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Prompt Versioning</p>
              <p className="text-sm text-blue-700">
                Each time you save changes, a new version is created. The system always uses
                the latest active version. Previous versions are kept for reference.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
