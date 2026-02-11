import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the ai-client module
vi.mock('./ai-client', () => ({
  generateWithFallback: vi.fn(),
  parseJSONFromResponse: vi.fn(),
}))

// Mock crypto.randomUUID
vi.mock(import('crypto'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: { ...actual, randomUUID: vi.fn(() => 'mock-uuid-gen') },
    randomUUID: vi.fn(() => 'mock-uuid-gen'),
  }
})

import {
  extractGeneralEntities,
  filterEntitiesByCategory,
  filterEntitiesByType,
} from './extract-general'
import { generateWithFallback, parseJSONFromResponse } from './ai-client'
import type { ClassificationResult, GeneralExtractionResult } from './types'

describe('extract-general module', () => {
  const mockClassification: ClassificationResult = {
    type: 'KICKOFF_SESSION',
    confidence: 0.92,
    keyIndicators: ['business goals', 'stakeholders'],
    missingQuestions: ['volume'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('extractGeneralEntities', () => {
    it('extracts entities successfully', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
        tokensUsed: { input: 200, output: 100 },
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [
          {
            id: 'e1',
            category: 'BUSINESS',
            type: 'GOAL',
            content: 'Reduce costs by 30%',
            confidence: 0.95,
            sourceQuote: 'reduce costs',
          },
          {
            id: 'e2',
            category: 'BUSINESS',
            type: 'STAKEHOLDER',
            content: 'Sarah Jones',
            confidence: 0.88,
          },
        ],
        summary: {
          totalEntities: 2,
          byCategory: { BUSINESS: 2 },
        },
      })

      const result = await extractGeneralEntities(
        Buffer.from('test content'),
        'text/plain',
        mockClassification
      )

      expect(result.entities).toHaveLength(2)
      expect(result.entities[0].type).toBe('GOAL')
      expect(result.entities[1].type).toBe('STAKEHOLDER')
      expect(result.summary.totalEntities).toBe(2)
      expect(result.summary.tokensUsed).toEqual({ input: 200, output: 100 })
    })

    it('includes classification context in prompt', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [],
        summary: { totalEntities: 0, byCategory: {} },
      })

      await extractGeneralEntities(
        Buffer.from('test'),
        'text/plain',
        mockClassification
      )

      const callArgs = vi.mocked(generateWithFallback).mock.calls[0][0]
      expect(callArgs.prompt).toContain('KICKOFF_SESSION')
      expect(callArgs.prompt).toContain('0.92')
      expect(callArgs.prompt).toContain('business goals, stakeholders')
    })

    it('passes file buffer and mime type to AI', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({ entities: [] })

      const buffer = Buffer.from('test content')
      await extractGeneralEntities(buffer, 'application/pdf', mockClassification)

      expect(generateWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          fileBuffer: buffer,
          mimeType: 'application/pdf',
        })
      )
    })

    it('assigns UUIDs to entities without IDs', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [
          { category: 'BUSINESS', type: 'GOAL', content: 'Test', confidence: 0.9 },
        ],
      })

      const result = await extractGeneralEntities(
        Buffer.from('test'),
        'text/plain',
        mockClassification
      )

      expect(result.entities[0].id).toBe('mock-uuid-gen')
    })

    it('assigns default confidence of 0.8 when missing', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [
          { id: 'e1', category: 'PROCESS', type: 'HAPPY_PATH_STEP', content: 'Step' },
        ],
      })

      const result = await extractGeneralEntities(
        Buffer.from('test'),
        'text/plain',
        mockClassification
      )

      expect(result.entities[0].confidence).toBe(0.8)
    })

    it('calculates byCategory when summary is missing', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [
          { id: 'e1', category: 'BUSINESS', type: 'GOAL', content: 'Goal', confidence: 0.9 },
          { id: 'e2', category: 'BUSINESS', type: 'KPI_TARGET', content: 'KPI', confidence: 0.8 },
          { id: 'e3', category: 'PROCESS', type: 'HAPPY_PATH_STEP', content: 'Step', confidence: 0.85 },
        ],
      })

      const result = await extractGeneralEntities(
        Buffer.from('test'),
        'text/plain',
        mockClassification
      )

      expect(result.summary.byCategory).toEqual({ BUSINESS: 2, PROCESS: 1 })
    })

    it('calls onProgress at key milestones', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [
          { id: 'e1', category: 'BUSINESS', type: 'GOAL', content: 'Test', confidence: 0.9 },
        ],
      })

      const onProgress = vi.fn()

      await extractGeneralEntities(
        Buffer.from('test'),
        'text/plain',
        mockClassification,
        onProgress
      )

      expect(onProgress).toHaveBeenCalledWith(10, 0)
      expect(onProgress).toHaveBeenCalledWith(70, 0)
      expect(onProgress).toHaveBeenCalledWith(85, 1)
      expect(onProgress).toHaveBeenCalledWith(100, 1)
    })

    it('handles empty entities gracefully', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        entities: [],
      })

      const result = await extractGeneralEntities(
        Buffer.from('test'),
        'text/plain',
        mockClassification
      )

      expect(result.entities).toEqual([])
      expect(result.summary.totalEntities).toBe(0)
    })

    it('handles undefined entities from parsed response', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({})

      const result = await extractGeneralEntities(
        Buffer.from('test'),
        'text/plain',
        mockClassification
      )

      expect(result.entities).toEqual([])
      expect(result.summary.totalEntities).toBe(0)
    })

    it('defaults tokensUsed to zero when not provided', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({ entities: [] })

      const result = await extractGeneralEntities(
        Buffer.from('test'),
        'text/plain',
        mockClassification
      )

      expect(result.summary.tokensUsed).toEqual({ input: 0, output: 0 })
    })

    it('throws PipelineError on AI failure', async () => {
      vi.mocked(generateWithFallback).mockRejectedValue(
        new Error('AI service unavailable')
      )

      await expect(
        extractGeneralEntities(Buffer.from('test'), 'text/plain', mockClassification)
      ).rejects.toThrow('General extraction failed: AI service unavailable')
    })

    it('re-throws PipelineError as-is', async () => {
      const { PipelineError } = await import('./types')
      vi.mocked(generateWithFallback).mockRejectedValue(
        new PipelineError('Pipeline stage error', 'GENERAL_EXTRACTION', true)
      )

      await expect(
        extractGeneralEntities(Buffer.from('test'), 'text/plain', mockClassification)
      ).rejects.toThrow('Pipeline stage error')
    })

    it('handles non-Error thrown values', async () => {
      vi.mocked(generateWithFallback).mockRejectedValue('string error')

      await expect(
        extractGeneralEntities(Buffer.from('test'), 'text/plain', mockClassification)
      ).rejects.toThrow('General extraction failed: Unknown extraction error')
    })

    it('tracks processing time in summary', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({ entities: [] })

      const result = await extractGeneralEntities(
        Buffer.from('test'),
        'text/plain',
        mockClassification
      )

      expect(result.summary.processingTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('filterEntitiesByCategory', () => {
    const mockResult: GeneralExtractionResult = {
      entities: [
        { id: 'e1', category: 'BUSINESS', type: 'GOAL', content: 'Goal 1', confidence: 0.9 },
        { id: 'e2', category: 'PROCESS', type: 'HAPPY_PATH_STEP', content: 'Step 1', confidence: 0.8 },
        { id: 'e3', category: 'BUSINESS', type: 'STAKEHOLDER', content: 'Person 1', confidence: 0.85 },
        { id: 'e4', category: 'INTEGRATIONS', type: 'SYSTEM_INTEGRATION', content: 'SAP', confidence: 0.9 },
      ],
      summary: {
        totalEntities: 4,
        byCategory: { BUSINESS: 2, PROCESS: 1, INTEGRATIONS: 1 },
        processingTime: 100,
        tokensUsed: { input: 0, output: 0 },
      },
    }

    it('filters entities by category', () => {
      const business = filterEntitiesByCategory(mockResult, 'BUSINESS')
      expect(business).toHaveLength(2)
      expect(business[0].type).toBe('GOAL')
      expect(business[1].type).toBe('STAKEHOLDER')
    })

    it('returns empty array for non-existent category', () => {
      const unknown = filterEntitiesByCategory(mockResult, 'UNKNOWN')
      expect(unknown).toHaveLength(0)
    })

    it('returns all entities of matching category', () => {
      const process = filterEntitiesByCategory(mockResult, 'PROCESS')
      expect(process).toHaveLength(1)
      expect(process[0].content).toBe('Step 1')
    })
  })

  describe('filterEntitiesByType', () => {
    const mockResult: GeneralExtractionResult = {
      entities: [
        { id: 'e1', category: 'BUSINESS', type: 'GOAL', content: 'Goal 1', confidence: 0.9 },
        { id: 'e2', category: 'BUSINESS', type: 'GOAL', content: 'Goal 2', confidence: 0.85 },
        { id: 'e3', category: 'BUSINESS', type: 'STAKEHOLDER', content: 'Person 1', confidence: 0.8 },
      ],
      summary: {
        totalEntities: 3,
        byCategory: { BUSINESS: 3 },
        processingTime: 100,
        tokensUsed: { input: 0, output: 0 },
      },
    }

    it('filters entities by type', () => {
      const goals = filterEntitiesByType(mockResult, 'GOAL')
      expect(goals).toHaveLength(2)
    })

    it('returns empty array for non-existent type', () => {
      const channels = filterEntitiesByType(mockResult, 'CHANNEL')
      expect(channels).toHaveLength(0)
    })

    it('returns single matching entity', () => {
      const stakeholders = filterEntitiesByType(mockResult, 'STAKEHOLDER')
      expect(stakeholders).toHaveLength(1)
      expect(stakeholders[0].content).toBe('Person 1')
    })
  })
})
