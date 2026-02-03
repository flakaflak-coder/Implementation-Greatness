import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the ai-client module
vi.mock('./ai-client', () => ({
  generateWithFallback: vi.fn(),
  parseJSONFromResponse: vi.fn(),
}))

// Import after mocks
import { classifyContent, getChecklistForType } from './classify'
import { generateWithFallback, parseJSONFromResponse } from './ai-client'

describe('classify module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getChecklistForType', () => {
    it('returns kickoff session checklist', () => {
      const checklist = getChecklistForType('KICKOFF_SESSION')

      expect(checklist).toContain('What problem are we solving? Why now?')
      expect(checklist).toContain("What's the monthly volume?")
      expect(checklist).toContain('Who are the key stakeholders?')
      expect(checklist.length).toBe(7)
    })

    it('returns process design session checklist', () => {
      const checklist = getChecklistForType('PROCESS_DESIGN_SESSION')

      expect(checklist).toContain("What's the happy path from start to finish?")
      expect(checklist).toContain("What's IN scope vs OUT of scope?")
      expect(checklist.length).toBe(6)
    })

    it('returns skills guardrails session checklist', () => {
      const checklist = getChecklistForType('SKILLS_GUARDRAILS_SESSION')

      expect(checklist).toContain('What skills does the DE need?')
      expect(checklist).toContain('What should the DE NEVER do?')
      expect(checklist).toContain('Are there financial limits?')
      expect(checklist.length).toBe(7)
    })

    it('returns technical session checklist', () => {
      const checklist = getChecklistForType('TECHNICAL_SESSION')

      expect(checklist).toContain('What systems need to be integrated?')
      expect(checklist).toContain('Is API access available?')
      expect(checklist).toContain('What are the security requirements?')
      expect(checklist.length).toBe(7)
    })

    it('returns signoff session checklist', () => {
      const checklist = getChecklistForType('SIGNOFF_SESSION')

      expect(checklist).toContain('Are all open items resolved?')
      expect(checklist).toContain('Who is providing final approval?')
      expect(checklist.length).toBe(5)
    })

    it('returns requirements document checklist', () => {
      const checklist = getChecklistForType('REQUIREMENTS_DOCUMENT')

      expect(checklist).toContain('Are functional requirements clearly defined?')
      expect(checklist.length).toBe(4)
    })

    it('returns technical spec checklist', () => {
      const checklist = getChecklistForType('TECHNICAL_SPEC')

      expect(checklist).toContain('Are API endpoints documented?')
      expect(checklist.length).toBe(4)
    })

    it('returns process document checklist', () => {
      const checklist = getChecklistForType('PROCESS_DOCUMENT')

      expect(checklist).toContain('Is the process flow clearly documented?')
      expect(checklist.length).toBe(4)
    })

    it('returns unknown checklist for unknown type', () => {
      const checklist = getChecklistForType('UNKNOWN')

      expect(checklist).toContain('Could not determine content type - consider re-uploading with more context')
      expect(checklist.length).toBe(1)
    })

    it('returns unknown checklist for invalid type', () => {
      const checklist = getChecklistForType('INVALID_TYPE' as any)

      expect(checklist).toContain('Could not determine content type - consider re-uploading with more context')
    })
  })

  describe('classifyContent', () => {
    it('classifies content successfully', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{"type":"KICKOFF_SESSION","confidence":0.95,"keyIndicators":["business case"],"missingQuestions":["volume"]}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        type: 'KICKOFF_SESSION',
        confidence: 0.95,
        keyIndicators: ['business case'],
        missingQuestions: ['volume'],
      })

      const result = await classifyContent(
        Buffer.from('test content'),
        'video/mp4',
        'recording.mp4'
      )

      expect(result.type).toBe('KICKOFF_SESSION')
      expect(result.confidence).toBe(0.95)
      expect(result.keyIndicators).toContain('business case')
      expect(result.missingQuestions).toContain('volume')
    })

    it('clamps confidence to valid range', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        type: 'TECHNICAL_SESSION',
        confidence: 1.5, // Over 1
        keyIndicators: [],
        missingQuestions: [],
      })

      const result = await classifyContent(
        Buffer.from('test'),
        'audio/mp3',
        'audio.mp3'
      )

      expect(result.confidence).toBe(1) // Clamped to max 1
    })

    it('clamps negative confidence to 0', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        type: 'PROCESS_DESIGN_SESSION',
        confidence: -0.5,
        keyIndicators: [],
        missingQuestions: [],
      })

      const result = await classifyContent(
        Buffer.from('test'),
        'audio/mp3',
        'audio.mp3'
      )

      expect(result.confidence).toBe(0) // Clamped to min 0
    })

    it('maps invalid type to UNKNOWN', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        type: 'INVALID_TYPE',
        confidence: 0.8,
        keyIndicators: [],
        missingQuestions: [],
      })

      const result = await classifyContent(
        Buffer.from('test'),
        'audio/mp3',
        'audio.mp3'
      )

      expect(result.type).toBe('UNKNOWN')
    })

    it('handles missing keyIndicators and missingQuestions', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        type: 'SIGNOFF_SESSION',
        confidence: 0.7,
        // No keyIndicators or missingQuestions
      })

      const result = await classifyContent(
        Buffer.from('test'),
        'application/pdf',
        'doc.pdf'
      )

      expect(result.keyIndicators).toEqual([])
      expect(result.missingQuestions).toEqual([])
    })

    it('throws PipelineError on classification failure', async () => {
      vi.mocked(generateWithFallback).mockRejectedValue(new Error('AI service unavailable'))

      await expect(
        classifyContent(Buffer.from('test'), 'video/mp4', 'test.mp4')
      ).rejects.toThrow('Classification failed: AI service unavailable')
    })

    it('passes correct parameters to generateWithFallback', async () => {
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'gemini',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        type: 'KICKOFF_SESSION',
        confidence: 0.9,
        keyIndicators: [],
        missingQuestions: [],
      })

      const buffer = Buffer.from('test content')
      await classifyContent(buffer, 'video/mp4', 'recording.mp4')

      expect(generateWithFallback).toHaveBeenCalledWith({
        prompt: expect.stringContaining('You are an AI assistant that classifies uploaded content'),
        fileBuffer: buffer,
        mimeType: 'video/mp4',
      })
    })
  })
})
