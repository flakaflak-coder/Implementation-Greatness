/**
 * LLM Judges for Evaluation Pipeline
 *
 * Each judge evaluates a specific aspect of the extraction pipeline.
 */

import type {
  ClassificationEvalInput,
  ClassificationJudgeResult,
  ExtractionEvalInput,
  HallucinationJudgeResult,
  CoverageJudgeResult,
  SpecializedEvalInput,
  ConsistencyJudgeResult,
  EvalThresholds,
} from './types'
import { DEFAULT_THRESHOLDS } from './types'

const JUDGE_MODEL = 'claude-3-haiku-20240307'

// Lazy-load Anthropic client to avoid initialization in test environments
let _anthropic: import('@anthropic-ai/sdk').default | null = null

async function getAnthropicClient() {
  if (!_anthropic) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    _anthropic = new Anthropic()
  }
  return _anthropic
}

/**
 * Classification Judge
 * Verifies that content was classified correctly
 */
export async function runClassificationJudge(
  input: ClassificationEvalInput,
  thresholds: EvalThresholds = DEFAULT_THRESHOLDS
): Promise<ClassificationJudgeResult> {
  const startTime = Date.now()

  const prompt = `You are verifying a content classification for a Digital Employee onboarding session.

SOURCE CONTENT EXCERPT:
${input.contentExcerpt}

CLASSIFICATION RESULT:
- Type: ${input.classificationType}
- Confidence: ${input.confidence}
- Key Indicators: ${input.keyIndicators.join(', ')}

CLASSIFICATION OPTIONS:
- KICKOFF_SESSION: Initial meeting about goals, business context, success metrics
- PROCESS_DESIGN_SESSION: Process walkthrough, happy path, exceptions, scope
- SKILLS_GUARDRAILS_SESSION: DE skills, brand tone, guardrails (never/always)
- TECHNICAL_SESSION: Systems, APIs, integrations, security
- SIGNOFF_SESSION: Final approval, open items, go/no-go
- REQUIREMENTS_DOCUMENT: Formal requirements or specifications
- TECHNICAL_SPEC: Technical specification or API documentation
- PROCESS_DOCUMENT: Process documentation, SOPs, workflows

Evaluate:
1. Is the classification correct based on the content?
2. Are the key indicators actually present in the content?
3. Is the confidence appropriate (not too high for ambiguous content)?

Respond in JSON only:
{
  "classification_correct": true/false,
  "correct_type": "[type if wrong, null if correct]",
  "indicators_verified": true/false,
  "confidence_appropriate": true/false,
  "issues": ["..."],
  "score": 0.0-1.0
}`

  try {
    const anthropic = await getAnthropicClient()
    const response = await anthropic.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Failed to parse judge response')

    const result = JSON.parse(jsonMatch[0])
    const passed = result.classification_correct && result.indicators_verified

    return {
      judge: 'classification',
      verdict: passed ? 'pass' : 'fail',
      score: result.score,
      issues: result.issues || [],
      details: {
        classificationCorrect: result.classification_correct,
        correctType: result.correct_type,
        indicatorsVerified: result.indicators_verified,
        confidenceAppropriate: result.confidence_appropriate,
      },
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      judge: 'classification',
      verdict: 'review',
      score: 0,
      issues: [`Judge error: ${error instanceof Error ? error.message : 'Unknown'}`],
      details: {
        classificationCorrect: false,
        correctType: null,
        indicatorsVerified: false,
        confidenceAppropriate: false,
      },
      latencyMs: Date.now() - startTime,
    }
  }
}

/**
 * Hallucination Judge
 * Verifies that extracted entities actually exist in the source
 */
export async function runHallucinationJudge(
  input: ExtractionEvalInput,
  sampleSize: number = 5
): Promise<HallucinationJudgeResult> {
  const startTime = Date.now()

  // Sample entities for checking
  const sampled = input.entities
    .sort(() => Math.random() - 0.5)
    .slice(0, sampleSize)

  const prompt = `You are checking for hallucinated entities in an LLM extraction.

SOURCE CONTENT:
${input.sourceContent.substring(0, 8000)}

EXTRACTED ENTITIES (sample of ${sampled.length}):
${JSON.stringify(sampled, null, 2)}

For each entity, verify:
1. Does the content actually mention this entity?
2. Is the source quote accurate (if provided)?
3. Is the speaker attribution correct (if provided)?

CRITICAL: Be thorough. Hallucinations are a serious quality issue.

Respond in JSON only:
{
  "entities": [
    {
      "id": "entity-id",
      "found_in_source": true/false,
      "quote_accurate": true/false,
      "speaker_correct": true/false,
      "issue": "description if any problem"
    }
  ],
  "hallucination_count": 0,
  "score": 0.0-1.0
}`

  try {
    const anthropic = await getAnthropicClient()
    const response = await anthropic.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Failed to parse judge response')

    const result = JSON.parse(jsonMatch[0])
    const hallucinationRate = result.hallucination_count / sampled.length
    const passed = hallucinationRate === 0

    return {
      judge: 'hallucination',
      verdict: passed ? 'pass' : result.hallucination_count > 1 ? 'fail' : 'review',
      score: result.score,
      issues: result.entities
        .filter((e: { issue?: string }) => e.issue)
        .map((e: { issue: string }) => e.issue),
      details: {
        entitiesChecked: sampled.length,
        hallucinatedCount: result.hallucination_count,
        entities: result.entities,
      },
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      judge: 'hallucination',
      verdict: 'review',
      score: 0,
      issues: [`Judge error: ${error instanceof Error ? error.message : 'Unknown'}`],
      details: {
        entitiesChecked: 0,
        hallucinatedCount: 0,
        entities: [],
      },
      latencyMs: Date.now() - startTime,
    }
  }
}

/**
 * Coverage Judge
 * Checks if important entities were missed
 */
export async function runCoverageJudge(
  input: ExtractionEvalInput,
  thresholds: EvalThresholds = DEFAULT_THRESHOLDS
): Promise<CoverageJudgeResult> {
  const startTime = Date.now()

  const expectedCategories: Record<string, string[]> = {
    KICKOFF_SESSION: ['STAKEHOLDER', 'GOAL', 'KPI', 'VOLUME', 'SUCCESS_METRIC'],
    PROCESS_DESIGN_SESSION: ['HAPPY_PATH_STEP', 'EXCEPTION_CASE', 'CASE_TYPE', 'IN_SCOPE', 'OUT_OF_SCOPE'],
    SKILLS_GUARDRAILS_SESSION: ['SKILL', 'GUARDRAIL_NEVER', 'GUARDRAIL_ALWAYS', 'BRAND_TONE'],
    TECHNICAL_SESSION: ['SYSTEM_INTEGRATION', 'DATA_FIELD', 'API_ENDPOINT', 'SECURITY_REQUIREMENT'],
    SIGNOFF_SESSION: ['OPEN_ITEM', 'DECISION_MADE', 'RISK', 'APPROVAL'],
  }

  const expected = expectedCategories[input.contentType] || []

  const prompt = `You are checking if important entities were missed during extraction.

SOURCE CONTENT:
${input.sourceContent.substring(0, 8000)}

CONTENT TYPE: ${input.contentType}

EXTRACTED ENTITIES SUMMARY:
- Total: ${input.summary.totalEntities}
- By category: ${JSON.stringify(input.summary.byCategory)}

EXPECTED CATEGORIES FOR ${input.contentType}:
${expected.join(', ')}

Check for obvious misses:
1. Are there stakeholder names mentioned but not extracted?
2. Are there system names mentioned but not extracted?
3. Are there numerical targets mentioned but not extracted?
4. Are there scope statements ("we will/won't do X") missed?

Respond in JSON only:
{
  "missed_entities": [
    {"content": "what was missed", "category": "expected category", "quote": "where it appeared"}
  ],
  "coverage_score": 0.0-1.0
}`

  try {
    const anthropic = await getAnthropicClient()
    const response = await anthropic.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Failed to parse judge response')

    const result = JSON.parse(jsonMatch[0])
    const passed = result.coverage_score >= thresholds.coverageScore

    return {
      judge: 'coverage',
      verdict: passed ? 'pass' : result.coverage_score >= 0.6 ? 'review' : 'fail',
      score: result.coverage_score,
      issues: result.missed_entities.map(
        (e: { content: string; category: string }) => `Missed ${e.category}: ${e.content}`
      ),
      details: {
        coverageScore: result.coverage_score,
        missedEntities: result.missed_entities,
      },
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      judge: 'coverage',
      verdict: 'review',
      score: 0,
      issues: [`Judge error: ${error instanceof Error ? error.message : 'Unknown'}`],
      details: {
        coverageScore: 0,
        missedEntities: [],
      },
      latencyMs: Date.now() - startTime,
    }
  }
}

/**
 * Consistency Judge
 * Verifies Stage 2 → Stage 3 alignment
 */
export async function runConsistencyJudge(
  input: SpecializedEvalInput,
  thresholds: EvalThresholds = DEFAULT_THRESHOLDS
): Promise<ConsistencyJudgeResult> {
  const startTime = Date.now()

  const prompt = `You are verifying consistency between extraction stages.

STAGE 2 ENTITIES (summary):
- Total: ${input.stage2Summary.totalEntities}
- By category: ${JSON.stringify(input.stage2Summary.byCategory)}

STAGE 3 OUTPUT:
- Extracted Items: ${input.stage3Items.length}
- Items by type: ${JSON.stringify(
    input.stage3Items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  )}

CHECKLIST RESULT:
- Questions Asked: ${input.checklist.questionsAsked.length}
- Questions Missing: ${input.checklist.questionsMissing.length}
- Coverage Score: ${input.checklist.coverageScore}

Verify:
1. Are Stage 3 items reasonably derived from Stage 2 entities?
2. Is the checklist coverage consistent with extracted content?
3. Are there significant Stage 2 categories not reflected in Stage 3?

Respond in JSON only:
{
  "stage_alignment": 0.0-1.0,
  "orphaned_entities": ["categories from stage 2 not in stage 3"],
  "inconsistencies": ["specific inconsistency descriptions"]
}`

  try {
    const anthropic = await getAnthropicClient()
    const response = await anthropic.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Failed to parse judge response')

    const result = JSON.parse(jsonMatch[0])
    const passed = result.stage_alignment >= thresholds.stageAlignment

    return {
      judge: 'consistency',
      verdict: passed ? 'pass' : result.stage_alignment >= 0.6 ? 'review' : 'fail',
      score: result.stage_alignment,
      issues: result.inconsistencies || [],
      details: {
        stageAlignment: result.stage_alignment,
        orphanedEntities: result.orphaned_entities || [],
        inconsistencies: result.inconsistencies || [],
      },
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      judge: 'consistency',
      verdict: 'review',
      score: 0,
      issues: [`Judge error: ${error instanceof Error ? error.message : 'Unknown'}`],
      details: {
        stageAlignment: 0,
        orphanedEntities: [],
        inconsistencies: [],
      },
      latencyMs: Date.now() - startTime,
    }
  }
}

/**
 * Automated Schema Validator
 * Validates JSON structure without LLM
 */
export function validateSchema(
  entities: ExtractionEvalInput['entities']
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  for (const entity of entities) {
    if (!entity.id) issues.push('Entity missing id')
    if (!entity.category) issues.push(`Entity ${entity.id} missing category`)
    if (!entity.type) issues.push(`Entity ${entity.id} missing type`)
    if (!entity.content) issues.push(`Entity ${entity.id} missing content`)
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Automated Confidence Gate
 * Checks if classification confidence meets threshold
 */
export function checkConfidenceGate(
  confidence: number,
  threshold: number = 0.7
): { passed: boolean; recommendation: string } {
  if (confidence >= 0.9) {
    return { passed: true, recommendation: 'High confidence, auto-approve' }
  }
  if (confidence >= threshold) {
    return { passed: true, recommendation: 'Acceptable confidence' }
  }
  if (confidence >= 0.5) {
    return { passed: false, recommendation: 'Low confidence, review classification' }
  }
  return { passed: false, recommendation: 'Very low confidence, likely misclassified' }
}
