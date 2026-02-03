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
 *   // Full extraction evaluation (async, uses LLM judges)
 *   const result = await evaluatePipeline(jobId, classInput, extractInput, specInput)
 *
 *   // Quick evaluation (sync, automated checks only)
 *   const quick = quickEvaluate(confidence, entityCount, coverage)
 *
 *   // Document generation evaluation
 *   const docResult = await evaluateDocumentGeneration({ documentInput, jobId })
 *
 *   // Avatar evaluation
 *   const avatarResult = await evaluateAvatarGeneration({ avatarInput, jobId })
 *
 *   // Prompt regression testing
 *   const promptResult = await evaluatePromptChange({ promptInput, jobId })
 */

export {
  evaluatePipeline,
  evaluateClassification,
  evaluateExtraction,
  evaluateSpecialized,
  quickEvaluate,
} from './evaluator'

// New orchestrator functions
export {
  evaluateExtraction as evaluateExtractionPipeline,
  evaluateDocumentGeneration,
  evaluateAvatarGeneration,
  evaluatePromptChange,
  quickEvaluate as quickEvaluateOrchestrated,
} from './orchestrator'

export {
  runClassificationJudge,
  runHallucinationJudge,
  runCoverageJudge,
  runConsistencyJudge,
  // New judges
  runConfidenceCalibrationJudge,
  runDocumentAlignmentJudge,
  runAvatarQualityJudge,
  runPromptRegressionJudge,
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
  // New types
  DocumentEvalInput,
  DocumentAlignmentJudgeResult,
  ConfidenceCalibrationInput,
  ConfidenceCalibrationJudgeResult,
  AvatarEvalInput,
  AvatarQualityJudgeResult,
  PromptRegressionInput,
  PromptRegressionJudgeResult,
  EvalThresholds,
  EvalMetrics,
} from './types'

export { DEFAULT_THRESHOLDS } from './types'
