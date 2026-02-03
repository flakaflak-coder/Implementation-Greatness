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

// Document Generation Evaluation
export interface DocumentEvalInput {
  extractedData: {
    stakeholders: Array<{ name: string; role: string }>
    goals: string[]
    kpis: Array<{ name: string; target: string }>
    processSteps: string[]
    integrations: string[]
    scopeIn: string[]
    scopeOut: string[]
  }
  generatedContent: {
    executiveSummary: string
    currentState: string
    futureState: string
    processAnalysis: string
    scopeAnalysis: string
    technicalFoundation: string
    riskAssessment: string
  }
  language: string
}

export interface DocumentAlignmentJudgeResult extends JudgeResult {
  details: {
    alignmentScore: number
    fabricatedClaims: Array<{
      claim: string
      section: string
      severity: 'high' | 'medium' | 'low'
    }>
    missedDataPoints: Array<{
      dataPoint: string
      expectedSection: string
    }>
    sectionScores: Record<string, number>
  }
}

// Confidence Calibration Evaluation
export interface ConfidenceCalibrationInput {
  predictions: Array<{
    id: string
    predictedConfidence: number
    itemContent: string
    itemType: string
    sourceQuote?: string
  }>
  sourceContent: string
  contentType: string
}

export interface ConfidenceCalibrationJudgeResult extends JudgeResult {
  details: {
    calibrationScore: number
    overconfidentItems: Array<{ id: string; claimed: number; estimated: number }>
    underconfidentItems: Array<{ id: string; claimed: number; estimated: number }>
    avgCalibrationError: number
  }
}

// Avatar Quality Evaluation
export interface AvatarEvalInput {
  imageBase64: string
  deName: string
  deRole: string
  dePersonality: string[]
  brandTone: string
}

export interface AvatarQualityJudgeResult extends JudgeResult {
  details: {
    professionalismScore: number
    styleCompliance: boolean  // Not photorealistic
    brandAlignment: number
    qualityIssues: string[]
    recommendations: string[]
  }
}

// Prompt Regression Evaluation
export interface PromptRegressionInput {
  promptType: string  // EXTRACT_KICKOFF, EXTRACT_PROCESS, etc.
  beforePrompt: string
  afterPrompt: string
  testCases: Array<{
    input: string
    beforeOutput: unknown
    afterOutput: unknown
    groundTruth?: unknown
  }>
}

export interface PromptRegressionJudgeResult extends JudgeResult {
  details: {
    qualityDelta: number  // Positive = improvement, negative = regression
    degradedCases: number
    improvedCases: number
    unchangedCases: number
    criticalRegressions: Array<{
      testCaseIndex: number
      description: string
    }>
    recommendation: 'approve' | 'review' | 'reject'
  }
}

// Metrics for tracking
export interface EvalMetrics {
  classificationAccuracy: number
  hallucinationRate: number
  coverageScore: number
  stageConsistency: number
  checklistCoverage: number
  documentAlignmentScore: number
  confidenceCalibration: number
  avatarQualityScore: number
  promptRegressionDelta: number
  latencyP50: number
  latencyP99: number
}

export interface EvalThresholds {
  classificationConfidence: number  // Minimum confidence for auto-pass
  hallucinationRate: number         // Maximum acceptable hallucination rate
  coverageScore: number             // Minimum coverage score
  stageAlignment: number            // Minimum stage alignment
  checklistCoverage: number         // Minimum checklist coverage
  documentAlignment: number         // Minimum document alignment score
  confidenceCalibration: number     // Maximum calibration error
  avatarQuality: number             // Minimum avatar quality score
  promptRegressionTolerance: number // Maximum negative delta before rejection
}

export const DEFAULT_THRESHOLDS: EvalThresholds = {
  classificationConfidence: 0.7,
  hallucinationRate: 0.03,
  coverageScore: 0.75,
  stageAlignment: 0.80,
  checklistCoverage: 0.50,
  documentAlignment: 0.85,
  confidenceCalibration: 0.15,  // Max 15% avg calibration error
  avatarQuality: 0.70,
  promptRegressionTolerance: -0.10,  // Max 10% quality decrease
}
