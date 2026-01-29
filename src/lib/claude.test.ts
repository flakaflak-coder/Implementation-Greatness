import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK with a factory that can be controlled
const mockMessagesCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: (...args: unknown[]) => mockMessagesCreate(...args),
      }
    },
  }
})

// Mock prisma - define mocks inline in factory
vi.mock('./db', () => ({
  prisma: {
    promptTemplate: {
      findFirst: vi.fn(),
    },
    extractedItem: {
      createMany: vi.fn(),
    },
    designWeek: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from './db'
import { extractFromTranscript, saveExtractedItems, generateDocument } from './claude'

// Cast to get mock methods
const mockedPrisma = prisma as unknown as {
  promptTemplate: { findFirst: ReturnType<typeof vi.fn> }
  extractedItem: { createMany: ReturnType<typeof vi.fn> }
  designWeek: { findUnique: ReturnType<typeof vi.fn> }
}

describe('extractFromTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts items from kickoff session transcript', async () => {
    // Mock no custom template (use default)
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)

    // Mock Anthropic response
    mockMessagesCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            items: [
              {
                type: 'STAKEHOLDER',
                category: 'decision_maker',
                content: 'John Smith - VP of Operations',
                confidence: 0.95,
                sourceQuote: 'John Smith, our VP, will sign off',
                sourceSpeaker: 'Client PM',
              },
              {
                type: 'GOAL',
                category: 'business',
                content: 'Reduce claim processing time by 50%',
                confidence: 0.9,
                sourceQuote: 'We want to cut processing time in half',
                sourceSpeaker: 'Client',
              },
            ],
          }),
        },
      ],
      usage: {
        input_tokens: 500,
        output_tokens: 200,
      },
    })

    const result = await extractFromTranscript(
      'Meeting transcript: John Smith, our VP, will sign off on this project.',
      'kickoff'
    )

    expect(result.items).toHaveLength(2)
    expect(result.items[0].type).toBe('STAKEHOLDER')
    expect(result.items[0].content).toBe('John Smith - VP of Operations')
    expect(result.items[1].type).toBe('GOAL')
    expect(result.inputTokens).toBe(500)
    expect(result.outputTokens).toBe(200)
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('handles JSON wrapped in markdown code blocks', async () => {
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)

    mockMessagesCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '```json\n{"items": [{"type": "GOAL", "content": "Test goal", "confidence": 0.8}]}\n```',
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    })

    const result = await extractFromTranscript('Test transcript', 'kickoff')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].content).toBe('Test goal')
  })

  it('uses custom prompt template from database when available', async () => {
    const customTemplate = {
      id: 'template-1',
      type: 'EXTRACT_KICKOFF',
      prompt: 'Custom extraction prompt',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.1,
      maxTokens: 2048,
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(customTemplate as never)

    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"items": []}' }],
      usage: { input_tokens: 50, output_tokens: 20 },
    })

    await extractFromTranscript('Test', 'kickoff')

    expect(mockedPrisma.promptTemplate.findFirst).toHaveBeenCalledWith({
      where: { type: 'EXTRACT_KICKOFF', isActive: true },
      orderBy: { version: 'desc' },
    })
  })

  it('throws error when no text response from Claude', async () => {
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)

    mockMessagesCreate.mockResolvedValue({
      content: [],
      usage: { input_tokens: 50, output_tokens: 0 },
    })

    await expect(extractFromTranscript('Test', 'kickoff')).rejects.toThrow('No text response from Claude')
  })

  it('throws error when JSON parsing fails', async () => {
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)

    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is not valid JSON at all and has no braces' }],
      usage: { input_tokens: 50, output_tokens: 20 },
    })

    await expect(extractFromTranscript('Test', 'kickoff')).rejects.toThrow('Failed to parse extraction result')
  })

  it('maps session types to correct prompt types', async () => {
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)

    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"items": []}' }],
      usage: { input_tokens: 50, output_tokens: 20 },
    })

    // Test all session types
    await extractFromTranscript('Test', 'kickoff')
    expect(mockedPrisma.promptTemplate.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { type: 'EXTRACT_KICKOFF', isActive: true } })
    )

    await extractFromTranscript('Test', 'process')
    expect(mockedPrisma.promptTemplate.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { type: 'EXTRACT_PROCESS', isActive: true } })
    )

    await extractFromTranscript('Test', 'technical')
    expect(mockedPrisma.promptTemplate.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { type: 'EXTRACT_TECHNICAL', isActive: true } })
    )

    await extractFromTranscript('Test', 'signoff')
    expect(mockedPrisma.promptTemplate.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { type: 'EXTRACT_SIGNOFF', isActive: true } })
    )
  })
})

describe('saveExtractedItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves extracted items to database', async () => {
    mockedPrisma.extractedItem.createMany.mockResolvedValue({ count: 2 })

    const items = [
      {
        type: 'STAKEHOLDER' as const,
        content: 'John Smith',
        confidence: 0.95,
        sourceQuote: 'John mentioned',
        sourceSpeaker: 'Client',
      },
      {
        type: 'GOAL' as const,
        content: 'Reduce time',
        confidence: 0.6,
        category: 'business',
      },
    ]

    await saveExtractedItems('session-123', items, 'template-1')

    expect(mockedPrisma.extractedItem.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          sessionId: 'session-123',
          promptTemplateId: 'template-1',
          type: 'STAKEHOLDER',
          content: 'John Smith',
          confidence: 0.95,
          status: 'APPROVED', // High confidence = auto-approved
        }),
        expect.objectContaining({
          sessionId: 'session-123',
          type: 'GOAL',
          content: 'Reduce time',
          confidence: 0.6,
          status: 'PENDING', // Low confidence = pending review
          category: 'business',
        }),
      ]),
    })
  })

  it('auto-approves items with confidence >= 0.8', async () => {
    mockedPrisma.extractedItem.createMany.mockResolvedValue({ count: 2 })

    const items = [
      { type: 'GOAL' as const, content: 'High confidence', confidence: 0.8 },
      { type: 'GOAL' as const, content: 'Low confidence', confidence: 0.79 },
    ]

    await saveExtractedItems('session-123', items)

    expect(mockedPrisma.extractedItem.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ content: 'High confidence', status: 'APPROVED' }),
        expect.objectContaining({ content: 'Low confidence', status: 'PENDING' }),
      ]),
    })
  })

  it('handles items without optional fields', async () => {
    mockedPrisma.extractedItem.createMany.mockResolvedValue({ count: 1 })

    const items = [
      { type: 'GOAL' as const, content: 'Minimal item', confidence: 0.5 },
    ]

    await saveExtractedItems('session-123', items)

    expect(mockedPrisma.extractedItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          sessionId: 'session-123',
          promptTemplateId: undefined,
          category: null,
          sourceTimestamp: null,
          sourceSpeaker: null,
          sourceQuote: null,
        }),
      ],
    })
  })
})

describe('generateDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates DE design document from extracted items', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      sessions: [
        {
          extractedItems: [
            { type: 'STAKEHOLDER', content: 'John', status: 'APPROVED' },
            { type: 'GOAL', content: 'Reduce time', status: 'APPROVED' },
          ],
        },
      ],
      digitalEmployee: {
        name: 'Claims Agent',
        description: 'Handles claims intake',
        company: { name: 'Acme Insurance' },
      },
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)

    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '# Digital Employee Design\n\nThis is the generated document.' }],
      usage: { input_tokens: 1000, output_tokens: 500 },
    })

    const result = await generateDocument('dw-1', 'DE_DESIGN')

    expect(result.content).toContain('Digital Employee Design')
    expect(result.inputTokens).toBe(1000)
    expect(result.outputTokens).toBe(500)
    expect(mockedPrisma.designWeek.findUnique).toHaveBeenCalledWith({
      where: { id: 'dw-1' },
      include: expect.objectContaining({
        sessions: expect.objectContaining({
          include: expect.objectContaining({
            extractedItems: { where: { status: 'APPROVED' } },
          }),
        }),
      }),
    })
  })

  it('throws error when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null)

    await expect(generateDocument('nonexistent', 'DE_DESIGN')).rejects.toThrow('Design week not found')
  })

  it('maps document types to correct prompt types', async () => {
    const mockDesignWeek = {
      id: 'dw-1',
      sessions: [],
      digitalEmployee: {
        name: 'Test',
        description: null,
        company: { name: 'Test Corp' },
      },
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)

    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Generated content' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    })

    await generateDocument('dw-1', 'DE_DESIGN')
    expect(mockedPrisma.promptTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: 'GENERATE_DE_DESIGN', isActive: true } })
    )

    vi.clearAllMocks()
    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Generated content' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    })

    await generateDocument('dw-1', 'SOLUTION_DESIGN')
    expect(mockedPrisma.promptTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: 'GENERATE_SOLUTION', isActive: true } })
    )

    vi.clearAllMocks()
    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Generated content' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    })

    await generateDocument('dw-1', 'TEST_PLAN')
    expect(mockedPrisma.promptTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: 'GENERATE_TEST_PLAN', isActive: true } })
    )
  })
})
