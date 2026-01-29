import { randomUUID } from 'crypto'
import { ClassificationResult, GeneralExtractionResult, ExtractedEntity, PipelineError } from './types'
import { generateWithFallback, parseJSONFromResponse } from './ai-client'

/**
 * General extraction prompt - extracts ALL possible entities
 *
 * IMPORTANT: Entity types MUST match the ExtractedItemType enum in Prisma schema exactly.
 * This ensures extracted items map directly to database fields and profile UI.
 *
 * Valid types (from prisma/schema.prisma ExtractedItemType enum):
 * STAKEHOLDER, GOAL, KPI_TARGET, VOLUME_EXPECTATION, TIMELINE_CONSTRAINT, BUSINESS_CASE,
 * COST_PER_CASE, PEAK_PERIODS, HAPPY_PATH_STEP, EXCEPTION_CASE, BUSINESS_RULE, SCOPE_IN,
 * SCOPE_OUT, ESCALATION_TRIGGER, CASE_TYPE, DOCUMENT_TYPE, CHANNEL, CHANNEL_VOLUME,
 * CHANNEL_SLA, CHANNEL_RULE, SKILL_ANSWER, SKILL_ROUTE, SKILL_APPROVE_REJECT,
 * SKILL_REQUEST_INFO, SKILL_NOTIFY, SKILL_OTHER, KNOWLEDGE_SOURCE, BRAND_TONE,
 * COMMUNICATION_STYLE, RESPONSE_TEMPLATE, GUARDRAIL_NEVER, GUARDRAIL_ALWAYS,
 * FINANCIAL_LIMIT, LEGAL_RESTRICTION, COMPLIANCE_REQUIREMENT, SYSTEM_INTEGRATION,
 * DATA_FIELD, API_ENDPOINT, SECURITY_REQUIREMENT, ERROR_HANDLING, TECHNICAL_CONTACT,
 * OPEN_ITEM, DECISION, APPROVAL, RISK
 */
const GENERAL_EXTRACTION_PROMPT = `You are an AI assistant that extracts relevant entities from content for a Digital Employee (AI agent) onboarding system.

Extract information that is useful for designing and implementing an AI agent. Be thorough but AVOID DUPLICATES.

## CRITICAL RULES - READ FIRST

### NO DUPLICATES
- NEVER extract the same information twice, even if mentioned multiple times in the document
- If something is mentioned in different sections, extract it ONCE with the most complete information
- Before adding an entity, check if you've already extracted similar content
- Merge related information into single, comprehensive entities

### MAXIMUM COUNTS PER TYPE
- GOAL: Maximum 3 (consolidate into top 3 main goals)
- BUSINESS_CASE: Maximum 5 bullet points (consolidate pain points)
- KPI_TARGET: Maximum 5 (most important KPIs only)
- VOLUME_EXPECTATION: Maximum 2 (primary volume + peak)
- SKILL_*: Consolidate into distinct skills, maximum 10 total
- BRAND_TONE: Maximum 1 (summarize tone guidelines)
- COMMUNICATION_STYLE: Maximum 1 (summarize style)

### CONSOLIDATION RULES
- If you find 10 pain points, consolidate into 5 clear bullet points
- If you find 8 goals, consolidate into 3 main objectives
- Prefer quality over quantity - fewer, richer entities are better

## Entity Categories and Types

IMPORTANT: Use EXACTLY these type values - they map directly to the database schema.

### BUSINESS (profile: identity & businessContext)
- STAKEHOLDER: Person involved in the project (name, role, contact)
- GOAL: Business objective or target outcome (MAX 3 - consolidate if more)
- BUSINESS_CASE: Problem statement with bullet points for pain points (MAX 5 pain points, use bullet format: "• Pain point 1 • Pain point 2")
- KPI_TARGET: Key performance indicator WITH specific target value (e.g., "85% automation rate")
- VOLUME_EXPECTATION: Transaction/case volume numbers (one for normal, one for peak if different)
- COST_PER_CASE: Cost information (current, target, per-case)
- PEAK_PERIODS: High volume periods (seasonal, time-based)
- TIMELINE_CONSTRAINT: Deadline or timeline requirement

### PROCESS (profile: process)
- HAPPY_PATH_STEP: Step in the standard process flow (NOT decisions - see DECISION type)
- EXCEPTION_CASE: Non-standard scenario that requires different handling (include: trigger, action, escalation path)
- CASE_TYPE: Category of cases/requests with complexity and volume %
- ESCALATION_TRIGGER: Specific condition that MUST trigger human escalation (e.g., "Fraud indicators", "Amount > €5000")
- BUSINESS_RULE: Business logic or rule
- DOCUMENT_TYPE: Type of document handled

### SCOPE (profile: scope)
- SCOPE_IN: Specific, concrete things the DE WILL handle (not vague - be specific)
- SCOPE_OUT: Specific, concrete things the DE will NOT handle (not vague - be specific)

### CHANNELS (profile: channels)
- CHANNEL: Communication channel with volume % and SLA (consolidate into one entity per channel)
- CHANNEL_VOLUME: Only use if volume is mentioned separately from channel
- CHANNEL_SLA: Only use if SLA is mentioned separately from channel
- CHANNEL_RULE: Rules specific to a channel

### SKILLS (profile: skills)
- SKILL_ANSWER: Skill to answer questions from knowledge base
- SKILL_ROUTE: Skill to route/transfer to correct department
- SKILL_APPROVE_REJECT: Skill to approve or reject requests
- SKILL_REQUEST_INFO: Skill to request additional information
- SKILL_NOTIFY: Skill to send notifications
- SKILL_OTHER: Any other skill type (consolidate similar skills)
- KNOWLEDGE_SOURCE: Where information comes from (KB, FAQ, docs)
- RESPONSE_TEMPLATE: Standard response pattern

### COMMUNICATION (profile: skills.communicationStyle)
- BRAND_TONE: Communication style guidelines - consolidate into ONE comprehensive description
- COMMUNICATION_STYLE: Formality level and languages - consolidate into ONE entity

### GUARDRAILS (profile: guardrails)
- GUARDRAIL_NEVER: Things DE must NEVER do (critical restrictions, safety limits)
- GUARDRAIL_ALWAYS: Things DE must ALWAYS do (mandatory actions, required behaviors)
- FINANCIAL_LIMIT: Monetary restrictions with specific amounts (e.g., "Cannot approve > €5000")
- LEGAL_RESTRICTION: Legal/policy requirements
- COMPLIANCE_REQUIREMENT: Compliance/audit requirements

### INTEGRATIONS (profile: technical.integrations)
- SYSTEM_INTEGRATION: External system to connect to (consolidate duplicates)
- DATA_FIELD: Specific data field needed
- API_ENDPOINT: API endpoint or method
- SECURITY_REQUIREMENT: Security-related requirement
- ERROR_HANDLING: How errors should be handled
- TECHNICAL_CONTACT: Technical point of contact

### DECISIONS (profile: decisions)
- DECISION: Decision POINTS in the process flow (yes/no branches, conditions)
- OPEN_ITEM: Unresolved item needing follow-up
- APPROVAL: Sign-off or approval given
- RISK: Identified risk or concern

### TYPE CLARIFICATIONS
- HAPPY_PATH_STEP is an ACTION (e.g., "Agent picks up case", "Send email to customer")
- DECISION is a BRANCH/CONDITION (e.g., "Is case in correct queue?", "Amount > €5000?")
- ESCALATION_TRIGGER is a CONDITION that requires human intervention
- EXCEPTION_CASE is a full SCENARIO with trigger, action, and outcome

## Response Format

For EACH entity found, extract:
{
  "id": "unique-id",
  "category": "BUSINESS|PROCESS|SCOPE|CHANNELS|SKILLS|COMMUNICATION|GUARDRAILS|INTEGRATIONS|SECURITY|DECISIONS",
  "type": "SPECIFIC_TYPE",
  "content": "The extracted information",
  "confidence": 0.95,
  "sourceQuote": "Exact quote from the content",
  "sourceSpeaker": "Person who said it (if identifiable)",
  "sourceTimestamp": 123,
  "structuredData": {
    // Type-specific structured fields
  }
}

### Structured Data by Type (use these exact field names)

**STAKEHOLDER:**
{ "name": "John Smith", "role": "Product Owner", "email": "john@example.com", "isDecisionMaker": true }

**GOAL:** (Maximum 3 consolidated goals)
{ "description": "Transform customer service through AI automation", "impact": "1-2 FTE savings, faster response times", "priority": "high" }

**BUSINESS_CASE:** (Maximum 1 with consolidated pain points as bullets)
{ "problemStatement": "High volume of repetitive emails creating manual workload", "painPoints": ["• High email volume (5000+/month)", "• Manual queue management adds delays", "• Multiple handovers increase resolution time", "• Team under constant pressure", "• Inconsistent response quality"], "impact": "1-2 FTE cost, slow response times" }

**KPI_TARGET:**
{ "name": "Automation Rate", "targetValue": "85%", "currentValue": "45%", "unit": "%", "frequency": "weekly" }

**VOLUME_EXPECTATION:** (ALWAYS normalize to monthly)
{
  "originalValue": 500,
  "originalUnit": "cases/day",
  "monthlyVolume": 11000,
  "calculationNote": "500/day × 22 working days = 11,000/month",
  "peakMultiplier": 2.5
}
Conversion rules (use 22 working days/month, 4.33 weeks/month):
- daily → monthly: multiply by 22
- weekly → monthly: multiply by 4.33
- yearly → monthly: divide by 12
- monthly → monthly: use as-is

**COST_PER_CASE:** (Include total monthly cost if volume is known)
{
  "costPerCase": 12.50,
  "currency": "EUR",
  "totalMonthlyCost": 137500,
  "calculationNote": "€12.50 × 11,000 cases/month = €137,500/month"
}

**PEAK_PERIODS:**
{ "period": "Monday mornings", "volumeMultiplier": 2.0 }

**HAPPY_PATH_STEP:**
{ "order": 1, "title": "Receive Request", "description": "Customer submits claim via email", "isDecisionPoint": false }

**EXCEPTION_CASE:**
{ "trigger": "Missing documents", "action": "Request additional info", "escalateTo": "Team Lead" }

**CASE_TYPE:**
{ "name": "Standard Claim", "volumePercent": 70, "complexity": "LOW|MEDIUM|HIGH", "automatable": true }

**CHANNEL:**
{ "name": "Email", "type": "email|chat|phone|portal|api|other", "volumePercentage": 60, "sla": "24 hours" }

**SKILL_* (SKILL_ANSWER, SKILL_ROUTE, etc):**
{ "name": "Answer FAQ", "description": "Responds to common questions", "knowledgeSources": ["KB", "FAQ"], "rules": ["..."] }

**GUARDRAIL_NEVER:** (Things the DE must NEVER do)
{ "action": "Promise refunds without approval", "severity": "critical", "reason": "Financial liability" }

**GUARDRAIL_ALWAYS:** (Things the DE must ALWAYS do)
{ "action": "Verify customer identity before sharing account info", "severity": "critical", "reason": "Privacy/GDPR" }

**FINANCIAL_LIMIT:**
{ "type": "Max Approval", "amount": 5000, "currency": "EUR" }

**SYSTEM_INTEGRATION:**
{ "systemName": "Salesforce", "purpose": "CRM lookup", "accessType": "READ|WRITE|READ_WRITE", "dataFields": ["customerId", "caseId"], "apiAvailable": true }

**ESCALATION_TRIGGER:**
{ "condition": "Fraud indicators detected", "action": "Escalate to supervisor", "targetTeam": "Fraud Team", "slaMinutes": 30 }

**TECHNICAL_CONTACT:**
{ "name": "Jane Doe", "role": "API Engineer", "email": "jane@example.com", "system": "Salesforce" }

## Instructions

1. AVOID DUPLICATES: Before extracting, mentally review what you've already extracted. Do NOT repeat similar information.
2. CONSOLIDATE: If multiple items belong together, merge them into one rich entity (e.g., all pain points into one BUSINESS_CASE with bullets)
3. RESPECT LIMITS: Follow the maximum counts per type (3 goals, 5 pain points, 5 KPIs, etc.)
4. Use EXACTLY the type names listed above (e.g., KPI_TARGET not KPI, SCOPE_IN not IN_SCOPE)
5. NORMALIZE VOLUMES: Always calculate and include monthlyVolume for VOLUME_EXPECTATION:
   - "500 cases/day" → monthlyVolume: 11000 (500 × 22 working days)
   - "1000 cases/week" → monthlyVolume: 4330 (1000 × 4.33 weeks)
   - "60000 cases/year" → monthlyVolume: 5000 (60000 ÷ 12)
   - Include the calculation in calculationNote for transparency
5. Include exact quotes as evidence (keep quotes SHORT - max 50 chars)
6. Assign confidence based on how clearly the information was stated
7. Use structured data fields - they map directly to profile UI fields
8. Don't make up information - only extract what's actually present
9. QUALITY over QUANTITY: 30 well-structured entities is better than 100 duplicates
10. For BUSINESS_CASE: Use bullet format in content: "• Pain point 1 • Pain point 2 • Pain point 3"
11. For GUARDRAIL_NEVER/ALWAYS: Look for words like "never", "always", "must", "must not", "forbidden", "required"
12. For ESCALATION_TRIGGER: Look for conditions that transfer control to a human

IMPORTANT: Output COMPACT JSON (no pretty-printing, no extra whitespace).
IMPORTANT: The "type" field must be one of the EXACT types listed above.
IMPORTANT: NO DUPLICATES - each piece of information should appear exactly ONCE.

Respond with a single-line JSON object:
{"entities":[...],"summary":{"totalEntities":42,"byCategory":{"BUSINESS":8,"PROCESS":15}}}

Analyze the content now and extract entities (respecting the no-duplicate and maximum count rules).`

/**
 * Stage 2: Extract all entities
 *
 * Performs comprehensive extraction of ALL possible entities
 * from the content, creating a complete JSON representation
 * for the chat agent and Stage 3 processing.
 */
export async function extractGeneralEntities(
  fileBuffer: Buffer,
  mimeType: string,
  classification: ClassificationResult,
  onProgress?: (percent: number, entityCount: number) => void
): Promise<GeneralExtractionResult> {
  const startTime = Date.now()

  try {
    // Add classification context to help extraction
    const contextPrompt = `
Content type identified as: ${classification.type} (confidence: ${classification.confidence})
Key indicators found: ${classification.keyIndicators.join(', ')}

${GENERAL_EXTRACTION_PROMPT}`

    // Report start
    onProgress?.(10, 0)

    const result = await generateWithFallback({
      prompt: contextPrompt,
      fileBuffer,
      mimeType,
    })

    console.log(`[General Extraction] Using provider: ${result.provider}`)

    // Report LLM complete
    onProgress?.(70, 0)

    // Parse JSON from response
    const parsed = parseJSONFromResponse(result.text) as {
      entities: Array<Omit<ExtractedEntity, 'id'> & { id?: string }>
      summary?: {
        totalEntities: number
        byCategory: Record<string, number>
      }
    }

    // Ensure all entities have IDs
    const entities: ExtractedEntity[] = (parsed.entities || []).map(entity => ({
      ...entity,
      id: entity.id || randomUUID(),
      confidence: entity.confidence || 0.8,
    }))

    // Report entity count immediately after parsing
    onProgress?.(85, entities.length)

    // Calculate summary if not provided
    const byCategory: Record<string, number> = parsed.summary?.byCategory || {}
    if (!parsed.summary?.byCategory) {
      for (const entity of entities) {
        byCategory[entity.category] = (byCategory[entity.category] || 0) + 1
      }
    }

    const processingTime = Date.now() - startTime

    // Get token usage from response if available
    const tokensUsed = result.tokensUsed || { input: 0, output: 0 }

    // Report complete
    onProgress?.(100, entities.length)

    console.log(`[General Extraction] Completed in ${processingTime}ms: ${entities.length} entities`)

    return {
      entities,
      summary: {
        totalEntities: entities.length,
        byCategory,
        processingTime,
        tokensUsed,
      },
    }
  } catch (error) {
    if (error instanceof PipelineError) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Unknown extraction error'
    throw new PipelineError(
      `General extraction failed: ${message}`,
      'GENERAL_EXTRACTION',
      true
    )
  }
}

/**
 * Get entities of a specific category
 */
export function filterEntitiesByCategory(
  result: GeneralExtractionResult,
  category: string
): ExtractedEntity[] {
  return result.entities.filter(e => e.category === category)
}

/**
 * Get entities of a specific type
 */
export function filterEntitiesByType(
  result: GeneralExtractionResult,
  type: string
): ExtractedEntity[] {
  return result.entities.filter(e => e.type === type)
}
