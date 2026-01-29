import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './db'
import { PromptType, ExtractedItemType, ReviewStatus } from '@prisma/client'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Default model - can be overridden per prompt template
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

export interface ExtractedItemResult {
  type: ExtractedItemType
  category?: string
  content: string
  structuredData?: Record<string, unknown>
  confidence: number
  sourceTimestamp?: number
  sourceSpeaker?: string
  sourceQuote?: string
}

export interface ExtractionResponse {
  items: ExtractedItemResult[]
  inputTokens: number
  outputTokens: number
  latencyMs: number
}

// Get prompt template from database or use default
async function getPromptTemplate(type: PromptType): Promise<{
  prompt: string
  model: string
  temperature: number
  maxTokens: number
  id?: string
}> {
  const template = await prisma.promptTemplate.findFirst({
    where: { type, isActive: true },
    orderBy: { version: 'desc' },
  })

  if (template) {
    return {
      prompt: template.prompt,
      model: template.model,
      temperature: template.temperature,
      maxTokens: template.maxTokens,
      id: template.id,
    }
  }

  // Return default prompts if no template exists
  return getDefaultPrompt(type)
}

function getDefaultPrompt(type: PromptType): {
  prompt: string
  model: string
  temperature: number
  maxTokens: number
} {
  const defaults: Record<PromptType, { prompt: string; temperature: number; maxTokens: number }> = {
    EXTRACT_KICKOFF: {
      prompt: `You are an AI assistant helping to extract structured information from a Design Week Kickoff session.

Analyze the provided transcript and extract the following:

1. **Stakeholders** - People mentioned with roles (STAKEHOLDER type)
2. **Goals** - Business objectives and desired outcomes (GOAL type)
3. **KPI Targets** - Measurable targets discussed (KPI_TARGET type)
4. **Volume Expectations** - Transaction volumes, call volumes, etc. (VOLUME_EXPECTATION type)
5. **Timeline Constraints** - Deadlines and milestones (TIMELINE_CONSTRAINT type)

For each extracted item, provide:
- type: The ExtractedItemType
- category: A sub-category (e.g., for STAKEHOLDER: "decision_maker", "technical", "end_user")
- content: Clear description of the item
- confidence: Your confidence in this extraction (0.0 to 1.0)
- sourceQuote: The exact quote from the transcript
- sourceSpeaker: Who said it (if identifiable)

Respond in JSON format:
{
  "items": [
    {
      "type": "STAKEHOLDER",
      "category": "decision_maker",
      "content": "John Smith - VP of Operations, responsible for sign-off",
      "confidence": 0.95,
      "sourceQuote": "John Smith, our VP of Ops, will need to approve this",
      "sourceSpeaker": "Client PM"
    }
  ]
}

Be thorough but only include items clearly mentioned. High confidence (>0.8) for explicit statements, medium (0.5-0.8) for implied items.`,
      temperature: 0.2,
      maxTokens: 4096,
    },
    EXTRACT_PROCESS: {
      prompt: `You are an AI assistant helping to extract process design information from a Design Week session.

Analyze the provided transcript and extract:

1. **Happy Path Steps** - Steps in the main process flow (HAPPY_PATH_STEP type)
2. **Exception Cases** - Edge cases and exceptions (EXCEPTION_CASE type)
3. **Business Rules** - Rules and conditions (BUSINESS_RULE type)
4. **Scope In** - Things explicitly in scope (SCOPE_IN type)
5. **Scope Out** - Things explicitly out of scope (SCOPE_OUT type)
6. **Escalation Triggers** - When to escalate to humans (ESCALATION_TRIGGER type)

For each item:
- type: The ExtractedItemType
- category: A sub-category (e.g., for HAPPY_PATH_STEP: "verification", "processing", "response")
- content: Clear description
- structuredData: Additional structured info (e.g., step_number, conditions)
- confidence: 0.0 to 1.0
- sourceQuote: Exact quote
- sourceSpeaker: Who said it

Respond in JSON format:
{
  "items": [...]
}

Focus on actionable process details. Mark items as SCOPE_IN only if explicitly confirmed by the client.`,
      temperature: 0.2,
      maxTokens: 8192,
    },
    EXTRACT_TECHNICAL: {
      prompt: `You are an AI assistant helping to extract technical design information from a Design Week session.

Analyze the provided transcript and extract:

1. **System Integrations** - Systems to connect to (SYSTEM_INTEGRATION type)
2. **Data Fields** - Specific data fields needed (DATA_FIELD type)
3. **API Endpoints** - API details mentioned (API_ENDPOINT type)
4. **Security Requirements** - Auth, encryption, compliance (SECURITY_REQUIREMENT type)
5. **Error Handling** - How to handle failures (ERROR_HANDLING type)

For each item:
- type: The ExtractedItemType
- category: Sub-category (e.g., for SYSTEM_INTEGRATION: "crm", "erp", "email", "database")
- content: Clear description
- structuredData: Technical details (e.g., { "system": "Salesforce", "method": "REST API", "auth": "OAuth2" })
- confidence: 0.0 to 1.0
- sourceQuote: Exact quote
- sourceSpeaker: Who said it

Respond in JSON format:
{
  "items": [...]
}

Be precise with technical details. Include authentication methods, data formats, and error scenarios.`,
      temperature: 0.2,
      maxTokens: 8192,
    },
    EXTRACT_SIGNOFF: {
      prompt: `You are an AI assistant helping to extract sign-off information from a Design Week session.

Analyze the provided transcript and extract:

1. **Open Items** - Things still to be decided (OPEN_ITEM type)
2. **Decisions** - Decisions made during the session (DECISION type)
3. **Approvals** - Things approved or signed off (APPROVAL type)
4. **Risks** - Identified risks or concerns (RISK type)

For each item:
- type: The ExtractedItemType
- category: Sub-category (e.g., for OPEN_ITEM: "technical", "business", "timeline")
- content: Clear description
- structuredData: Additional info (e.g., { "owner": "John", "dueDate": "2024-02-15" })
- confidence: 0.0 to 1.0
- sourceQuote: Exact quote
- sourceSpeaker: Who said it

Respond in JSON format:
{
  "items": [...]
}

Clearly distinguish between confirmed decisions and open items. Note who is responsible for each open item.`,
      temperature: 0.2,
      maxTokens: 4096,
    },
    GENERATE_DE_DESIGN: {
      prompt: `Generate a Digital Employee Design document based on the extracted information.
This document should be client-facing and business-friendly for sign-off.
Use the template structure provided and fill in all sections.`,
      temperature: 0.3,
      maxTokens: 16384,
    },
    GENERATE_SOLUTION: {
      prompt: `Generate a Solution Design document based on the extracted information.
This document is technical and internal. Include architecture diagrams (in text),
API specifications, data models, and implementation details.`,
      temperature: 0.3,
      maxTokens: 16384,
    },
    GENERATE_TEST_PLAN: {
      prompt: `Generate a Test Plan document based on the extracted information.
This document should be client-facing for UAT sign-off.
Include happy path tests, edge cases, boundary tests, and escalation tests.`,
      temperature: 0.3,
      maxTokens: 16384,
    },
  }

  return {
    ...defaults[type],
    model: DEFAULT_MODEL,
  }
}

// Main extraction function
export async function extractFromTranscript(
  transcript: string,
  sessionType: 'kickoff' | 'process' | 'technical' | 'signoff'
): Promise<ExtractionResponse> {
  const promptTypeMap: Record<string, PromptType> = {
    kickoff: 'EXTRACT_KICKOFF',
    process: 'EXTRACT_PROCESS',
    technical: 'EXTRACT_TECHNICAL',
    signoff: 'EXTRACT_SIGNOFF',
  }

  const promptType = promptTypeMap[sessionType]
  const template = await getPromptTemplate(promptType)

  const startTime = Date.now()

  const response = await anthropic.messages.create({
    model: template.model,
    max_tokens: template.maxTokens,
    temperature: template.temperature,
    messages: [
      {
        role: 'user',
        content: `${template.prompt}\n\n---\n\nTRANSCRIPT:\n${transcript}`,
      },
    ],
  })

  const latencyMs = Date.now() - startTime

  // Parse response
  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const text = textContent.text

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse extraction result')
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0]
  const parsed = JSON.parse(jsonStr) as { items: ExtractedItemResult[] }

  return {
    items: parsed.items,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
  }
}

// Save extracted items to database
export async function saveExtractedItems(
  sessionId: string,
  items: ExtractedItemResult[],
  promptTemplateId?: string
): Promise<void> {
  await prisma.extractedItem.createMany({
    data: items.map((item) => ({
      sessionId,
      promptTemplateId,
      type: item.type,
      category: item.category || null,
      content: item.content,
      structuredData: item.structuredData ? JSON.parse(JSON.stringify(item.structuredData)) : null,
      confidence: item.confidence,
      status: item.confidence >= 0.8 ? 'APPROVED' as ReviewStatus : 'PENDING' as ReviewStatus,
      sourceTimestamp: item.sourceTimestamp || null,
      sourceSpeaker: item.sourceSpeaker || null,
      sourceQuote: item.sourceQuote || null,
    })),
  })
}

// Generate document from extracted items
export async function generateDocument(
  designWeekId: string,
  documentType: 'DE_DESIGN' | 'SOLUTION_DESIGN' | 'TEST_PLAN'
): Promise<{ content: string; inputTokens: number; outputTokens: number; latencyMs: number }> {
  const promptTypeMap: Record<string, PromptType> = {
    DE_DESIGN: 'GENERATE_DE_DESIGN',
    SOLUTION_DESIGN: 'GENERATE_SOLUTION',
    TEST_PLAN: 'GENERATE_TEST_PLAN',
  }

  // Get all extracted items for this design week
  const designWeek = await prisma.designWeek.findUnique({
    where: { id: designWeekId },
    include: {
      sessions: {
        include: {
          extractedItems: {
            where: { status: 'APPROVED' },
          },
        },
      },
      digitalEmployee: {
        include: { company: true },
      },
    },
  })

  if (!designWeek) {
    throw new Error('Design week not found')
  }

  // Compile all extracted items
  const allItems = designWeek.sessions.flatMap((s) => s.extractedItems)

  const template = await getPromptTemplate(promptTypeMap[documentType])

  const startTime = Date.now()

  const response = await anthropic.messages.create({
    model: template.model,
    max_tokens: template.maxTokens,
    temperature: template.temperature,
    messages: [
      {
        role: 'user',
        content: `${template.prompt}

---

CONTEXT:
- Company: ${designWeek.digitalEmployee.company.name}
- Digital Employee: ${designWeek.digitalEmployee.name}
- Description: ${designWeek.digitalEmployee.description || 'N/A'}

EXTRACTED ITEMS:
${JSON.stringify(allItems, null, 2)}

Generate the complete document in markdown format.`,
      },
    ],
  })

  const latencyMs = Date.now() - startTime

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  return {
    content: textContent.text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
  }
}
