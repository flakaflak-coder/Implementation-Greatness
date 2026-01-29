import { ContentClassification } from '@prisma/client'
import { ClassificationResult, PipelineError } from './types'
import { generateWithFallback, parseJSONFromResponse } from './ai-client'

/**
 * Classification prompt - determines content type and missing questions
 */
const CLASSIFICATION_PROMPT = `You are an AI assistant that classifies uploaded content for a Digital Employee (AI agent) onboarding system.

Analyze this content and determine:
1. What TYPE of content this is
2. How CONFIDENT you are in the classification
3. What KEY INDICATORS led to your classification
4. What IMPORTANT QUESTIONS should have been asked but weren't covered

## Content Types

**Session Types (recordings/transcripts of meetings):**
- KICKOFF_SESSION: Initial kickoff meeting discussing goals, business context, success metrics, volumes, stakeholders
- PROCESS_DESIGN_SESSION: Process walkthrough covering happy path, case types, channels, exceptions, scope items
- SKILLS_GUARDRAILS_SESSION: Discussion of DE skills, brand tone, guardrails (never/always), communication style
- TECHNICAL_SESSION: Technical integration discussion covering systems, APIs, data fields, security requirements
- SIGNOFF_SESSION: Final sign-off meeting with approvals, open items, decisions, risks

**Document Types:**
- REQUIREMENTS_DOCUMENT: Formal requirements or specifications document
- TECHNICAL_SPEC: Technical specification or API documentation
- PROCESS_DOCUMENT: Process documentation, SOPs, or workflow descriptions
- UNKNOWN: Cannot determine content type

## Classification Hints

**KICKOFF_SESSION indicators:**
- "why are we doing this", "business case", "cost savings", "ROI"
- Volume discussions (monthly cases, emails per day)
- Success metrics, KPIs, automation targets
- Stakeholder introductions

**PROCESS_DESIGN_SESSION indicators:**
- "happy path", "walk through the process", "step by step"
- Case type discussions, complexity ratings
- Channel discussions (email, portal, web form)
- Exception handling, escalation triggers
- Scope discussions ("DE should/shouldn't handle")

**SKILLS_GUARDRAILS_SESSION indicators:**
- Skill discussions ("DE needs to be able to...")
- Brand tone ("formal", "friendly", language preferences)
- Guardrails ("never do X", "always do Y")
- Financial limits, compliance restrictions

**TECHNICAL_SESSION indicators:**
- System names, integration types
- API discussions, authentication methods
- Data field names, database references
- Security requirements (SSO, encryption, GDPR)

**SIGNOFF_SESSION indicators:**
- "final approval", "sign off", "go/no-go"
- Open items review, decision tracking
- Risk discussions, mitigation plans

## Checklist Questions by Type

For each content type, there are key questions that SHOULD be covered:

**KICKOFF_SESSION checklist:**
- What problem are we solving? Why now?
- What's the current cost per case/transaction?
- What's the target cost after automation?
- What's the monthly volume?
- What does success look like? (KPIs)
- Who are the key stakeholders?
- What's the proposed DE name/role?

**PROCESS_DESIGN_SESSION checklist:**
- What's the happy path from start to finish?
- What case types exist? Volume distribution?
- Which channels are used? Volume per channel?
- What's the exception rate?
- When MUST this escalate to a human?
- What's IN scope vs OUT of scope?

**SKILLS_GUARDRAILS_SESSION checklist:**
- What skills does the DE need?
- What's the brand tone? Formality level?
- What languages are needed?
- What should the DE NEVER do?
- What should the DE ALWAYS do?
- Are there financial limits?
- Are there legal/compliance restrictions?

**TECHNICAL_SESSION checklist:**
- What systems need to be integrated?
- What's the access type (read/write)?
- What data fields are needed?
- Is API access available?
- Who's the technical contact?
- What are the security requirements?
- What are the compliance requirements?

**SIGNOFF_SESSION checklist:**
- Are all open items resolved?
- Are all decisions documented?
- Are risks identified and mitigated?
- Who is providing final approval?
- Are there any conditions on approval?

## Response Format

Respond with a JSON object:
{
  "type": "CONTENT_TYPE",
  "confidence": 0.85,
  "keyIndicators": [
    "Specific phrase or topic that indicated the type"
  ],
  "missingQuestions": [
    "Question that should have been asked but wasn't covered"
  ]
}

**Confidence guidelines:**
- 0.9+: Very clear indicators, obvious content type
- 0.7-0.9: Strong indicators, high confidence
- 0.5-0.7: Some indicators but ambiguous
- <0.5: Weak indicators, best guess

Analyze the content now and provide your classification.`

/**
 * Stage 1: Classify content type
 *
 * Analyzes uploaded content to determine what type it is
 * (kickoff session, process design, technical document, etc.)
 */
export async function classifyContent(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ClassificationResult> {
  const startTime = Date.now()

  try {
    const result = await generateWithFallback({
      prompt: CLASSIFICATION_PROMPT,
      fileBuffer,
      mimeType,
    })

    console.log(`[Classification] Using provider: ${result.provider}`)

    // Parse JSON from response
    const parsed = parseJSONFromResponse(result.text) as {
      type: string
      confidence: number
      keyIndicators: string[]
      missingQuestions: string[]
    }

    // Validate and map the type to our enum
    const validTypes = Object.values(ContentClassification)
    const classifiedType = validTypes.includes(parsed.type as ContentClassification)
      ? (parsed.type as ContentClassification)
      : 'UNKNOWN'

    const processingTime = Date.now() - startTime
    console.log(`[Classification] Completed in ${processingTime}ms: ${classifiedType} (${parsed.confidence})`)

    return {
      type: classifiedType,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      keyIndicators: parsed.keyIndicators || [],
      missingQuestions: parsed.missingQuestions || [],
    }
  } catch (error) {
    if (error instanceof PipelineError) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Unknown classification error'
    throw new PipelineError(
      `Classification failed: ${message}`,
      'CLASSIFICATION',
      true
    )
  }
}

/**
 * Get the checklist questions for a content type
 */
export function getChecklistForType(type: ContentClassification): string[] {
  const checklists: Record<ContentClassification, string[]> = {
    KICKOFF_SESSION: [
      'What problem are we solving? Why now?',
      "What's the current cost per case/transaction?",
      "What's the target cost after automation?",
      "What's the monthly volume?",
      'What does success look like? (KPIs)',
      'Who are the key stakeholders?',
      "What's the proposed DE name/role?",
    ],
    PROCESS_DESIGN_SESSION: [
      "What's the happy path from start to finish?",
      'What case types exist? Volume distribution?',
      'Which channels are used? Volume per channel?',
      "What's the exception rate?",
      'When MUST this escalate to a human?',
      "What's IN scope vs OUT of scope?",
    ],
    SKILLS_GUARDRAILS_SESSION: [
      'What skills does the DE need?',
      "What's the brand tone? Formality level?",
      'What languages are needed?',
      'What should the DE NEVER do?',
      'What should the DE ALWAYS do?',
      'Are there financial limits?',
      'Are there legal/compliance restrictions?',
    ],
    TECHNICAL_SESSION: [
      'What systems need to be integrated?',
      "What's the access type (read/write)?",
      'What data fields are needed?',
      'Is API access available?',
      "Who's the technical contact?",
      'What are the security requirements?',
      'What are the compliance requirements?',
    ],
    SIGNOFF_SESSION: [
      'Are all open items resolved?',
      'Are all decisions documented?',
      'Are risks identified and mitigated?',
      'Who is providing final approval?',
      'Are there any conditions on approval?',
    ],
    REQUIREMENTS_DOCUMENT: [
      'Are functional requirements clearly defined?',
      'Are non-functional requirements specified?',
      'Are acceptance criteria included?',
      'Is scope clearly bounded?',
    ],
    TECHNICAL_SPEC: [
      'Are API endpoints documented?',
      'Are data schemas defined?',
      'Are authentication requirements specified?',
      'Are error handling approaches documented?',
    ],
    PROCESS_DOCUMENT: [
      'Is the process flow clearly documented?',
      'Are roles and responsibilities defined?',
      'Are exceptions and escalations covered?',
      'Are SLAs specified?',
    ],
    UNKNOWN: [
      'Could not determine content type - consider re-uploading with more context',
    ],
  }

  return checklists[type] || checklists.UNKNOWN
}
