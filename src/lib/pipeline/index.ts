/**
 * Unified Upload Pipeline
 *
 * A 3-stage LLM pipeline that processes any uploaded content:
 * 1. Classification - Determines content type (kickoff, process design, technical, etc.)
 * 2. General Extraction - Extracts ALL entities into a complete JSON
 * 3. Specialized Extraction - Type-specific enhancement + checklist validation
 * 4. Tab Population - Creates ExtractedItems and structured entities
 *
 * Usage:
 *   import { runExtractionPipeline, retryPipeline } from '@/lib/pipeline'
 */

export { runExtractionPipeline, retryPipeline } from './orchestrator'
export { classifyContent, getChecklistForType } from './classify'
export { extractGeneralEntities, filterEntitiesByCategory, filterEntitiesByType } from './extract-general'
export { extractSpecializedEntities, mapToExtractedItemType } from './extract-specialized'
export { extractWithOptions, isMultiModelResult } from './extract-enhanced'
export { populateTabs, createScopeItems, getProfileSection } from './populate-tabs'

export type {
  StageProgress,
  PipelineContext,
  PipelineResult,
  ClassificationResult,
  ExtractedEntity,
  GeneralExtractionResult,
  SpecializedExtractionResult,
  SpecializedItem,
  ChecklistResult,
  PopulationResult,
  MappedIntegration,
  MappedBusinessRule,
  MappedTestCase,
  ExtractionMode,
  ExtractionOptions,
  MultiModelResult,
} from './types'

export { PipelineError, DEFAULT_EXTRACTION_OPTIONS } from './types'
