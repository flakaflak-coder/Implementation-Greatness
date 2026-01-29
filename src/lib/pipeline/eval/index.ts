/**
 * LLM Evaluation Pipeline
 *
 * Provides quality assurance for the extraction pipeline through
 * LLM judges that verify classification, check for hallucinations,
 * measure coverage, and ensure stage consistency.
 *
 * Usage:
 *   import { evaluatePipeline, quickEvaluate } from '@/lib/pipeline/eval'
 *
 *   // Full evaluation (async, uses LLM judges)
 *   const result = await evaluatePipeline(jobId, classInput, extractInput, specInput)
 *
 *   // Quick evaluation (sync, automated checks only)
 *   const quick = quickEvaluate(confidence, entityCount, coverage)
 */

export {
  evaluatePipeline,
  evaluateClassification,
  evaluateExtraction,
  evaluateSpecialized,
  quickEvaluate,
} from './evaluator'

export {
  runClassificationJudge,
  runHallucinationJudge,
  runCoverageJudge,
  runConsistencyJudge,
  validateSchema,
  checkConfidenceGate,
} from './judges'

export type {
  Verdict,
  JudgeResult,
  EvalResult,
  PipelineEvalResult,
  ClassificationEvalInput,
  ExtractionEvalInput,
  SpecializedEvalInput,
  EvalThresholds,
  EvalMetrics,
} from './types'

export { DEFAULT_THRESHOLDS } from './types'
