import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/support/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('GET /api/support', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns digital employees with scope summaries and scope items', async () => {
    const mockDigitalEmployees = [
      {
        id: 'de-1',
        name: 'Claims Agent',
        status: 'LIVE',
        channels: ['email', 'chat'],
        goLiveDate: new Date('2026-03-01'),
        company: { id: 'company-1', name: 'Acme Insurance' },
        designWeek: {
          scopeItems: [
            { classification: 'IN_SCOPE' },
            { classification: 'IN_SCOPE' },
            { classification: 'OUT_OF_SCOPE' },
            { classification: 'AMBIGUOUS' },
          ],
        },
      },
    ]

    const mockScopeItems = [
      {
        id: 'scope-1',
        statement: 'Handle basic claims',
        classification: 'IN_SCOPE',
        skill: 'claims-processing',
        conditions: null,
        notes: null,
        createdAt: new Date(),
        designWeek: {
          digitalEmployee: {
            id: 'de-1',
            name: 'Claims Agent',
            company: { id: 'company-1', name: 'Acme Insurance' },
          },
        },
      },
    ]

    mockedPrisma.digitalEmployee.findMany.mockResolvedValue(mockDigitalEmployees as never)
    mockedPrisma.scopeItem.findMany.mockResolvedValue(mockScopeItems as never)

    const request = new NextRequest('http://localhost/api/support')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.digitalEmployees).toHaveLength(1)
    expect(data.data.digitalEmployees[0].id).toBe('de-1')
    expect(data.data.digitalEmployees[0].scopeSummary).toEqual({
      inScope: 2,
      outOfScope: 1,
      ambiguous: 1,
    })
    expect(data.data.scopeItems).toHaveLength(1)
    expect(data.data.scopeItems[0].digitalEmployeeName).toBe('Claims Agent')
    expect(data.data.scopeItems[0].companyName).toBe('Acme Insurance')
    expect(mockedPrisma.digitalEmployee.findMany).toHaveBeenCalledOnce()
    expect(mockedPrisma.scopeItem.findMany).toHaveBeenCalledOnce()
  })

  it('returns empty state when no digital employees exist', async () => {
    mockedPrisma.digitalEmployee.findMany.mockResolvedValue([] as never)
    mockedPrisma.scopeItem.findMany.mockResolvedValue([] as never)

    const request = new NextRequest('http://localhost/api/support')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.digitalEmployees).toHaveLength(0)
    expect(data.data.scopeItems).toHaveLength(0)
  })

  it('filters scope items by search query', async () => {
    mockedPrisma.digitalEmployee.findMany.mockResolvedValue([] as never)

    const mockScopeItems = [
      {
        id: 'scope-1',
        statement: 'Handle basic claims',
        classification: 'IN_SCOPE',
        skill: 'claims',
        conditions: null,
        notes: null,
        createdAt: new Date(),
        designWeek: {
          digitalEmployee: {
            id: 'de-1',
            name: 'Claims Agent',
            company: { id: 'company-1', name: 'Acme Insurance' },
          },
        },
      },
      {
        id: 'scope-2',
        statement: 'Process refunds',
        classification: 'OUT_OF_SCOPE',
        skill: 'refunds',
        conditions: null,
        notes: null,
        createdAt: new Date(),
        designWeek: {
          digitalEmployee: {
            id: 'de-2',
            name: 'Billing Bot',
            company: { id: 'company-2', name: 'Beta Corp' },
          },
        },
      },
    ]

    mockedPrisma.scopeItem.findMany.mockResolvedValue(mockScopeItems as never)

    const request = new NextRequest('http://localhost/api/support?search=claims')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // Should filter to only the one matching "claims"
    expect(data.data.scopeItems).toHaveLength(1)
    expect(data.data.scopeItems[0].statement).toBe('Handle basic claims')
  })

  it('handles digital employee without design week gracefully', async () => {
    const mockDigitalEmployees = [
      {
        id: 'de-1',
        name: 'New Agent',
        status: 'DESIGN',
        channels: [],
        goLiveDate: null,
        company: { id: 'company-1', name: 'Acme Insurance' },
        designWeek: null,
      },
    ]

    mockedPrisma.digitalEmployee.findMany.mockResolvedValue(mockDigitalEmployees as never)
    mockedPrisma.scopeItem.findMany.mockResolvedValue([] as never)

    const request = new NextRequest('http://localhost/api/support')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.digitalEmployees[0].scopeSummary).toEqual({
      inScope: 0,
      outOfScope: 0,
      ambiguous: 0,
    })
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.digitalEmployee.findMany.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/support')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to fetch support data')
  })
})
