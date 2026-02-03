import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import {
  buildSafePrompt,
  extractAndValidateJson,
  GeminiExtractionSchema,
  CONFIDENCE_SCORING_GUIDE,
  PII_HANDLING_GUIDE,
  ERROR_RECOVERY_GUIDE,
} from './prompt-utils'
import { trackLLMOperationServer } from './observatory/tracking'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Use Gemini 3 Pro Preview for multimodal processing (audio/video/documents)
// Alternatives: 'gemini-2.5-pro' for stable, 'gemini-3-flash-preview' for faster
const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' })

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
  "kpis": [{"name": "KPI name", "targetValue": "target", "unit": "optional unit", "measurementMethod": "how measured", "quote": "exact quote"}],
  "stakeholders": [{"name": "Full Name", "role": "Their Role", "email": "work@company.com (optional)", "isDecisionMaker": true/false, "quote": "exact quote"}]
}

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
  "caseTypes": [{"type": "case type name", "volumePercent": 25, "complexity": "LOW|MEDIUM|HIGH", "automatable": true, "quote": "exact quote"}],
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
  "integrations": [{"systemName": "System Name", "purpose": "what it's used for", "accessType": "READ|WRITE|READ_WRITE", "dataFields": ["field1", "field2"], "technicalContact": "Name (optional)", "apiAvailable": true, "quote": "exact quote"}],
  "securityRequirements": [{"requirement": "what's required", "type": "category", "quote": "exact quote"}]
}

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
  "approvals": [{"stakeholder": "who signed off", "status": "approved/pending", "conditions": "any conditions", "quote": "exact quote"}]
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

// Map session phase to appropriate prompt
function getPromptForSessionType(sessionPhase?: number): string {
  switch (sessionPhase) {
    case 1: // Kickoff
      return KICKOFF_PROMPT
    case 2: // Process Design 1
      return PROCESS_DESIGN_PROMPT
    case 3: // Process Design 2 (Skills & Guardrails)
      return SKILLS_GUARDRAILS_PROMPT
    case 4: // Technical
    case 5: // Technical continued
      return TECHNICAL_PROMPT
    case 6: // Sign-off
      return SIGNOFF_PROMPT
    default:
      // Log warning for unexpected session phase - using legacy prompt as fallback
      console.warn(
        `[Gemini Extraction] Unexpected session phase: ${sessionPhase}. ` +
          `Expected 1-6. Using legacy extraction prompt as fallback. ` +
          `This may produce inconsistent results.`
      )
      return LEGACY_EXTRACTION_PROMPT
  }
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

  // Use session-type-specific prompt
  const prompt = getPromptForSessionType(sessionPhase)

  const result = await model.generateContent([
    prompt,
    audioPart,
  ])

  const latencyMs = Date.now() - startTime
  const response = result.response
  const text = response.text()

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
        model: 'gemini-3-pro-preview',
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
      model: 'gemini-3-pro-preview',
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
    model: 'gemini-3-pro-preview',
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

  // Use session-type-specific prompt, adapted for documents
  const prompt = getPromptForSessionType(sessionPhase)
    .replace(/recording/g, 'document')
    .replace(/timestamp/g, 'page/paragraph')

  const result = await model.generateContent([
    prompt,
    docPart,
  ])

  const latencyMs = Date.now() - startTime
  const response = result.response
  const text = response.text()

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
        model: 'gemini-3-pro-preview',
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
      model: 'gemini-3-pro-preview',
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
    model: 'gemini-3-pro-preview',
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

import { GoogleGenAI } from '@google/genai'

// Initialize the new GenAI client for Imagen
const genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

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
    const response = await genAIClient.models.generateImages({
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
