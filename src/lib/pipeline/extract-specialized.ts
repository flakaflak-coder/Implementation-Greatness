import { ContentClassification } from '@prisma/client'
import {
  GeneralExtractionResult,
  SpecializedExtractionResult,
  SpecializedItem,
  ChecklistResult,
  PipelineError,
} from './types'
import { getChecklistForType } from './classify'
import { generateWithFallback, parseJSONFromResponse } from './ai-client'

/**
 * Type-specific prompts for specialized extraction
 */
const SPECIALIZED_PROMPTS: Record<ContentClassification, string> = {
  KICKOFF_SESSION: `You are reviewing extraction results from a KICKOFF session. Focus on:

1. **Business Context Quality**
   - Is the problem clearly defined?
   - Are costs (current and target) specified?
   - Is the volume quantified?

2. **Success Metrics**
   - Are KPIs concrete and measurable?
   - Are automation rate targets set?
   - Are accuracy targets defined?

3. **Stakeholder Clarity**
   - Are decision-makers identified?
   - Are technical contacts listed?
   - Is the DE name/role proposed?

Review the extracted entities and:
- Flag items needing clarification
- Identify missing critical information
- Enhance items with additional structure`,

  PROCESS_DESIGN_SESSION: `You are reviewing extraction results from a PROCESS DESIGN session. Focus on:

1. **Happy Path Completeness**
   - Are all steps in sequence?
   - Is each step actionable?
   - Are decision points marked?

2. **Exception Coverage**
   - Are major exceptions identified?
   - Are escalation triggers clear?
   - Is exception rate estimated?

3. **Scope Clarity**
   - Are IN/OUT scope items clearly bounded?
   - Are AMBIGUOUS items flagged?
   - Are conditions for scope specified?

Review the extracted entities and:
- Ensure process steps are numbered correctly
- Flag incomplete exception handling
- Identify scope gaps`,

  SKILLS_GUARDRAILS_SESSION: `You are reviewing extraction results from a SKILLS & GUARDRAILS session. Focus on:

1. **Skills Completeness**
   - Is each skill clearly defined?
   - Are skill types properly categorized?
   - Are knowledge sources identified?

2. **Guardrails Thoroughness**
   - Are NEVER items clear and justified?
   - Are ALWAYS items practical?
   - Are financial limits specified?
   - Are legal restrictions noted?

3. **Communication Guidelines**
   - Is brand tone defined?
   - Is formality level set?
   - Are languages specified?

Review the extracted entities and:
- Enhance skill definitions
- Prioritize guardrails by severity
- Flag communication gaps`,

  TECHNICAL_SESSION: `You are reviewing extraction results from a TECHNICAL session. Focus on:

1. **Integration Completeness**
   - Are all systems identified?
   - Is access type (R/W) specified?
   - Are data fields listed?
   - Is API availability confirmed?

2. **Security Requirements**
   - Are authentication methods specified?
   - Are compliance requirements listed?
   - Is data handling documented?

3. **Technical Contacts**
   - Are system owners identified?
   - Are API contacts listed?

Review the extracted entities and:
- Structure integration definitions
- Flag missing API details
- Identify security gaps`,

  SIGNOFF_SESSION: `You are reviewing extraction results from a SIGNOFF session. Focus on:

1. **Open Items**
   - Are all open items tracked?
   - Are owners assigned?
   - Are due dates set?

2. **Decisions**
   - Are all decisions documented?
   - Are approvers identified?
   - Are conditions noted?

3. **Risks**
   - Are risks clearly stated?
   - Are mitigations proposed?
   - Are risk owners assigned?

4. **Launch Criteria**
   - Are go/no-go criteria defined?
   - Are soft launch thresholds set?
   - Are hypercare requirements documented?

Review the extracted entities and:
- Prioritize open items
- Confirm decision completeness
- Flag unmitigated risks
- Extract launch criteria as LAUNCH_CRITERION type`,

  PERSONA_DESIGN_SESSION: `You are reviewing extraction results from a PERSONA & CONVERSATIONAL DESIGN session. Focus on:

1. **Persona Definition**
   - Are personality traits named with examples?
   - Is the tone of voice clearly defined?
   - Are formality rules specified?

2. **Conversational Design**
   - Are do's and don'ts defined with examples?
   - Is the opening message specified?
   - Is the conversation structure documented?

3. **Escalation Language**
   - Are escalation scripts provided for different contexts?
   - Is warm handover language defined?
   - Are edge case responses documented?

4. **Example Dialogues**
   - Are there examples for happy path, clarification, edge cases?
   - Are angry customer scenarios covered?
   - Do dialogues demonstrate the intended tone?

5. **Feedback & Monitoring**
   - Is the feedback mechanism defined?
   - Are monitoring metrics specified with owners?
   - Is the improvement cycle documented?

Review the extracted entities and:
- Ensure persona traits have example phrases
- Flag missing escalation contexts
- Identify gaps in dialogue coverage
- Use types: PERSONA_TRAIT, TONE_RULE, DOS_AND_DONTS, EXAMPLE_DIALOGUE, ESCALATION_SCRIPT, MONITORING_METRIC, LAUNCH_CRITERION, DECISION_TREE`,

  REQUIREMENTS_DOCUMENT: `You are reviewing extraction results from a REQUIREMENTS document. Focus on:
- Functional requirements clarity
- Non-functional requirements coverage
- Acceptance criteria completeness`,

  TECHNICAL_SPEC: `You are reviewing extraction results from a TECHNICAL SPEC. Focus on:
- API documentation completeness
- Data schema definitions
- Integration specifications`,

  PROCESS_DOCUMENT: `You are reviewing extraction results from a PROCESS document. Focus on:
- Process flow completeness
- Role definitions
- Exception handling`,

  SALES_HANDOVER_DOCUMENT: `You are reviewing extraction results from a SALES HANDOVER document (proposal, SOW, deal summary). Focus on:

1. **Deal Context**
   - Is the deal summary clear and complete?
   - Is the client motivation captured?
   - Are contract terms and value documented?

2. **Deadlines & Milestones**
   - Are go-live dates and contractual deadlines captured?
   - Are they marked as hard vs aspirational?

3. **Watch-Outs**
   - Are political, technical, or timeline risks noted?
   - Are known constraints documented?

4. **Promises**
   - What capabilities were promised to the client?
   - Are they prioritized (must-have vs nice-to-have)?

5. **Stakeholders**
   - Are key client contacts identified?
   - Are decision makers flagged?`,

  UNKNOWN: `You are reviewing extraction results from unknown content. Do your best to:
- Structure the information logically
- Identify any patterns
- Flag items needing clarification`,
}

/**
 * Stage 3: Specialized extraction based on content type
 *
 * Takes the general extraction and applies type-specific logic to:
 * 1. Enhance entities with additional structure
 * 2. Validate against the checklist for this content type
 * 3. Flag items needing clarification
 */
export async function extractSpecializedEntities(
  generalExtraction: GeneralExtractionResult,
  contentType: ContentClassification
): Promise<SpecializedExtractionResult> {
  const startTime = Date.now()

  try {
    // Get the checklist for this content type
    const checklist = getChecklistForType(contentType)

    const specializedPrompt = `${SPECIALIZED_PROMPTS[contentType]}

## Previously Extracted Entities

${JSON.stringify(generalExtraction.entities, null, 2)}

## Checklist for ${contentType}

${checklist.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## Your Task

1. Review each extracted entity and enhance it if needed
2. Check which checklist questions are covered by the entities
3. Identify which checklist questions are NOT covered (missing)
4. Add any additional entities you find that were missed

Respond with:
{
  "extractedItems": [
    {
      "type": "ENTITY_TYPE",
      "content": "Enhanced content",
      "confidence": 0.9,
      "sourceQuote": "exact quote",
      "sourceSpeaker": "speaker name",
      "sourceTimestamp": 123,
      "structuredData": { ... }
    }
  ],
  "checklist": {
    "questionsAsked": ["Question 1", "Question 3"],
    "questionsMissing": ["Question 2", "Question 4"],
    "coverageScore": 0.75
  }
}`

    // Note: We don't send the file again - we already have the extracted entities
    // This saves ~3500 tokens and avoids rate limits
    // Use higher maxTokens (32k) since specialized extraction can produce large JSON arrays
    const result = await generateWithFallback({
      prompt: specializedPrompt,
      maxTokens: 32768,
      // No fileBuffer - use extracted entities only
    })

    // Warn if response was truncated
    if (result.truncated) {
      console.warn('[Specialized Extraction] Response was truncated - JSON may be incomplete')
    }

    console.log(`[Specialized Extraction] Using provider: ${result.provider}`)

    // Parse JSON from response
    const parsed = parseJSONFromResponse(result.text) as {
      extractedItems: SpecializedItem[]
      checklist: ChecklistResult
    }

    const processingTime = Date.now() - startTime
    console.log(`[Specialized Extraction] Completed in ${processingTime}ms: ${parsed.extractedItems.length} items, ${parsed.checklist.coverageScore * 100}% coverage`)

    return {
      extractedItems: parsed.extractedItems || [],
      checklist: parsed.checklist || {
        questionsAsked: [],
        questionsMissing: checklist,
        coverageScore: 0,
      },
    }
  } catch (error) {
    if (error instanceof PipelineError) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Unknown extraction error'
    throw new PipelineError(
      `Specialized extraction failed: ${message}`,
      'SPECIALIZED_EXTRACTION',
      true
    )
  }
}

/**
 * Map entity types to ExtractedItem types for database storage
 * Must match ExtractedItemType enum in Prisma schema
 *
 * ExtractedItemType enum values:
 * - Business: STAKEHOLDER, GOAL, KPI_TARGET, VOLUME_EXPECTATION, TIMELINE_CONSTRAINT, BUSINESS_CASE, COST_PER_CASE, PEAK_PERIODS
 * - Process: HAPPY_PATH_STEP, EXCEPTION_CASE, BUSINESS_RULE, SCOPE_IN, SCOPE_OUT, ESCALATION_TRIGGER, CASE_TYPE, DOCUMENT_TYPE
 * - Channels: CHANNEL, CHANNEL_VOLUME, CHANNEL_SLA, CHANNEL_RULE
 * - Skills: SKILL_ANSWER, SKILL_ROUTE, SKILL_APPROVE_REJECT, SKILL_REQUEST_INFO, SKILL_NOTIFY, SKILL_OTHER, KNOWLEDGE_SOURCE, BRAND_TONE, COMMUNICATION_STYLE, RESPONSE_TEMPLATE
 * - Guardrails: GUARDRAIL_NEVER, GUARDRAIL_ALWAYS, FINANCIAL_LIMIT, LEGAL_RESTRICTION, COMPLIANCE_REQUIREMENT
 * - Technical: SYSTEM_INTEGRATION, DATA_FIELD, API_ENDPOINT, SECURITY_REQUIREMENT, ERROR_HANDLING, TECHNICAL_CONTACT
 * - Sign-off: OPEN_ITEM, DECISION, APPROVAL, RISK
 */
export function mapToExtractedItemType(entityType: string): string {
  const typeMapping: Record<string, string> = {
    // === Business Context ===
    GOAL: 'GOAL',
    OBJECTIVE: 'GOAL',
    TARGET: 'GOAL',
    PROBLEM: 'BUSINESS_CASE',
    BUSINESS_CONTEXT: 'BUSINESS_CASE',
    BUSINESS_CASE: 'BUSINESS_CASE',
    REQUIREMENT: 'BUSINESS_CASE',
    FUNCTIONAL_REQUIREMENT: 'BUSINESS_CASE',
    NON_FUNCTIONAL_REQUIREMENT: 'BUSINESS_CASE',
    ACCEPTANCE_CRITERIA: 'BUSINESS_CASE',
    KPI: 'KPI_TARGET',
    KPI_TARGET: 'KPI_TARGET',
    SUCCESS_METRIC: 'KPI_TARGET',
    METRIC: 'KPI_TARGET',
    VOLUME: 'VOLUME_EXPECTATION',
    VOLUME_EXPECTATION: 'VOLUME_EXPECTATION',
    COST: 'COST_PER_CASE',
    COST_PER_CASE: 'COST_PER_CASE',
    STAKEHOLDER: 'STAKEHOLDER',
    ROLE: 'STAKEHOLDER',
    PERSON: 'STAKEHOLDER',
    CONTACT: 'STAKEHOLDER',
    TIMELINE: 'TIMELINE_CONSTRAINT',
    TIMELINE_CONSTRAINT: 'TIMELINE_CONSTRAINT',
    DEADLINE: 'TIMELINE_CONSTRAINT',
    PEAK_PERIOD: 'PEAK_PERIODS',
    PEAK_PERIODS: 'PEAK_PERIODS',

    // === Process ===
    HAPPY_PATH_STEP: 'HAPPY_PATH_STEP',
    PROCESS_STEP: 'HAPPY_PATH_STEP',
    WORKFLOW_STEP: 'HAPPY_PATH_STEP',
    STEP: 'HAPPY_PATH_STEP',
    PROCESS: 'HAPPY_PATH_STEP',
    PROCESS_FLOW: 'HAPPY_PATH_STEP',
    WORKFLOW: 'HAPPY_PATH_STEP',
    EXCEPTION_CASE: 'EXCEPTION_CASE',
    EXCEPTION: 'EXCEPTION_CASE',
    ERROR_CASE: 'EXCEPTION_CASE',
    EDGE_CASE: 'EXCEPTION_CASE',
    CASE_TYPE: 'CASE_TYPE',
    REQUEST_TYPE: 'CASE_TYPE',
    ESCALATION_TRIGGER: 'ESCALATION_TRIGGER',
    ESCALATION_RULE: 'ESCALATION_TRIGGER',
    ESCALATION: 'ESCALATION_TRIGGER',
    BUSINESS_RULE: 'BUSINESS_RULE',
    RULE: 'BUSINESS_RULE',
    DOCUMENT_TYPE: 'DOCUMENT_TYPE',
    ATTACHMENT: 'DOCUMENT_TYPE',

    // === Scope ===
    IN_SCOPE: 'SCOPE_IN',
    SCOPE_IN: 'SCOPE_IN',
    OUT_OF_SCOPE: 'SCOPE_OUT',
    SCOPE_OUT: 'SCOPE_OUT',
    EXCLUDED: 'SCOPE_OUT',

    // === Channels ===
    INPUT_CHANNEL: 'CHANNEL',
    OUTPUT_CHANNEL: 'CHANNEL',
    CHANNEL: 'CHANNEL',
    COMMUNICATION_CHANNEL: 'CHANNEL',
    CHANNEL_RULE: 'CHANNEL_RULE',
    SLA: 'CHANNEL_SLA',
    CHANNEL_SLA: 'CHANNEL_SLA',
    RESPONSE_TIME: 'CHANNEL_SLA',
    CHANNEL_VOLUME: 'CHANNEL_VOLUME',

    // === Skills ===
    SKILL: 'SKILL_OTHER',
    SKILL_OTHER: 'SKILL_OTHER',
    CAPABILITY: 'SKILL_OTHER',
    ABILITY: 'SKILL_OTHER',
    SKILL_ANSWER: 'SKILL_ANSWER',
    ANSWER: 'SKILL_ANSWER',
    SKILL_ROUTE: 'SKILL_ROUTE',
    ROUTING: 'SKILL_ROUTE',
    SKILL_APPROVE_REJECT: 'SKILL_APPROVE_REJECT',
    SKILL_REQUEST_INFO: 'SKILL_REQUEST_INFO',
    SKILL_NOTIFY: 'SKILL_NOTIFY',
    NOTIFICATION: 'SKILL_NOTIFY',
    KNOWLEDGE_SOURCE: 'KNOWLEDGE_SOURCE',
    KNOWLEDGE: 'KNOWLEDGE_SOURCE',
    KNOWLEDGE_BASE: 'KNOWLEDGE_SOURCE',
    RESPONSE_TEMPLATE: 'RESPONSE_TEMPLATE',
    TEMPLATE: 'RESPONSE_TEMPLATE',

    // === Communication ===
    BRAND_TONE: 'BRAND_TONE',
    TONE: 'BRAND_TONE',
    COMMUNICATION_STYLE: 'COMMUNICATION_STYLE',
    LANGUAGE: 'COMMUNICATION_STYLE',
    FORMALITY: 'COMMUNICATION_STYLE',

    // === Guardrails ===
    GUARDRAIL_NEVER: 'GUARDRAIL_NEVER',
    NEVER: 'GUARDRAIL_NEVER',
    PROHIBITED: 'GUARDRAIL_NEVER',
    FORBIDDEN: 'GUARDRAIL_NEVER',
    GUARDRAIL_ALWAYS: 'GUARDRAIL_ALWAYS',
    ALWAYS: 'GUARDRAIL_ALWAYS',
    MANDATORY: 'GUARDRAIL_ALWAYS',
    REQUIRED: 'GUARDRAIL_ALWAYS',
    FINANCIAL_LIMIT: 'FINANCIAL_LIMIT',
    LIMIT: 'FINANCIAL_LIMIT',
    LEGAL_RESTRICTION: 'LEGAL_RESTRICTION',
    LEGAL: 'LEGAL_RESTRICTION',
    COMPLIANCE_REQUIREMENT: 'COMPLIANCE_REQUIREMENT',
    COMPLIANCE: 'COMPLIANCE_REQUIREMENT',

    // === Technical/Integrations ===
    SYSTEM_INTEGRATION: 'SYSTEM_INTEGRATION',
    INTEGRATION: 'SYSTEM_INTEGRATION',
    SYSTEM: 'SYSTEM_INTEGRATION',
    DATA_FIELD: 'DATA_FIELD',
    FIELD: 'DATA_FIELD',
    API_ENDPOINT: 'API_ENDPOINT',
    API: 'API_ENDPOINT',
    ENDPOINT: 'API_ENDPOINT',
    SECURITY_REQUIREMENT: 'SECURITY_REQUIREMENT',
    SECURITY: 'SECURITY_REQUIREMENT',
    AUTH_REQUIREMENT: 'SECURITY_REQUIREMENT',
    AUTHENTICATION: 'SECURITY_REQUIREMENT',
    ERROR_HANDLING: 'ERROR_HANDLING',
    TECHNICAL_CONTACT: 'TECHNICAL_CONTACT',
    TECH_CONTACT: 'TECHNICAL_CONTACT',

    // === Sign-off ===
    OPEN_ITEM: 'OPEN_ITEM',
    TODO: 'OPEN_ITEM',
    ACTION_ITEM: 'OPEN_ITEM',
    PENDING: 'OPEN_ITEM',
    DECISION: 'DECISION',
    DECISION_POINT: 'DECISION',
    APPROVAL: 'APPROVAL',
    SIGN_OFF: 'APPROVAL',
    RISK: 'RISK',
    CONCERN: 'RISK',
    ISSUE: 'RISK',

    // === Persona & Conversational Design ===
    EXAMPLE_DIALOGUE: 'EXAMPLE_DIALOGUE',
    DIALOGUE: 'EXAMPLE_DIALOGUE',
    CONVERSATION_EXAMPLE: 'EXAMPLE_DIALOGUE',
    SAMPLE_CONVERSATION: 'EXAMPLE_DIALOGUE',
    ESCALATION_SCRIPT: 'ESCALATION_SCRIPT',
    HANDOVER_SCRIPT: 'ESCALATION_SCRIPT',
    WARM_HANDOVER: 'ESCALATION_SCRIPT',
    PERSONA_TRAIT: 'PERSONA_TRAIT',
    PERSONALITY: 'PERSONA_TRAIT',
    PERSONALITY_TRAIT: 'PERSONA_TRAIT',
    TRAIT: 'PERSONA_TRAIT',
    TONE_RULE: 'TONE_RULE',
    TONE_OF_VOICE: 'TONE_RULE',
    VOICE_RULE: 'TONE_RULE',
    READING_LEVEL: 'TONE_RULE',
    DOS_AND_DONTS: 'DOS_AND_DONTS',
    DO_AND_DONT: 'DOS_AND_DONTS',
    CONVERSATIONAL_GUIDELINE: 'DOS_AND_DONTS',

    // === Monitoring & Launch ===
    MONITORING_METRIC: 'MONITORING_METRIC',
    MONITORING_KPI: 'MONITORING_METRIC',
    DASHBOARD_METRIC: 'MONITORING_METRIC',
    ALERT_THRESHOLD: 'MONITORING_METRIC',
    LAUNCH_CRITERION: 'LAUNCH_CRITERION',
    GO_NO_GO: 'LAUNCH_CRITERION',
    LAUNCH_READINESS: 'LAUNCH_CRITERION',
    SOFT_LAUNCH: 'LAUNCH_CRITERION',
    HYPERCARE: 'LAUNCH_CRITERION',
    DECISION_TREE: 'DECISION_TREE',
    ROUTING_RULE: 'DECISION_TREE',
    QUESTION_ROUTING: 'DECISION_TREE',
    AUTOMATION_FEASIBILITY: 'DECISION_TREE',

    // === Sales Handover ===
    DEAL_SUMMARY: 'DEAL_SUMMARY',
    CONTRACT_DEADLINE: 'CONTRACT_DEADLINE',
    SALES_WATCH_OUT: 'SALES_WATCH_OUT',
    PROMISED_CAPABILITY: 'PROMISED_CAPABILITY',
    CLIENT_PREFERENCE: 'CLIENT_PREFERENCE',
  }

  const mapped = typeMapping[entityType]
  if (!mapped) {
    console.warn(`[mapToExtractedItemType] Unknown entity type: ${entityType}`)
  }
  return mapped || entityType
}
