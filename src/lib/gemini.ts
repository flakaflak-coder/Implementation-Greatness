import { GoogleGenerativeAI, Part } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Use Gemini 3 Pro Preview for multimodal processing (audio/video/documents)
// Alternatives: 'gemini-2.5-pro' for stable, 'gemini-3-flash-preview' for faster
const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' })

export interface ExtractionResult {
  transcript: string

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

Include exact quotes and timestamps. Only include clearly discussed items.`

const PROCESS_DESIGN_PROMPT = `You are an AI assistant extracting information from a Design Week PROCESS DESIGN session for Digital Employee onboarding.

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

Include exact quotes and timestamps.`

const SKILLS_GUARDRAILS_PROMPT = `You are an AI assistant extracting information from a Design Week PROCESS DESIGN session (phase 2) for Digital Employee onboarding.

Focus on extracting: **Skills, Brand Tone, Guardrails**

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
  "skills": [{name, type, description, knowledgeSource, phase, quote}],
  "brandTone": {tone, formality, language, empathyLevel, quote},
  "guardrails": {
    never: [{item, reason, quote}],
    always: [{item, reason, quote}],
    financialLimits: "...",
    legalRestrictions: "..."
  }
}

Include exact quotes and timestamps.`

const TECHNICAL_PROMPT = `You are an AI assistant extracting information from a Design Week TECHNICAL session for Digital Employee onboarding.

Focus on extracting: **Integrations, Systems, Data Fields**

Extract the following:

1. **System Integrations**
   - What systems does this process touch? (list all)
   - Purpose of each system
   - Access type: READ, WRITE, or READ_WRITE
   - Specific data fields needed (field names)
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
}

Include exact quotes and timestamps.`

const SIGNOFF_PROMPT = `You are an AI assistant extracting information from a Design Week SIGN-OFF session for Digital Employee onboarding.

Focus on extracting: **Open Items, Decisions, Approvals, Risks**

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
  "openItems": [{item, owner, quote}],
  "decisions": [{decision, approvedBy, quote}],
  "risks": [{risk, mitigation, quote}],
  "approvals": [{stakeholder, status, conditions, quote}]
}

Include exact quotes and timestamps.`

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
      return LEGACY_EXTRACTION_PROMPT
  }
}

export async function processRecording(
  audioBuffer: Buffer,
  mimeType: string,
  sessionPhase?: number
): Promise<ExtractionResult> {
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

  const response = result.response
  const text = response.text()

  // Parse JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse extraction result')
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0]
  return JSON.parse(jsonStr) as ExtractionResult
}

export async function processDocument(
  fileBuffer: Buffer,
  mimeType: string,
  sessionPhase?: number
): Promise<ExtractionResult> {
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

  const response = result.response
  const text = response.text()

  const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse extraction result')
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0]
  return JSON.parse(jsonStr) as ExtractionResult
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
