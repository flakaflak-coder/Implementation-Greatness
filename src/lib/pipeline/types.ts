import type { ContentClassification, PipelineStage, UploadJobStatus } from '@prisma/client'

// ============================================
// Pipeline Stage Types
// ============================================

export interface StageProgress {
  stage: PipelineStage
  status: 'pending' | 'running' | 'complete' | 'error'
  percent: number
  message: string
  details?: Record<string, unknown>
}

export interface PipelineContext {
  jobId: string
  designWeekId: string
  fileBuffer: Buffer
  filename: string
  mimeType: string
  fileUrl: string
  onProgress: (progress: StageProgress) => Promise<void>
  /** Extraction options for enhanced modes */
  extractionOptions?: ExtractionOptions
}

export interface PipelineResult {
  success: boolean
  classification?: ClassificationResult
  rawExtractionId?: string
  populationResult?: PopulationResult
  error?: string
}

// ============================================
// Stage 1: Classification
// ============================================

export interface ClassificationResult {
  type: ContentClassification
  confidence: number
  keyIndicators: string[]
  missingQuestions: string[]
}

// ============================================
// Stage 2: General Extraction
// ============================================

export type ExtractionMode = 'auto' | 'standard' | 'exhaustive' | 'multi-model' | 'two-pass' | 'section-based'

export interface ExtractionOptions {
  /** Extraction mode: standard (with limits), exhaustive (no limits), multi-model, two-pass, or section-based */
  mode: ExtractionMode
  /** For multi-model: which models to use */
  models?: ('gemini' | 'claude')[]
  /** For two-pass: include second pass for missed items */
  secondPassEnabled?: boolean
}

export const DEFAULT_EXTRACTION_OPTIONS: ExtractionOptions = {
  mode: 'standard',
}

export interface MultiModelResult {
  gemini?: GeneralExtractionResult
  claude?: GeneralExtractionResult
  merged: GeneralExtractionResult
  comparison: {
    onlyGemini: ExtractedEntity[]
    onlyClaude: ExtractedEntity[]
    both: ExtractedEntity[]
  }
}

export interface ExtractedEntity {
  id: string
  category: string
  type: string
  content: string
  confidence: number
  sourceQuote?: string
  sourceSpeaker?: string
  sourceTimestamp?: number
  structuredData?: Record<string, unknown>
}

export interface GeneralExtractionResult {
  entities: ExtractedEntity[]
  summary: {
    totalEntities: number
    byCategory: Record<string, number>
    processingTime: number
    tokensUsed: {
      input: number
      output: number
    }
  }
}

// ============================================
// Stage 3: Specialized Extraction
// ============================================

export interface SpecializedExtractionResult {
  extractedItems: SpecializedItem[]
  checklist: ChecklistResult
}

export interface SpecializedItem {
  type: string
  content: string
  confidence: number
  sourceQuote?: string
  sourceSpeaker?: string
  sourceTimestamp?: number
  structuredData?: Record<string, unknown>
}

export interface ChecklistResult {
  questionsAsked: string[]
  questionsMissing: string[]
  coverageScore: number
}

// ============================================
// Tab Population
// ============================================

export interface PopulationResult {
  extractedItems: number
  integrations: number
  businessRules: number
  testCases: number
  warnings: string[]
}

// ============================================
// Entity Mapping Types
// ============================================

export interface MappedIntegration {
  systemName: string
  purpose: 'read' | 'write' | 'read_write'
  connectionType: 'rest_api' | 'graphql' | 'database' | 'file' | 'webhook' | 'other'
  baseUrl?: string
  authMethod?: 'oauth2' | 'api_key' | 'basic_auth' | 'jwt' | 'none' | 'other'
  environment: 'production' | 'staging' | 'development'
  notes?: string
  sourceItemId?: string
}

export interface MappedBusinessRule {
  name: string
  category: 'validation' | 'calculation' | 'routing' | 'escalation' | 'compliance' | 'other'
  priority: 'critical' | 'high' | 'medium' | 'low'
  condition: string
  action: string
  exceptions?: string
  examples?: string
  sourceItemId?: string
}

export interface MappedTestCase {
  name: string
  type: 'happy_path' | 'exception' | 'guardrail' | 'scope' | 'boundary'
  priority: 'critical' | 'high' | 'medium' | 'low'
  preconditions?: string
  steps: string[]
  expectedResult: string
  sourceItemId?: string
}

// ============================================
// Error Types
// ============================================

export class PipelineError extends Error {
  stage: PipelineStage
  retryable: boolean

  constructor(message: string, stage: PipelineStage, retryable = true) {
    super(message)
    this.name = 'PipelineError'
    this.stage = stage
    this.retryable = retryable
  }
}
