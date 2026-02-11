import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Use vi.hoisted to create the mock function so the vi.mock factory can reference it
const mocks = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}))

// Mock the Anthropic SDK - the route uses lazy init with `new Anthropic()`
// The default export must be a class/constructor function
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: mocks.mockCreate,
    }
  }
  return { default: MockAnthropic }
})

// Mock observatory tracking
vi.mock('@/lib/observatory/tracking', () => ({
  trackLLMOperationServer: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/design-weeks/[id]/sales-handover/quality-check/route'

describe('POST /api/design-weeks/[id]/sales-handover/quality-check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/bad!id/sales-handover/quality-check', {
      method: 'POST',
      body: JSON.stringify({ profile: {} }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'bad!id' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 400 when profile is missing', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover/quality-check', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Profile is required')
  })

  it('returns quality check result on success', async () => {
    const qualityResult = {
      rating: 'good',
      summary: 'The handover is mostly complete.',
      missingItems: ['Technical contact details'],
      suggestions: ['Add more details about integration requirements'],
    }

    mocks.mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(qualityResult) }],
      usage: { input_tokens: 500, output_tokens: 200 },
    } as never)

    const profile = {
      context: { dealSummary: 'Insurance automation', clientMotivation: 'Cost reduction' },
      watchOuts: [{ description: 'Tight deadline' }],
    }

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover/quality-check', {
      method: 'POST',
      body: JSON.stringify({ profile }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.result.rating).toBe('good')
    expect(data.result.summary).toBe('The handover is mostly complete.')
    expect(data.result.missingItems).toHaveLength(1)
    expect(data.result.suggestions).toHaveLength(1)
  })

  it('handles AI response wrapped in markdown code blocks', async () => {
    const qualityResult = {
      rating: 'excellent',
      summary: 'Comprehensive handover.',
      missingItems: [],
      suggestions: [],
    }

    mocks.mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(qualityResult) + '\n```' }],
      usage: { input_tokens: 500, output_tokens: 200 },
    } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover/quality-check', {
      method: 'POST',
      body: JSON.stringify({ profile: { context: { dealSummary: 'Test' } } }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.result.rating).toBe('excellent')
  })

  it('returns 500 when AI returns no text content', async () => {
    mocks.mockCreate.mockResolvedValue({
      content: [{ type: 'image', source: {} }],
      usage: { input_tokens: 100, output_tokens: 0 },
    } as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover/quality-check', {
      method: 'POST',
      body: JSON.stringify({ profile: { context: {} } }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Quality check failed. Please try again.')
  })

  it('returns 500 when AI call fails', async () => {
    mocks.mockCreate.mockRejectedValue(new Error('API rate limit exceeded'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/sales-handover/quality-check', {
      method: 'POST',
      body: JSON.stringify({ profile: { context: {} } }),
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Quality check failed. Please try again.')
  })
})
