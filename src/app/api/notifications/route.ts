import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateBody, CreateNotificationSchema } from '@/lib/validation'
import { withErrorTracking } from '@/lib/api-utils'

// GET /api/notifications - List latest 20 notifications with unread count
export const GET = withErrorTracking(async () => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.notification.count({
      where: { read: false },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: { notifications, unreadCount },
  })
}, '/api/notifications')

// POST /api/notifications - Create a new notification
export const POST = withErrorTracking(async (request: NextRequest) => {
  const validation = await validateBody(request, CreateNotificationSchema)
  if (!validation.success) {
    return validation.response
  }

  const { type, title, message, link, metadata } = validation.data

  const notification = await prisma.notification.create({
    data: {
      type,
      title,
      message,
      link: link ?? null,
      metadata: metadata as object | undefined,
    },
  })

  return NextResponse.json({ success: true, data: notification }, { status: 201 })
}, '/api/notifications')
