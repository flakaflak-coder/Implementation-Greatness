import { prisma } from '@/lib/db'
import { PipelineStage, UploadJobStatus, ContentClassification, DesignWeekStatus } from '@prisma/client'
import { classifyContent } from './classify'
import { extractGeneralEntities } from './extract-general'
import { extractSpecializedEntities } from './extract-specialized'
import { extractWithOptions, isMultiModelResult } from './extract-enhanced'
import { populateTabs } from './populate-tabs'
import { calculateDesignWeekEndDate, calculateActualDuration } from '@/lib/phase-durations'
import type {
  PipelineContext,
  PipelineResult,
  StageProgress,
  PipelineError,
  GeneralExtractionResult,
  ExtractedEntity,
  SpecializedItem,
  ExtractionMode,
} from './types'

/**
 * Map content classification to Design Week phase
 */
const CLASSIFICATION_TO_PHASE: Record<ContentClassification, number> = {
  KICKOFF_SESSION: 1,
  PROCESS_DESIGN_SESSION: 2,
  SKILLS_GUARDRAILS_SESSION: 2, // Part of Process Design
  PERSONA_DESIGN_SESSION: 2, // Part of Process Design (persona/conversational design)
  TECHNICAL_SESSION: 3,
  SIGNOFF_SESSION: 4,
  SALES_HANDOVER_DOCUMENT: 0, // Pre-Design-Week, does not advance phase
  REQUIREMENTS_DOCUMENT: 1, // Typically part of Kickoff
  TECHNICAL_SPEC: 3,
  PROCESS_DOCUMENT: 2,
  UNKNOWN: 1,
}

/**
 * Enhanced extraction modes that already do comprehensive extraction
 * and don't need Stage 3 (Specialized Extraction)
 */
const SKIP_STAGE3_MODES: ExtractionMode[] = ['auto', 'exhaustive', 'multi-model', 'two-pass', 'section-based']

/**
 * Convert ExtractedEntity from Stage 2 to SpecializedItem for Stage 4
 * (skipping Stage 3)
 */
function convertEntitiesToItems(entities: ExtractedEntity[]): SpecializedItem[] {
  return entities.map(entity => ({
    type: entity.type,
    content: entity.content,
    confidence: entity.confidence,
    sourceQuote: entity.sourceQuote,
    sourceSpeaker: entity.sourceSpeaker,
    sourceTimestamp: entity.sourceTimestamp,
    structuredData: entity.structuredData,
  }))
}

/**
 * Main pipeline orchestrator - coordinates all 3 stages
 */
export async function runExtractionPipeline(ctx: PipelineContext): Promise<PipelineResult> {
  const { jobId, designWeekId, fileBuffer, filename, mimeType, onProgress, extractionOptions } = ctx
  const extractionMode = extractionOptions?.mode || 'standard'

  console.log(`\n${'='.repeat(60)}`)
  console.log(`[Pipeline] Starting extraction for job ${jobId}`)
  console.log(`[Pipeline] File: ${filename} (${mimeType}, ${fileBuffer.length} bytes)`)
  console.log(`${'='.repeat(60)}\n`)

  try {
    // ============================================
    // Stage 1: Classification
    // ============================================
    console.log('\n[Pipeline] === STAGE 1: CLASSIFICATION ===')
    await updateJobStatus(jobId, 'CLASSIFYING', 'CLASSIFICATION')
    await onProgress({
      stage: 'CLASSIFICATION',
      status: 'running',
      percent: 0,
      message: 'Analyzing content type...',
    })

    const classification = await classifyContent(fileBuffer, mimeType, filename)
    console.log(`[Pipeline] Classification complete: ${classification.type} (${classification.confidence} confidence)`)

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { classificationResult: classification as object },
    })

    await onProgress({
      stage: 'CLASSIFICATION',
      status: 'complete',
      percent: 100,
      message: `Classified as: ${formatClassificationType(classification.type)}`,
      details: {
        type: classification.type,
        confidence: classification.confidence,
        missingQuestions: classification.missingQuestions,
      },
    })

    // ============================================
    // Stage 2: General Extraction
    // ============================================
    console.log('\n[Pipeline] === STAGE 2: GENERAL EXTRACTION ===')
    console.log(`[Pipeline] Extraction mode: ${extractionMode}`)
    await updateJobStatus(jobId, 'EXTRACTING_GENERAL', 'GENERAL_EXTRACTION')
    await onProgress({
      stage: 'GENERAL_EXTRACTION',
      status: 'running',
      percent: 0,
      message: `Extracting entities (${extractionMode} mode)...`,
    })

    // Use enhanced extraction if mode is not standard
    let generalExtraction: GeneralExtractionResult
    if (extractionOptions && extractionOptions.mode !== 'standard') {
      const result = await extractWithOptions(
        fileBuffer,
        mimeType,
        classification,
        extractionOptions,
        (percent, entityCount) => {
          onProgress({
            stage: 'GENERAL_EXTRACTION',
            status: 'running',
            percent,
            message: entityCount > 0 ? `Analyzing content (${extractionMode})...` : 'Starting extraction...',
            details: { entityCount, mode: extractionMode },
          })
        }
      )
      // For multi-model, use the merged result
      generalExtraction = isMultiModelResult(result) ? result.merged : result
    } else {
      generalExtraction = await extractGeneralEntities(
        fileBuffer,
        mimeType,
        classification,
        (percent, entityCount) => {
          onProgress({
            stage: 'GENERAL_EXTRACTION',
            status: 'running',
            percent,
            message: entityCount > 0 ? `Analyzing content...` : 'Starting extraction...',
            details: { entityCount },
          })
        }
      )
    }

    // Save raw extraction to database
    const rawExtraction = await prisma.rawExtraction.create({
      data: {
        designWeekId,
        contentType: classification.type,
        sourceFileName: filename,
        sourceMimeType: mimeType,
        rawJson: generalExtraction as object,
        metadata: {
          tokensUsed: generalExtraction.summary.tokensUsed,
          processingTime: generalExtraction.summary.processingTime,
        },
      },
    })

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { rawExtractionId: rawExtraction.id },
    })

    await onProgress({
      stage: 'GENERAL_EXTRACTION',
      status: 'complete',
      percent: 100,
      message: `Extracted ${generalExtraction.summary.totalEntities} entities`,
      details: {
        byCategory: generalExtraction.summary.byCategory,
        tokensUsed: generalExtraction.summary.tokensUsed,
      },
    })

    // ============================================
    // Stage 3: Specialized Extraction (skipped for enhanced modes)
    // ============================================
    const skipStage3 = SKIP_STAGE3_MODES.includes(extractionMode as ExtractionMode)
    let itemsForPopulation: SpecializedItem[]

    if (skipStage3) {
      // Enhanced modes already do comprehensive extraction - skip Stage 3
      console.log('\n[Pipeline] === STAGE 3: SKIPPED (enhanced extraction mode) ===')
      console.log(`[Pipeline] Mode "${extractionMode}" provides comprehensive extraction, skipping specialized pass`)

      await onProgress({
        stage: 'SPECIALIZED_EXTRACTION',
        status: 'complete',
        percent: 100,
        message: `Skipped (${extractionMode} mode is comprehensive)`,
        details: { skipped: true, reason: 'enhanced_extraction_mode' },
      })

      // Convert entities directly to items
      itemsForPopulation = convertEntitiesToItems(generalExtraction.entities)
    } else {
      // Standard mode - run Stage 3
      console.log('\n[Pipeline] === STAGE 3: SPECIALIZED EXTRACTION ===')
      console.log(`[Pipeline] Processing ${generalExtraction.entities.length} entities for ${classification.type}`)
      await updateJobStatus(jobId, 'EXTRACTING_SPECIALIZED', 'SPECIALIZED_EXTRACTION')
      await onProgress({
        stage: 'SPECIALIZED_EXTRACTION',
        status: 'running',
        percent: 0,
        message: 'Running specialized extraction...',
      })

      // Stage 3 only uses extracted entities (no file) to avoid rate limits
      const specializedResult = await extractSpecializedEntities(
        generalExtraction,
        classification.type
      )
      console.log(`[Pipeline] Specialized extraction complete: ${specializedResult.extractedItems.length} items`)

      await onProgress({
        stage: 'SPECIALIZED_EXTRACTION',
        status: 'complete',
        percent: 100,
        message: `Created ${specializedResult.extractedItems.length} items`,
        details: {
          coverageScore: specializedResult.checklist.coverageScore,
          questionsMissing: specializedResult.checklist.questionsMissing,
        },
      })

      itemsForPopulation = specializedResult.extractedItems
    }

    // ============================================
    // Stage 4: Tab Population
    // ============================================
    console.log('\n[Pipeline] === STAGE 4: TAB POPULATION ===')
    await updateJobStatus(jobId, 'POPULATING_TABS', 'TAB_POPULATION')
    await onProgress({
      stage: 'TAB_POPULATION',
      status: 'running',
      percent: 0,
      message: 'Populating profile tabs...',
    })

    const populationResult = await populateTabs(
      designWeekId,
      itemsForPopulation,
      classification
    )

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: { populationResult: populationResult as object },
    })

    await onProgress({
      stage: 'TAB_POPULATION',
      status: 'complete',
      percent: 100,
      message: `Added ${populationResult.extractedItems} items to profiles`,
      details: populationResult as unknown as Record<string, unknown>,
    })

    // ============================================
    // Update Design Week Progress
    // ============================================
    console.log('\n[Pipeline] === UPDATING DESIGN WEEK PROGRESS ===')
    await updateDesignWeekProgress(designWeekId, classification.type)

    // ============================================
    // Complete
    // ============================================
    console.log(`\n${'='.repeat(60)}`)
    console.log(`[Pipeline] SUCCESS! Job ${jobId} completed`)
    console.log(`[Pipeline] Classification: ${classification.type}`)
    console.log(`[Pipeline] Entities: ${generalExtraction.entities.length}`)
    console.log(`[Pipeline] Items: ${itemsForPopulation.length}`)
    console.log(`${'='.repeat(60)}\n`)

    await updateJobStatus(jobId, 'COMPLETE', 'COMPLETE')
    await onProgress({
      stage: 'COMPLETE',
      status: 'complete',
      percent: 100,
      message: 'Pipeline complete!',
    })

    return {
      success: true,
      classification,
      rawExtractionId: rawExtraction.id,
      populationResult,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    const stage = (error as PipelineError)?.stage || 'CLASSIFICATION'

    console.error(`\n${'!'.repeat(60)}`)
    console.error(`[Pipeline] FAILED at stage: ${stage}`)
    console.error(`[Pipeline] Error: ${errorMessage}`)
    if (errorStack) {
      console.error(`[Pipeline] Stack: ${errorStack}`)
    }
    console.error(`${'!'.repeat(60)}\n`)

    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: errorMessage,
      },
    })

    await onProgress({
      stage,
      status: 'error',
      percent: 0,
      message: errorMessage,
    })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Update job status in database
 */
async function updateJobStatus(
  jobId: string,
  status: UploadJobStatus,
  stage: PipelineStage
): Promise<void> {
  await prisma.uploadJob.update({
    where: { id: jobId },
    data: {
      status,
      currentStage: stage,
      ...(status === 'CLASSIFYING' ? { startedAt: new Date() } : {}),
      ...(status === 'COMPLETE' ? { completedAt: new Date() } : {}),
    },
  })
}

/**
 * Format classification type for display
 */
function formatClassificationType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Update Design Week status and phase based on processed content
 * - Sets status to IN_PROGRESS if not already further along
 * - Updates currentPhase to the highest phase seen
 */
async function updateDesignWeekProgress(
  designWeekId: string,
  classificationType: ContentClassification
): Promise<void> {
  console.log(`[Pipeline] updateDesignWeekProgress called with designWeekId=${designWeekId}, classificationType=${classificationType}`)

  try {
    const designWeek = await prisma.designWeek.findUnique({
      where: { id: designWeekId },
    })

    if (!designWeek) {
      console.error(`[Pipeline] Design Week not found: ${designWeekId}`)
      return
    }

    console.log(`[Pipeline] Current Design Week state: status=${designWeek.status}, phase=${designWeek.currentPhase}`)

    const processedPhase = CLASSIFICATION_TO_PHASE[classificationType] || 1
    console.log(`[Pipeline] Classification ${classificationType} maps to phase ${processedPhase}`)

    // Calculate new status: NOT_STARTED → IN_PROGRESS
    // Don't downgrade from PENDING_SIGNOFF or COMPLETE
    let newStatus: DesignWeekStatus = designWeek.status
    if (designWeek.status === 'NOT_STARTED') {
      newStatus = 'IN_PROGRESS'
    }

    // Update currentPhase to the highest phase we've seen content for
    // Phase 4 (Sign-off) means we're in PENDING_SIGNOFF status
    const newPhase = Math.max(designWeek.currentPhase, processedPhase)
    if (processedPhase === 4 && newStatus === 'IN_PROGRESS') {
      newStatus = 'PENDING_SIGNOFF'
    }

    console.log(`[Pipeline] Calculated new state: status=${newStatus}, phase=${newPhase}`)

    // Only update if something changed
    if (newStatus !== designWeek.status || newPhase !== designWeek.currentPhase) {
      console.log(`[Pipeline] Updating Design Week progress: phase ${designWeek.currentPhase} → ${newPhase}, status ${designWeek.status} → ${newStatus}`)

      // Calculate dates when starting
      const isStarting = designWeek.status === 'NOT_STARTED'
      const startDate = isStarting ? new Date() : designWeek.startedAt
      const plannedEndDate = isStarting && startDate
        ? calculateDesignWeekEndDate(startDate, designWeek.plannedDurationDays)
        : designWeek.plannedEndDate

      // Calculate actual duration when completing
      const isCompleting = newStatus === 'COMPLETE' && designWeek.status !== 'COMPLETE'
      const completedAt = isCompleting ? new Date() : undefined
      const actualDurationDays = isCompleting && startDate && completedAt
        ? calculateActualDuration(startDate, completedAt)
        : undefined

      await prisma.designWeek.update({
        where: { id: designWeekId },
        data: {
          status: newStatus,
          currentPhase: newPhase,
          ...(isStarting ? { startedAt: startDate, plannedEndDate } : {}),
          ...(isCompleting ? { completedAt, actualDurationDays } : {}),
        },
      })

      if (isStarting) {
        console.log(`[Pipeline] Design Week started: plannedEndDate=${plannedEndDate?.toISOString()}`)
      }
      if (isCompleting) {
        console.log(`[Pipeline] Design Week completed: actualDurationDays=${actualDurationDays}`)
      }
      console.log(`[Pipeline] Design Week updated successfully`)
    } else {
      console.log(`[Pipeline] No Design Week update needed (state unchanged)`)
    }
  } catch (error) {
    console.error(`[Pipeline] Error updating Design Week progress:`, error)
    // Don't throw - let the pipeline continue even if status update fails
  }
}

/**
 * Retry a failed pipeline from a specific stage
 */
export async function retryPipeline(
  jobId: string,
  fromStage: PipelineStage
): Promise<PipelineResult> {
  const job = await prisma.uploadJob.findUnique({
    where: { id: jobId },
    include: { designWeek: true },
  })

  if (!job) {
    throw new Error('Job not found')
  }

  if (job.status !== 'FAILED') {
    throw new Error('Can only retry failed jobs')
  }

  // Get file from storage
  const { getFile } = await import('@/lib/storage')
  const fileBuffer = await getFile(job.fileUrl)

  // Reset job status
  await prisma.uploadJob.update({
    where: { id: jobId },
    data: {
      status: 'QUEUED',
      currentStage: fromStage,
      error: null,
    },
  })

  // Create progress callback that updates the database
  const onProgress = async (progress: StageProgress) => {
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        stageProgress: progress as object,
      },
    })
  }

  // Re-run pipeline
  return runExtractionPipeline({
    jobId,
    designWeekId: job.designWeekId,
    fileBuffer,
    filename: job.filename,
    mimeType: job.mimeType,
    fileUrl: job.fileUrl,
    onProgress,
  })
}
