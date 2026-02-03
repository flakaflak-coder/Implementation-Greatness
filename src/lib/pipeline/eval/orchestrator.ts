/**
 * Evaluation Pipeline Orchestrator
 *
 * Coordinates running multiple judges and aggregates results.
 * Supports both extraction evaluation and document generation evaluation.
 */

import {
  runClassificationJudge,
  runHallucinationJudge,
  runCoverageJudge,
  runConsistencyJudge,
  runConfidenceCalibrationJudge,
  runDocumentAlignmentJudge,
  runAvatarQualityJudge,
  runPromptRegressionJudge,
  validateSchema,
  checkConfidenceGate,
} from './judges'
import type {
  ClassificationEvalInput,
  ExtractionEvalInput,
  SpecializedEvalInput,
  DocumentEvalInput,
  ConfidenceCalibrationInput,
  AvatarEvalInput,
  PromptRegressionInput,
  EvalResult,
  JudgeResult,
  EvalThresholds,
  PipelineEvalResult,
} from './types'
import { DEFAULT_THRESHOLDS } from './types'
import { trackLLMOperationServer } from '@/lib/observatory/tracking'

export interface ExtractionEvalConfig {
  classificationInput?: ClassificationEvalInput
  extractionInput: ExtractionEvalInput
  specializedInput?: SpecializedEvalInput
  confidenceInput?: ConfidenceCalibrationInput
  thresholds?: Partial<EvalThresholds>
  jobId: string
}

export interface DocumentEvalConfig {
  documentInput: DocumentEvalInput
  thresholds?: Partial<EvalThresholds>
  jobId: string
}

export interface AvatarEvalConfig {
  avatarInput: AvatarEvalInput
  thresholds?: Partial<EvalThresholds>
  jobId: string
}

export interface PromptEvalConfig {
  promptInput: PromptRegressionInput
  thresholds?: Partial<EvalThresholds>
  jobId: string
}

/**
 * Run full extraction evaluation pipeline
 */
export async function evaluateExtraction(
  config: ExtractionEvalConfig
): Promise<PipelineEvalResult> {
  const startTime = Date.now()
  const thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds }
  const results: { [stage: string]: JudgeResult[] } = {
    classification: [],
    extraction: [],
    specialized: [],
  }
  const allIssues: string[] = []

  // Stage 1: Classification evaluation
  if (config.classificationInput) {
    const [classJudge, confidenceGate] = await Promise.all([
      runClassificationJudge(config.classificationInput, thresholds),
      Promise.resolve(
        checkConfidenceGate(
          config.classificationInput.confidence,
          thresholds.classificationConfidence
        )
      ),
    ])

    results.classification.push(classJudge)
    if (!confidenceGate.passed) {
      allIssues.push(`Confidence gate: ${confidenceGate.recommendation}`)
    }
    allIssues.push(...classJudge.issues)
  }

  // Stage 2: Extraction evaluation (parallel)
  const [schemaValidation, hallucinationJudge, coverageJudge, calibrationJudge] =
    await Promise.all([
      Promise.resolve(validateSchema(config.extractionInput.entities)),
      runHallucinationJudge(config.extractionInput),
      runCoverageJudge(config.extractionInput, thresholds),
      config.confidenceInput
        ? runConfidenceCalibrationJudge(config.confidenceInput, thresholds)
        : Promise.resolve(null),
    ])

  if (!schemaValidation.valid) {
    results.extraction.push({
      judge: 'schema-validation',
      verdict: 'fail',
      score: 0,
      issues: schemaValidation.issues,
      details: { valid: false },
      latencyMs: 0,
    })
  }

  results.extraction.push(hallucinationJudge, coverageJudge)
  if (calibrationJudge) {
    results.extraction.push(calibrationJudge)
  }

  allIssues.push(
    ...hallucinationJudge.issues,
    ...coverageJudge.issues,
    ...(calibrationJudge?.issues || [])
  )

  // Stage 3: Specialized extraction evaluation
  if (config.specializedInput) {
    const consistencyJudge = await runConsistencyJudge(
      config.specializedInput,
      thresholds
    )
    results.specialized.push(consistencyJudge)
    allIssues.push(...consistencyJudge.issues)
  }

  // Aggregate results
  const allJudges = [
    ...results.classification,
    ...results.extraction,
    ...results.specialized,
  ]

  const overallScore =
    allJudges.length > 0
      ? allJudges.reduce((sum, j) => sum + j.score, 0) / allJudges.length
      : 0

  const criticalIssues = allIssues.filter(
    (i) =>
      i.includes('hallucinated') ||
      i.includes('CRITICAL') ||
      i.toLowerCase().includes('fail')
  )

  const overallPassed =
    allJudges.every((j) => j.verdict !== 'fail') && criticalIssues.length === 0

  // Track in observatory
  trackLLMOperationServer({
    pipelineName: 'extraction_evaluation',
    model: 'claude-haiku',
    inputTokens: 0, // Judge operations don't track tokens individually
    outputTokens: 0,
    latencyMs: Date.now() - startTime,
    success: overallPassed,
    metadata: {
      jobId: config.jobId,
      judgeCount: allJudges.length,
      overallScore,
    },
  })

  return {
    jobId: config.jobId,
    overallPassed,
    overallScore,
    stages: {
      classification: {
        passed: results.classification.every((j) => j.verdict !== 'fail'),
        overallScore:
          results.classification.length > 0
            ? results.classification.reduce((s, j) => s + j.score, 0) /
              results.classification.length
            : 1,
        verdicts: results.classification,
        criticalIssues: results.classification.flatMap((j) => j.issues),
        metadata: {
          jobId: config.jobId,
          stage: 'classification',
          timestamp: new Date(),
          totalLatencyMs: results.classification.reduce(
            (s, j) => s + j.latencyMs,
            0
          ),
        },
      },
      extraction: {
        passed: results.extraction.every((j) => j.verdict !== 'fail'),
        overallScore:
          results.extraction.length > 0
            ? results.extraction.reduce((s, j) => s + j.score, 0) /
              results.extraction.length
            : 1,
        verdicts: results.extraction,
        criticalIssues: results.extraction.flatMap((j) => j.issues),
        metadata: {
          jobId: config.jobId,
          stage: 'extraction',
          timestamp: new Date(),
          totalLatencyMs: results.extraction.reduce((s, j) => s + j.latencyMs, 0),
        },
      },
      specialized: {
        passed: results.specialized.every((j) => j.verdict !== 'fail'),
        overallScore:
          results.specialized.length > 0
            ? results.specialized.reduce((s, j) => s + j.score, 0) /
              results.specialized.length
            : 1,
        verdicts: results.specialized,
        criticalIssues: results.specialized.flatMap((j) => j.issues),
        metadata: {
          jobId: config.jobId,
          stage: 'specialized',
          timestamp: new Date(),
          totalLatencyMs: results.specialized.reduce((s, j) => s + j.latencyMs, 0),
        },
      },
    },
    recommendations: generateRecommendations(allJudges),
    requiresHumanReview:
      allJudges.some((j) => j.verdict === 'review') || criticalIssues.length > 0,
  }
}

/**
 * Evaluate document generation quality
 */
export async function evaluateDocumentGeneration(
  config: DocumentEvalConfig
): Promise<EvalResult> {
  const startTime = Date.now()
  const thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds }

  const judge = await runDocumentAlignmentJudge(config.documentInput, thresholds)

  trackLLMOperationServer({
    pipelineName: 'document_evaluation',
    model: 'claude-sonnet',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: Date.now() - startTime,
    success: judge.verdict !== 'fail',
    metadata: {
      jobId: config.jobId,
      alignmentScore: judge.score,
    },
  })

  return {
    passed: judge.verdict !== 'fail',
    overallScore: judge.score,
    verdicts: [judge],
    criticalIssues: judge.issues.filter((i) => i.includes('HIGH')),
    metadata: {
      jobId: config.jobId,
      stage: 'document-generation',
      timestamp: new Date(),
      totalLatencyMs: judge.latencyMs,
    },
  }
}

/**
 * Evaluate avatar generation quality
 */
export async function evaluateAvatarGeneration(
  config: AvatarEvalConfig
): Promise<EvalResult> {
  const startTime = Date.now()
  const thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds }

  const judge = await runAvatarQualityJudge(config.avatarInput, thresholds)

  trackLLMOperationServer({
    pipelineName: 'avatar_evaluation',
    model: 'claude-sonnet',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: Date.now() - startTime,
    success: judge.verdict !== 'fail',
    metadata: {
      jobId: config.jobId,
      qualityScore: judge.score,
    },
  })

  return {
    passed: judge.verdict !== 'fail',
    overallScore: judge.score,
    verdicts: [judge],
    criticalIssues: judge.issues.filter((i) => i.includes('CRITICAL')),
    metadata: {
      jobId: config.jobId,
      stage: 'avatar-generation',
      timestamp: new Date(),
      totalLatencyMs: judge.latencyMs,
    },
  }
}

/**
 * Evaluate prompt template change
 */
export async function evaluatePromptChange(
  config: PromptEvalConfig
): Promise<EvalResult> {
  const startTime = Date.now()
  const thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds }

  const judge = await runPromptRegressionJudge(config.promptInput, thresholds)

  trackLLMOperationServer({
    pipelineName: 'prompt_evaluation',
    model: 'claude-haiku',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: Date.now() - startTime,
    success: judge.verdict !== 'fail',
    metadata: {
      jobId: config.jobId,
      qualityDelta: judge.details.qualityDelta,
    },
  })

  return {
    passed: judge.verdict !== 'fail',
    overallScore: judge.score,
    verdicts: [judge],
    criticalIssues: judge.issues,
    metadata: {
      jobId: config.jobId,
      stage: 'prompt-evaluation',
      timestamp: new Date(),
      totalLatencyMs: judge.latencyMs,
    },
  }
}

/**
 * Generate recommendations based on judge results
 */
function generateRecommendations(judges: JudgeResult[]): string[] {
  const recommendations: string[] = []

  for (const judge of judges) {
    if (judge.verdict === 'fail') {
      switch (judge.judge) {
        case 'classification':
          recommendations.push(
            'Review classification logic or add training examples for this content type'
          )
          break
        case 'hallucination':
          recommendations.push(
            'Strengthen source verification in extraction prompts'
          )
          break
        case 'coverage':
          recommendations.push(
            'Review extraction prompts for completeness, consider adding checklist items'
          )
          break
        case 'consistency':
          recommendations.push(
            'Check Stage 2 → Stage 3 mapping logic for information loss'
          )
          break
        case 'confidence-calibration':
          recommendations.push(
            'Recalibrate confidence scoring guidance in prompts'
          )
          break
        case 'document-alignment':
          recommendations.push(
            'Add explicit grounding constraints in document generation prompt'
          )
          break
        case 'avatar-quality':
          recommendations.push(
            'Update avatar generation prompt to enforce non-photorealistic style'
          )
          break
        case 'prompt-regression':
          recommendations.push('Revert prompt change or investigate degradation')
          break
      }
    } else if (judge.verdict === 'review') {
      recommendations.push(
        `Manual review recommended for ${judge.judge}: ${judge.issues[0] || 'borderline scores'}`
      )
    }
  }

  return [...new Set(recommendations)] // Deduplicate
}

/**
 * Quick evaluation for real-time feedback (runs subset of judges)
 */
export async function quickEvaluate(
  extractionInput: ExtractionEvalInput,
  sampleSize: number = 3
): Promise<{ passed: boolean; score: number; topIssue: string | null }> {
  const startTime = Date.now()

  // Run only hallucination check on small sample
  const result = await runHallucinationJudge(extractionInput, sampleSize)

  trackLLMOperationServer({
    pipelineName: 'quick_evaluation',
    model: 'claude-haiku',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: Date.now() - startTime,
    success: result.verdict !== 'fail',
    metadata: { sampleSize },
  })

  return {
    passed: result.verdict !== 'fail',
    score: result.score,
    topIssue: result.issues[0] || null,
  }
}
