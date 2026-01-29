/**
 * Evaluation Pipeline Types
 *
 * Types for the LLM evaluation system that verifies extraction quality.
 */

export type Verdict = 'pass' | 'fail' | 'review'

export interface JudgeResult {
  judge: string
  verdict: Verdict
  score: number
  issues: string[]
  details: Record<string, unknown>
  latencyMs: number
}

export interface EvalResult {
  passed: boolean
  overallScore: number
  verdicts: JudgeResult[]
  criticalIssues: string[]
  metadata: {
    jobId: string
    stage: string
    timestamp: Date
    totalLatencyMs: number
  }
}

// Stage 1: Classification Evaluation
export interface ClassificationEvalInput {
  contentExcerpt: string
  classificationType: string
  confidence: number
  keyIndicators: string[]
}

export interface ClassificationJudgeResult extends JudgeResult {
  details: {
    classificationCorrect: boolean
    correctType: string | null
    indicatorsVerified: boolean
    confidenceAppropriate: boolean
  }
}

// Stage 2: Extraction Evaluation
export interface ExtractionEvalInput {
  sourceContent: string
  contentType: string
  entities: Array<{
    id: string
    category: string
    type: string
    content: string
    sourceQuote?: string
    sourceSpeaker?: string
  }>
  summary: {
    totalEntities: number
    byCategory: Record<string, number>
  }
}

export interface HallucinationJudgeResult extends JudgeResult {
  details: {
    entitiesChecked: number
    hallucinatedCount: number
    entities: Array<{
      id: string
      foundInSource: boolean
      quoteAccurate: boolean
      speakerCorrect: boolean
      issue?: string
    }>
  }
}

export interface CoverageJudgeResult extends JudgeResult {
  details: {
    coverageScore: number
    missedEntities: Array<{
      content: string
      category: string
      quote: string
    }>
  }
}

// Stage 3: Specialized Extraction Evaluation
export interface SpecializedEvalInput {
  stage2Summary: {
    totalEntities: number
    byCategory: Record<string, number>
  }
  stage3Items: Array<{
    type: string
    content: string
    confidence: number
  }>
  checklist: {
    questionsAsked: string[]
    questionsMissing: string[]
    coverageScore: number
  }
}

export interface ConsistencyJudgeResult extends JudgeResult {
  details: {
    stageAlignment: number
    orphanedEntities: string[]
    inconsistencies: string[]
  }
}

// Aggregated Pipeline Evaluation
export interface PipelineEvalResult {
  jobId: string
  overallPassed: boolean
  overallScore: number
  stages: {
    classification: EvalResult
    extraction: EvalResult
    specialized: EvalResult
  }
  recommendations: string[]
  requiresHumanReview: boolean
}

// Metrics for tracking
export interface EvalMetrics {
  classificationAccuracy: number
  hallucinationRate: number
  coverageScore: number
  stageConsistency: number
  checklistCoverage: number
  latencyP50: number
  latencyP99: number
}

export interface EvalThresholds {
  classificationConfidence: number  // Minimum confidence for auto-pass
  hallucinationRate: number         // Maximum acceptable hallucination rate
  coverageScore: number             // Minimum coverage score
  stageAlignment: number            // Minimum stage alignment
  checklistCoverage: number         // Minimum checklist coverage
}

export const DEFAULT_THRESHOLDS: EvalThresholds = {
  classificationConfidence: 0.7,
  hallucinationRate: 0.03,
  coverageScore: 0.75,
  stageAlignment: 0.80,
  checklistCoverage: 0.50,
}
