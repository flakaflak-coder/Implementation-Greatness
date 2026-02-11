import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/journey-phases/[id]/checklist/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('PATCH /api/journey-phases/[id]/checklist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid ID format', async () => {
    const request = new NextRequest('http://localhost/api/journey-phases/bad!id/checklist', {
      method: 'PATCH',
      body: JSON.stringify({ itemId: 'item-1', isCompleted: true }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'bad!id' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid ID format')
  })

  it('returns 400 for invalid body (missing isCompleted)', async () => {
    const request = new NextRequest('http://localhost/api/journey-phases/cl-1/checklist', {
      method: 'PATCH',
      body: JSON.stringify({ itemId: 'item-1' }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'cl-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 400 for invalid body (missing itemId)', async () => {
    const request = new NextRequest('http://localhost/api/journey-phases/cl-1/checklist', {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted: true }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'cl-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 404 when checklist item not found', async () => {
    mockedPrisma.journeyChecklistItem.findUnique.mockResolvedValue(null as never)

    const request = new NextRequest('http://localhost/api/journey-phases/cl-1/checklist', {
      method: 'PATCH',
      body: JSON.stringify({ itemId: 'nonexistent', isCompleted: true }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'cl-1' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Checklist item not found')
  })

  it('marks checklist item as completed', async () => {
    mockedPrisma.journeyChecklistItem.findUnique.mockResolvedValue({
      id: 'cl-1',
      label: 'Review scope',
      isCompleted: false,
    } as never)

    const updatedItem = {
      id: 'cl-1',
      label: 'Review scope',
      isCompleted: true,
      completedAt: new Date(),
      completedBy: 'Sophie',
    }
    mockedPrisma.journeyChecklistItem.update.mockResolvedValue(updatedItem as never)

    const request = new NextRequest('http://localhost/api/journey-phases/cl-1/checklist', {
      method: 'PATCH',
      body: JSON.stringify({ itemId: 'cl-1', isCompleted: true }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'cl-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.item.isCompleted).toBe(true)
    expect(data.item.completedBy).toBe('Sophie')
    expect(mockedPrisma.journeyChecklistItem.update).toHaveBeenCalledWith({
      where: { id: 'cl-1' },
      data: {
        isCompleted: true,
        completedAt: expect.any(Date),
        completedBy: 'Sophie',
      },
    })
  })

  it('marks checklist item as not completed', async () => {
    mockedPrisma.journeyChecklistItem.findUnique.mockResolvedValue({
      id: 'cl-1',
      label: 'Review scope',
      isCompleted: true,
    } as never)

    const updatedItem = {
      id: 'cl-1',
      label: 'Review scope',
      isCompleted: false,
      completedAt: null,
      completedBy: null,
    }
    mockedPrisma.journeyChecklistItem.update.mockResolvedValue(updatedItem as never)

    const request = new NextRequest('http://localhost/api/journey-phases/cl-1/checklist', {
      method: 'PATCH',
      body: JSON.stringify({ itemId: 'cl-1', isCompleted: false }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'cl-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.item.isCompleted).toBe(false)
    expect(data.item.completedAt).toBeNull()
    expect(data.item.completedBy).toBeNull()
    expect(mockedPrisma.journeyChecklistItem.update).toHaveBeenCalledWith({
      where: { id: 'cl-1' },
      data: {
        isCompleted: false,
        completedAt: null,
        completedBy: null,
      },
    })
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.journeyChecklistItem.findUnique.mockRejectedValue(new Error('DB connection error'))

    const request = new NextRequest('http://localhost/api/journey-phases/cl-1/checklist', {
      method: 'PATCH',
      body: JSON.stringify({ itemId: 'cl-1', isCompleted: true }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'cl-1' }) })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update checklist item')
  })

  it('returns 400 for invalid JSON body', async () => {
    const request = new NextRequest('http://localhost/api/journey-phases/cl-1/checklist', {
      method: 'PATCH',
      body: 'not-json',
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 'cl-1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid JSON body')
  })
})
