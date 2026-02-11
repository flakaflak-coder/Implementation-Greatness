import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/design-weeks/[id]/test-plan/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('GET /api/design-weeks/[id]/test-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a saved test plan with stats', async () => {
    const savedTestPlan = {
      testCases: [
        { id: 'tc-1', name: 'Happy path', type: 'happy_path', priority: 'high', status: 'pass', steps: ['Step 1'], expectedResult: 'Success' },
        { id: 'tc-2', name: 'Exception', type: 'exception', priority: 'high', status: 'fail', steps: ['Step 1'], expectedResult: 'Handled' },
        { id: 'tc-3', name: 'Guardrail', type: 'guardrail', priority: 'critical', status: 'not_run', steps: ['Step 1'], expectedResult: 'Blocked' },
        { id: 'tc-4', name: 'Boundary', type: 'boundary', priority: 'medium', status: 'blocked', steps: ['Step 1'], expectedResult: 'Rejected' },
      ],
      coverageGoal: 80,
      notes: [],
    }

    const mockDesignWeek = {
      id: 'dw-1',
      testPlan: savedTestPlan,
      sessions: [],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/test-plan')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.testPlan.testCases).toHaveLength(4)
    expect(data.stats.total).toBe(4)
    expect(data.stats.passed).toBe(1)
    expect(data.stats.failed).toBe(1)
    expect(data.stats.notRun).toBe(1)
    expect(data.stats.blocked).toBe(1)
    expect(data.stats.coveragePercent).toBe(25) // 1/4 = 25%
    expect(data.stats.hasSavedPlan).toBe(true)
  })

  it('generates a test plan from extracted items when none is saved', async () => {
    const mockDesignWeek = {
      id: 'dw-2',
      testPlan: null,
      sessions: [
        {
          extractedItems: [
            {
              id: 'item-1',
              type: 'HAPPY_PATH_STEP',
              content: 'Process incoming claim',
              status: 'APPROVED',
              structuredData: { title: 'Process Claim', description: 'Handle new claims' },
            },
            {
              id: 'item-2',
              type: 'EXCEPTION_CASE',
              content: 'Duplicate claim detected',
              status: 'APPROVED',
              structuredData: { trigger: 'Duplicate claim', action: 'Flag for review' },
            },
            {
              id: 'item-3',
              type: 'GUARDRAIL_NEVER',
              content: 'Share customer data externally',
              status: 'APPROVED',
              structuredData: null,
            },
          ],
        },
      ],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-2/test-plan')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-2' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.testPlan.testCases).toHaveLength(3)

    // Check happy path test case
    const happyPathCase = data.testPlan.testCases.find((tc: { type: string }) => tc.type === 'happy_path')
    expect(happyPathCase).toBeDefined()
    expect(happyPathCase.name).toContain('Process Claim')
    expect(happyPathCase.priority).toBe('high')
    expect(happyPathCase.status).toBe('not_run')

    // Check exception test case
    const exceptionCase = data.testPlan.testCases.find((tc: { type: string }) => tc.type === 'exception')
    expect(exceptionCase).toBeDefined()
    expect(exceptionCase.name).toContain('Duplicate claim')

    // Check guardrail test case
    const guardrailCase = data.testPlan.testCases.find((tc: { type: string }) => tc.type === 'guardrail')
    expect(guardrailCase).toBeDefined()
    expect(guardrailCase.priority).toBe('critical')

    expect(data.stats.hasSavedPlan).toBe(false)
    expect(data.stats.total).toBe(3)
    expect(data.stats.notRun).toBe(3)
    expect(data.stats.coveragePercent).toBe(0)
  })

  it('generates test cases for SCOPE_IN and SCOPE_OUT items', async () => {
    const mockDesignWeek = {
      id: 'dw-3',
      testPlan: null,
      sessions: [
        {
          extractedItems: [
            {
              id: 'item-4',
              type: 'SCOPE_IN',
              content: 'Handle simple claims',
              status: 'APPROVED',
              structuredData: null,
            },
            {
              id: 'item-5',
              type: 'SCOPE_OUT',
              content: 'Complex legal disputes',
              status: 'APPROVED',
              structuredData: null,
            },
          ],
        },
      ],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-3/test-plan')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-3' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.testPlan.testCases).toHaveLength(2)

    const scopeCase = data.testPlan.testCases.find((tc: { type: string }) => tc.type === 'scope')
    expect(scopeCase).toBeDefined()
    expect(scopeCase.name).toContain('In Scope')

    const boundaryCase = data.testPlan.testCases.find((tc: { type: string }) => tc.type === 'boundary')
    expect(boundaryCase).toBeDefined()
    expect(boundaryCase.name).toContain('Out of Scope')
  })

  it('returns empty test plan when no extracted items exist', async () => {
    const mockDesignWeek = {
      id: 'dw-4',
      testPlan: null,
      sessions: [],
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-4/test-plan')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-4' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.testPlan.testCases).toHaveLength(0)
    expect(data.stats.total).toBe(0)
    expect(data.stats.coveragePercent).toBe(0)
  })

  it('returns 404 when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/design-weeks/nonexistent/test-plan')
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/invalid id!/test-plan')
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.designWeek.findUnique.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/test-plan')
    const response = await GET(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to load test plan')
  })
})

describe('PUT /api/design-weeks/[id]/test-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves a test plan successfully', async () => {
    const testPlan = {
      testCases: [
        { id: 'tc-1', name: 'Test 1', type: 'happy_path', priority: 'high', status: 'pass', steps: ['Step 1'], expectedResult: 'Success' },
      ],
      coverageGoal: 80,
      notes: ['Some notes'],
    }

    const mockDesignWeek = {
      id: 'dw-1',
    }

    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockResolvedValue({} as never)

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/test-plan', {
      method: 'PUT',
      body: JSON.stringify({ profile: testPlan }),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    const updateCall = mockedPrisma.designWeek.update.mock.calls[0][0]
    expect(updateCall.where.id).toBe('dw-1')
    expect(updateCall.data.testPlan).toBeDefined()
    expect(updateCall.data.testPlan.testCases).toHaveLength(1)
    expect(updateCall.data.testPlan.lastUpdated).toBeDefined()
  })

  it('returns 404 when design week not found', async () => {
    mockedPrisma.designWeek.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/design-weeks/nonexistent/test-plan', {
      method: 'PUT',
      body: JSON.stringify({ profile: { testCases: [], coverageGoal: 80, notes: [] } }),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Design week not found')
  })

  it('returns 400 when profile field is missing', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/test-plan', {
      method: 'PUT',
      body: JSON.stringify({}),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/design-weeks/invalid id!/test-plan', {
      method: 'PUT',
      body: JSON.stringify({ profile: { testCases: [], coverageGoal: 80, notes: [] } }),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'invalid id!' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 500 on database error', async () => {
    const mockDesignWeek = { id: 'dw-1' }
    mockedPrisma.designWeek.findUnique.mockResolvedValue(mockDesignWeek as never)
    mockedPrisma.designWeek.update.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/design-weeks/dw-1/test-plan', {
      method: 'PUT',
      body: JSON.stringify({ profile: { testCases: [], coverageGoal: 80, notes: [] } }),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'dw-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save test plan')
  })
})
