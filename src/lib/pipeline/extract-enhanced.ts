/**
 * Enhanced Extraction Module
 *
 * Supports multiple extraction modes:
 * - auto: Analyzes document first, picks best strategy (recommended)
 * - standard: Original extraction with limits
 * - exhaustive: No limits, extract everything possible
 * - multi-model: Run Gemini and Claude in parallel, merge results
 * - two-pass: First pass + second pass for missed items
 * - section-based: 5 focused passes for maximum coverage
 */

import { randomUUID } from 'crypto'
import {
  ClassificationResult,
  GeneralExtractionResult,
  ExtractedEntity,
  PipelineError,
  ExtractionOptions,
  ExtractionMode,
  MultiModelResult,
  DEFAULT_EXTRACTION_OPTIONS,
} from './types'
import { generateWithFallback, parseJSONFromResponse, AIGenerateOptions } from './ai-client'

// ============================================
// EXHAUSTIVE PROMPT (no limits)
// ============================================

const EXHAUSTIVE_EXTRACTION_PROMPT = `You are an AI assistant that extracts ALL relevant entities from content for a Digital Employee (AI agent) onboarding system.

IMPORTANT: Extract EVERYTHING you find. Do NOT consolidate or limit. We want comprehensive coverage.

## Entity Categories and Types

Use EXACTLY these type values - they map directly to the database schema.

### BUSINESS
- STAKEHOLDER: Person involved (name, role, contact) - extract ALL people mentioned
- GOAL: Business objective - extract ALL goals mentioned
- BUSINESS_CASE: Problem statement, pain points - extract EACH pain point separately
- KPI_TARGET: Performance indicator - extract ALL KPIs
- VOLUME_EXPECTATION: Transaction/case volume numbers
- COST_PER_CASE: Cost information
- PEAK_PERIODS: High volume periods
- TIMELINE_CONSTRAINT: Deadline or timeline

### PROCESS
- HAPPY_PATH_STEP: Step in the standard process flow
- EXCEPTION_CASE: Non-standard scenario
- CASE_TYPE: Category of cases/requests
- ESCALATION_TRIGGER: Condition that triggers escalation
- BUSINESS_RULE: Business logic or rule
- DOCUMENT_TYPE: Type of document handled
- DECISION: Decision points/branches in process

### SCOPE
- SCOPE_IN: Things the DE WILL handle
- SCOPE_OUT: Things the DE will NOT handle

### CHANNELS
- CHANNEL: Communication channel
- CHANNEL_VOLUME: Volume per channel
- CHANNEL_SLA: SLA per channel
- CHANNEL_RULE: Channel-specific rules

### SKILLS
- SKILL_ANSWER: Answer questions from knowledge
- SKILL_ROUTE: Route/transfer to department
- SKILL_APPROVE_REJECT: Approve or reject requests
- SKILL_REQUEST_INFO: Request additional information
- SKILL_NOTIFY: Send notifications
- SKILL_OTHER: Any other skill type
- KNOWLEDGE_SOURCE: Information sources
- RESPONSE_TEMPLATE: Standard response patterns

### COMMUNICATION
- BRAND_TONE: Communication style
- COMMUNICATION_STYLE: Formality level, languages

### GUARDRAILS
- GUARDRAIL_NEVER: Things DE must NEVER do
- GUARDRAIL_ALWAYS: Things DE must ALWAYS do
- FINANCIAL_LIMIT: Monetary restrictions
- LEGAL_RESTRICTION: Legal requirements
- COMPLIANCE_REQUIREMENT: Compliance requirements

### INTEGRATIONS
- SYSTEM_INTEGRATION: External system
- DATA_FIELD: Specific data field
- API_ENDPOINT: API endpoint
- SECURITY_REQUIREMENT: Security requirement
- ERROR_HANDLING: Error handling approach
- TECHNICAL_CONTACT: Technical contact person

### DECISIONS
- OPEN_ITEM: Unresolved item
- APPROVAL: Sign-off or approval
- RISK: Identified risk

## Response Format

For EACH entity found:
{
  "id": "unique-id",
  "category": "BUSINESS|PROCESS|SCOPE|CHANNELS|SKILLS|COMMUNICATION|GUARDRAILS|INTEGRATIONS|DECISIONS",
  "type": "SPECIFIC_TYPE",
  "content": "The extracted information",
  "confidence": 0.95,
  "sourceQuote": "Exact quote (max 100 chars)",
  "sourceSpeaker": "Person who said it",
  "sourceTimestamp": 123,
  "structuredData": { ... }
}

## CRITICAL INSTRUCTIONS

1. Extract EVERYTHING - no limits on quantity
2. Each distinct piece of information = separate entity
3. If someone mentions 10 pain points, extract 10 BUSINESS_CASE items
4. If 5 people are mentioned, extract 5 STAKEHOLDER items
5. Prefer many specific items over few consolidated items
6. Keep sourceQuote short (max 100 chars) but extract ALL items
7. Assign confidence based on clarity (0.5-1.0)
8. Use structuredData for typed fields

Output COMPACT JSON:
{"entities":[...],"summary":{"totalEntities":N,"byCategory":{...}}}

Now extract EVERYTHING from the content.`

// ============================================
// SECOND PASS PROMPT (for missed items)
// ============================================

const SECOND_PASS_PROMPT = `You are reviewing a document that has already been partially extracted. Your job is to find ANYTHING that was missed.

## Already Extracted (DO NOT REPEAT THESE)
The following entities were already extracted:
{EXISTING_ENTITIES}

## Your Task
Find ANY information that was NOT captured in the list above. Look for:
- Stakeholders mentioned but not extracted
- Goals, KPIs, or metrics missed
- Process steps not captured
- Edge cases or exceptions overlooked
- Integrations or systems not mentioned
- Guardrails or rules skipped
- Any other relevant information

## Valid Entity Types
STAKEHOLDER, GOAL, KPI_TARGET, VOLUME_EXPECTATION, TIMELINE_CONSTRAINT, BUSINESS_CASE,
COST_PER_CASE, PEAK_PERIODS, HAPPY_PATH_STEP, EXCEPTION_CASE, BUSINESS_RULE, SCOPE_IN,
SCOPE_OUT, ESCALATION_TRIGGER, CASE_TYPE, DOCUMENT_TYPE, CHANNEL, CHANNEL_VOLUME,
CHANNEL_SLA, CHANNEL_RULE, SKILL_ANSWER, SKILL_ROUTE, SKILL_APPROVE_REJECT,
SKILL_REQUEST_INFO, SKILL_NOTIFY, SKILL_OTHER, KNOWLEDGE_SOURCE, BRAND_TONE,
COMMUNICATION_STYLE, RESPONSE_TEMPLATE, GUARDRAIL_NEVER, GUARDRAIL_ALWAYS,
FINANCIAL_LIMIT, LEGAL_RESTRICTION, COMPLIANCE_REQUIREMENT, SYSTEM_INTEGRATION,
DATA_FIELD, API_ENDPOINT, SECURITY_REQUIREMENT, ERROR_HANDLING, TECHNICAL_CONTACT,
OPEN_ITEM, DECISION, APPROVAL, RISK

## Response Format
Output ONLY the NEW entities found (not already extracted):
{"entities":[...],"summary":{"totalEntities":N,"byCategory":{...}}}

If nothing was missed, return: {"entities":[],"summary":{"totalEntities":0,"byCategory":{}}}`

// ============================================
// Standard prompt (imported behavior)
// ============================================

const STANDARD_EXTRACTION_PROMPT = `You are an AI assistant that extracts relevant entities from content for a Digital Employee (AI agent) onboarding system.

Extract information that is useful for designing and implementing an AI agent. Be thorough but AVOID DUPLICATES.

## CRITICAL RULES

### NO DUPLICATES
- NEVER extract the same information twice
- Merge related information into single entities

### MAXIMUM COUNTS PER TYPE
- GOAL: Maximum 3 (consolidate into top 3 main goals)
- BUSINESS_CASE: Maximum 5 bullet points
- KPI_TARGET: Maximum 5 (most important KPIs only)
- VOLUME_EXPECTATION: Maximum 2
- SKILL_*: Maximum 10 total
- BRAND_TONE: Maximum 1
- COMMUNICATION_STYLE: Maximum 1

## Entity Types

### BUSINESS
STAKEHOLDER, GOAL, BUSINESS_CASE, KPI_TARGET, VOLUME_EXPECTATION, COST_PER_CASE, PEAK_PERIODS, TIMELINE_CONSTRAINT

### PROCESS
HAPPY_PATH_STEP, EXCEPTION_CASE, CASE_TYPE, ESCALATION_TRIGGER, BUSINESS_RULE, DOCUMENT_TYPE, DECISION

### SCOPE
SCOPE_IN, SCOPE_OUT

### CHANNELS
CHANNEL, CHANNEL_VOLUME, CHANNEL_SLA, CHANNEL_RULE

### SKILLS
SKILL_ANSWER, SKILL_ROUTE, SKILL_APPROVE_REJECT, SKILL_REQUEST_INFO, SKILL_NOTIFY, SKILL_OTHER, KNOWLEDGE_SOURCE, RESPONSE_TEMPLATE

### COMMUNICATION
BRAND_TONE, COMMUNICATION_STYLE

### GUARDRAILS
GUARDRAIL_NEVER, GUARDRAIL_ALWAYS, FINANCIAL_LIMIT, LEGAL_RESTRICTION, COMPLIANCE_REQUIREMENT

### INTEGRATIONS
SYSTEM_INTEGRATION, DATA_FIELD, API_ENDPOINT, SECURITY_REQUIREMENT, ERROR_HANDLING, TECHNICAL_CONTACT

### DECISIONS
OPEN_ITEM, APPROVAL, RISK

## Response Format
{"entities":[{"id":"","category":"","type":"","content":"","confidence":0.9,"sourceQuote":"","structuredData":{}}],"summary":{"totalEntities":N,"byCategory":{}}}`

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

/**
 * Run extraction with specified prompt
 */
async function runExtraction(
  prompt: string,
  fileBuffer: Buffer,
  mimeType: string,
  classification: ClassificationResult,
  forceProvider?: 'gemini' | 'claude'
): Promise<GeneralExtractionResult> {
  const startTime = Date.now()

  const contextPrompt = `
Content type identified as: ${classification.type} (confidence: ${classification.confidence})
Key indicators found: ${classification.keyIndicators.join(', ')}

${prompt}`

  const options: AIGenerateOptions = {
    prompt: contextPrompt,
    fileBuffer,
    mimeType,
    maxTokens: 32768, // Allow larger responses for exhaustive mode
  }

  const result = await generateWithFallback(options)

  console.log(`[Enhanced Extraction] Using provider: ${result.provider}`)

  const parsed = parseJSONFromResponse(result.text) as {
    entities: Array<Omit<ExtractedEntity, 'id'> & { id?: string }>
    summary?: {
      totalEntities: number
      byCategory: Record<string, number>
    }
  }

  const entities: ExtractedEntity[] = (parsed.entities || []).map(entity => ({
    ...entity,
    id: entity.id || randomUUID(),
    confidence: entity.confidence || 0.8,
  }))

  const byCategory: Record<string, number> = parsed.summary?.byCategory || {}
  if (!parsed.summary?.byCategory) {
    for (const entity of entities) {
      byCategory[entity.category] = (byCategory[entity.category] || 0) + 1
    }
  }

  const processingTime = Date.now() - startTime
  const tokensUsed = result.tokensUsed || { input: 0, output: 0 }

  console.log(`[Enhanced Extraction] Completed in ${processingTime}ms: ${entities.length} entities`)

  return {
    entities,
    summary: {
      totalEntities: entities.length,
      byCategory,
      processingTime,
      tokensUsed,
    },
  }
}

/**
 * Run extraction with both Gemini and Claude, merge results
 */
async function runMultiModelExtraction(
  fileBuffer: Buffer,
  mimeType: string,
  classification: ClassificationResult,
  onProgress?: (percent: number, entityCount: number) => void
): Promise<MultiModelResult> {
  console.log('[Multi-Model] Starting parallel extraction with Gemini and Claude')
  onProgress?.(10, 0)

  // Run both extractions in parallel
  const [geminiResult, claudeResult] = await Promise.all([
    runExtraction(EXHAUSTIVE_EXTRACTION_PROMPT, fileBuffer, mimeType, classification).catch(err => {
      console.error('[Multi-Model] Gemini extraction failed:', err)
      return null
    }),
    runExtractionWithClaude(EXHAUSTIVE_EXTRACTION_PROMPT, fileBuffer, mimeType, classification).catch(err => {
      console.error('[Multi-Model] Claude extraction failed:', err)
      return null
    }),
  ])

  onProgress?.(70, (geminiResult?.entities.length || 0) + (claudeResult?.entities.length || 0))

  // Merge results
  const comparison = compareExtractions(
    geminiResult?.entities || [],
    claudeResult?.entities || []
  )

  // Create merged result with deduplicated entities
  const mergedEntities = [
    ...comparison.both,
    ...comparison.onlyGemini,
    ...comparison.onlyClaude,
  ]

  const byCategory: Record<string, number> = {}
  for (const entity of mergedEntities) {
    byCategory[entity.category] = (byCategory[entity.category] || 0) + 1
  }

  const merged: GeneralExtractionResult = {
    entities: mergedEntities,
    summary: {
      totalEntities: mergedEntities.length,
      byCategory,
      processingTime: (geminiResult?.summary.processingTime || 0) + (claudeResult?.summary.processingTime || 0),
      tokensUsed: {
        input: (geminiResult?.summary.tokensUsed.input || 0) + (claudeResult?.summary.tokensUsed.input || 0),
        output: (geminiResult?.summary.tokensUsed.output || 0) + (claudeResult?.summary.tokensUsed.output || 0),
      },
    },
  }

  onProgress?.(100, mergedEntities.length)

  console.log(`[Multi-Model] Merged: ${mergedEntities.length} entities (Gemini: ${comparison.onlyGemini.length} unique, Claude: ${comparison.onlyClaude.length} unique, Both: ${comparison.both.length})`)

  return {
    gemini: geminiResult || undefined,
    claude: claudeResult || undefined,
    merged,
    comparison,
  }
}

/**
 * Force extraction with Claude specifically
 */
async function runExtractionWithClaude(
  prompt: string,
  fileBuffer: Buffer,
  mimeType: string,
  classification: ClassificationResult
): Promise<GeneralExtractionResult> {
  const startTime = Date.now()

  // Import Anthropic directly for forced Claude extraction
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

  const contextPrompt = `
Content type identified as: ${classification.type} (confidence: ${classification.confidence})
Key indicators found: ${classification.keyIndicators.join(', ')}

${prompt}`

  // For PDF, we need to extract text first (Claude doesn't handle raw PDFs well in messages)
  let content: string
  if (mimeType === 'application/pdf') {
    const { extractText } = await import('unpdf')
    const result = await extractText(new Uint8Array(fileBuffer))
    const text = Array.isArray(result.text) ? result.text.join('\n\n') : result.text
    content = `PDF DOCUMENT CONTENT:\n${text}\n\n---\n\n${contextPrompt}`
  } else {
    content = `DOCUMENT CONTENT:\n${fileBuffer.toString('utf-8')}\n\n---\n\n${contextPrompt}`
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 32768,
    messages: [{ role: 'user', content }],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  const text = textContent?.type === 'text' ? textContent.text : ''

  const parsed = parseJSONFromResponse(text) as {
    entities: Array<Omit<ExtractedEntity, 'id'> & { id?: string }>
    summary?: { totalEntities: number; byCategory: Record<string, number> }
  }

  const entities: ExtractedEntity[] = (parsed.entities || []).map(entity => ({
    ...entity,
    id: entity.id || randomUUID(),
    confidence: entity.confidence || 0.8,
  }))

  const byCategory: Record<string, number> = {}
  for (const entity of entities) {
    byCategory[entity.category] = (byCategory[entity.category] || 0) + 1
  }

  const processingTime = Date.now() - startTime

  return {
    entities,
    summary: {
      totalEntities: entities.length,
      byCategory,
      processingTime,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    },
  }
}

/**
 * Compare extractions from two models
 */
function compareExtractions(
  geminiEntities: ExtractedEntity[],
  claudeEntities: ExtractedEntity[]
): { onlyGemini: ExtractedEntity[]; onlyClaude: ExtractedEntity[]; both: ExtractedEntity[] } {
  const onlyGemini: ExtractedEntity[] = []
  const onlyClaude: ExtractedEntity[] = []
  const both: ExtractedEntity[] = []

  // Simple similarity check based on type and content
  const isSimilar = (a: ExtractedEntity, b: ExtractedEntity): boolean => {
    if (a.type !== b.type) return false
    // Check content similarity (simple substring match)
    const aContent = a.content.toLowerCase()
    const bContent = b.content.toLowerCase()
    return (
      aContent.includes(bContent.slice(0, 50)) ||
      bContent.includes(aContent.slice(0, 50)) ||
      aContent === bContent
    )
  }

  const claudeMatched = new Set<number>()

  for (const gEntity of geminiEntities) {
    let found = false
    for (let i = 0; i < claudeEntities.length; i++) {
      if (!claudeMatched.has(i) && isSimilar(gEntity, claudeEntities[i])) {
        // Merge: prefer higher confidence, combine quotes
        const merged = {
          ...gEntity,
          confidence: Math.max(gEntity.confidence, claudeEntities[i].confidence),
          sourceQuote: gEntity.sourceQuote || claudeEntities[i].sourceQuote,
        }
        both.push(merged)
        claudeMatched.add(i)
        found = true
        break
      }
    }
    if (!found) {
      onlyGemini.push(gEntity)
    }
  }

  for (let i = 0; i < claudeEntities.length; i++) {
    if (!claudeMatched.has(i)) {
      onlyClaude.push(claudeEntities[i])
    }
  }

  return { onlyGemini, onlyClaude, both }
}

/**
 * Run two-pass extraction
 */
async function runTwoPassExtraction(
  fileBuffer: Buffer,
  mimeType: string,
  classification: ClassificationResult,
  onProgress?: (percent: number, entityCount: number) => void
): Promise<GeneralExtractionResult> {
  console.log('[Two-Pass] Starting first pass extraction')
  onProgress?.(10, 0)

  // First pass: exhaustive extraction
  const firstPass = await runExtraction(
    EXHAUSTIVE_EXTRACTION_PROMPT,
    fileBuffer,
    mimeType,
    classification
  )

  onProgress?.(50, firstPass.entities.length)
  console.log(`[Two-Pass] First pass: ${firstPass.entities.length} entities`)

  // Second pass: look for missed items
  const existingEntitiesSummary = firstPass.entities
    .map(e => `- ${e.type}: ${e.content.slice(0, 100)}`)
    .join('\n')

  const secondPassPrompt = SECOND_PASS_PROMPT.replace('{EXISTING_ENTITIES}', existingEntitiesSummary)

  console.log('[Two-Pass] Starting second pass for missed items')

  const secondPass = await runExtraction(
    secondPassPrompt,
    fileBuffer,
    mimeType,
    classification
  )

  onProgress?.(90, firstPass.entities.length + secondPass.entities.length)
  console.log(`[Two-Pass] Second pass: ${secondPass.entities.length} additional entities`)

  // Merge results
  const allEntities = [...firstPass.entities, ...secondPass.entities]

  const byCategory: Record<string, number> = {}
  for (const entity of allEntities) {
    byCategory[entity.category] = (byCategory[entity.category] || 0) + 1
  }

  onProgress?.(100, allEntities.length)
  console.log(`[Two-Pass] Total: ${allEntities.length} entities`)

  return {
    entities: allEntities,
    summary: {
      totalEntities: allEntities.length,
      byCategory,
      processingTime: firstPass.summary.processingTime + secondPass.summary.processingTime,
      tokensUsed: {
        input: firstPass.summary.tokensUsed.input + secondPass.summary.tokensUsed.input,
        output: firstPass.summary.tokensUsed.output + secondPass.summary.tokensUsed.output,
      },
    },
  }
}

// ============================================
// SECTION-BASED PROMPTS (focused extraction per category)
// ============================================

const SECTION_PROMPTS = {
  business: `Extract ALL business-related information. Focus ONLY on these types:

STAKEHOLDER - Extract EVERY person mentioned (name, role, email, company)
GOAL - Extract EVERY goal, objective, or target outcome mentioned
BUSINESS_CASE - Extract problem statements, pain points (each as separate item)
KPI_TARGET - Extract EVERY KPI, metric, or success measure with targets
VOLUME_EXPECTATION - Extract ALL volume numbers (emails/month, cases/day, etc.)
COST_PER_CASE - Extract cost information
PEAK_PERIODS - Extract high volume periods
TIMELINE_CONSTRAINT - Extract deadlines, phases, milestones

Be exhaustive. If 10 KPIs are mentioned, extract 10 entities.
Output format: {"entities":[{"id":"","category":"BUSINESS","type":"TYPE","content":"","confidence":0.9,"sourceQuote":""}]}`,

  process: `Extract ALL process-related information. Focus ONLY on these types:

HAPPY_PATH_STEP - Extract EVERY step in process flows (As-Is AND To-Be). Include step number, description, owner, status
EXCEPTION_CASE - Extract EVERY exception, edge case, or special scenario
DECISION - Extract EVERY decision point or branch (yes/no questions in flows)
ESCALATION_TRIGGER - Extract conditions that trigger escalation to human
BUSINESS_RULE - Extract business rules and logic
CASE_TYPE - Extract types/categories of cases handled
DOCUMENT_TYPE - Extract document types mentioned

IMPORTANT: Process tables often have 10-20 steps. Extract EACH row as a separate HAPPY_PATH_STEP.
Output format: {"entities":[{"id":"","category":"PROCESS","type":"TYPE","content":"","confidence":0.9,"sourceQuote":""}]}`,

  scope: `Extract ALL scope-related information. Focus ONLY on these types:

SCOPE_IN - Extract EVERYTHING that IS in scope (features, capabilities, phases)
SCOPE_OUT - Extract EVERYTHING that is NOT in scope (explicit exclusions)
GUARDRAIL_NEVER - Extract things the system must NEVER do
GUARDRAIL_ALWAYS - Extract things the system must ALWAYS do
FINANCIAL_LIMIT - Extract monetary limits or thresholds
LEGAL_RESTRICTION - Extract legal/policy restrictions
COMPLIANCE_REQUIREMENT - Extract compliance requirements

Look for sections titled "In Scope", "Out of Scope", "Exclusions", "Limitations", "Must/Must Not".
Output format: {"entities":[{"id":"","category":"SCOPE","type":"TYPE","content":"","confidence":0.9,"sourceQuote":""}]}`,

  technical: `Extract ALL technical/integration information. Focus ONLY on these types:

SYSTEM_INTEGRATION - Extract EVERY system mentioned (Salesforce, APIs, databases, etc.)
DATA_FIELD - Extract specific data fields, attributes, or properties
API_ENDPOINT - Extract API endpoints, methods, webhooks
SECURITY_REQUIREMENT - Extract security requirements (auth, encryption)
TECHNICAL_CONTACT - Extract technical contacts/owners
ERROR_HANDLING - Extract error handling approaches
CHANNEL - Extract communication channels (email, web, chat)
CHANNEL_RULE - Extract channel-specific rules

Look for technical specs, integration diagrams, API documentation, system names.
Output format: {"entities":[{"id":"","category":"INTEGRATIONS","type":"TYPE","content":"","confidence":0.9,"sourceQuote":""}]}`,

  features: `Extract ALL features and requirements. Focus ONLY on these types:

SKILL_ANSWER - Extract question-answering capabilities
SKILL_ROUTE - Extract routing/transfer capabilities
SKILL_APPROVE_REJECT - Extract approval capabilities
SKILL_REQUEST_INFO - Extract info-gathering capabilities
SKILL_NOTIFY - Extract notification capabilities
SKILL_OTHER - Extract other capabilities/features
KNOWLEDGE_SOURCE - Extract knowledge bases, FAQs, documentation sources
RESPONSE_TEMPLATE - Extract response templates or patterns
BRAND_TONE - Extract tone of voice guidelines
COMMUNICATION_STYLE - Extract communication style requirements

Look for feature tables, capability lists, requirements sections.
Output format: {"entities":[{"id":"","category":"SKILLS","type":"TYPE","content":"","confidence":0.9,"sourceQuote":""}]}`,
}

// ============================================
// DOCUMENT ANALYSIS PROMPT (for Auto mode)
// ============================================

const DOCUMENT_ANALYSIS_PROMPT = `Analyze this document to determine the best extraction strategy.

Evaluate the following characteristics:

1. **Document Type**: What kind of document is this?
   - design_doc: Formal design document with sections, tables, structured data
   - transcript: Meeting transcript, interview, or conversation
   - notes: Meeting notes, bullet points, informal
   - technical_spec: Technical specification, API docs, integration specs
   - mixed: Combination of multiple types

2. **Complexity**: How complex is the content?
   - simple: Straightforward, linear content, few topics
   - moderate: Multiple topics, some structure
   - complex: Many interconnected topics, tables, detailed specifications

3. **Structure Level**: How structured is the document?
   - highly_structured: Clear sections, tables, headers, numbered lists
   - moderately_structured: Some sections and organization
   - unstructured: Free-form text, conversation

4. **Content Density**: How much extractable information?
   - low: Few entities, sparse information
   - medium: Moderate amount of information
   - high: Dense with entities, many details, comprehensive

5. **Has Tables**: Does the document contain data tables?
   - true/false

6. **Estimated Entity Count**: Rough estimate of extractable entities
   - low: < 20 entities
   - medium: 20-50 entities
   - high: > 50 entities

Based on your analysis, recommend the best extraction strategy:
- "standard": For simple documents with < 20 entities
- "exhaustive": For transcripts or unstructured docs with medium density
- "two-pass": For moderate complexity docs where some items might be missed
- "section-based": For complex, highly structured docs with tables and high density
- "multi-model": For critical docs where accuracy is paramount

Output JSON:
{
  "documentType": "design_doc|transcript|notes|technical_spec|mixed",
  "complexity": "simple|moderate|complex",
  "structureLevel": "highly_structured|moderately_structured|unstructured",
  "contentDensity": "low|medium|high",
  "hasTables": true|false,
  "estimatedEntityCount": "low|medium|high",
  "recommendedStrategy": "standard|exhaustive|two-pass|section-based|multi-model",
  "reasoning": "Brief explanation of why this strategy is best"
}`

interface DocumentAnalysis {
  documentType: 'design_doc' | 'transcript' | 'notes' | 'technical_spec' | 'mixed'
  complexity: 'simple' | 'moderate' | 'complex'
  structureLevel: 'highly_structured' | 'moderately_structured' | 'unstructured'
  contentDensity: 'low' | 'medium' | 'high'
  hasTables: boolean
  estimatedEntityCount: 'low' | 'medium' | 'high'
  recommendedStrategy: ExtractionMode
  reasoning: string
}

/**
 * Analyze document to determine best extraction strategy
 */
async function analyzeDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<DocumentAnalysis> {
  console.log('[Auto Mode] Analyzing document to determine best extraction strategy')

  const options: AIGenerateOptions = {
    prompt: DOCUMENT_ANALYSIS_PROMPT,
    fileBuffer,
    mimeType,
    maxTokens: 2048,
  }

  const result = await generateWithFallback(options)
  const analysis = parseJSONFromResponse(result.text) as DocumentAnalysis

  console.log(`[Auto Mode] Document analysis:`, {
    type: analysis.documentType,
    complexity: analysis.complexity,
    structure: analysis.structureLevel,
    density: analysis.contentDensity,
    tables: analysis.hasTables,
    recommended: analysis.recommendedStrategy,
    reasoning: analysis.reasoning,
  })

  return analysis
}

/**
 * Run section-based extraction (multiple focused passes)
 */
async function runSectionBasedExtraction(
  fileBuffer: Buffer,
  mimeType: string,
  classification: ClassificationResult,
  onProgress?: (percent: number, entityCount: number) => void
): Promise<GeneralExtractionResult> {
  console.log('[Section-Based] Starting multi-section extraction')

  const sections = Object.entries(SECTION_PROMPTS)
  const allEntities: ExtractedEntity[] = []
  let totalProcessingTime = 0
  let totalTokensInput = 0
  let totalTokensOutput = 0

  for (let i = 0; i < sections.length; i++) {
    const [sectionName, prompt] = sections[i]
    const progressPercent = Math.round((i / sections.length) * 100)
    onProgress?.(progressPercent, allEntities.length)

    console.log(`[Section-Based] Extracting ${sectionName} (${i + 1}/${sections.length})`)

    try {
      const result = await runExtraction(
        prompt,
        fileBuffer,
        mimeType,
        classification
      )

      console.log(`[Section-Based] ${sectionName}: ${result.entities.length} entities`)
      allEntities.push(...result.entities)
      totalProcessingTime += result.summary.processingTime
      totalTokensInput += result.summary.tokensUsed.input
      totalTokensOutput += result.summary.tokensUsed.output
    } catch (error) {
      console.error(`[Section-Based] ${sectionName} extraction failed:`, error)
      // Continue with other sections even if one fails
    }
  }

  onProgress?.(100, allEntities.length)

  // Deduplicate entities by content similarity
  const deduped = deduplicateEntities(allEntities)
  console.log(`[Section-Based] Total: ${allEntities.length} entities, ${deduped.length} after dedup`)

  const byCategory: Record<string, number> = {}
  for (const entity of deduped) {
    byCategory[entity.category] = (byCategory[entity.category] || 0) + 1
  }

  return {
    entities: deduped,
    summary: {
      totalEntities: deduped.length,
      byCategory,
      processingTime: totalProcessingTime,
      tokensUsed: {
        input: totalTokensInput,
        output: totalTokensOutput,
      },
    },
  }
}

/**
 * Deduplicate entities by content similarity
 */
function deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  const seen = new Map<string, ExtractedEntity>()

  for (const entity of entities) {
    // Create a key based on type and content prefix
    const contentKey = entity.content.toLowerCase().slice(0, 100).trim()
    const key = `${entity.type}:${contentKey}`

    if (!seen.has(key)) {
      seen.set(key, entity)
    } else {
      // If duplicate, keep the one with higher confidence
      const existing = seen.get(key)!
      if (entity.confidence > existing.confidence) {
        seen.set(key, entity)
      }
    }
  }

  return Array.from(seen.values())
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Enhanced extraction with multiple modes
 */
export async function extractWithOptions(
  fileBuffer: Buffer,
  mimeType: string,
  classification: ClassificationResult,
  options: ExtractionOptions = DEFAULT_EXTRACTION_OPTIONS,
  onProgress?: (percent: number, entityCount: number) => void
): Promise<GeneralExtractionResult | MultiModelResult> {
  console.log(`[Enhanced Extraction] Mode: ${options.mode}`)

  try {
    // Handle Auto mode - analyze document first
    let effectiveMode: ExtractionMode = options.mode
    if (options.mode === 'auto') {
      onProgress?.(5, 0)
      const analysis = await analyzeDocument(fileBuffer, mimeType)
      effectiveMode = analysis.recommendedStrategy === 'auto' ? 'section-based' : analysis.recommendedStrategy
      console.log(`[Auto Mode] Selected strategy: ${effectiveMode} (reason: ${analysis.reasoning})`)
      onProgress?.(10, 0)
    }

    switch (effectiveMode) {
      case 'exhaustive':
        return await runExtraction(
          EXHAUSTIVE_EXTRACTION_PROMPT,
          fileBuffer,
          mimeType,
          classification
        )

      case 'multi-model':
        return await runMultiModelExtraction(
          fileBuffer,
          mimeType,
          classification,
          onProgress
        )

      case 'two-pass':
        return await runTwoPassExtraction(
          fileBuffer,
          mimeType,
          classification,
          onProgress
        )

      case 'section-based':
        return await runSectionBasedExtraction(
          fileBuffer,
          mimeType,
          classification,
          onProgress
        )

      case 'standard':
      default:
        return await runExtraction(
          STANDARD_EXTRACTION_PROMPT,
          fileBuffer,
          mimeType,
          classification
        )
    }
  } catch (error) {
    if (error instanceof PipelineError) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Unknown extraction error'
    throw new PipelineError(
      `Enhanced extraction failed: ${message}`,
      'GENERAL_EXTRACTION',
      true
    )
  }
}

/**
 * Check if result is a multi-model result
 */
export function isMultiModelResult(result: GeneralExtractionResult | MultiModelResult): result is MultiModelResult {
  return 'comparison' in result && 'merged' in result
}
