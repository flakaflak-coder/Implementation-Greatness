import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/notifications/route'
import { POST as markRead } from '@/app/api/notifications/mark-read/route'
import { mockPrisma } from '../setup'

const mockedPrisma = mockPrisma

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns notifications with unread count', async () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        type: 'EXTRACTION_COMPLETE',
        title: 'Extraction Complete',
        message: 'Session 1 has been processed',
        link: '/companies/c1/digital-employees/de-1',
        read: false,
        metadata: null,
        createdAt: new Date('2026-02-10T10:00:00Z'),
      },
      {
        id: 'notif-2',
        type: 'HEALTH_CHANGE',
        title: 'Health Alert',
        message: 'Claims Agent health dropped to 65',
        link: null,
        read: true,
        metadata: { oldScore: 85, newScore: 65 },
        createdAt: new Date('2026-02-09T10:00:00Z'),
      },
    ]

    mockedPrisma.notification.findMany.mockResolvedValue(mockNotifications as never)
    mockedPrisma.notification.count.mockResolvedValue(1 as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.notifications).toHaveLength(2)
    expect(data.data.unreadCount).toBe(1)
    expect(mockedPrisma.notification.findMany).toHaveBeenCalledOnce()
    expect(mockedPrisma.notification.count).toHaveBeenCalledWith({
      where: { read: false },
    })
  })

  it('returns empty state when no notifications exist', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([] as never)
    mockedPrisma.notification.count.mockResolvedValue(0 as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.notifications).toHaveLength(0)
    expect(data.data.unreadCount).toBe(0)
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.notification.findMany.mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })
})

describe('POST /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a notification with valid data', async () => {
    const mockNotification = {
      id: 'notif-new',
      type: 'EXTRACTION_COMPLETE',
      title: 'Extraction Done',
      message: 'Session processed successfully',
      link: '/companies/c1/digital-employees/de-1',
      read: false,
      metadata: null,
      createdAt: new Date(),
    }

    mockedPrisma.notification.create.mockResolvedValue(mockNotification as never)

    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({
        type: 'EXTRACTION_COMPLETE',
        title: 'Extraction Done',
        message: 'Session processed successfully',
        link: '/companies/c1/digital-employees/de-1',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe('notif-new')
    expect(mockedPrisma.notification.create).toHaveBeenCalledOnce()
  })

  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({
        type: 'EXTRACTION_COMPLETE',
        // missing title and message
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details).toBeDefined()
    expect(mockedPrisma.notification.create).not.toHaveBeenCalled()
  })

  it('returns 400 with invalid notification type', async () => {
    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({
        type: 'INVALID_TYPE',
        title: 'Test',
        message: 'Test message',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.notification.create.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      body: JSON.stringify({
        type: 'EXTRACTION_COMPLETE',
        title: 'Test',
        message: 'Test message',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })
})

describe('POST /api/notifications/mark-read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks specific notifications as read by ids', async () => {
    mockedPrisma.notification.updateMany.mockResolvedValue({ count: 2 } as never)

    const request = new NextRequest('http://localhost/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({
        ids: ['notif-1', 'notif-2'],
      }),
    })

    const response = await markRead(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.count).toBe(2)
    expect(mockedPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['notif-1', 'notif-2'] } },
      data: { read: true },
    })
  })

  it('marks all notifications as read', async () => {
    mockedPrisma.notification.updateMany.mockResolvedValue({ count: 5 } as never)

    const request = new NextRequest('http://localhost/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({
        all: true,
      }),
    })

    const response = await markRead(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.count).toBe(5)
    expect(mockedPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { read: false },
      data: { read: true },
    })
  })

  it('returns 400 when neither ids nor all is provided', async () => {
    const request = new NextRequest('http://localhost/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await markRead(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(mockedPrisma.notification.updateMany).not.toHaveBeenCalled()
  })

  it('returns 500 on database error', async () => {
    mockedPrisma.notification.updateMany.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({
        all: true,
      }),
    })

    const response = await markRead(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })
})
