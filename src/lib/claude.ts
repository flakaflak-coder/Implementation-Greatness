import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './db'
import { PromptType, ExtractedItemType, ReviewStatus } from '@prisma/client'
import {
  buildSafePrompt,
  extractAndValidateJson,
  ExtractionResponseSchema,
  CONFIDENCE_SCORING_GUIDE,
  PII_HANDLING_GUIDE,
  ERROR_RECOVERY_GUIDE,
  type ValidatedExtractionResponse,
} from './prompt-utils'
import { trackLLMOperationServer } from './observatory/tracking'

// Lazy-initialize to avoid errors during Next.js build (no API key at build time)
let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }
  return _anthropic
}

// Default model - can be overridden per prompt template
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'

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

${CONFIDENCE_SCORING_GUIDE}

${PII_HANDLING_GUIDE}

${ERROR_RECOVERY_GUIDE}

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
- confidence: Your confidence in this extraction (use the scoring guide above)
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
  ],
  "warnings": ["optional array of warnings if some expected data couldn't be found"]
}

Only include items with confidence >= 0.50.`,
      temperature: 0.2,
      maxTokens: 4096,
    },
    EXTRACT_PROCESS: {
      prompt: `You are an AI assistant helping to extract process design information from a Design Week session.

${CONFIDENCE_SCORING_GUIDE}

${ERROR_RECOVERY_GUIDE}

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
- structuredData: Additional structured info (e.g., {"step_number": 1, "conditions": "when X"})
- confidence: Use the scoring guide above
- sourceQuote: Exact quote
- sourceSpeaker: Who said it

Respond in JSON format:
{
  "items": [
    {
      "type": "HAPPY_PATH_STEP",
      "category": "processing",
      "content": "Validate customer identity using email verification",
      "structuredData": {"step_number": 2, "requires": ["customer_email"]},
      "confidence": 0.92,
      "sourceQuote": "...",
      "sourceSpeaker": "Process Owner"
    }
  ],
  "warnings": ["optional warnings"]
}

Focus on actionable process details. Mark items as SCOPE_IN only if explicitly confirmed by the client.
Only include items with confidence >= 0.50.`,
      temperature: 0.2,
      maxTokens: 8192,
    },
    EXTRACT_TECHNICAL: {
      prompt: `You are an AI assistant helping to extract technical design information from a Design Week session.

${CONFIDENCE_SCORING_GUIDE}

${PII_HANDLING_GUIDE}

${ERROR_RECOVERY_GUIDE}

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
- structuredData: Technical details (e.g., {"system": "Salesforce", "method": "REST API", "auth": "OAuth2"})
- confidence: Use the scoring guide above
- sourceQuote: Exact quote
- sourceSpeaker: Who said it

⚠️ SECURITY: Do NOT extract actual API keys, passwords, or credentials. Only extract:
- System NAMES (e.g., "ServiceNow", "Salesforce")
- Authentication METHODS (e.g., "OAuth2", "API Key") - not actual keys
- Endpoint PATTERNS (e.g., "/api/v1/users") - not full URLs with credentials

Respond in JSON format:
{
  "items": [
    {
      "type": "SYSTEM_INTEGRATION",
      "category": "crm",
      "content": "Salesforce integration for customer data lookup",
      "structuredData": {"system": "Salesforce", "method": "REST API", "auth": "OAuth2"},
      "confidence": 0.88,
      "sourceQuote": "...",
      "sourceSpeaker": "IT Lead"
    }
  ],
  "warnings": ["optional warnings"]
}

Be precise with technical details. Only include items with confidence >= 0.50.`,
      temperature: 0.2,
      maxTokens: 8192,
    },
    EXTRACT_SIGNOFF: {
      prompt: `You are an AI assistant helping to extract sign-off information from a Design Week session.

${CONFIDENCE_SCORING_GUIDE}

${ERROR_RECOVERY_GUIDE}

Analyze the provided transcript and extract:

1. **Open Items** - Things still to be decided (OPEN_ITEM type)
2. **Decisions** - Decisions made during the session (DECISION type)
3. **Approvals** - Things approved or signed off (APPROVAL type)
4. **Risks** - Identified risks or concerns (RISK type)

For each item:
- type: The ExtractedItemType
- category: Sub-category (e.g., for OPEN_ITEM: "technical", "business", "timeline")
- content: Clear description
- structuredData: Additional info (e.g., {"owner": "John Smith", "dueDate": "2024-02-15"})
- confidence: Use the scoring guide above
- sourceQuote: Exact quote
- sourceSpeaker: Who said it

Respond in JSON format:
{
  "items": [
    {
      "type": "DECISION",
      "category": "scope",
      "content": "Phase 1 will include password resets only, access provisioning moves to Phase 2",
      "structuredData": {"decidedBy": "Sarah", "rationale": "Time constraints"},
      "confidence": 0.95,
      "sourceQuote": "...",
      "sourceSpeaker": "Project Sponsor"
    }
  ],
  "warnings": ["optional warnings"]
}

Clearly distinguish between confirmed decisions and open items. Note who is responsible for each open item.
Only include items with confidence >= 0.50.`,
      temperature: 0.2,
      maxTokens: 4096,
    },
    EXTRACT_PERSONA: {
      prompt: `You are an AI assistant helping to extract persona and conversational design information from a Design Week session.

${CONFIDENCE_SCORING_GUIDE}

${ERROR_RECOVERY_GUIDE}

Analyze the provided transcript and extract:

1. **Persona Traits** - Named personality characteristics with example phrases (PERSONA_TRAIT type)
2. **Tone Rules** - Reading level, formality, sentence length rules (TONE_RULE type)
3. **Do's & Don'ts** - Wrong/right conversation pairs (DOS_AND_DONTS type)
4. **Example Dialogues** - Full multi-turn conversations (EXAMPLE_DIALOGUE type)
5. **Escalation Scripts** - Exact language per context (ESCALATION_SCRIPT type)
6. **Monitoring Metrics** - KPIs with owners and thresholds (MONITORING_METRIC type)
7. **Launch Criteria** - Go/no-go criteria per launch phase (LAUNCH_CRITERION type)
8. **Decision Tree** - Question type → action routing (DECISION_TREE type)

For each item:
- type: The ExtractedItemType
- category: A sub-category (e.g., for PERSONA_TRAIT: "helpful", "empathetic", "honest")
- content: Clear description
- structuredData: Rich structured data:
  - PERSONA_TRAIT: {"name": "Helpful", "examplePhrase": "Let me find that for you"}
  - TONE_RULE: {"category": "reading_level|formality|sentence_structure|vocabulary", "examples": "..."}
  - DOS_AND_DONTS: {"wrong": "I'm just a bot", "right": "I don't have that information", "category": "tone"}
  - EXAMPLE_DIALOGUE: {"scenario": "Happy path", "category": "happy_path|clarification|edge_case|angry_customer|complex", "messages": [{"speaker": "user|de", "text": "..."}]}
  - ESCALATION_SCRIPT: {"context": "office_hours|after_hours|unknown_topic|emotional", "script": "exact language", "includesContext": true}
  - MONITORING_METRIC: {"target": ">=4.0", "perspective": "user_experience|operational|knowledge_quality|financial", "frequency": "daily", "owner": "...", "alertThreshold": "<3.5", "actionTrigger": "..."}
  - LAUNCH_CRITERION: {"phase": "soft_launch|full_launch|hypercare", "owner": "...", "softTarget": "...", "fullTarget": "..."}
  - DECISION_TREE: {"questionType": "...", "volumePercent": 25, "automationFeasibility": "full|partial|never", "action": "...", "escalate": false}
- confidence: Use the scoring guide above
- sourceQuote: Exact quote
- sourceSpeaker: Who said it

Respond in JSON format:
{
  "items": [...],
  "warnings": ["optional warnings"]
}

Only include items with confidence >= 0.50.`,
      temperature: 0.2,
      maxTokens: 8192,
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
    GENERATE_PERSONA_DOC: {
      prompt: `Generate a Persona & Conversational Design document (Sub3) based on the extracted information.
Include: Identity Profile, Personality Traits with examples, Tone of Voice Rules,
Do's & Don'ts table, Opening Message, Conversation Structure (6-step flow),
Escalation Scripts (4 contexts), Example Dialogues (5+ scenarios),
Edge Cases & Boundaries, and Feedback Mechanism design.`,
      temperature: 0.3,
      maxTokens: 16384,
    },
    GENERATE_MONITORING: {
      prompt: `Generate a Monitoring Framework & Dashboard document (Sub4) based on the extracted information.
Include: Measurement Framework (4 perspectives), KPI Definitions with owners and thresholds,
Dashboard Specifications per stakeholder, Alert Configuration, Reporting Cycle
(daily/weekly/monthly/quarterly), Weekly Improvement Actions, and Baseline Measurement plan.`,
      temperature: 0.3,
      maxTokens: 16384,
    },
    GENERATE_ROLLOUT: {
      prompt: `Generate a Test & Rollout Plan document (Sub5) based on the extracted information.
Include: Testing Phases (Functional → UAT → Staff Pilot → Soft Launch → Full Launch),
Test Scenarios per Phase, Soft Launch Protocol with lower KPI thresholds,
Go/No-Go Checklist (13+ points), Hypercare Protocol (4-week post-launch),
Kill Switch Mechanism, Risk & Mitigation, and Transition to Steady State.`,
      temperature: 0.3,
      maxTokens: 16384,
    },
  }

  return {
    ...defaults[type],
    model: DEFAULT_MODEL,
  }
}

/**
 * Classify a Claude API error into a user-friendly message.
 * Never exposes API keys, internal URLs, or raw stack traces.
 */
function classifyClaudeError(error: unknown): { userMessage: string; retryable: boolean } {
  if (!(error instanceof Error)) {
    return { userMessage: 'An unexpected error occurred during Claude processing.', retryable: false }
  }

  const msg = error.message.toLowerCase()

  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
    return { userMessage: 'Claude rate limit reached. Please wait a moment and try again.', retryable: true }
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('invalid api key') || msg.includes('authentication')) {
    return { userMessage: 'Claude authentication failed. Please verify the API key configuration.', retryable: false }
  }
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('econnaborted') || msg.includes('socket hang up')) {
    return { userMessage: 'Claude request timed out. The content may be too large or the service is under heavy load.', retryable: true }
  }
  if (msg.includes('500') || msg.includes('529') || msg.includes('503') || msg.includes('overloaded') || msg.includes('service unavailable')) {
    return { userMessage: 'Claude service is temporarily unavailable. Please try again shortly.', retryable: true }
  }

  // Sanitize: strip potential credentials and URLs
  let sanitized = error.message
    .replace(/(?:key|token|api[_-]?key)[=:\s]+\S+/gi, '[redacted]')
    .replace(/https?:\/\/\S+/gi, '[service-url]')
  if (sanitized.length > 200) sanitized = sanitized.substring(0, 197) + '...'

  return { userMessage: `Claude processing error: ${sanitized}`, retryable: false }
}

// Main extraction function
export async function extractFromTranscript(
  transcript: string,
  sessionType: 'kickoff' | 'process' | 'technical' | 'signoff' | 'persona'
): Promise<ExtractionResponse> {
  const promptTypeMap: Record<string, PromptType> = {
    kickoff: 'EXTRACT_KICKOFF',
    process: 'EXTRACT_PROCESS',
    technical: 'EXTRACT_TECHNICAL',
    signoff: 'EXTRACT_SIGNOFF',
    persona: 'EXTRACT_PERSONA',
  }

  const promptType = promptTypeMap[sessionType]
  const template = await getPromptTemplate(promptType)

  const startTime = Date.now()

  // Build safe prompt with sanitized user content
  const safePrompt = buildSafePrompt(template.prompt, transcript, 'TRANSCRIPT')

  let response
  try {
    response = await getAnthropic().messages.create({
      model: template.model,
      max_tokens: template.maxTokens,
      temperature: template.temperature,
      messages: [
        {
          role: 'user',
          content: safePrompt,
        },
      ],
    })
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const classified = classifyClaudeError(error)
    console.error(`[Claude Extraction] API call failed for session type "${sessionType}": ${classified.userMessage}`)

    await trackLLMOperationServer({
      pipelineName: `claude-extract-${sessionType}`,
      model: template.model,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      success: false,
      errorMessage: classified.userMessage,
      metadata: { sessionType },
    })

    throw new Error(classified.userMessage)
  }

  const latencyMs = Date.now() - startTime

  // Parse response
  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const text = textContent.text

  // Parse and validate JSON from response
  const validationResult = extractAndValidateJson(text, ExtractionResponseSchema)

  if (!validationResult.success) {
    console.error('[Claude Extraction] Validation failed:', validationResult.error)
    // Attempt fallback parsing without validation for backwards compatibility
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error(`Failed to parse extraction result: ${validationResult.error}`)
    }
    const jsonStr = jsonMatch[1] || jsonMatch[0]
    console.warn('[Claude Extraction] Using unvalidated fallback parsing')
    const parsed = JSON.parse(jsonStr) as { items: ExtractedItemResult[] }
    const fallbackResult = {
      items: parsed.items,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs,
    }

    // Track LLM operation even for fallback parsing
    await trackLLMOperationServer({
      pipelineName: `claude-extract-${sessionType}`,
      model: template.model,
      inputTokens: fallbackResult.inputTokens,
      outputTokens: fallbackResult.outputTokens,
      latencyMs: fallbackResult.latencyMs,
      success: true,
      metadata: { sessionType, itemCount: fallbackResult.items.length, fallbackParsing: true },
    })

    return fallbackResult
  }

  // Log any warnings from the LLM
  const validated = validationResult.data as ValidatedExtractionResponse
  if (validated.error) {
    console.warn('[Claude Extraction] LLM reported error:', validated.error)
  }
  if (validated.warnings?.length) {
    console.warn('[Claude Extraction] LLM warnings:', validated.warnings)
  }

  const result = {
    items: validated.items as ExtractedItemResult[],
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
  }

  // Track LLM operation for observatory
  await trackLLMOperationServer({
    pipelineName: `claude-extract-${sessionType}`,
    model: template.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
    success: true,
    metadata: { sessionType, itemCount: result.items.length },
  })

  return result
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

  let response
  try {
    response = await getAnthropic().messages.create({
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
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const classified = classifyClaudeError(error)
    console.error(`[Claude Document Generation] API call failed for "${documentType}": ${classified.userMessage}`)

    await trackLLMOperationServer({
      pipelineName: `claude-generate-${documentType.toLowerCase()}`,
      model: template.model,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      success: false,
      errorMessage: classified.userMessage,
      metadata: { documentType, designWeekId },
    })

    throw new Error(classified.userMessage)
  }

  const latencyMs = Date.now() - startTime

  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const result = {
    content: textContent.text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
  }

  // Track document generation for observatory
  await trackLLMOperationServer({
    pipelineName: `claude-generate-${documentType.toLowerCase()}`,
    model: template.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
    success: true,
    metadata: { documentType, designWeekId },
  })

  return result
}
