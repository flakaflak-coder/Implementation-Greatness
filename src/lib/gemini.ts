import { GoogleGenAI, type Part } from '@google/genai'
import {
  buildSafePrompt,
  extractAndValidateJson,
  GeminiExtractionSchema,
  CONFIDENCE_SCORING_GUIDE,
  PII_HANDLING_GUIDE,
  ERROR_RECOVERY_GUIDE,
} from './prompt-utils'
import { trackLLMOperationServer } from './observatory/tracking'
import { prisma } from './db'
import type { PromptType } from '@prisma/client'

const GEMINI_TEXT_MODEL = 'gemini-3-pro-preview'

// Lazy-initialize to avoid errors during Next.js build (no API key at build time)
let _genAIClient: GoogleGenAI | null = null
function getGenAIClient() {
  if (!_genAIClient) {
    _genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })
  }
  return _genAIClient
}

export interface ExtractionResult {
  transcript: string

  // Stakeholders (Kickoff) - Added to match KICKOFF_PROMPT schema
  stakeholders?: Array<{
    name: string
    role: string
    email?: string
    isDecisionMaker?: boolean
    quote: string
  }>

  // Business Context (Kickoff)
  businessContext?: {
    problem: string
    currentCost?: string
    targetCost?: string
    monthlyVolume?: number
    peakPeriods?: string
    successMetrics?: string
    deName?: string
    quote: string
  }

  // Process (Process Design 1)
  processSteps?: Array<{
    step: string
    order: number
    quote: string
  }>
  caseTypes?: Array<{
    type: string
    volumePercent?: number
    complexity: 'LOW' | 'MEDIUM' | 'HIGH'
    automatable: boolean
    quote: string
  }>

  // Channels (Process Design 1)
  channels?: Array<{
    type: 'EMAIL' | 'WEB_FORM' | 'API' | 'PORTAL' | 'OTHER'
    volumePercent?: number
    currentSLA?: string
    targetSLA?: string
    rules?: string
    quote: string
  }>

  // Skills (Process Design 2)
  skills?: Array<{
    name: string
    type: 'ANSWER' | 'ROUTE' | 'APPROVE_REJECT' | 'REQUEST_INFO' | 'NOTIFY' | 'OTHER'
    description: string
    knowledgeSource?: string
    phase: number
    quote: string
  }>

  brandTone?: {
    tone: string
    formality: 'FORMAL' | 'INFORMAL'
    language: string[]
    empathyLevel: string
    quote: string
  }

  // Guardrails (Process Design 2)
  guardrails?: {
    never: Array<{ item: string; reason: string; quote: string }>
    always: Array<{ item: string; reason: string; quote: string }>
    financialLimits?: string
    legalRestrictions?: string
  }

  // Integrations (Technical 1 & 2)
  integrations?: Array<{
    systemName: string
    purpose: string
    accessType: 'READ' | 'WRITE' | 'READ_WRITE'
    dataFields: string[]
    technicalContact?: string
    apiAvailable?: boolean
    quote: string
  }>

  // Legacy fields (for backward compatibility)
  scopeItems?: Array<{
    statement: string
    classification: 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS'
    skill?: string
    conditions?: string
    timestampStart?: number
    timestampEnd?: number
    quote: string
  }>
  scenarios?: Array<{
    title: string
    description: string
    steps: string[]
    expectedOutcome: string
    exceptions?: string[]
    timestampStart?: number
    timestampEnd?: number
    quote: string
  }>
  kpis?: Array<{
    name: string
    targetValue: string
    unit: string
    measurementMethod: string
    quote: string
  }>
  escalationRules?: Array<{
    triggerCondition: string
    action: string
    targetTeam?: string
    slaMinutes?: number
    quote: string
  }>

  // Persona & Conversational Design extractions
  personaTraits?: Array<{
    name: string
    description: string
    examplePhrase: string
    quote: string
  }>
  toneRules?: Array<{
    rule: string
    category: 'reading_level' | 'formality' | 'sentence_structure' | 'vocabulary' | 'other'
    examples?: string
    quote: string
  }>
  dosAndDonts?: Array<{
    wrong: string
    right: string
    category?: string
    quote: string
  }>
  exampleDialogues?: Array<{
    scenario: string
    category: 'happy_path' | 'clarification' | 'edge_case' | 'angry_customer' | 'complex'
    messages: Array<{ speaker: 'user' | 'de'; text: string }>
    quote: string
  }>
  escalationScripts?: Array<{
    context: 'office_hours' | 'after_hours' | 'unknown_topic' | 'emotional' | 'other'
    label: string
    script: string
    includesContext: boolean
    quote: string
  }>
  openingMessage?: {
    greeting: string
    aiDisclaimer: string
    quote: string
  }
  feedbackMechanism?: {
    methods: string[]
    improvementCycle: string
    quote: string
  }

  // Monitoring & Launch extractions
  monitoringMetrics?: Array<{
    name: string
    target: string
    perspective: 'user_experience' | 'operational' | 'knowledge_quality' | 'financial'
    frequency: string
    owner: string
    alertThreshold: string
    actionTrigger: string
    quote: string
  }>
  launchCriteria?: Array<{
    criterion: string
    phase: 'soft_launch' | 'full_launch' | 'hypercare'
    owner: string
    softTarget?: string
    fullTarget?: string
    quote: string
  }>
  decisionTree?: Array<{
    questionType: string
    volumePercent: number
    automationFeasibility: 'full' | 'partial' | 'never'
    action: string
    escalate: boolean
    reason?: string
    quote: string
  }>
}

// Session-type-specific extraction prompts aligned with Sophie's checklist
const KICKOFF_PROMPT = `You are an AI assistant extracting information from a Design Week KICKOFF session for Digital Employee onboarding.

Focus on extracting: **Business Context, Volumes, and Success Metrics**

${CONFIDENCE_SCORING_GUIDE}

${PII_HANDLING_GUIDE}

${ERROR_RECOVERY_GUIDE}

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
   - Only include WORK email addresses, not personal ones

Respond in JSON with structure:
{
  "transcript": "full transcript",
  "businessContext": {
    "problem": "description of problem",
    "currentCost": "cost per case",
    "targetCost": "target cost",
    "monthlyVolume": 1234,
    "peakPeriods": "when are peak times",
    "successMetrics": "what success looks like",
    "deName": "proposed DE name",
    "quote": "relevant quote from transcript"
  },
  "kpis": [{"name": "KPI name", "targetValue": "target", "unit": "optional unit", "measurementMethod": "how measured", "owner": "who monitors this KPI (optional)", "alertThreshold": "when to escalate (optional)", "frequency": "daily|weekly|monthly (optional)", "quote": "exact quote"}],
  "stakeholders": [{"name": "Full Name", "role": "Their Role", "email": "work@company.com (optional)", "isDecisionMaker": true/false, "quote": "exact quote"}],
  "decisionTree": [{"questionType": "type of question/request", "volumePercent": 25, "automationFeasibility": "full|partial|never", "action": "what the DE should do", "escalate": false, "reason": "why this routing", "quote": "exact quote"}]
}

Also extract a decision tree if discussed: what types of questions/requests come in, what % each represents, and whether each is fully automatable, partially automatable, or should never be automated.

Include exact quotes. Only include items with confidence >= 0.50.`

const PROCESS_DESIGN_PROMPT = `You are an AI assistant extracting information from a Design Week PROCESS DESIGN session for Digital Employee onboarding.

Focus on extracting: **The Process, Channels, Case Types, Exceptions**

${CONFIDENCE_SCORING_GUIDE}

${ERROR_RECOVERY_GUIDE}

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
  "processSteps": [{"step": "description", "order": 1, "quote": "exact quote"}],
  "caseTypes": [{"type": "case type name", "volumePercent": 25, "complexity": "LOW|MEDIUM|HIGH", "automatable": true, "automationFeasibility": "full|partial|never", "quote": "exact quote"}],
  "channels": [{"type": "EMAIL|WEB_FORM|API|PORTAL|OTHER", "volumePercent": 30, "currentSLA": "current", "targetSLA": "target", "rules": "any rules", "quote": "exact quote"}],
  "escalationRules": [{"triggerCondition": "when to escalate", "action": "what to do", "targetTeam": "optional team", "slaMinutes": 30, "quote": "exact quote"}],
  "scopeItems": [{"statement": "scope item", "classification": "IN_SCOPE|OUT_OF_SCOPE|AMBIGUOUS", "quote": "exact quote"}]
}

Include exact quotes. Only include items with confidence >= 0.50.`

const SKILLS_GUARDRAILS_PROMPT = `You are an AI assistant extracting information from a Design Week PROCESS DESIGN session (phase 2) for Digital Employee onboarding.

Focus on extracting: **Skills, Brand Tone, Guardrails**

${CONFIDENCE_SCORING_GUIDE}

${ERROR_RECOVERY_GUIDE}

Extract the following:

1. **Skills Needed**
   - What actions does the DE need to perform?
   - Types: ANSWER (answer questions), ROUTE (route/escalate), APPROVE_REJECT (make decisions), REQUEST_INFO (ask for missing info), NOTIFY (send confirmations), OTHER
   - Knowledge source for each skill (KB, manuals, policies, rules, templates)
   - Which phase (1 or 2)?

2. **Brand Tone & Communication**
   - Brand tone description (professional, warm, friendly, etc.)
   - Formality: FORMAL or INFORMAL (u vs. je in Dutch)
   - Languages
   - Empathy level
   - Can DE be proactive?

3. **Guardrails**
   - NEVER: What should the DE absolutely NEVER do or say? (with reason)
   - ALWAYS: What should the DE ALWAYS do? (with reason)
   - Financial limits (can't approve > €X, can't promise refunds)
   - Legal or compliance restrictions

Respond in JSON:
{
  "transcript": "full transcript",
  "skills": [{"name": "skill name", "type": "ANSWER|ROUTE|APPROVE_REJECT|REQUEST_INFO|NOTIFY|OTHER", "description": "what it does", "knowledgeSource": "where info comes from", "phase": 1, "quote": "exact quote"}],
  "brandTone": {"tone": "description", "formality": "FORMAL|INFORMAL", "language": ["Dutch", "English"], "empathyLevel": "description", "quote": "exact quote"},
  "guardrails": {
    "never": [{"item": "what to never do", "reason": "why", "quote": "exact quote"}],
    "always": [{"item": "what to always do", "reason": "why", "quote": "exact quote"}],
    "financialLimits": "any limits mentioned",
    "legalRestrictions": "any legal requirements"
  }
}

Include exact quotes. Only include items with confidence >= 0.50.`

const TECHNICAL_PROMPT = `You are an AI assistant extracting information from a Design Week TECHNICAL session for Digital Employee onboarding.

Focus on extracting: **Integrations, Systems, Data Fields**

${CONFIDENCE_SCORING_GUIDE}

${PII_HANDLING_GUIDE}

${ERROR_RECOVERY_GUIDE}

Extract the following:

1. **System Integrations**
   - What systems does this process touch? (list all)
   - Purpose of each system
   - Access type: READ, WRITE, or READ_WRITE
   - Specific data fields needed (field names)
   - Is there API access? Documentation?
   - Who's the technical contact? (work contact only)

2. **Security & Compliance**
   - Security requirements (SSO, encryption, etc.)
   - Compliance requirements (GDPR, audit trails, etc.)
   - Authentication methods

⚠️ SENSITIVE DATA: Do NOT extract actual credentials, API keys, or passwords mentioned.
Only extract system names, authentication METHODS (not actual credentials), and contact NAMES.

Respond in JSON:
{
  "transcript": "full transcript",
  "integrations": [{"systemName": "System Name", "purpose": "what it's used for", "accessType": "READ|WRITE|READ_WRITE", "dataFields": ["field1", "field2"], "technicalContact": "Name (optional)", "apiAvailable": true, "fallbackBehavior": "what happens when system is down (optional)", "retryStrategy": "retry approach (optional)", "dataFreshness": "sync frequency (optional)", "quote": "exact quote"}],
  "securityRequirements": [{"requirement": "what's required", "type": "category", "quote": "exact quote"}],
  "monitoringMetrics": [{"name": "metric name", "target": "target value", "perspective": "user_experience|operational|knowledge_quality|financial", "frequency": "daily|weekly|monthly", "owner": "who monitors", "alertThreshold": "when to alert", "actionTrigger": "what to do if threshold breached", "quote": "exact quote"}]
}

Also extract any monitoring metrics or KPIs discussed in the technical context (system uptime, API latency, error rates, etc.).

3. **Fallback Behaviors**
   - What happens when each system is unavailable?
   - Retry strategies (exponential backoff, max retries)
   - Data freshness requirements (how often to sync)

Include exact quotes. Only include items with confidence >= 0.50.`

const SIGNOFF_PROMPT = `You are an AI assistant extracting information from a Design Week SIGN-OFF session for Digital Employee onboarding.

Focus on extracting: **Open Items, Decisions, Approvals, Risks**

${CONFIDENCE_SCORING_GUIDE}

${ERROR_RECOVERY_GUIDE}

Extract the following:

1. **Open Items**
   - What still needs to be resolved?
   - Who owns each item?

2. **Decisions Made**
   - What decisions were finalized?
   - Who approved?

3. **Risks Identified**
   - What are the risks or concerns?
   - Mitigation plans?

4. **Final Approvals**
   - Who signed off?
   - Any conditions?

Respond in JSON:
{
  "transcript": "full transcript",
  "openItems": [{"item": "what needs to be done", "owner": "who owns it", "quote": "exact quote"}],
  "decisions": [{"decision": "what was decided", "approvedBy": "who approved", "quote": "exact quote"}],
  "risks": [{"risk": "risk description", "mitigation": "how to mitigate", "quote": "exact quote"}],
  "approvals": [{"stakeholder": "who signed off", "status": "approved/pending", "conditions": "any conditions", "quote": "exact quote"}],
  "launchCriteria": [{"criterion": "go/no-go criterion", "phase": "soft_launch|full_launch|hypercare", "owner": "who owns this", "softTarget": "soft launch threshold (optional)", "fullTarget": "full launch threshold (optional)", "quote": "exact quote"}]
}

5. **Launch Criteria**
   - Go/no-go criteria per launch phase
   - Soft launch vs full launch thresholds
   - Hypercare requirements

Include exact quotes. Only include items with confidence >= 0.50.`

const PERSONA_DESIGN_PROMPT = `You are an AI assistant extracting PERSONA & CONVERSATIONAL DESIGN information from a Design Week session for Digital Employee onboarding.

Focus on extracting: **Personality, Tone of Voice, Do's/Don'ts, Example Dialogues, Escalation Scripts**

${CONFIDENCE_SCORING_GUIDE}

${ERROR_RECOVERY_GUIDE}

Extract the following:

1. **Persona Traits**
   - Named personality characteristics (e.g., Helpful, Clear, Patient, Honest, Empathetic, Proactive)
   - Description of each trait
   - Example phrase demonstrating the trait

2. **Tone of Voice Rules**
   - Reading level (e.g., B1 Dutch, plain English)
   - Formality (u vs. je, formal/informal)
   - Max sentence length
   - Vocabulary rules (jargon replacements)
   - Active/passive voice preference

3. **Do's & Don'ts**
   - Wrong/right conversation pairs
   - What the DE should NEVER say (with better alternative)
   - Category: tone, clarity, empathy, jargon, actionability

4. **Opening Message**
   - Exact greeting text
   - AI transparency disclaimer
   - Question prompt

5. **Conversation Structure**
   - Step-by-step flow (e.g., Acknowledge → Understand → Clarify → Answer → Proactive next → Close)

6. **Escalation Scripts**
   - Exact language per context: office_hours, after_hours, unknown_topic, emotional
   - Whether conversation context is passed to the human agent ("warm handover")

7. **Example Dialogues**
   - Full multi-turn conversations for scenarios: happy_path, clarification, edge_case, angry_customer, complex
   - Each message with speaker (user/de) and text

8. **Edge Case Responses**
   - How to handle: profanity, spam, legal questions, timeout, sexual remarks, repeated abuse

9. **Feedback Mechanism**
   - Collection methods (thumbs up/down, CSAT 1-5, comment field)
   - Improvement cycle (e.g., "Weekly top-5 improvements reviewed by project team")

Respond in JSON:
{
  "transcript": "full transcript",
  "personaTraits": [{"name": "Helpful", "description": "Always tries to find an answer", "examplePhrase": "Let me see what I can find for you", "quote": "exact quote"}],
  "toneRules": [{"rule": "Max 15-20 words per sentence", "category": "sentence_structure", "examples": "Short sentences are clearer", "quote": "exact quote"}],
  "dosAndDonts": [{"wrong": "I'm a chatbot and don't know everything", "right": "I don't have reliable information on that topic", "category": "tone", "quote": "exact quote"}],
  "openingMessage": {"greeting": "Hello! I'm Dani, the digital assistant of...", "aiDisclaimer": "I am an AI assistant. I can help with...", "quote": "exact quote"},
  "exampleDialogues": [{"scenario": "Simple parking question", "category": "happy_path", "messages": [{"speaker": "user", "text": "..."}, {"speaker": "de", "text": "..."}], "quote": "discussed at..."}],
  "escalationScripts": [{"context": "office_hours", "label": "During office hours", "script": "I'll connect you with a colleague who can see our conversation...", "includesContext": true, "quote": "exact quote"}],
  "feedbackMechanism": {"methods": ["thumbs_up_down", "csat_1_5"], "improvementCycle": "Weekly review by project team", "quote": "exact quote"},
  "escalationRules": [{"triggerCondition": "when to escalate", "action": "what to do", "quote": "exact quote"}],
  "guardrails": {
    "never": [{"item": "what to never do", "reason": "why", "quote": "exact quote"}],
    "always": [{"item": "what to always do", "reason": "why", "quote": "exact quote"}]
  },
  "brandTone": {"tone": "description", "formality": "FORMAL|INFORMAL", "language": ["Dutch"], "empathyLevel": "description", "quote": "exact quote"}
}

Include exact quotes. Only include items with confidence >= 0.50.`

// Legacy prompt for backward compatibility
const LEGACY_EXTRACTION_PROMPT = `You are an AI assistant helping to extract structured information from a Design Week session recording for Digital Employee onboarding.

Analyze this recording and extract the following information:

1. **Scope Items**: Things the Digital Employee should or should not do
   - Mark as IN_SCOPE if explicitly confirmed the DE will handle
   - Mark as OUT_OF_SCOPE if explicitly stated the DE will NOT handle
   - Mark as AMBIGUOUS if discussed but not clearly decided
   - Include the exact quote and timestamp range

2. **Scenarios**: Process flows and use cases discussed
   - Include step-by-step process descriptions
   - Note exceptions and edge cases
   - Include expected outcomes

3. **KPIs**: Performance metrics and targets mentioned
   - Target values and units
   - How they will be measured

4. **Integrations**: Systems the DE needs to connect to
   - System names and integration types (API, RPA, email, etc.)
   - Data fields to be exchanged

5. **Escalation Rules**: When human intervention is needed
   - Trigger conditions
   - Target teams and SLAs

Respond in JSON format with this structure:
{
  "transcript": "full transcript of the recording",
  "scopeItems": [...],
  "scenarios": [...],
  "kpis": [...],
  "integrations": [...],
  "escalationRules": [...]
}

Be thorough but only include items that are clearly discussed. Include timestamps in seconds.`

// Map session phase to Gemini PromptType for DB lookup
const SESSION_PHASE_TO_PROMPT_TYPE: Record<number, PromptType> = {
  1: 'GEMINI_EXTRACT_KICKOFF',
  2: 'GEMINI_EXTRACT_PROCESS',
  3: 'GEMINI_EXTRACT_SKILLS_GUARDRAILS',
  4: 'GEMINI_EXTRACT_TECHNICAL',
  5: 'GEMINI_EXTRACT_TECHNICAL',
  6: 'GEMINI_EXTRACT_SIGNOFF',
  7: 'GEMINI_EXTRACT_PERSONA',
}

// Map session phase to hardcoded fallback prompt
const SESSION_PHASE_TO_DEFAULT_PROMPT: Record<number, string> = {
  1: KICKOFF_PROMPT,
  2: PROCESS_DESIGN_PROMPT,
  3: SKILLS_GUARDRAILS_PROMPT,
  4: TECHNICAL_PROMPT,
  5: TECHNICAL_PROMPT,
  6: SIGNOFF_PROMPT,
  7: PERSONA_DESIGN_PROMPT,
}

/**
 * Load a Gemini extraction prompt from the PromptTemplate database table.
 * Falls back to the hardcoded constant if no DB entry exists or if the query fails.
 * This ensures backwards compatibility -- the system works without DB entries.
 */
export async function getGeminiPrompt(type: PromptType): Promise<string> {
  try {
    const template = await prisma.promptTemplate.findFirst({
      where: { type, isActive: true },
      orderBy: { version: 'desc' },
    })

    if (template) {
      return template.prompt
    }
  } catch (error) {
    // Gracefully fall back to hardcoded prompt on DB failure
    console.warn(
      `[Gemini Prompt] Failed to load prompt from DB for type "${type}". ` +
        `Falling back to hardcoded default. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  // Return empty string to signal caller to use hardcoded default
  return ''
}

// Map session phase to appropriate prompt (with DB override support)
async function getPromptForSessionType(sessionPhase?: number): Promise<string> {
  // Try DB lookup first for known session phases
  if (sessionPhase !== undefined && sessionPhase in SESSION_PHASE_TO_PROMPT_TYPE) {
    const promptType = SESSION_PHASE_TO_PROMPT_TYPE[sessionPhase]
    const dbPrompt = await getGeminiPrompt(promptType)
    if (dbPrompt) {
      return dbPrompt
    }
  }

  // Fall back to hardcoded constants
  if (sessionPhase !== undefined && sessionPhase in SESSION_PHASE_TO_DEFAULT_PROMPT) {
    return SESSION_PHASE_TO_DEFAULT_PROMPT[sessionPhase]
  }

  // Log warning for unexpected session phase - using legacy prompt as fallback
  console.warn(
    `[Gemini Extraction] Unexpected session phase: ${sessionPhase}. ` +
      `Expected 1-7. Using legacy extraction prompt as fallback. ` +
      `This may produce inconsistent results.`
  )
  return LEGACY_EXTRACTION_PROMPT
}

/**
 * Classify a Gemini API error into a user-friendly message.
 * Never exposes API keys, internal URLs, or raw stack traces.
 */
function classifyGeminiError(error: unknown): { userMessage: string; retryable: boolean } {
  if (!(error instanceof Error)) {
    return { userMessage: 'An unexpected error occurred during Gemini processing.', retryable: false }
  }

  const msg = error.message.toLowerCase()

  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('resource exhausted') || msg.includes('quota')) {
    return { userMessage: 'Gemini rate limit reached. Please wait a moment and try again.', retryable: true }
  }
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized') || msg.includes('invalid api key')) {
    return { userMessage: 'Gemini authentication failed. Please verify the API key configuration.', retryable: false }
  }
  if (msg.includes('timeout') || msg.includes('deadline exceeded') || msg.includes('econnaborted')) {
    return { userMessage: 'Gemini request timed out. The file may be too large or the service is under heavy load.', retryable: true }
  }
  if (msg.includes('500') || msg.includes('503') || msg.includes('service unavailable')) {
    return { userMessage: 'Gemini service is temporarily unavailable. Please try again shortly.', retryable: true }
  }

  // Sanitize: strip potential credentials and URLs
  let sanitized = error.message
    .replace(/(?:key|token|api[_-]?key)[=:\s]+\S+/gi, '[redacted]')
    .replace(/https?:\/\/\S+/gi, '[service-url]')
  if (sanitized.length > 200) sanitized = sanitized.substring(0, 197) + '...'

  return { userMessage: `Gemini processing error: ${sanitized}`, retryable: false }
}

export async function processRecording(
  audioBuffer: Buffer,
  mimeType: string,
  sessionPhase?: number
): Promise<ExtractionResult> {
  const startTime = Date.now()
  const audioPart: Part = {
    inlineData: {
      data: audioBuffer.toString('base64'),
      mimeType,
    },
  }

  // Use session-type-specific prompt (DB override or hardcoded fallback)
  const prompt = await getPromptForSessionType(sessionPhase)

  let response
  try {
    response = await getGenAIClient().models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [
        { role: 'user', parts: [{ text: prompt }, audioPart] },
      ],
    })
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const classified = classifyGeminiError(error)
    console.error(`[Gemini Extraction] API call failed for recording phase ${sessionPhase ?? 'unknown'}: ${classified.userMessage}`)

    await trackLLMOperationServer({
      pipelineName: `gemini-extract-phase${sessionPhase ?? 0}`,
      model: GEMINI_TEXT_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      success: false,
      errorMessage: classified.userMessage,
      metadata: { sessionPhase, mimeType },
    })

    throw new Error(classified.userMessage)
  }

  const latencyMs = Date.now() - startTime
  const text = response.text ?? ''

  // Get token usage from response metadata (if available)
  const usageMetadata = response.usageMetadata
  const inputTokens = usageMetadata?.promptTokenCount ?? 0
  const outputTokens = usageMetadata?.candidatesTokenCount ?? 0

  // Parse and validate JSON from response
  const validationResult = extractAndValidateJson(text, GeminiExtractionSchema)

  if (!validationResult.success) {
    console.error('[Gemini Extraction] Validation failed:', validationResult.error)
    // Attempt fallback parsing without validation for backwards compatibility
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Track failed operation
      await trackLLMOperationServer({
        pipelineName: `gemini-extract-phase${sessionPhase ?? 0}`,
        model: GEMINI_TEXT_MODEL,
        inputTokens,
        outputTokens,
        latencyMs,
        success: false,
        errorMessage: validationResult.error,
        metadata: { sessionPhase, mimeType },
      })
      throw new Error(`Failed to parse extraction result: ${validationResult.error}`)
    }
    const jsonStr = jsonMatch[1] || jsonMatch[0]
    console.warn('[Gemini Extraction] Using unvalidated fallback parsing')

    // Track fallback operation
    await trackLLMOperationServer({
      pipelineName: `gemini-extract-phase${sessionPhase ?? 0}`,
      model: GEMINI_TEXT_MODEL,
      inputTokens,
      outputTokens,
      latencyMs,
      success: true,
      metadata: { sessionPhase, mimeType, fallbackParsing: true },
    })

    return JSON.parse(jsonStr) as ExtractionResult
  }

  // Check for error or warning fields in response
  if (validationResult.data.error) {
    console.warn('[Gemini Extraction] LLM reported error:', validationResult.data.error)
  }
  if (validationResult.data.warnings?.length) {
    console.warn('[Gemini Extraction] LLM warnings:', validationResult.data.warnings)
  }

  // Track successful operation
  await trackLLMOperationServer({
    pipelineName: `gemini-extract-phase${sessionPhase ?? 0}`,
    model: GEMINI_TEXT_MODEL,
    inputTokens,
    outputTokens,
    latencyMs,
    success: true,
    metadata: { sessionPhase, mimeType },
  })

  return validationResult.data as ExtractionResult
}

export async function processDocument(
  fileBuffer: Buffer,
  mimeType: string,
  sessionPhase?: number
): Promise<ExtractionResult> {
  const startTime = Date.now()
  const docPart: Part = {
    inlineData: {
      data: fileBuffer.toString('base64'),
      mimeType,
    },
  }

  // Use session-type-specific prompt (DB override or hardcoded fallback), adapted for documents
  const prompt = (await getPromptForSessionType(sessionPhase))
    .replace(/recording/g, 'document')
    .replace(/timestamp/g, 'page/paragraph')

  let response
  try {
    response = await getGenAIClient().models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [
        { role: 'user', parts: [{ text: prompt }, docPart] },
      ],
    })
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const classified = classifyGeminiError(error)
    console.error(`[Gemini Document Extraction] API call failed for phase ${sessionPhase ?? 'unknown'}: ${classified.userMessage}`)

    await trackLLMOperationServer({
      pipelineName: `gemini-document-phase${sessionPhase ?? 0}`,
      model: GEMINI_TEXT_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      success: false,
      errorMessage: classified.userMessage,
      metadata: { sessionPhase, mimeType, type: 'document' },
    })

    throw new Error(classified.userMessage)
  }

  const latencyMs = Date.now() - startTime
  const text = response.text ?? ''

  // Get token usage from response metadata (if available)
  const usageMetadata = response.usageMetadata
  const inputTokens = usageMetadata?.promptTokenCount ?? 0
  const outputTokens = usageMetadata?.candidatesTokenCount ?? 0

  // Parse and validate JSON from response
  const validationResult = extractAndValidateJson(text, GeminiExtractionSchema)

  if (!validationResult.success) {
    console.error('[Gemini Document Extraction] Validation failed:', validationResult.error)
    // Attempt fallback parsing without validation for backwards compatibility
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      await trackLLMOperationServer({
        pipelineName: `gemini-document-phase${sessionPhase ?? 0}`,
        model: GEMINI_TEXT_MODEL,
        inputTokens,
        outputTokens,
        latencyMs,
        success: false,
        errorMessage: validationResult.error,
        metadata: { sessionPhase, mimeType, type: 'document' },
      })
      throw new Error(`Failed to parse extraction result: ${validationResult.error}`)
    }
    const jsonStr = jsonMatch[1] || jsonMatch[0]
    console.warn('[Gemini Document Extraction] Using unvalidated fallback parsing')

    await trackLLMOperationServer({
      pipelineName: `gemini-document-phase${sessionPhase ?? 0}`,
      model: GEMINI_TEXT_MODEL,
      inputTokens,
      outputTokens,
      latencyMs,
      success: true,
      metadata: { sessionPhase, mimeType, type: 'document', fallbackParsing: true },
    })

    return JSON.parse(jsonStr) as ExtractionResult
  }

  // Check for error or warning fields in response
  if (validationResult.data.error) {
    console.warn('[Gemini Document Extraction] LLM reported error:', validationResult.data.error)
  }
  if (validationResult.data.warnings?.length) {
    console.warn('[Gemini Document Extraction] LLM warnings:', validationResult.data.warnings)
  }

  await trackLLMOperationServer({
    pipelineName: `gemini-document-phase${sessionPhase ?? 0}`,
    model: GEMINI_TEXT_MODEL,
    inputTokens,
    outputTokens,
    latencyMs,
    success: true,
    metadata: { sessionPhase, mimeType, type: 'document' },
  })

  return validationResult.data as ExtractionResult
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE GENERATION - Gemini Imagen 4
// ═══════════════════════════════════════════════════════════════════════════════

// Re-use the same GoogleGenAI client initialized at the top of this file

/**
 * Generate an avatar for a Digital Employee using Gemini Imagen 4
 * Returns base64 encoded PNG image or null if generation fails
 */
export async function generateDEAvatar(
  deName: string,
  role: string,
  personality: string,
  brandTone: string
): Promise<string | null> {
  const startTime = Date.now()
  try {
    console.log(`[Gemini Imagen] Generating avatar for ${deName}...`)

    const prompt = `Create a professional, friendly avatar portrait for a digital AI assistant.

CHARACTER DETAILS:
- Name: ${deName}
- Role: ${role}
- Personality: ${personality}
- Brand Tone: ${brandTone}

STYLE REQUIREMENTS:
- Modern, clean digital illustration style (NOT photorealistic)
- Friendly, approachable, and trustworthy appearance
- Professional but warm expression with a gentle smile
- Soft, harmonious color palette
- Simple, clean background (subtle gradient or solid color)
- Head and shoulders portrait, centered composition
- High quality, polished look suitable for corporate documents

The avatar should feel like a friendly colleague - professional enough for business documents but warm and approachable. Think modern tech company mascot meets helpful customer service representative.

DO NOT include: text, logos, harsh colors, scary expressions, photorealistic human faces, complex backgrounds.`

    // Call Imagen 4 via the new GenAI SDK
    const response = await getGenAIClient().models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/png',
      },
    })

    const latencyMs = Date.now() - startTime

    // Extract base64 image data
    if (response.generatedImages && response.generatedImages.length > 0) {
      const imageData = response.generatedImages[0].image?.imageBytes
      if (imageData) {
        console.log(`[Gemini Imagen] Avatar generated successfully for ${deName}`)

        // Track successful avatar generation
        await trackLLMOperationServer({
          pipelineName: 'gemini-imagen-avatar',
          model: 'imagen-4.0-generate-001',
          inputTokens: 0, // Image generation doesn't use tokens
          outputTokens: 0,
          latencyMs,
          success: true,
          metadata: { deName, role },
        })

        return imageData
      }
    }

    console.warn('[Gemini Imagen] No images returned from API')

    // Track failed generation (no images returned)
    await trackLLMOperationServer({
      pipelineName: 'gemini-imagen-avatar',
      model: 'imagen-4.0-generate-001',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      success: false,
      errorMessage: 'No images returned from API',
      metadata: { deName, role },
    })

    return null
  } catch (error) {
    const latencyMs = Date.now() - startTime
    console.error('[Gemini Imagen] Error generating avatar:', error)

    // Track error
    await trackLLMOperationServer({
      pipelineName: 'gemini-imagen-avatar',
      model: 'imagen-4.0-generate-001',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: { deName, role },
    })

    // Return null to allow graceful degradation - document will work without avatar
    return null
  }
}

// Utility to get file mime type
export function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    wav: 'audio/wav',
    webm: 'audio/webm',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}
