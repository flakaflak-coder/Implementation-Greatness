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
  ConfidenceCalibrationInput,
  ConfidenceCalibrationJudgeResult,
  DocumentEvalInput,
  DocumentAlignmentJudgeResult,
  AvatarEvalInput,
  AvatarQualityJudgeResult,
  PromptRegressionInput,
  PromptRegressionJudgeResult,
} from './types'
import { DEFAULT_THRESHOLDS } from './types'

const JUDGE_MODEL = 'claude-haiku-4-5-20251001'

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

// ============================================================================
// NEW JUDGES - Addressing Critical Evaluation Gaps
// ============================================================================

/**
 * Confidence Calibration Judge
 * Verifies that confidence scores actually correlate with accuracy
 */
export async function runConfidenceCalibrationJudge(
  input: ConfidenceCalibrationInput,
  thresholds: EvalThresholds = DEFAULT_THRESHOLDS
): Promise<ConfidenceCalibrationJudgeResult> {
  const startTime = Date.now()

  const prompt = `You are evaluating the calibration of confidence scores in an LLM extraction.

Well-calibrated confidence means: if the model says 0.9 confidence, it should be correct ~90% of the time.

SOURCE CONTENT:
${input.sourceContent.substring(0, 6000)}

CONTENT TYPE: ${input.contentType}

EXTRACTED ITEMS WITH CLAIMED CONFIDENCE:
${JSON.stringify(input.predictions.slice(0, 10), null, 2)}

For each item, assess:
1. Is the item actually present and correctly extracted from the source?
2. What confidence SHOULD it have based on clarity of evidence?
3. Is the claimed confidence over/under the estimated true confidence?

Respond in JSON only:
{
  "items": [
    {
      "id": "item-id",
      "claimed_confidence": 0.9,
      "estimated_true_confidence": 0.85,
      "is_actually_correct": true,
      "calibration_error": 0.05,
      "reasoning": "brief explanation"
    }
  ],
  "avg_calibration_error": 0.0-1.0,
  "overconfident_count": 0,
  "underconfident_count": 0,
  "calibration_score": 0.0-1.0
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
    const passed = result.avg_calibration_error <= thresholds.confidenceCalibration

    const overconfidentItems = result.items
      .filter((i: { claimed_confidence: number; estimated_true_confidence: number }) =>
        i.claimed_confidence > i.estimated_true_confidence + 0.1)
      .map((i: { id: string; claimed_confidence: number; estimated_true_confidence: number }) => ({
        id: i.id,
        claimed: i.claimed_confidence,
        estimated: i.estimated_true_confidence,
      }))

    const underconfidentItems = result.items
      .filter((i: { claimed_confidence: number; estimated_true_confidence: number }) =>
        i.claimed_confidence < i.estimated_true_confidence - 0.1)
      .map((i: { id: string; claimed_confidence: number; estimated_true_confidence: number }) => ({
        id: i.id,
        claimed: i.claimed_confidence,
        estimated: i.estimated_true_confidence,
      }))

    return {
      judge: 'confidence-calibration',
      verdict: passed ? 'pass' : result.avg_calibration_error <= 0.25 ? 'review' : 'fail',
      score: result.calibration_score,
      issues: overconfidentItems.length > 0
        ? [`${overconfidentItems.length} items overconfident by >10%`]
        : [],
      details: {
        calibrationScore: result.calibration_score,
        overconfidentItems,
        underconfidentItems,
        avgCalibrationError: result.avg_calibration_error,
      },
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      judge: 'confidence-calibration',
      verdict: 'review',
      score: 0,
      issues: [`Judge error: ${error instanceof Error ? error.message : 'Unknown'}`],
      details: {
        calibrationScore: 0,
        overconfidentItems: [],
        underconfidentItems: [],
        avgCalibrationError: 1,
      },
      latencyMs: Date.now() - startTime,
    }
  }
}

/**
 * Document Alignment Judge
 * Ensures generated document content references actual extracted data
 */
export async function runDocumentAlignmentJudge(
  input: DocumentEvalInput,
  thresholds: EvalThresholds = DEFAULT_THRESHOLDS
): Promise<DocumentAlignmentJudgeResult> {
  const startTime = Date.now()

  const prompt = `You are verifying that a generated document accurately represents extracted data.

EXTRACTED DATA (this is the ground truth):
${JSON.stringify(input.extractedData, null, 2)}

GENERATED DOCUMENT SECTIONS:
${Object.entries(input.generatedContent)
  .map(([section, content]) => `### ${section}\n${content}`)
  .join('\n\n')}

LANGUAGE: ${input.language}

Your task:
1. Check each claim in the generated content against the extracted data
2. Flag any "fabricated claims" - statements not supported by extracted data
3. Note any important extracted data points that should have been included but weren't
4. Score each section for alignment (0.0-1.0)

CRITICAL: The generated document should ONLY contain:
- Information directly from extracted data
- Reasonable inferences clearly marked as such
- Standard consulting language/framing

Respond in JSON only:
{
  "fabricated_claims": [
    {
      "claim": "specific claim made",
      "section": "executiveSummary",
      "severity": "high/medium/low",
      "reason": "why this is fabricated"
    }
  ],
  "missed_data_points": [
    {
      "data_point": "what was missed",
      "expected_section": "where it should appear"
    }
  ],
  "section_scores": {
    "executiveSummary": 0.9,
    "currentState": 0.85,
    "futureState": 0.8,
    "processAnalysis": 0.95,
    "scopeAnalysis": 0.9,
    "technicalFoundation": 0.85,
    "riskAssessment": 0.75
  },
  "overall_alignment_score": 0.0-1.0
}`

  try {
    const anthropic = await getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Use Sonnet for more thorough analysis
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Failed to parse judge response')

    const result = JSON.parse(jsonMatch[0])
    const passed = result.overall_alignment_score >= thresholds.documentAlignment

    const highSeverityFabrications = result.fabricated_claims.filter(
      (c: { severity: string }) => c.severity === 'high'
    )

    return {
      judge: 'document-alignment',
      verdict: passed && highSeverityFabrications.length === 0
        ? 'pass'
        : highSeverityFabrications.length > 0
        ? 'fail'
        : 'review',
      score: result.overall_alignment_score,
      issues: result.fabricated_claims.map(
        (c: { claim: string; section: string; severity: string }) =>
          `[${c.severity.toUpperCase()}] ${c.section}: "${c.claim}"`
      ),
      details: {
        alignmentScore: result.overall_alignment_score,
        fabricatedClaims: result.fabricated_claims,
        missedDataPoints: result.missed_data_points,
        sectionScores: result.section_scores,
      },
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      judge: 'document-alignment',
      verdict: 'review',
      score: 0,
      issues: [`Judge error: ${error instanceof Error ? error.message : 'Unknown'}`],
      details: {
        alignmentScore: 0,
        fabricatedClaims: [],
        missedDataPoints: [],
        sectionScores: {},
      },
      latencyMs: Date.now() - startTime,
    }
  }
}

/**
 * Avatar Quality Judge
 * Assesses generated avatar for quality and brand compliance
 */
export async function runAvatarQualityJudge(
  input: AvatarEvalInput,
  thresholds: EvalThresholds = DEFAULT_THRESHOLDS
): Promise<AvatarQualityJudgeResult> {
  const startTime = Date.now()

  const prompt = `You are evaluating the quality of an AI-generated avatar for a Digital Employee.

DIGITAL EMPLOYEE DETAILS:
- Name: ${input.deName}
- Role: ${input.deRole}
- Personality traits: ${input.dePersonality.join(', ')}
- Brand tone: ${input.brandTone}

IMAGE: [Attached as base64]

Evaluate the avatar on these criteria:

1. **Professionalism (0.0-1.0)**: Does it look professional and appropriate for business use?
2. **Style Compliance**: Is it NON-photorealistic (illustrated/stylized)? Photorealistic faces are NOT allowed.
3. **Brand Alignment (0.0-1.0)**: Does the style match the described brand tone?
4. **Technical Quality**: Check for artifacts, distortions, or generation issues.
5. **Personality Match**: Does the avatar convey the described personality?

Respond in JSON only:
{
  "professionalism_score": 0.0-1.0,
  "style_compliant": true/false,
  "brand_alignment_score": 0.0-1.0,
  "quality_issues": ["any visual defects or problems"],
  "personality_match": true/false,
  "recommendations": ["suggestions for improvement"],
  "overall_score": 0.0-1.0
}`

  try {
    const anthropic = await getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Sonnet for vision capability
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: input.imageBase64,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Failed to parse judge response')

    const result = JSON.parse(jsonMatch[0])
    const passed =
      result.overall_score >= thresholds.avatarQuality && result.style_compliant

    return {
      judge: 'avatar-quality',
      verdict: passed ? 'pass' : !result.style_compliant ? 'fail' : 'review',
      score: result.overall_score,
      issues: [
        ...(result.style_compliant ? [] : ['CRITICAL: Avatar is photorealistic']),
        ...result.quality_issues,
      ],
      details: {
        professionalismScore: result.professionalism_score,
        styleCompliance: result.style_compliant,
        brandAlignment: result.brand_alignment_score,
        qualityIssues: result.quality_issues,
        recommendations: result.recommendations,
      },
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      judge: 'avatar-quality',
      verdict: 'review',
      score: 0,
      issues: [`Judge error: ${error instanceof Error ? error.message : 'Unknown'}`],
      details: {
        professionalismScore: 0,
        styleCompliance: false,
        brandAlignment: 0,
        qualityIssues: ['Could not evaluate image'],
        recommendations: [],
      },
      latencyMs: Date.now() - startTime,
    }
  }
}

/**
 * Prompt Regression Judge
 * Detects quality degradation after prompt template changes
 */
export async function runPromptRegressionJudge(
  input: PromptRegressionInput,
  thresholds: EvalThresholds = DEFAULT_THRESHOLDS
): Promise<PromptRegressionJudgeResult> {
  const startTime = Date.now()

  const prompt = `You are evaluating whether a prompt change improved or degraded extraction quality.

PROMPT TYPE: ${input.promptType}

BEFORE PROMPT (first 500 chars):
${input.beforePrompt.substring(0, 500)}...

AFTER PROMPT (first 500 chars):
${input.afterPrompt.substring(0, 500)}...

TEST CASES (${input.testCases.length} total):
${JSON.stringify(input.testCases.slice(0, 3), null, 2)}

For each test case:
1. Compare beforeOutput vs afterOutput quality
2. If groundTruth is provided, check which is closer
3. Score: +1 if afterOutput is better, -1 if worse, 0 if same

Consider:
- Accuracy of extracted information
- Completeness of extraction
- Proper confidence scoring
- Correct categorization

Respond in JSON only:
{
  "case_assessments": [
    {
      "test_case_index": 0,
      "before_quality": 0.0-1.0,
      "after_quality": 0.0-1.0,
      "delta": -1/0/+1,
      "notes": "why"
    }
  ],
  "degraded_cases": 0,
  "improved_cases": 0,
  "unchanged_cases": 0,
  "critical_regressions": [
    {
      "test_case_index": 0,
      "description": "what went seriously wrong"
    }
  ],
  "quality_delta": -1.0 to +1.0,
  "recommendation": "approve/review/reject"
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
    const passed =
      result.quality_delta >= thresholds.promptRegressionTolerance &&
      result.critical_regressions.length === 0

    return {
      judge: 'prompt-regression',
      verdict: passed
        ? result.quality_delta > 0.05
          ? 'pass'
          : 'review'
        : 'fail',
      score: (result.quality_delta + 1) / 2, // Normalize -1..1 to 0..1
      issues:
        result.quality_delta < 0
          ? [`Quality decreased by ${Math.abs(result.quality_delta * 100).toFixed(0)}%`]
          : [],
      details: {
        qualityDelta: result.quality_delta,
        degradedCases: result.degraded_cases,
        improvedCases: result.improved_cases,
        unchangedCases: result.unchanged_cases,
        criticalRegressions: result.critical_regressions,
        recommendation: result.recommendation,
      },
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      judge: 'prompt-regression',
      verdict: 'review',
      score: 0.5, // Neutral score on error
      issues: [`Judge error: ${error instanceof Error ? error.message : 'Unknown'}`],
      details: {
        qualityDelta: 0,
        degradedCases: 0,
        improvedCases: 0,
        unchangedCases: 0,
        criticalRegressions: [],
        recommendation: 'review',
      },
      latencyMs: Date.now() - startTime,
    }
  }
}
