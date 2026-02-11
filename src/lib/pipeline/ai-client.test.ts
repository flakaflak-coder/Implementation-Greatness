import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock external AI SDKs
const mockGenerateContent = vi.fn()
const mockMessagesCreate = vi.fn()

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent,
      }
    },
  }
})

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockMessagesCreate,
      }
    },
  }
})

vi.mock('unpdf', () => ({
  extractText: vi.fn(),
}))

import {
  claudeCanHandle,
  isMultimodalContent,
  parseJSONFromResponse,
  generateWithFallback,
} from './ai-client'
import { extractText } from 'unpdf'

describe('ai-client utilities', () => {
  describe('claudeCanHandle', () => {
    it('returns true for PDF files', () => {
      expect(claudeCanHandle('application/pdf')).toBe(true)
    })

    it('returns true for JPEG images', () => {
      expect(claudeCanHandle('image/jpeg')).toBe(true)
    })

    it('returns true for PNG images', () => {
      expect(claudeCanHandle('image/png')).toBe(true)
    })

    it('returns true for GIF images', () => {
      expect(claudeCanHandle('image/gif')).toBe(true)
    })

    it('returns true for WebP images', () => {
      expect(claudeCanHandle('image/webp')).toBe(true)
    })

    it('returns true for plain text', () => {
      expect(claudeCanHandle('text/plain')).toBe(true)
    })

    it('returns true for HTML', () => {
      expect(claudeCanHandle('text/html')).toBe(true)
    })

    it('returns true for CSV', () => {
      expect(claudeCanHandle('text/csv')).toBe(true)
    })

    it('returns true for any text/* type', () => {
      expect(claudeCanHandle('text/markdown')).toBe(true)
      expect(claudeCanHandle('text/xml')).toBe(true)
    })

    it('returns true for any image/* type', () => {
      expect(claudeCanHandle('image/svg+xml')).toBe(true)
      expect(claudeCanHandle('image/bmp')).toBe(true)
    })

    it('returns false for audio files', () => {
      expect(claudeCanHandle('audio/mpeg')).toBe(false)
      expect(claudeCanHandle('audio/wav')).toBe(false)
    })

    it('returns false for video files', () => {
      expect(claudeCanHandle('video/mp4')).toBe(false)
      expect(claudeCanHandle('video/webm')).toBe(false)
    })

    it('returns false for binary files', () => {
      expect(claudeCanHandle('application/octet-stream')).toBe(false)
    })
  })

  describe('isMultimodalContent', () => {
    it('returns true for MP3 audio', () => {
      expect(isMultimodalContent('audio/mpeg')).toBe(true)
      expect(isMultimodalContent('audio/mp3')).toBe(true)
    })

    it('returns true for WAV audio', () => {
      expect(isMultimodalContent('audio/wav')).toBe(true)
    })

    it('returns true for OGG audio', () => {
      expect(isMultimodalContent('audio/ogg')).toBe(true)
    })

    it('returns true for MP4 video', () => {
      expect(isMultimodalContent('video/mp4')).toBe(true)
    })

    it('returns true for WebM video', () => {
      expect(isMultimodalContent('video/webm')).toBe(true)
    })

    it('returns true for QuickTime video', () => {
      expect(isMultimodalContent('video/quicktime')).toBe(true)
    })

    it('returns false for images', () => {
      expect(isMultimodalContent('image/jpeg')).toBe(false)
      expect(isMultimodalContent('image/png')).toBe(false)
    })

    it('returns false for PDF', () => {
      expect(isMultimodalContent('application/pdf')).toBe(false)
    })

    it('returns false for text', () => {
      expect(isMultimodalContent('text/plain')).toBe(false)
    })
  })

  describe('parseJSONFromResponse', () => {
    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('parses JSON from markdown code block', () => {
      const text = 'Here is the result:\n```json\n{"key": "value", "count": 42}\n```\nEnd of response.'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({ key: 'value', count: 42 })
    })

    it('parses raw JSON object', () => {
      const text = '{"items": [1, 2, 3], "total": 3}'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({ items: [1, 2, 3], total: 3 })
    })

    it('parses JSON with surrounding text', () => {
      const text = 'Based on my analysis: {"type": "GOAL", "confidence": 0.95} is the result.'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({ type: 'GOAL', confidence: 0.95 })
    })

    it('handles nested objects', () => {
      const text = '{"outer": {"inner": {"deep": true}}, "array": [1, 2]}'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({
        outer: { inner: { deep: true } },
        array: [1, 2],
      })
    })

    it('repairs trailing comma', () => {
      const text = '{"items": [1, 2, 3,], "key": "value",}'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({ items: [1, 2, 3], key: 'value' })
    })

    it('repairs JSON in code block with missing closing braces', () => {
      // The repair function adds missing closing braces when JSON is in a code block
      // Note: Raw JSON without code block requires balanced braces for regex matching
      const text = '```json\n{"items": [1, 2, 3]\n```'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({ items: [1, 2, 3] })
    })

    it('throws error when no JSON found', () => {
      const text = 'This is just plain text without any JSON'

      expect(() => parseJSONFromResponse(text)).toThrow('no JSON block found')
    })

    it('handles complex extraction results', () => {
      const text = `Here are the extracted items:
\`\`\`json
{
  "items": [
    {
      "type": "STAKEHOLDER",
      "content": "John Doe - Product Manager",
      "confidence": 0.92
    },
    {
      "type": "GOAL",
      "content": "Reduce processing time by 50%",
      "confidence": 0.88
    }
  ]
}
\`\`\`
That's all I found.`

      const result = parseJSONFromResponse(text) as { items: Array<{ type: string; content: string; confidence: number }> }

      expect(result.items).toHaveLength(2)
      expect(result.items[0].type).toBe('STAKEHOLDER')
      expect(result.items[1].confidence).toBe(0.88)
    })

    it('handles JSON with special characters in strings', () => {
      const text = '{"message": "Hello \\"world\\"", "path": "C:\\\\Users"}'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({
        message: 'Hello "world"',
        path: 'C:\\Users',
      })
    })

    it('handles empty arrays and objects', () => {
      const text = '{"items": [], "metadata": {}}'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({ items: [], metadata: {} })
    })

    it('handles boolean and null values', () => {
      const text = '{"active": true, "deleted": false, "optional": null}'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({
        active: true,
        deleted: false,
        optional: null,
      })
    })

    it('repairs truncated JSON with missing closing brace', () => {
      // Simple case: one level of nesting, missing only closing brace
      const text = '```json\n{"items": [1, 2, 3]\n```'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({ items: [1, 2, 3] })
    })

    it('repairs multiple trailing commas in nested JSON', () => {
      const text = '```json\n{"data": {"key": "value",},}\n```'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({ data: { key: 'value' } })
    })

    it('repairs JSON with missing bracket and brace', () => {
      const text = '```json\n{"items": [1, 2, 3\n```'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({ items: [1, 2, 3] })
    })

    it('throws descriptive error when JSON cannot be parsed or repaired', () => {
      const text = '```json\n{this is not valid json at all\n```'

      expect(() => parseJSONFromResponse(text)).toThrow('Failed to parse JSON')
    })

    it('prefers code block JSON over bare JSON', () => {
      const text = 'Some text {"wrong": true} ```json\n{"correct": true}\n```'
      const result = parseJSONFromResponse(text)

      expect(result).toEqual({ correct: true })
    })
  })

  describe('generateWithFallback', () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
      vi.clearAllMocks()
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.spyOn(console, 'error').mockImplementation(() => {})
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it('uses Gemini as primary provider', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Test response',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
      })

      const result = await generateWithFallback({
        prompt: 'Test prompt',
      })

      expect(result.provider).toBe('gemini')
      expect(result.text).toBe('Test response')
      expect(result.tokensUsed).toEqual({ input: 100, output: 50 })
    })

    it('returns Gemini result with file buffer for non-multimodal content', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Response with file',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 100 },
      })

      const result = await generateWithFallback({
        prompt: 'Analyze this',
        fileBuffer: Buffer.from('test content'),
        mimeType: 'text/plain',
      })

      expect(result.provider).toBe('gemini')
      expect(result.text).toBe('Response with file')
    })

    it('detects truncation when Gemini returns MAX_TOKENS', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Truncated response...',
        candidates: [{ finishReason: 'MAX_TOKENS' }],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 16384 },
      })

      const result = await generateWithFallback({
        prompt: 'Test prompt',
      })

      expect(result.truncated).toBe(true)
    })

    it('falls back to Claude on Gemini rate limit after retries', async () => {
      const rateLimitError = new Error('429 Rate limit exceeded')

      mockGenerateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Claude response' }],
        usage: { input_tokens: 50, output_tokens: 30 },
        stop_reason: 'end_turn',
      })

      const result = await generateWithFallback({
        prompt: 'Test prompt',
      })

      expect(result.provider).toBe('claude')
      expect(result.text).toBe('Claude response')
    })

    it('throws immediately on auth errors', async () => {
      const authError = new Error('401 Unauthorized - Invalid API key')
      mockGenerateContent.mockRejectedValue(authError)

      await expect(
        generateWithFallback({ prompt: 'Test' })
      ).rejects.toThrow('authentication failed')
    })

    it('retries on timeout errors', async () => {
      const timeoutError = new Error('Request timed out')

      mockGenerateContent
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          text: 'Success after retry',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
        })

      const result = await generateWithFallback({
        prompt: 'Test prompt',
      })

      expect(result.text).toBe('Success after retry')
      expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    })

    it('uses Gemini-only for multimodal content (audio/video)', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Audio analysis',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 500, candidatesTokenCount: 200 },
      })

      const result = await generateWithFallback({
        prompt: 'Analyze audio',
        fileBuffer: Buffer.from('audio data'),
        mimeType: 'audio/mpeg',
      })

      expect(result.provider).toBe('gemini')
    })

    it('extracts text from PDF before sending to Gemini', async () => {
      vi.mocked(extractText).mockResolvedValue({
        text: ['Page 1 text', 'Page 2 text'],
        totalPages: 2,
      } as never)

      mockGenerateContent.mockResolvedValue({
        text: 'PDF analysis',
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 150 },
      })

      const result = await generateWithFallback({
        prompt: 'Analyze PDF',
        fileBuffer: Buffer.from('pdf data'),
        mimeType: 'application/pdf',
      })

      expect(extractText).toHaveBeenCalled()
      expect(result.provider).toBe('gemini')
    })

    it('throws when both Gemini and Claude fail', async () => {
      const rateLimitError = new Error('429 Rate limit exceeded')
      mockGenerateContent.mockRejectedValue(rateLimitError)
      mockMessagesCreate.mockRejectedValue(new Error('500 Internal Server Error'))

      await expect(
        generateWithFallback({ prompt: 'Test' })
      ).rejects.toThrow()
    })

    it('handles Gemini response with null text', async () => {
      mockGenerateContent.mockResolvedValue({
        text: null,
        candidates: [{ finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 0 },
      })

      const result = await generateWithFallback({
        prompt: 'Test prompt',
      })

      expect(result.text).toBe('')
    })

    it('handles Claude response with no text content block', async () => {
      const rateLimitError = new Error('429 Rate limit')
      mockGenerateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'image', source: {} }],
        usage: { input_tokens: 50, output_tokens: 0 },
        stop_reason: 'end_turn',
      })

      const result = await generateWithFallback({
        prompt: 'Test prompt',
      })

      expect(result.text).toBe('')
    })

    it('detects Claude response truncation', async () => {
      const rateLimitError = new Error('429 Rate limit')
      mockGenerateContent
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Truncated...' }],
        usage: { input_tokens: 50, output_tokens: 16384 },
        stop_reason: 'max_tokens',
      })

      const result = await generateWithFallback({
        prompt: 'Test prompt',
      })

      expect(result.truncated).toBe(true)
    })

    it('throws on Gemini missing API key', async () => {
      delete process.env.GEMINI_API_KEY
      // Need to reset module cache to pick up env change
      // The lazy client init will check API key inside generateWithGemini
      mockGenerateContent.mockRejectedValue(new Error('GEMINI_API_KEY is not set'))

      await expect(
        generateWithFallback({ prompt: 'Test' })
      ).rejects.toThrow()
    })

    it('handles server errors from Gemini', async () => {
      const serverError = new Error('500 Internal Server Error')
      mockGenerateContent.mockRejectedValue(serverError)

      await expect(
        generateWithFallback({ prompt: 'Test' })
      ).rejects.toThrow('temporarily unavailable')
    })

    it('classifies rate limit errors with retry-after header', async () => {
      const error = new Error('Resource exhausted. Retry-After: 30')
      mockGenerateContent
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          text: 'Success',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
        })

      const result = await generateWithFallback({ prompt: 'Test' })
      expect(result.text).toBe('Success')
    })

    it('sanitizes unknown errors to remove credentials', async () => {
      const error = new Error('Failed at https://api.example.com/v1/generate with api_key=sk-1234567890')
      mockGenerateContent.mockRejectedValue(error)

      await expect(
        generateWithFallback({ prompt: 'Test' })
      ).rejects.toThrow(expect.not.stringContaining('sk-1234567890'))
    })
  })
})
