import { describe, it, expect, vi, beforeEach } from 'vitest'

// Define all mocks inside factories to avoid hoisting issues
vi.mock('@/lib/db', () => ({
  prisma: {
    uploadJob: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    rawExtraction: {
      create: vi.fn(),
    },
    designWeek: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('./classify', () => ({
  classifyContent: vi.fn(),
}))

vi.mock('./extract-general', () => ({
  extractGeneralEntities: vi.fn(),
}))

vi.mock('./extract-specialized', () => ({
  extractSpecializedEntities: vi.fn(),
}))

vi.mock('./extract-enhanced', () => ({
  extractWithOptions: vi.fn(),
  isMultiModelResult: (result: any) => result && 'merged' in result,
}))

vi.mock('./populate-tabs', () => ({
  populateTabs: vi.fn(),
}))

// Import after mocks
import { runExtractionPipeline } from './orchestrator'
import { prisma } from '@/lib/db'
import { classifyContent } from './classify'
import { extractGeneralEntities } from './extract-general'
import { extractSpecializedEntities } from './extract-specialized'
import { extractWithOptions } from './extract-enhanced'
import { populateTabs } from './populate-tabs'
import type { PipelineContext } from './types'

describe('runExtractionPipeline', () => {
  const mockOnProgress = vi.fn()

  const createMockContext = (overrides: Partial<PipelineContext> = {}): PipelineContext => ({
    jobId: 'job-123',
    designWeekId: 'dw-456',
    fileBuffer: Buffer.from('test content'),
    filename: 'recording.mp4',
    mimeType: 'video/mp4',
    fileUrl: '/uploads/recording.mp4',
    onProgress: mockOnProgress,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Default successful mocks
    vi.mocked(prisma.uploadJob.update).mockResolvedValue({} as any)
    vi.mocked(prisma.rawExtraction.create).mockResolvedValue({ id: 'raw-123' } as any)
    vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
      id: 'dw-456',
      status: 'NOT_STARTED',
      currentPhase: 1,
    } as any)
    vi.mocked(prisma.designWeek.update).mockResolvedValue({} as any)

    vi.mocked(classifyContent).mockResolvedValue({
      type: 'KICKOFF_MEETING',
      confidence: 0.95,
      missingQuestions: [],
    } as any)

    vi.mocked(extractGeneralEntities).mockResolvedValue({
      entities: [
        { type: 'GOAL', content: 'Test goal', confidence: 0.9 },
        { type: 'STAKEHOLDER', content: 'John Doe', confidence: 0.85 },
      ],
      summary: {
        totalEntities: 2,
        byCategory: { GOAL: 1, STAKEHOLDER: 1 },
        tokensUsed: 1000,
        processingTime: 5000,
      },
    } as any)

    vi.mocked(extractSpecializedEntities).mockResolvedValue({
      extractedItems: [
        { type: 'GOAL', content: 'Specialized goal', confidence: 0.92 },
      ],
      checklist: {
        coverageScore: 0.85,
        questionsMissing: ['question1'],
      },
    } as any)

    vi.mocked(populateTabs).mockResolvedValue({
      extractedItems: 2,
      tabsUpdated: ['identity', 'businessContext'],
    } as any)
  })

  describe('Stage 1: Classification', () => {
    it('classifies content type correctly', async () => {
      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(classifyContent).toHaveBeenCalledWith(
        ctx.fileBuffer,
        ctx.mimeType,
        ctx.filename
      )
      expect(mockOnProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'CLASSIFICATION',
          status: 'complete',
          percent: 100,
        })
      )
    })

    it('updates job status during classification', async () => {
      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(prisma.uploadJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: expect.objectContaining({
          status: 'CLASSIFYING',
          currentStage: 'CLASSIFICATION',
        }),
      })
    })
  })

  describe('Stage 2: General Extraction', () => {
    it('extracts entities using standard mode by default', async () => {
      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(extractGeneralEntities).toHaveBeenCalled()
      expect(extractWithOptions).not.toHaveBeenCalled()
    })

    it('uses enhanced extraction for non-standard modes', async () => {
      vi.mocked(extractWithOptions).mockResolvedValue({
        entities: [{ type: 'GOAL', content: 'Enhanced goal', confidence: 0.95 }],
        summary: { totalEntities: 1, byCategory: { GOAL: 1 }, tokensUsed: 500, processingTime: 3000 },
      } as any)

      const ctx = createMockContext({
        extractionOptions: { mode: 'exhaustive' },
      })

      await runExtractionPipeline(ctx)

      expect(extractWithOptions).toHaveBeenCalled()
      expect(extractGeneralEntities).not.toHaveBeenCalled()
    })

    it('saves raw extraction to database', async () => {
      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(prisma.rawExtraction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          designWeekId: 'dw-456',
          contentType: 'KICKOFF_MEETING',
          sourceFileName: 'recording.mp4',
          sourceMimeType: 'video/mp4',
        }),
      })
    })
  })

  describe('Stage 3: Specialized Extraction', () => {
    it('runs specialized extraction for standard mode', async () => {
      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(extractSpecializedEntities).toHaveBeenCalled()
    })

    it('skips specialized extraction for exhaustive mode', async () => {
      vi.mocked(extractWithOptions).mockResolvedValue({
        entities: [{ type: 'GOAL', content: 'Goal', confidence: 0.9 }],
        summary: { totalEntities: 1, byCategory: { GOAL: 1 }, tokensUsed: 500, processingTime: 3000 },
      } as any)

      const ctx = createMockContext({
        extractionOptions: { mode: 'exhaustive' },
      })

      await runExtractionPipeline(ctx)

      expect(extractSpecializedEntities).not.toHaveBeenCalled()
    })
  })

  describe('Stage 4: Tab Population', () => {
    it('populates profile tabs with extracted items', async () => {
      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(populateTabs).toHaveBeenCalledWith(
        'dw-456',
        expect.arrayContaining([
          expect.objectContaining({ type: 'GOAL' }),
        ]),
        expect.objectContaining({ type: 'KICKOFF_MEETING' })
      )
    })

    it('reports progress for tab population', async () => {
      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(mockOnProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'TAB_POPULATION',
          status: 'complete',
        })
      )
    })
  })

  describe('Pipeline Completion', () => {
    it('returns success result on completion', async () => {
      const ctx = createMockContext()

      const result = await runExtractionPipeline(ctx)

      expect(result.success).toBe(true)
      expect(result.classification).toEqual(expect.objectContaining({ type: 'KICKOFF_MEETING' }))
      expect(result.rawExtractionId).toBe('raw-123')
      expect(result.populationResult).toBeDefined()
    })

    it('updates job status to COMPLETE', async () => {
      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(prisma.uploadJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: expect.objectContaining({
          status: 'COMPLETE',
          currentStage: 'COMPLETE',
        }),
      })
    })
  })

  describe('Error Handling', () => {
    it('handles classification errors', async () => {
      vi.mocked(classifyContent).mockRejectedValue(new Error('Classification failed'))

      const ctx = createMockContext()

      const result = await runExtractionPipeline(ctx)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Classification failed')
    })

    it('handles extraction errors', async () => {
      vi.mocked(extractGeneralEntities).mockRejectedValue(new Error('Extraction failed'))

      const ctx = createMockContext()

      const result = await runExtractionPipeline(ctx)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Extraction failed')
    })

    it('updates job status to FAILED on error', async () => {
      vi.mocked(classifyContent).mockRejectedValue(new Error('Test error'))

      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(prisma.uploadJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          error: 'Test error',
        }),
      })
    })

    it('reports error progress on failure', async () => {
      vi.mocked(classifyContent).mockRejectedValue(new Error('Pipeline error'))

      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(mockOnProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'CLASSIFICATION',
          status: 'error',
          message: 'Classification failed: Pipeline error',
        })
      )
    })

    it('returns actionable warning when specialized extraction fails', async () => {
      vi.mocked(extractSpecializedEntities).mockRejectedValue(new Error('Model timeout'))

      const ctx = createMockContext()

      const result = await runExtractionPipeline(ctx)

      expect(result.success).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings![0]).toBe(
        'Completed with basic extraction (specialized analysis was skipped due to an error)'
      )
    })

    it('returns actionable warning when tab population fails', async () => {
      vi.mocked(populateTabs).mockRejectedValue(new Error('DB write error'))

      const ctx = createMockContext()

      const result = await runExtractionPipeline(ctx)

      // Tab population failure without results is a critical failure
      expect(result.success).toBe(false)
    })

    it('returns multiple warnings when multiple stages fail', async () => {
      vi.mocked(extractSpecializedEntities).mockRejectedValue(new Error('Model timeout'))
      vi.mocked(populateTabs).mockRejectedValue(new Error('DB write error'))

      const ctx = createMockContext()

      const result = await runExtractionPipeline(ctx)

      // Both Stage 3 and Stage 4 failed, but raw extraction exists so it's partial success
      // However populationResult is undefined, so this is a critical failure
      expect(result.success).toBe(false)
    })

    it('sends warnings in COMPLETE progress details when specialized extraction fails', async () => {
      vi.mocked(extractSpecializedEntities).mockRejectedValue(new Error('Model timeout'))

      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(mockOnProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'COMPLETE',
          status: 'complete',
          message: 'Completed with basic extraction (specialized analysis was skipped due to an error)',
          details: {
            warnings: [
              'Completed with basic extraction (specialized analysis was skipped due to an error)',
            ],
          },
        })
      )
    })

    it('returns no warnings on full success', async () => {
      const ctx = createMockContext()

      const result = await runExtractionPipeline(ctx)

      expect(result.success).toBe(true)
      expect(result.warnings).toBeUndefined()
    })
  })

  describe('Progress Reporting', () => {
    it('calls onProgress for each stage', async () => {
      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      const progressCalls = mockOnProgress.mock.calls.map(call => call[0].stage)

      expect(progressCalls).toContain('CLASSIFICATION')
      expect(progressCalls).toContain('GENERAL_EXTRACTION')
      expect(progressCalls).toContain('TAB_POPULATION')
      expect(progressCalls).toContain('COMPLETE')
    })

    it('includes entity count in extraction progress', async () => {
      const ctx = createMockContext()

      await runExtractionPipeline(ctx)

      expect(mockOnProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'GENERAL_EXTRACTION',
          status: 'complete',
          message: expect.stringContaining('2 entities'),
        })
      )
    })
  })
})
