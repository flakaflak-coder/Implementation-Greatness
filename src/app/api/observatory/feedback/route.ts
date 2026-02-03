import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { FeedbackType, FeedbackStatus } from '@prisma/client'

// POST /api/observatory/feedback - Submit feedback
export async function POST(req: Request) {
  try {
    const data = await req.json()

    const { type, content, featureId, userId, npsScore } = data

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Feedback content is required' },
        { status: 400 }
      )
    }

    // Validate feedback type
    const validTypes: FeedbackType[] = ['BUG', 'FEATURE_REQUEST', 'PRAISE', 'COMPLAINT', 'GENERAL']
    const feedbackType = validTypes.includes(type) ? type : 'GENERAL'

    // Validate NPS score if provided
    const validNPS = npsScore !== undefined && npsScore >= 0 && npsScore <= 10 ? npsScore : null

    const feedback = await prisma.observatoryFeedback.create({
      data: {
        type: feedbackType,
        content: content.trim(),
        featureId: featureId || null,
        userId: userId || null,
        npsScore: validNPS,
        status: 'NEW',
      },
    })

    return NextResponse.json({
      success: true,
      data: { id: feedback.id },
    })
  } catch (error) {
    console.error('[Observatory Feedback] Error recording feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

// GET /api/observatory/feedback - Get feedback list
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: {
      status?: FeedbackStatus
      type?: FeedbackType
    } = {}

    if (status && ['NEW', 'REVIEWED', 'ACTIONED', 'CLOSED'].includes(status)) {
      where.status = status as FeedbackStatus
    }
    if (type && ['BUG', 'FEATURE_REQUEST', 'PRAISE', 'COMPLAINT', 'GENERAL'].includes(type)) {
      where.type = type as FeedbackType
    }

    const feedback = await prisma.observatoryFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    })

    return NextResponse.json({
      success: true,
      data: feedback,
    })
  } catch (error) {
    console.error('[Observatory Feedback] Error fetching feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}

// PATCH /api/observatory/feedback - Update feedback status
export async function PATCH(req: Request) {
  try {
    const data = await req.json()
    const { id, status } = data

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Feedback ID is required' },
        { status: 400 }
      )
    }

    const validStatuses = ['NEW', 'REVIEWED', 'ACTIONED', 'CLOSED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    await prisma.observatoryFeedback.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Observatory Feedback] Error updating feedback:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update feedback' },
      { status: 500 }
    )
  }
}
