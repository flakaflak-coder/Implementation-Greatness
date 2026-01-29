/**
 * Pipeline Evaluator
 *
 * Orchestrates all judges to evaluate extraction pipeline quality.
 */

import type {
  EvalResult,
  PipelineEvalResult,
  ClassificationEvalInput,
  ExtractionEvalInput,
  SpecializedEvalInput,
  EvalThresholds,
  JudgeResult,
} from './types'
import { DEFAULT_THRESHOLDS } from './types'
import {
  runClassificationJudge,
  runHallucinationJudge,
  runCoverageJudge,
  runConsistencyJudge,
  validateSchema,
  checkConfidenceGate,
} from './judges'

export interface EvaluatorConfig {
  thresholds: EvalThresholds
  sampleRate: {
    hallucination: number  // 0-1, percentage of jobs to check
    qualityGate: number    // 0-1, percentage for deep quality check
  }
  enabledJudges: {
    classification: boolean
    hallucination: boolean
    coverage: boolean
    consistency: boolean
  }
}

const DEFAULT_CONFIG: EvaluatorConfig = {
  thresholds: DEFAULT_THRESHOLDS,
  sampleRate: {
    hallucination: 0.2,  // Check 20% of jobs
    qualityGate: 0.1,    // Deep check 10% of jobs
  },
  enabledJudges: {
    classification: true,
    hallucination: true,
    coverage: true,
    consistency: true,
  },
}

/**
 * Evaluate Stage 1: Classification
 */
export async function evaluateClassification(
  input: ClassificationEvalInput,
  config: EvaluatorConfig = DEFAULT_CONFIG
): Promise<EvalResult> {
  const startTime = Date.now()
  const verdicts: JudgeResult[] = []
  const criticalIssues: string[] = []

  // Automated: Confidence gate
  const confidenceCheck = checkConfidenceGate(
    input.confidence,
    config.thresholds.classificationConfidence
  )

  if (!confidenceCheck.passed) {
    criticalIssues.push(confidenceCheck.recommendation)
  }

  // LLM Judge: Classification correctness
  if (config.enabledJudges.classification) {
    const classificationResult = await runClassificationJudge(input, config.thresholds)
    verdicts.push(classificationResult)

    if (classificationResult.verdict === 'fail') {
      criticalIssues.push(...classificationResult.issues)
    }
  }

  const overallScore = verdicts.length > 0
    ? verdicts.reduce((sum, v) => sum + v.score, 0) / verdicts.length
    : confidenceCheck.passed ? 0.8 : 0.4

  return {
    passed: criticalIssues.length === 0 && verdicts.every(v => v.verdict !== 'fail'),
    overallScore,
    verdicts,
    criticalIssues,
    metadata: {
      jobId: '',
      stage: 'classification',
      timestamp: new Date(),
      totalLatencyMs: Date.now() - startTime,
    },
  }
}

/**
 * Evaluate Stage 2: General Extraction
 */
export async function evaluateExtraction(
  input: ExtractionEvalInput,
  config: EvaluatorConfig = DEFAULT_CONFIG
): Promise<EvalResult> {
  const startTime = Date.now()
  const verdicts: JudgeResult[] = []
  const criticalIssues: string[] = []

  // Automated: Schema validation
  const schemaCheck = validateSchema(input.entities)
  if (!schemaCheck.valid) {
    criticalIssues.push(...schemaCheck.issues.slice(0, 3))
  }

  // LLM Judge: Hallucination check (sampled)
  if (config.enabledJudges.hallucination && Math.random() < config.sampleRate.hallucination) {
    const hallucinationResult = await runHallucinationJudge(input)
    verdicts.push(hallucinationResult)

    if (hallucinationResult.details.hallucinatedCount > 0) {
      criticalIssues.push(
        `${hallucinationResult.details.hallucinatedCount} hallucinated entities detected`
      )
    }
  }

  // LLM Judge: Coverage check
  if (config.enabledJudges.coverage) {
    const coverageResult = await runCoverageJudge(input, config.thresholds)
    verdicts.push(coverageResult)

    if (coverageResult.verdict === 'fail') {
      criticalIssues.push(`Low coverage: ${coverageResult.details.coverageScore}`)
    }
  }

  const overallScore = verdicts.length > 0
    ? verdicts.reduce((sum, v) => sum + v.score, 0) / verdicts.length
    : schemaCheck.valid ? 0.7 : 0.3

  return {
    passed: criticalIssues.length === 0 && verdicts.every(v => v.verdict !== 'fail'),
    overallScore,
    verdicts,
    criticalIssues,
    metadata: {
      jobId: '',
      stage: 'extraction',
      timestamp: new Date(),
      totalLatencyMs: Date.now() - startTime,
    },
  }
}

/**
 * Evaluate Stage 3: Specialized Extraction
 */
export async function evaluateSpecialized(
  input: SpecializedEvalInput,
  config: EvaluatorConfig = DEFAULT_CONFIG
): Promise<EvalResult> {
  const startTime = Date.now()
  const verdicts: JudgeResult[] = []
  const criticalIssues: string[] = []

  // Automated: Checklist coverage check
  if (input.checklist.coverageScore < config.thresholds.checklistCoverage) {
    criticalIssues.push(
      `Low checklist coverage: ${Math.round(input.checklist.coverageScore * 100)}%`
    )
  }

  // LLM Judge: Consistency check
  if (config.enabledJudges.consistency) {
    const consistencyResult = await runConsistencyJudge(input, config.thresholds)
    verdicts.push(consistencyResult)

    if (consistencyResult.verdict === 'fail') {
      criticalIssues.push(...consistencyResult.issues.slice(0, 3))
    }
  }

  const overallScore = verdicts.length > 0
    ? verdicts.reduce((sum, v) => sum + v.score, 0) / verdicts.length
    : input.checklist.coverageScore

  return {
    passed: criticalIssues.length === 0 && verdicts.every(v => v.verdict !== 'fail'),
    overallScore,
    verdicts,
    criticalIssues,
    metadata: {
      jobId: '',
      stage: 'specialized',
      timestamp: new Date(),
      totalLatencyMs: Date.now() - startTime,
    },
  }
}

/**
 * Full Pipeline Evaluation
 *
 * Evaluates all stages and provides aggregated results.
 */
export async function evaluatePipeline(
  jobId: string,
  classificationInput: ClassificationEvalInput,
  extractionInput: ExtractionEvalInput,
  specializedInput: SpecializedEvalInput,
  config: EvaluatorConfig = DEFAULT_CONFIG
): Promise<PipelineEvalResult> {
  // Run evaluations in parallel where possible
  const [classificationResult, extractionResult, specializedResult] = await Promise.all([
    evaluateClassification(classificationInput, config),
    evaluateExtraction(extractionInput, config),
    evaluateSpecialized(specializedInput, config),
  ])

  // Update job IDs
  classificationResult.metadata.jobId = jobId
  extractionResult.metadata.jobId = jobId
  specializedResult.metadata.jobId = jobId

  // Calculate overall score (weighted)
  const overallScore =
    classificationResult.overallScore * 0.2 +
    extractionResult.overallScore * 0.5 +
    specializedResult.overallScore * 0.3

  // Determine if human review is needed
  const requiresHumanReview =
    !classificationResult.passed ||
    !extractionResult.passed ||
    extractionResult.verdicts.some(v => v.verdict === 'review') ||
    overallScore < 0.7

  // Generate recommendations
  const recommendations: string[] = []

  if (!classificationResult.passed) {
    recommendations.push('Review classification - may need re-processing')
  }

  if (extractionResult.criticalIssues.some(i => i.includes('hallucinated'))) {
    recommendations.push('CRITICAL: Hallucinations detected - verify extracted entities')
  }

  if (specializedResult.criticalIssues.some(i => i.includes('coverage'))) {
    recommendations.push('Consider follow-up session to cover missing topics')
  }

  const orphaned = specializedResult.verdicts
    .filter(v => v.judge === 'consistency')
    .flatMap(v => (v.details as { orphanedEntities?: string[] }).orphanedEntities || [])

  if (orphaned.length > 0) {
    recommendations.push(`Stage 2 categories not in Stage 3: ${orphaned.join(', ')}`)
  }

  return {
    jobId,
    overallPassed: classificationResult.passed && extractionResult.passed && specializedResult.passed,
    overallScore,
    stages: {
      classification: classificationResult,
      extraction: extractionResult,
      specialized: specializedResult,
    },
    recommendations,
    requiresHumanReview,
  }
}

/**
 * Quick evaluation for real-time feedback
 * Only runs automated checks, no LLM judges
 */
export function quickEvaluate(
  classificationConfidence: number,
  entityCount: number,
  checklistCoverage: number
): {
  passed: boolean
  score: number
  issues: string[]
} {
  const issues: string[] = []

  if (classificationConfidence < 0.7) {
    issues.push('Low classification confidence')
  }

  if (entityCount < 5) {
    issues.push('Very few entities extracted')
  }

  if (checklistCoverage < 0.5) {
    issues.push('Low checklist coverage')
  }

  const score =
    (classificationConfidence * 0.3) +
    (Math.min(entityCount / 20, 1) * 0.3) +
    (checklistCoverage * 0.4)

  return {
    passed: issues.length === 0,
    score,
    issues,
  }
}
