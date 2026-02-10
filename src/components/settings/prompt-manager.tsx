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
  Check,
  Lock,
  Video,
  Image,
  FileCode,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkeletonCard } from '@/components/ui/skeleton'

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

// Hardcoded system prompts (read-only) from gemini.ts and generate-document.ts
const SYSTEM_PROMPTS = {
  gemini: [
    {
      id: 'kickoff',
      name: 'Kickoff Session Extraction',
      description: 'Extracts business context, KPIs, and stakeholders from kickoff recordings',
      model: 'gemini-3-pro-preview',
      sessionPhase: 1,
      file: 'src/lib/gemini.ts',
      prompt: `You are an AI assistant extracting information from a Design Week KICKOFF session for Digital Employee onboarding.

Focus on extracting: **Business Context, Volumes, and Success Metrics**

Extract the following:

1. **Business Context**
   - What problem are they solving? Why now?
   - Current cost per case/transaction (FTE time + tools)
   - Target cost after automation
   - Monthly volume (cases/emails/documents)
   - Peak periods (month-end, seasonality)
   - What does success look like?
   - Proposed DE name and role

2. **KPI Targets**
   - Automation rate target (% fully handled by DE)
   - Accuracy target (% responses approved without edits)
   - Response time targets
   - Customer satisfaction targets
   - How will these be measured?

3. **Stakeholders**
   - Who are the key people involved?
   - Decision makers, business owners, technical contacts

Respond in JSON with structure:
{
  "transcript": "full transcript",
  "businessContext": {...},
  "kpis": [{name, targetValue, measurementMethod, quote}],
  "stakeholders": [{name, role, quote}]
}

Include exact quotes and timestamps. Only include clearly discussed items.`,
    },
    {
      id: 'process-design',
      name: 'Process Design Extraction',
      description: 'Extracts process steps, case types, channels, and exceptions',
      model: 'gemini-3-pro-preview',
      sessionPhase: 2,
      file: 'src/lib/gemini.ts',
      prompt: `You are an AI assistant extracting information from a Design Week PROCESS DESIGN session for Digital Employee onboarding.

Focus on extracting: **The Process, Channels, Case Types, Exceptions**

Extract the following:

1. **Process Happy Path**
   - Walk through the typical case from start to finish
   - Step-by-step actions
   - Information needed at each step

2. **Case Types**
   - What types of cases/requests come in?
   - Volume distribution (% per type)
   - Complexity level: LOW, MEDIUM, HIGH
   - Which are automatable?

3. **Channels**
   - Which channels: EMAIL, WEB_FORM, API, PORTAL, OTHER
   - Volume % per channel
   - Current SLA vs. Target SLA
   - Any channel-specific rules

4. **Exceptions & Escalation**
   - Exception rate (% non-standard)
   - When MUST this go to a human?
   - Escalation triggers

5. **Scope Items**
   - What should DE handle (IN_SCOPE)
   - What should DE NOT handle (OUT_OF_SCOPE)
   - Unclear items (AMBIGUOUS)

Respond in JSON:
{
  "transcript": "full transcript",
  "processSteps": [{step, order, quote}],
  "caseTypes": [{type, volumePercent, complexity, automatable, quote}],
  "channels": [{type, volumePercent, currentSLA, targetSLA, rules, quote}],
  "escalationRules": [{triggerCondition, action, quote}],
  "scopeItems": [{statement, classification, quote}]
}

Include exact quotes and timestamps.`,
    },
    {
      id: 'skills-guardrails',
      name: 'Skills & Guardrails Extraction',
      description: 'Extracts skills, brand tone, and operational guardrails',
      model: 'gemini-3-pro-preview',
      sessionPhase: 3,
      file: 'src/lib/gemini.ts',
      prompt: `You are an AI assistant extracting information from a Design Week PROCESS DESIGN session (phase 2) for Digital Employee onboarding.

Focus on extracting: **Skills, Brand Tone, Guardrails**

Extract the following:

1. **Skills Needed**
   - What actions does the DE need to perform?
   - Types: ANSWER, ROUTE, APPROVE_REJECT, REQUEST_INFO, NOTIFY, OTHER
   - Knowledge source for each skill
   - Which phase (1 or 2)?

2. **Brand Tone & Communication**
   - Brand tone description
   - Formality: FORMAL or INFORMAL
   - Languages
   - Empathy level
   - Can DE be proactive?

3. **Guardrails**
   - NEVER: What should the DE absolutely NEVER do or say?
   - ALWAYS: What should the DE ALWAYS do?
   - Financial limits
   - Legal or compliance restrictions

Respond in JSON:
{
  "transcript": "full transcript",
  "skills": [{name, type, description, knowledgeSource, phase, quote}],
  "brandTone": {tone, formality, language, empathyLevel, quote},
  "guardrails": {never: [...], always: [...], financialLimits, legalRestrictions}
}`,
    },
    {
      id: 'technical',
      name: 'Technical Session Extraction',
      description: 'Extracts integrations, systems, data fields, and security requirements',
      model: 'gemini-3-pro-preview',
      sessionPhase: '4-5',
      file: 'src/lib/gemini.ts',
      prompt: `You are an AI assistant extracting information from a Design Week TECHNICAL session for Digital Employee onboarding.

Focus on extracting: **Integrations, Systems, Data Fields**

Extract the following:

1. **System Integrations**
   - What systems does this process touch?
   - Purpose of each system
   - Access type: READ, WRITE, or READ_WRITE
   - Specific data fields needed
   - Is there API access? Documentation?
   - Who's the technical contact?

2. **Security & Compliance**
   - Security requirements (SSO, encryption, etc.)
   - Compliance requirements (GDPR, audit trails, etc.)
   - Authentication methods

Respond in JSON:
{
  "transcript": "full transcript",
  "integrations": [{systemName, purpose, accessType, dataFields, technicalContact, apiAvailable, quote}],
  "securityRequirements": [{requirement, type, quote}]
}`,
    },
    {
      id: 'signoff',
      name: 'Sign-off Session Extraction',
      description: 'Extracts open items, decisions, approvals, and risks',
      model: 'gemini-3-pro-preview',
      sessionPhase: 6,
      file: 'src/lib/gemini.ts',
      prompt: `You are an AI assistant extracting information from a Design Week SIGN-OFF session for Digital Employee onboarding.

Focus on extracting: **Open Items, Decisions, Approvals, Risks**

Extract the following:

1. **Open Items** - What still needs to be resolved? Who owns each item?
2. **Decisions Made** - What decisions were finalized? Who approved?
3. **Risks Identified** - What are the risks or concerns? Mitigation plans?
4. **Final Approvals** - Who signed off? Any conditions?

Respond in JSON:
{
  "transcript": "full transcript",
  "openItems": [{item, owner, quote}],
  "decisions": [{decision, approvedBy, quote}],
  "risks": [{risk, mitigation, quote}],
  "approvals": [{stakeholder, status, conditions, quote}]
}`,
    },
  ],
  avatar: {
    id: 'avatar-generation',
    name: 'DE Avatar Generation',
    description: 'Generates professional avatar portraits for Digital Employees',
    model: 'imagen-4.0-generate-001',
    file: 'src/lib/gemini.ts',
    prompt: `Create a professional, friendly avatar portrait for a digital AI assistant.

CHARACTER DETAILS:
- Name: {deName}
- Role: {role}
- Personality: {personality}
- Brand Tone: {brandTone}

STYLE REQUIREMENTS:
- Modern, clean digital illustration style (NOT photorealistic)
- Friendly, approachable, and trustworthy appearance
- Professional but warm expression with a gentle smile
- Soft, harmonious color palette
- Simple, clean background (subtle gradient or solid color)
- Head and shoulders portrait, centered composition
- High quality, polished look suitable for corporate documents

DO NOT include: text, logos, harsh colors, scary expressions, photorealistic human faces, complex backgrounds.`,
  },
  pdfGeneration: {
    id: 'pdf-master-prompt',
    name: 'PDF Document Generation',
    description: 'Master prompt for generating comprehensive DE Design Documents (460+ lines)',
    model: 'claude-sonnet-4-20250514',
    file: 'src/lib/documents/generate-document.ts',
    languages: ['en', 'nl', 'de', 'fr', 'es'],
    sections: [
      'Executive Summary (opening, overview, objectives, value proposition, outcomes)',
      'Current State Analysis (challenges, inefficiencies, opportunity cost)',
      'Future State Vision (transformation narrative, day-in-the-life, benefits)',
      'Process Analysis (step-by-step, automation benefits, exception handling)',
      'Scope Analysis (in-scope rationale, out-of-scope, guardrails)',
      'Technical Foundation (architecture, integration strategy, security)',
      'Risk Assessment (risks with likelihood/impact, mitigation)',
      'Implementation Approach (phases, success factors, training plan)',
      'Success Metrics (KPI narrative, measurement approach)',
      'Conclusion & Next Steps',
      'Quick Reference Card (for frontline teams)',
      'Executive One-Pager (for leadership)',
    ],
    promptSummary: `You are a senior management consultant at a top-tier consulting firm (McKinsey, BCG, Bain level). You're creating a comprehensive Digital Employee design document that will be presented to C-level executives.

This document must have a "WOW" factor - it should be:
- Extensively detailed with rich narratives
- Professionally written with compelling storytelling
- Self-explanatory so anyone can understand without context
- Visionary yet practical
- Written as if this is a $500K+ consulting engagement deliverable

CRITICAL QUALITY REQUIREMENTS:
- Use SPECIFIC role titles, never "Stakeholder"
- KPIs must use PROPER FORMATS (e.g., "20% reduction")
- NO technical placeholders like "{system_name}"
- Include content for frontline teams, not just executives`,
  },
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
        <Card className="mb-4 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200">
          {/* Gradient accent bar */}
          <div className={cn(
            'h-1 bg-gradient-to-r',
            info?.icon === 'extract'
              ? 'from-[#C2703E] to-[#A05A32]'
              : 'from-blue-500 to-cyan-500'
          )} />
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center',
                    info?.icon === 'extract' ? 'bg-[#F5E6DA]' : 'bg-blue-100'
                  )}>
                    {info?.icon === 'extract' ? (
                      <Sparkles className="w-4 h-4 text-[#C2703E]" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{info?.label || template.type}</CardTitle>
                    <CardDescription>{info?.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">v{template.version}</Badge>
                  <Badge className={cn(
                    'border-0 text-xs',
                    info?.icon === 'extract'
                      ? 'bg-[#F5E6DA] text-[#A05A32]'
                      : 'bg-blue-100 text-blue-700'
                  )}>
                    {template.model}
                  </Badge>
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
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className={cn('animate-fade-in-up', `stagger-${i + 1}`)} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="extraction" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="extraction" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Extraction
          </TabsTrigger>
          <TabsTrigger value="generation" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Generation
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            System (Read-only)
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

        <TabsContent value="system" className="mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">System Prompts (Hardcoded)</h3>
            <p className="text-sm text-gray-500">
              These prompts are built into the codebase and cannot be edited via the UI.
              To modify them, edit the source files directly.
            </p>
          </div>

          {/* Gemini Session Extraction Prompts */}
          <div className="mb-6">
            <h4 className="text-md font-medium mb-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-orange-500" />
              Gemini Multimodal Extraction
              <Badge variant="outline" className="ml-2">Audio/Video</Badge>
            </h4>
            <div className="space-y-3">
              {SYSTEM_PROMPTS.gemini.map((prompt) => (
                <Collapsible key={prompt.id}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Lock className="w-4 h-4 text-gray-400" />
                            <div>
                              <CardTitle className="text-base">{prompt.name}</CardTitle>
                              <CardDescription className="text-xs">{prompt.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">Phase {prompt.sessionPhase}</Badge>
                            <Badge variant="outline" className="text-xs">{prompt.model}</Badge>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="text-xs text-gray-500 mb-2">
                          Source: <code className="bg-gray-100 px-1 rounded">{prompt.file}</code>
                        </div>
                        <pre className="p-3 bg-gray-50 rounded-md text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-auto">
                          {prompt.prompt}
                        </pre>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Avatar Generation Prompt */}
          <div className="mb-6">
            <h4 className="text-md font-medium mb-3 flex items-center gap-2">
              <Image className="w-4 h-4 text-[#C2703E]" />
              Avatar Generation
              <Badge variant="outline" className="ml-2">Imagen 4</Badge>
            </h4>
            <Collapsible>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <div>
                          <CardTitle className="text-base">{SYSTEM_PROMPTS.avatar.name}</CardTitle>
                          <CardDescription className="text-xs">{SYSTEM_PROMPTS.avatar.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{SYSTEM_PROMPTS.avatar.model}</Badge>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="text-xs text-gray-500 mb-2">
                      Source: <code className="bg-gray-100 px-1 rounded">{SYSTEM_PROMPTS.avatar.file}</code>
                    </div>
                    <pre className="p-3 bg-gray-50 rounded-md text-xs font-mono whitespace-pre-wrap max-h-[200px] overflow-auto">
                      {SYSTEM_PROMPTS.avatar.prompt}
                    </pre>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          {/* PDF Generation Master Prompt */}
          <div className="mb-6">
            <h4 className="text-md font-medium mb-3 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-500" />
              PDF Document Generation
              <Badge variant="outline" className="ml-2">Claude</Badge>
            </h4>
            <Collapsible>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <div>
                          <CardTitle className="text-base">{SYSTEM_PROMPTS.pdfGeneration.name}</CardTitle>
                          <CardDescription className="text-xs">{SYSTEM_PROMPTS.pdfGeneration.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{SYSTEM_PROMPTS.pdfGeneration.model}</Badge>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="text-xs text-gray-500 mb-2">
                      Source: <code className="bg-gray-100 px-1 rounded">{SYSTEM_PROMPTS.pdfGeneration.file}</code>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Supported Languages:</p>
                      <div className="flex gap-1">
                        {SYSTEM_PROMPTS.pdfGeneration.languages.map((lang) => (
                          <Badge key={lang} variant="secondary" className="text-xs">{lang}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Generated Sections:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                        {SYSTEM_PROMPTS.pdfGeneration.sections.map((section, i) => (
                          <li key={i}>{section}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Prompt Summary:</p>
                      <pre className="p-3 bg-gray-50 rounded-md text-xs font-mono whitespace-pre-wrap max-h-[200px] overflow-auto">
                        {SYSTEM_PROMPTS.pdfGeneration.promptSummary}
                      </pre>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Why are these read-only?</p>
                  <p className="text-sm text-amber-700">
                    These prompts are optimized for specific AI models and output formats.
                    Modifying them requires testing to ensure compatibility.
                    Contact the development team if changes are needed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
