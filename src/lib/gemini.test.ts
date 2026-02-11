import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the observatory tracking module
vi.mock('./observatory/tracking', () => ({
  trackLLMOperationServer: vi.fn().mockResolvedValue(undefined),
}))

// Mock prompt-utils module
vi.mock('./prompt-utils', () => ({
  buildSafePrompt: vi.fn((prompt: string, content: string) => `${prompt}\n${content}`),
  extractAndValidateJson: vi.fn((text: string) => {
    try {
      // Try to parse JSON from text
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return { success: false, error: 'No JSON found' }
      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const data = JSON.parse(jsonStr)
      return { success: true, data }
    } catch {
      return { success: false, error: 'Failed to parse' }
    }
  }),
  GeminiExtractionSchema: {},
  CONFIDENCE_SCORING_GUIDE: 'Confidence guide',
  PII_HANDLING_GUIDE: 'PII guide',
  ERROR_RECOVERY_GUIDE: 'Error recovery guide',
}))

// Mock Prisma DB client (getGeminiPrompt uses prisma.promptTemplate.findFirst)
vi.mock('./db', () => ({
  prisma: {
    promptTemplate: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}))

// Mock GoogleGenAI SDK
const mockGenerateContent = vi.fn()
const mockGenerateImages = vi.fn()
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
      generateImages: (...args: unknown[]) => mockGenerateImages(...args),
    }
  },
}))

import { getMimeType, processRecording, processDocument, generateDEAvatar } from './gemini'

describe('getMimeType', () => {
  it('returns correct MIME type for audio files', () => {
    expect(getMimeType('recording.mp3')).toBe('audio/mpeg')
    expect(getMimeType('audio.wav')).toBe('audio/wav')
    expect(getMimeType('audio.m4a')).toBe('audio/mp4')
    expect(getMimeType('audio.webm')).toBe('audio/webm')
    expect(getMimeType('audio.ogg')).toBe('audio/ogg')
  })

  it('returns correct MIME type for video files', () => {
    expect(getMimeType('video.mp4')).toBe('video/mp4')
  })

  it('returns correct MIME type for document files', () => {
    expect(getMimeType('document.pdf')).toBe('application/pdf')
    expect(getMimeType('document.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(getMimeType('presentation.pptx')).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation')
  })

  it('handles uppercase extensions', () => {
    expect(getMimeType('RECORDING.MP3')).toBe('audio/mpeg')
    expect(getMimeType('Document.PDF')).toBe('application/pdf')
  })

  it('returns octet-stream for unknown extensions', () => {
    expect(getMimeType('file.xyz')).toBe('application/octet-stream')
    expect(getMimeType('file.unknown')).toBe('application/octet-stream')
    expect(getMimeType('noextension')).toBe('application/octet-stream')
  })

  it('handles files with multiple dots', () => {
    expect(getMimeType('my.recording.2024.mp3')).toBe('audio/mpeg')
    expect(getMimeType('file.name.pdf')).toBe('application/pdf')
  })
})

describe('processRecording', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts data from kickoff session (phase 1)', async () => {
    const mockResult = {
      transcript: 'This is a kickoff session transcript',
      businessContext: {
        problem: 'High manual workload',
        monthlyVolume: 5000,
        quote: 'We process about 5000 cases monthly',
      },
      stakeholders: [
        { name: 'John Smith', role: 'VP Operations', isDecisionMaker: true, quote: 'I lead operations' },
      ],
      kpis: [
        { name: 'Automation Rate', targetValue: '85%', unit: '%', measurementMethod: 'Monthly tracking', quote: 'Target 85%' },
      ],
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 500 },
    } as never)

    const buffer = Buffer.from('fake audio data')
    const result = await processRecording(buffer, 'audio/mpeg', 1)

    expect(result.transcript).toBe('This is a kickoff session transcript')
    expect(result.businessContext?.problem).toBe('High manual workload')
    expect(result.stakeholders).toHaveLength(1)
    expect(result.kpis).toHaveLength(1)
  })

  it('extracts data from process design session (phase 2)', async () => {
    const mockResult = {
      transcript: 'Process design transcript',
      processSteps: [
        { step: 'Receive claim', order: 1, quote: 'First we receive the claim' },
        { step: 'Validate data', order: 2, quote: 'Then we validate' },
      ],
      caseTypes: [
        { type: 'Simple Claim', volumePercent: 60, complexity: 'LOW', automatable: true, quote: 'Simple claims are 60%' },
      ],
      channels: [
        { type: 'EMAIL', volumePercent: 70, quote: 'Most come via email' },
      ],
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 800, candidatesTokenCount: 400 },
    } as never)

    const buffer = Buffer.from('fake audio data')
    const result = await processRecording(buffer, 'audio/mpeg', 2)

    expect(result.processSteps).toHaveLength(2)
    expect(result.caseTypes).toHaveLength(1)
    expect(result.channels).toHaveLength(1)
  })

  it('extracts data from skills/guardrails session (phase 3)', async () => {
    const mockResult = {
      transcript: 'Skills and guardrails transcript',
      skills: [
        { name: 'Answer FAQ', type: 'ANSWER', description: 'Answer common questions', phase: 1, quote: 'Answer FAQs' },
      ],
      brandTone: {
        tone: 'Professional and warm',
        formality: 'FORMAL',
        language: ['Dutch', 'English'],
        empathyLevel: 'High',
        quote: 'We want a warm professional tone',
      },
      guardrails: {
        never: [{ item: 'Share passwords', reason: 'Security risk', quote: 'Never share passwords' }],
        always: [{ item: 'Verify identity', reason: 'Compliance', quote: 'Always verify' }],
      },
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 450 },
    } as never)

    const buffer = Buffer.from('fake audio data')
    const result = await processRecording(buffer, 'audio/mpeg', 3)

    expect(result.skills).toHaveLength(1)
    expect(result.brandTone?.formality).toBe('FORMAL')
    expect(result.guardrails?.never).toHaveLength(1)
    expect(result.guardrails?.always).toHaveLength(1)
  })

  it('extracts data from technical session (phase 4)', async () => {
    const mockResult = {
      transcript: 'Technical session transcript',
      integrations: [
        { systemName: 'SAP', purpose: 'ERP', accessType: 'READ_WRITE', dataFields: ['customer_id', 'claim_amount'], apiAvailable: true, quote: 'SAP integration needed' },
      ],
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 700, candidatesTokenCount: 350 },
    } as never)

    const buffer = Buffer.from('fake audio data')
    const result = await processRecording(buffer, 'audio/mpeg', 4)

    expect(result.integrations).toHaveLength(1)
    expect(result.integrations![0].systemName).toBe('SAP')
    expect(result.integrations![0].dataFields).toContain('customer_id')
  })

  it('extracts data from technical session continued (phase 5)', async () => {
    const mockResult = {
      transcript: 'Technical session continued',
      integrations: [
        { systemName: 'Salesforce', purpose: 'CRM', accessType: 'READ', dataFields: ['contact'], apiAvailable: true, quote: 'CRM access' },
      ],
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 600, candidatesTokenCount: 300 },
    } as never)

    const buffer = Buffer.from('fake audio data')
    const result = await processRecording(buffer, 'audio/mpeg', 5)

    expect(result.integrations).toHaveLength(1)
  })

  it('extracts data from sign-off session (phase 6)', async () => {
    const mockResult = {
      transcript: 'Sign-off session transcript',
      launchCriteria: [
        { criterion: 'All tests pass', phase: 'full_launch', owner: 'QA Team', quote: 'Need all tests passing' },
      ],
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 500, candidatesTokenCount: 250 },
    } as never)

    const buffer = Buffer.from('fake audio data')
    const result = await processRecording(buffer, 'audio/mpeg', 6)

    expect(result.launchCriteria).toHaveLength(1)
    expect(result.launchCriteria![0].criterion).toBe('All tests pass')
  })

  it('uses legacy prompt for unknown session phase', async () => {
    const mockResult = {
      transcript: 'Legacy transcript',
      scopeItems: [
        { statement: 'Handle claims', classification: 'IN_SCOPE', quote: 'We handle claims' },
      ],
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 400, candidatesTokenCount: 200 },
    } as never)

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const buffer = Buffer.from('fake audio data')
    const result = await processRecording(buffer, 'audio/mpeg', 99)

    expect(result.scopeItems).toHaveLength(1)
    consoleSpy.mockRestore()
  })

  it('uses legacy prompt when session phase is undefined', async () => {
    const mockResult = {
      transcript: 'No phase transcript',
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 150 },
    } as never)

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const buffer = Buffer.from('fake audio data')
    const result = await processRecording(buffer, 'audio/mpeg')

    expect(result.transcript).toBe('No phase transcript')
    consoleSpy.mockRestore()
  })

  it('throws user-friendly error on API failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('429 rate limit exceeded'))

    const buffer = Buffer.from('fake audio data')
    await expect(processRecording(buffer, 'audio/mpeg', 1)).rejects.toThrow(
      'Gemini rate limit reached'
    )
  })

  it('throws user-friendly error on auth failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('401 unauthorized'))

    const buffer = Buffer.from('fake audio data')
    await expect(processRecording(buffer, 'audio/mpeg', 1)).rejects.toThrow(
      'Gemini authentication failed'
    )
  })

  it('throws user-friendly error on timeout', async () => {
    mockGenerateContent.mockRejectedValue(new Error('timeout: deadline exceeded'))

    const buffer = Buffer.from('fake audio data')
    await expect(processRecording(buffer, 'audio/mpeg', 1)).rejects.toThrow(
      'Gemini request timed out'
    )
  })

  it('throws user-friendly error on service unavailable', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 service unavailable'))

    const buffer = Buffer.from('fake audio data')
    await expect(processRecording(buffer, 'audio/mpeg', 1)).rejects.toThrow(
      'Gemini service is temporarily unavailable'
    )
  })

  it('sanitizes unknown error messages', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Custom error with key=abc123 and https://api.google.com/secret'))

    const buffer = Buffer.from('fake audio data')
    await expect(processRecording(buffer, 'audio/mpeg', 1)).rejects.toThrow(
      /Gemini processing error/
    )
  })

  it('handles non-Error thrown objects', async () => {
    mockGenerateContent.mockRejectedValue('string error')

    const buffer = Buffer.from('fake audio data')
    await expect(processRecording(buffer, 'audio/mpeg', 1)).rejects.toThrow(
      'An unexpected error occurred during Gemini processing'
    )
  })

  it('falls back to unvalidated JSON parsing when validation fails', async () => {
    // Make extractAndValidateJson fail, but provide parseable JSON
    const { extractAndValidateJson } = await import('./prompt-utils')
    const mockExtract = vi.mocked(extractAndValidateJson)
    mockExtract.mockReturnValueOnce({ success: false, error: 'Schema validation failed' })

    const mockResult = { transcript: 'Fallback parse' }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
    } as never)

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const buffer = Buffer.from('fake audio data')
    const result = await processRecording(buffer, 'audio/mpeg', 1)

    expect(result.transcript).toBe('Fallback parse')
    consoleSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('handles response with markdown-wrapped JSON', async () => {
    // Make extractAndValidateJson fail so fallback regex kicks in
    const { extractAndValidateJson } = await import('./prompt-utils')
    const mockExtract = vi.mocked(extractAndValidateJson)
    mockExtract.mockReturnValueOnce({ success: false, error: 'Validation failed' })

    mockGenerateContent.mockResolvedValue({
      text: '```json\n{"transcript": "markdown wrapped"}\n```',
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
    } as never)

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const buffer = Buffer.from('fake audio data')
    const result = await processRecording(buffer, 'audio/mpeg', 1)

    expect(result.transcript).toBe('markdown wrapped')
    consoleSpy.mockRestore()
    errorSpy.mockRestore()
  })
})

describe('processDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts data from document upload', async () => {
    const mockResult = {
      transcript: 'Document content analysis',
      businessContext: {
        problem: 'Manual document processing',
        quote: 'Too much manual work',
      },
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 800, candidatesTokenCount: 400 },
    } as never)

    const buffer = Buffer.from('fake document data')
    const result = await processDocument(buffer, 'application/pdf', 1)

    expect(result.transcript).toBe('Document content analysis')
    expect(result.businessContext?.problem).toBe('Manual document processing')
  })

  it('throws user-friendly error on API failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('429 rate limit'))

    const buffer = Buffer.from('fake document data')
    await expect(processDocument(buffer, 'application/pdf', 1)).rejects.toThrow(
      'Gemini rate limit reached'
    )
  })

  it('processes technical documents (phase 4)', async () => {
    const mockResult = {
      transcript: 'Technical document',
      integrations: [
        { systemName: 'API Gateway', purpose: 'Routing', accessType: 'READ', dataFields: ['route'], apiAvailable: true, quote: 'Gateway docs' },
      ],
    }

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockResult),
      usageMetadata: { promptTokenCount: 500, candidatesTokenCount: 200 },
    } as never)

    const buffer = Buffer.from('fake document')
    const result = await processDocument(buffer, 'application/pdf', 4)

    expect(result.integrations).toHaveLength(1)
  })

  it('falls back to unvalidated parsing on validation failure', async () => {
    const { extractAndValidateJson } = await import('./prompt-utils')
    const mockExtract = vi.mocked(extractAndValidateJson)
    mockExtract.mockReturnValueOnce({ success: false, error: 'Validation failed' })

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ transcript: 'Fallback doc parse' }),
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
    } as never)

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const buffer = Buffer.from('fake document')
    const result = await processDocument(buffer, 'application/pdf', 1)

    expect(result.transcript).toBe('Fallback doc parse')
    consoleSpy.mockRestore()
    errorSpy.mockRestore()
  })
})

describe('generateDEAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns base64 image on success', async () => {
    mockGenerateImages.mockResolvedValue({
      generatedImages: [
        { image: { imageBytes: 'base64ImageData' } },
      ],
    } as never)

    const result = await generateDEAvatar('Ben', 'Customer Service', 'Friendly', 'Professional')

    expect(result).toBe('base64ImageData')
    expect(mockGenerateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'imagen-4.0-generate-001',
        config: expect.objectContaining({
          numberOfImages: 1,
          aspectRatio: '1:1',
          outputMimeType: 'image/png',
        }),
      })
    )
  })

  it('includes DE details in the prompt', async () => {
    mockGenerateImages.mockResolvedValue({
      generatedImages: [{ image: { imageBytes: 'data' } }],
    } as never)

    await generateDEAvatar('Emma', 'Claims Assistant', 'Patient and thorough', 'Warm and professional')

    const callArgs = mockGenerateImages.mock.calls[0][0]
    expect(callArgs.prompt).toContain('Emma')
    expect(callArgs.prompt).toContain('Claims Assistant')
    expect(callArgs.prompt).toContain('Patient and thorough')
    expect(callArgs.prompt).toContain('Warm and professional')
  })

  it('returns null when no images are returned', async () => {
    mockGenerateImages.mockResolvedValue({
      generatedImages: [],
    } as never)

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await generateDEAvatar('Ben', 'Role', 'Personality', 'Tone')

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('returns null when generatedImages is undefined', async () => {
    mockGenerateImages.mockResolvedValue({} as never)

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await generateDEAvatar('Ben', 'Role', 'Personality', 'Tone')

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('returns null when image data is missing', async () => {
    mockGenerateImages.mockResolvedValue({
      generatedImages: [{ image: {} }],
    } as never)

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await generateDEAvatar('Ben', 'Role', 'Personality', 'Tone')

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('returns null on API error (graceful degradation)', async () => {
    mockGenerateImages.mockRejectedValue(new Error('Image generation failed'))

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await generateDEAvatar('Ben', 'Role', 'Personality', 'Tone')

    expect(result).toBeNull()
    errorSpy.mockRestore()
  })
})
