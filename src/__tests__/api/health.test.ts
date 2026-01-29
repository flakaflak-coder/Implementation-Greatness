import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/health/route'
import { prisma } from '@/lib/db'

const mockedPrisma = vi.mocked(prisma)

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns healthy status when database is connected', async () => {
    mockedPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }] as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.services.database).toBe('connected')
    expect(data.timestamp).toBeDefined()
  })

  it('returns unhealthy status when database is disconnected', async () => {
    mockedPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.services.database).toBe('disconnected')
    expect(data.timestamp).toBeDefined()
  })
})
