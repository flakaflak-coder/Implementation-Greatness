import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateBody, MarkNotificationsReadSchema } from '@/lib/validation'
import { withErrorTracking } from '@/lib/api-utils'

// POST /api/notifications/mark-read - Mark notifications as read
export const POST = withErrorTracking(async (request: NextRequest) => {
  const validation = await validateBody(request, MarkNotificationsReadSchema)
  if (!validation.success) {
    return validation.response
  }

  const data = validation.data

  let result: { count: number }

  if ('all' in data && data.all === true) {
    result = await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    })
  } else if ('ids' in data && data.ids) {
    result = await prisma.notification.updateMany({
      where: { id: { in: data.ids } },
      data: { read: true },
    })
  } else {
    return NextResponse.json(
      { success: false, error: 'Must provide either ids or all: true' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    data: { count: result.count },
  })
}, '/api/notifications/mark-read')
