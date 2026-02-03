import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  claudeCanHandle,
  isMultimodalContent,
  parseJSONFromResponse,
} from './ai-client'

// Note: We test the utility functions here without mocking external AI clients
// The main generateWithFallback function requires complex API mocking

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
  })
})
