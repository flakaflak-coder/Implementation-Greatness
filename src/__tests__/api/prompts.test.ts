import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/prompts/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('GET /api/prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns grouped prompt templates', async () => {
    const mockTemplates = [
      {
        id: 'template-1',
        type: 'EXTRACT_KICKOFF',
        name: 'extract_kickoff',
        description: 'Kickoff extraction prompt',
        prompt: 'Extract kickoff information...',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.2,
        maxTokens: 4096,
        version: 2,
        isActive: true,
        createdAt: new Date('2026-01-27T10:00:00Z'),
        updatedAt: new Date('2026-01-27T10:00:00Z'),
      },
      {
        id: 'template-2',
        type: 'EXTRACT_KICKOFF',
        name: 'extract_kickoff',
        description: 'Old version',
        prompt: 'Old prompt...',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.2,
        maxTokens: 4096,
        version: 1,
        isActive: false,
        createdAt: new Date('2026-01-20T10:00:00Z'),
        updatedAt: new Date('2026-01-20T10:00:00Z'),
      },
      {
        id: 'template-3',
        type: 'EXTRACT_PROCESS',
        name: 'extract_process',
        description: 'Process extraction prompt',
        prompt: 'Extract process information...',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.2,
        maxTokens: 8192,
        version: 1,
        isActive: true,
        createdAt: new Date('2026-01-27T10:00:00Z'),
        updatedAt: new Date('2026-01-27T10:00:00Z'),
      },
    ]

    mockedPrisma.promptTemplate.findMany.mockResolvedValue(mockTemplates as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.templates).toHaveLength(2) // Grouped by type, only latest
    expect(data.all).toHaveLength(3) // All templates

    // First template should be EXTRACT_KICKOFF (version 2)
    expect(data.templates[0].type).toBe('EXTRACT_KICKOFF')
    expect(data.templates[0].version).toBe(2)

    expect(mockedPrisma.promptTemplate.findMany).toHaveBeenCalledWith({
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    })
  })

  it('returns empty arrays when no templates exist', async () => {
    mockedPrisma.promptTemplate.findMany.mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.templates).toEqual([])
    expect(data.all).toEqual([])
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.promptTemplate.findMany.mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch prompts')
  })
})

describe('POST /api/prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new prompt template when none exists', async () => {
    // No existing template
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)

    const newTemplate = {
      id: 'new-template',
      type: 'EXTRACT_KICKOFF',
      name: 'extract_kickoff',
      description: 'Custom prompt',
      prompt: 'New extraction prompt...',
      model: 'claude-sonnet-4-5-20250929',
      temperature: 0.3,
      maxTokens: 4096,
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockedPrisma.promptTemplate.create.mockResolvedValue(newTemplate as never)

    const request = new NextRequest('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'extract_kickoff',
        type: 'EXTRACT_KICKOFF',
        prompt: 'New extraction prompt...',
        description: 'Custom prompt',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.template.version).toBe(1)
    expect(data.template.isActive).toBe(true)

    // Should NOT call updateMany since no existing template
    expect(mockedPrisma.promptTemplate.updateMany).not.toHaveBeenCalled()
  })

  it('increments version and deactivates old templates', async () => {
    // Existing template version 2
    const existingTemplate = {
      id: 'old-template',
      type: 'EXTRACT_KICKOFF',
      version: 2,
      isActive: true,
    }
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(existingTemplate as never)
    mockedPrisma.promptTemplate.updateMany.mockResolvedValue({ count: 2 })

    const newTemplate = {
      id: 'new-template',
      type: 'EXTRACT_KICKOFF',
      name: 'extract_kickoff',
      prompt: 'Updated prompt...',
      model: 'claude-sonnet-4-5-20250929',
      temperature: 0.3,
      maxTokens: 4096,
      version: 3, // Incremented
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockedPrisma.promptTemplate.create.mockResolvedValue(newTemplate as never)

    const request = new NextRequest('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'extract_kickoff',
        type: 'EXTRACT_KICKOFF',
        prompt: 'Updated prompt...',
      }),
    })

    const response = await POST(request)
    await response.json()

    expect(response.status).toBe(200)

    // Should deactivate old templates
    expect(mockedPrisma.promptTemplate.updateMany).toHaveBeenCalledWith({
      where: { type: 'EXTRACT_KICKOFF' },
      data: { isActive: false },
    })

    // Should create with version 3
    expect(mockedPrisma.promptTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'EXTRACT_KICKOFF',
        version: 3,
        isActive: true,
      }),
    })
  })

  it('returns 400 when type is missing', async () => {
    const request = new NextRequest('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'test_prompt',
        prompt: 'Some prompt...',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(mockedPrisma.promptTemplate.create).not.toHaveBeenCalled()
  })

  it('returns 400 when prompt is missing', async () => {
    const request = new NextRequest('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'test_prompt',
        type: 'EXTRACT_KICKOFF',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('uses default values for optional fields', async () => {
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)
    mockedPrisma.promptTemplate.create.mockResolvedValue({
      id: 'template',
      type: 'EXTRACT_KICKOFF',
      name: 'extract_kickoff',
      prompt: 'Prompt text',
      model: 'claude-sonnet-4-5-20250929',
      temperature: 0.3,
      maxTokens: 4096,
      version: 1,
      isActive: true,
    } as never)

    const request = new NextRequest('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'extract_kickoff',
        type: 'EXTRACT_KICKOFF',
        prompt: 'Prompt text',
      }),
    })

    await POST(request)

    expect(mockedPrisma.promptTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.3,
        maxTokens: 4096,
      }),
    })
  })

  it('uses custom values when provided', async () => {
    mockedPrisma.promptTemplate.findFirst.mockResolvedValue(null)
    mockedPrisma.promptTemplate.create.mockResolvedValue({
      id: 'template',
      type: 'EXTRACT_KICKOFF',
      name: 'custom_name',
      prompt: 'Prompt text',
      model: 'claude-opus-4-6',
      temperature: 0.1,
      maxTokens: 8192,
      version: 1,
      isActive: true,
    } as never)

    const request = new NextRequest('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        type: 'EXTRACT_KICKOFF',
        prompt: 'Prompt text',
        name: 'custom_name',
        model: 'claude-opus-4-6',
        temperature: 0.1,
        maxTokens: 8192,
      }),
    })

    await POST(request)

    expect(mockedPrisma.promptTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'custom_name',
        model: 'claude-opus-4-6',
        temperature: 0.1,
        maxTokens: 8192,
      }),
    })
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.promptTemplate.findFirst.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        name: 'test_prompt',
        type: 'EXTRACT_KICKOFF',
        prompt: 'Test prompt',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create prompt')
  })
})
