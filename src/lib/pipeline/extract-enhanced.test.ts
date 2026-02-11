import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the ai-client module
vi.mock('./ai-client', () => ({
  generateWithFallback: vi.fn(),
  parseJSONFromResponse: vi.fn(),
}))

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn(),
      }
    },
  }
})

// Mock unpdf
vi.mock('unpdf', () => ({
  extractText: vi.fn().mockResolvedValue({
    text: ['PDF page 1 content', 'PDF page 2 content'],
    totalPages: 2,
  }),
}))

// Mock crypto.randomUUID
vi.mock(import('crypto'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: { ...actual, randomUUID: vi.fn(() => 'mock-uuid-1234') },
    randomUUID: vi.fn(() => 'mock-uuid-1234'),
  }
})

import { extractWithOptions, isMultiModelResult } from './extract-enhanced'
import { generateWithFallback, parseJSONFromResponse } from './ai-client'
import type { ClassificationResult, GeneralExtractionResult, MultiModelResult } from './types'

describe('extract-enhanced module', () => {
  const mockClassification: ClassificationResult = {
    type: 'KICKOFF_SESSION',
    confidence: 0.95,
    keyIndicators: ['business case', 'goals'],
    missingQuestions: [],
  }

  const mockEntities = [
    {
      id: 'entity-1',
      category: 'BUSINESS',
      type: 'GOAL',
      content: 'Reduce processing time',
      confidence: 0.9,
      sourceQuote: 'goal is to reduce',
    },
    {
      id: 'entity-2',
      category: 'BUSINESS',
      type: 'STAKEHOLDER',
      content: 'John Doe',
      confidence: 0.85,
    },
  ]

  const mockGenerateResult = {
    provider: 'gemini' as const,
    text: '{"entities":[],"summary":{"totalEntities":0,"byCategory":{}}}',
    tokensUsed: { input: 100, output: 50 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('extractWithOptions - standard mode', () => {
    it('extracts entities in standard mode', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: mockEntities,
        summary: { totalEntities: 2, byCategory: { BUSINESS: 2 } },
      })

      const result = await extractWithOptions(
        Buffer.from('test content'),
        'text/plain',
        mockClassification,
        { mode: 'standard' }
      )

      expect('entities' in result).toBe(true)
      const generalResult = result as GeneralExtractionResult
      expect(generalResult.entities).toHaveLength(2)
      expect(generalResult.entities[0].type).toBe('GOAL')
      expect(generalResult.summary.totalEntities).toBe(2)
    })

    it('uses standard mode as default', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [],
        summary: { totalEntities: 0, byCategory: {} },
      })

      await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification
      )

      expect(generateWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining(mockClassification.type),
        })
      )
    })

    it('assigns UUIDs to entities without IDs', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [
          { category: 'BUSINESS', type: 'GOAL', content: 'Test goal', confidence: 0.9 },
        ],
      })

      const result = await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'standard' }
      ) as GeneralExtractionResult

      expect(result.entities[0].id).toBe('mock-uuid-1234')
    })

    it('assigns default confidence when missing', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [
          { id: 'e1', category: 'BUSINESS', type: 'GOAL', content: 'Test' },
        ],
      })

      const result = await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'standard' }
      ) as GeneralExtractionResult

      expect(result.entities[0].confidence).toBe(0.8)
    })

    it('calculates byCategory when not provided in summary', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [
          { id: 'e1', category: 'BUSINESS', type: 'GOAL', content: 'Goal 1', confidence: 0.9 },
          { id: 'e2', category: 'PROCESS', type: 'HAPPY_PATH_STEP', content: 'Step 1', confidence: 0.85 },
          { id: 'e3', category: 'BUSINESS', type: 'STAKEHOLDER', content: 'Person 1', confidence: 0.8 },
        ],
      })

      const result = await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'standard' }
      ) as GeneralExtractionResult

      expect(result.summary.byCategory).toEqual({
        BUSINESS: 2,
        PROCESS: 1,
      })
    })

    it('includes tokensUsed from provider result', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        ...mockGenerateResult,
        tokensUsed: { input: 500, output: 200 },
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [],
        summary: { totalEntities: 0, byCategory: {} },
      })

      const result = await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'standard' }
      ) as GeneralExtractionResult

      expect(result.summary.tokensUsed).toEqual({ input: 500, output: 200 })
    })

    it('defaults tokensUsed to zero when not provided', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [],
      })

      const result = await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'standard' }
      ) as GeneralExtractionResult

      expect(result.summary.tokensUsed).toEqual({ input: 0, output: 0 })
    })
  })

  describe('extractWithOptions - exhaustive mode', () => {
    it('uses exhaustive prompt for exhaustive mode', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: mockEntities,
        summary: { totalEntities: 2, byCategory: { BUSINESS: 2 } },
      })

      await extractWithOptions(
        Buffer.from('test content'),
        'text/plain',
        mockClassification,
        { mode: 'exhaustive' }
      )

      expect(generateWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Extract EVERYTHING'),
          maxTokens: 32768,
        })
      )
    })
  })

  describe('extractWithOptions - two-pass mode', () => {
    it('runs two passes and merges results', async () => {
      // First pass
      vi.mocked(generateWithFallback)
        .mockResolvedValueOnce(mockGenerateResult)
        .mockResolvedValueOnce(mockGenerateResult)

      vi.mocked(parseJSONFromResponse)
        .mockReturnValueOnce({
          entities: [
            { id: 'e1', category: 'BUSINESS', type: 'GOAL', content: 'Goal 1', confidence: 0.9 },
          ],
          summary: { totalEntities: 1, byCategory: { BUSINESS: 1 } },
        })
        .mockReturnValueOnce({
          entities: [
            { id: 'e2', category: 'PROCESS', type: 'HAPPY_PATH_STEP', content: 'Step 1', confidence: 0.8 },
          ],
          summary: { totalEntities: 1, byCategory: { PROCESS: 1 } },
        })

      const result = await extractWithOptions(
        Buffer.from('test content'),
        'text/plain',
        mockClassification,
        { mode: 'two-pass' }
      ) as GeneralExtractionResult

      expect(result.entities).toHaveLength(2)
      expect(result.summary.totalEntities).toBe(2)
      expect(result.summary.byCategory).toEqual({ BUSINESS: 1, PROCESS: 1 })
    })

    it('calls onProgress during two-pass extraction', async () => {
      vi.mocked(generateWithFallback)
        .mockResolvedValueOnce(mockGenerateResult)
        .mockResolvedValueOnce(mockGenerateResult)

      vi.mocked(parseJSONFromResponse)
        .mockReturnValueOnce({ entities: [{ id: 'e1', category: 'A', type: 'B', content: 'C', confidence: 0.9 }] })
        .mockReturnValueOnce({ entities: [] })

      const onProgress = vi.fn()

      await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'two-pass' },
        onProgress
      )

      expect(onProgress).toHaveBeenCalledWith(10, 0)
      expect(onProgress).toHaveBeenCalledWith(50, 1)
      expect(onProgress).toHaveBeenCalledWith(100, 1)
    })

    it('includes second pass prompt with existing entities summary', async () => {
      vi.mocked(generateWithFallback)
        .mockResolvedValueOnce(mockGenerateResult)
        .mockResolvedValueOnce(mockGenerateResult)

      vi.mocked(parseJSONFromResponse)
        .mockReturnValueOnce({
          entities: [{ id: 'e1', category: 'BUSINESS', type: 'GOAL', content: 'Test goal', confidence: 0.9 }],
        })
        .mockReturnValueOnce({ entities: [] })

      await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'two-pass' }
      )

      // Second call should include existing entities
      const secondCallArgs = vi.mocked(generateWithFallback).mock.calls[1][0]
      expect(secondCallArgs.prompt).toContain('GOAL: Test goal')
    })

    it('aggregates processing time and tokens from both passes', async () => {
      vi.mocked(generateWithFallback)
        .mockResolvedValueOnce({ ...mockGenerateResult, tokensUsed: { input: 100, output: 50 } })
        .mockResolvedValueOnce({ ...mockGenerateResult, tokensUsed: { input: 200, output: 100 } })

      vi.mocked(parseJSONFromResponse)
        .mockReturnValueOnce({ entities: [] })
        .mockReturnValueOnce({ entities: [] })

      const result = await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'two-pass' }
      ) as GeneralExtractionResult

      expect(result.summary.tokensUsed.input).toBe(300)
      expect(result.summary.tokensUsed.output).toBe(150)
    })
  })

  describe('extractWithOptions - section-based mode', () => {
    it('runs 5 section extractions', async () => {
      // There are 5 sections: business, process, scope, technical, features
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [{ id: 'e1', category: 'A', type: 'B', content: 'C', confidence: 0.9 }],
      })

      await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'section-based' }
      )

      expect(generateWithFallback).toHaveBeenCalledTimes(5)
    })

    it('deduplicates entities from section-based extraction', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)

      // Same entity returned by multiple sections
      const duplicateEntity = {
        id: 'dup',
        category: 'BUSINESS',
        type: 'STAKEHOLDER',
        content: 'John Doe',
        confidence: 0.9,
      }

      vi.mocked(parseJSONFromResponse)
        .mockReturnValueOnce({ entities: [duplicateEntity] })
        .mockReturnValueOnce({ entities: [{ ...duplicateEntity, id: 'dup-2', confidence: 0.7 }] })
        .mockReturnValueOnce({ entities: [] })
        .mockReturnValueOnce({ entities: [] })
        .mockReturnValueOnce({ entities: [] })

      const result = await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'section-based' }
      ) as GeneralExtractionResult

      // Should deduplicate, keeping the higher confidence one
      expect(result.entities).toHaveLength(1)
      expect(result.entities[0].confidence).toBe(0.9)
    })

    it('continues when a section extraction fails', async () => {
      vi.mocked(generateWithFallback)
        .mockResolvedValueOnce(mockGenerateResult)
        .mockRejectedValueOnce(new Error('Section failed'))
        .mockResolvedValueOnce(mockGenerateResult)
        .mockResolvedValueOnce(mockGenerateResult)
        .mockResolvedValueOnce(mockGenerateResult)

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [{ id: 'e1', category: 'A', type: 'B', content: 'C', confidence: 0.9 }],
      })

      const result = await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'section-based' }
      ) as GeneralExtractionResult

      // 4 successful sections, each returning 1 entity (but deduped by type+content)
      expect(result.entities.length).toBeGreaterThan(0)
    })

    it('calls onProgress during section-based extraction', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({ entities: [] })

      const onProgress = vi.fn()

      await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'section-based' },
        onProgress
      )

      expect(onProgress).toHaveBeenCalledWith(0, 0)
      expect(onProgress).toHaveBeenCalledWith(100, expect.any(Number))
    })
  })

  describe('extractWithOptions - auto mode', () => {
    it('analyzes document and selects extraction strategy', async () => {
      // First call is document analysis, subsequent calls are the selected mode
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)

      vi.mocked(parseJSONFromResponse)
        .mockReturnValueOnce({
          documentType: 'design_doc',
          complexity: 'moderate',
          structureLevel: 'highly_structured',
          contentDensity: 'medium',
          hasTables: false,
          estimatedEntityCount: 'medium',
          recommendedStrategy: 'standard',
          reasoning: 'Simple document',
        })
        .mockReturnValue({
          entities: [],
          summary: { totalEntities: 0, byCategory: {} },
        })

      await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'auto' }
      )

      // First call is analysis, second is the extraction
      expect(generateWithFallback).toHaveBeenCalledTimes(2)
    })

    it('falls back to section-based when auto recommends auto', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)

      vi.mocked(parseJSONFromResponse)
        .mockReturnValueOnce({
          documentType: 'mixed',
          complexity: 'complex',
          structureLevel: 'moderately_structured',
          contentDensity: 'high',
          hasTables: true,
          estimatedEntityCount: 'high',
          recommendedStrategy: 'auto', // Recommends auto again, should fallback
          reasoning: 'Complex document',
        })
        .mockReturnValue({
          entities: [],
        })

      await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'auto' }
      )

      // Should use section-based (5 sections + 1 analysis = 6 calls)
      expect(generateWithFallback).toHaveBeenCalledTimes(6)
    })

    it('calls onProgress with 5% for auto mode analysis', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)

      vi.mocked(parseJSONFromResponse)
        .mockReturnValueOnce({
          documentType: 'transcript',
          complexity: 'simple',
          structureLevel: 'unstructured',
          contentDensity: 'low',
          hasTables: false,
          estimatedEntityCount: 'low',
          recommendedStrategy: 'standard',
          reasoning: 'Simple transcript',
        })
        .mockReturnValue({ entities: [] })

      const onProgress = vi.fn()

      await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'auto' },
        onProgress
      )

      expect(onProgress).toHaveBeenCalledWith(5, 0)
      expect(onProgress).toHaveBeenCalledWith(10, 0)
    })
  })

  describe('extractWithOptions - error handling', () => {
    it('throws PipelineError on extraction failure', async () => {
      vi.mocked(generateWithFallback).mockRejectedValue(new Error('AI service down'))

      await expect(
        extractWithOptions(
          Buffer.from('test'),
          'text/plain',
          mockClassification,
          { mode: 'standard' }
        )
      ).rejects.toThrow('Enhanced extraction failed: AI service down')
    })

    it('re-throws PipelineError as-is', async () => {
      const { PipelineError } = await import('./types')
      vi.mocked(generateWithFallback).mockRejectedValue(
        new PipelineError('Custom pipeline error', 'GENERAL_EXTRACTION', false)
      )

      await expect(
        extractWithOptions(
          Buffer.from('test'),
          'text/plain',
          mockClassification,
          { mode: 'standard' }
        )
      ).rejects.toThrow('Custom pipeline error')
    })

    it('handles non-Error thrown values', async () => {
      vi.mocked(generateWithFallback).mockRejectedValue('string error')

      await expect(
        extractWithOptions(
          Buffer.from('test'),
          'text/plain',
          mockClassification,
          { mode: 'standard' }
        )
      ).rejects.toThrow('Enhanced extraction failed: Unknown extraction error')
    })

    it('handles empty entities array from AI', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [],
      })

      const result = await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'standard' }
      ) as GeneralExtractionResult

      expect(result.entities).toEqual([])
      expect(result.summary.totalEntities).toBe(0)
    })

    it('handles missing entities field from AI', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({})

      const result = await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'standard' }
      ) as GeneralExtractionResult

      expect(result.entities).toEqual([])
      expect(result.summary.totalEntities).toBe(0)
    })
  })

  describe('isMultiModelResult', () => {
    it('returns true for multi-model results', () => {
      const multiModelResult: MultiModelResult = {
        merged: {
          entities: [],
          summary: {
            totalEntities: 0,
            byCategory: {},
            processingTime: 0,
            tokensUsed: { input: 0, output: 0 },
          },
        },
        comparison: {
          onlyGemini: [],
          onlyClaude: [],
          both: [],
        },
      }

      expect(isMultiModelResult(multiModelResult)).toBe(true)
    })

    it('returns false for general extraction results', () => {
      const generalResult: GeneralExtractionResult = {
        entities: [],
        summary: {
          totalEntities: 0,
          byCategory: {},
          processingTime: 0,
          tokensUsed: { input: 0, output: 0 },
        },
      }

      expect(isMultiModelResult(generalResult)).toBe(false)
    })
  })

  describe('extractWithOptions - context prompt', () => {
    it('includes classification context in the prompt', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue(mockGenerateResult)
      vi.mocked(parseJSONFromResponse).mockReturnValue({ entities: [] })

      await extractWithOptions(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        { mode: 'standard' }
      )

      const callArgs = vi.mocked(generateWithFallback).mock.calls[0][0]
      expect(callArgs.prompt).toContain('KICKOFF_SESSION')
      expect(callArgs.prompt).toContain('0.95')
      expect(callArgs.prompt).toContain('business case, goals')
    })
  })
})
