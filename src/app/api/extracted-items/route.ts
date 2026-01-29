import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma, ExtractedItemType, ReviewStatus } from '@prisma/client'

// Create extracted item (manual entry)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { designWeekId, type, content, notes, isManual, status } = body as {
      designWeekId: string
      type: ExtractedItemType
      content: string
      notes?: string | null
      isManual?: boolean
      status?: ReviewStatus
    }

    // Validate required fields
    if (!designWeekId || !type || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: designWeekId, type, content' },
        { status: 400 }
      )
    }

    // For manual entries, find the most recent session to link to
    // (ExtractedItem requires sessionId in the schema)
    const designWeek = await prisma.designWeek.findUnique({
      where: { id: designWeekId },
      include: {
        sessions: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    })

    if (!designWeek) {
      return NextResponse.json(
        { success: false, error: 'Design week not found' },
        { status: 404 }
      )
    }

    if (designWeek.sessions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No sessions found in design week. Upload a session first.' },
        { status: 400 }
      )
    }

    const sessionId = designWeek.sessions[0].id

    // Create the extracted item
    const item = await prisma.extractedItem.create({
      data: {
        sessionId,
        type,
        content,
        confidence: 1.0, // Manual entries have full confidence
        status: status || 'APPROVED', // Manual entries are auto-approved by default
        reviewNotes: notes || null,
        structuredData: isManual ? { isManual: true } : Prisma.JsonNull,
        // No source evidence for manual entries
        sourceTimestamp: null,
        sourceSpeaker: null,
        sourceQuote: null,
      },
    })

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Error creating extracted item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create extracted item' },
      { status: 500 }
    )
  }
}

// Get extracted items (with optional filtering)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const designWeekId = searchParams.get('designWeekId')
    const sessionId = searchParams.get('sessionId')
    const type = searchParams.get('type') as ExtractedItemType | null
    const status = searchParams.get('status') as ReviewStatus | null

    const where: Record<string, unknown> = {}

    if (sessionId) {
      where.sessionId = sessionId
    } else if (designWeekId) {
      // Get all items for a design week via sessions
      const sessions = await prisma.session.findMany({
        where: { designWeekId },
        select: { id: true },
      })
      where.sessionId = { in: sessions.map((s) => s.id) }
    }

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
    }

    const items = await prisma.extractedItem.findMany({
      where,
      include: {
        session: {
          select: {
            id: true,
            phase: true,
            sessionNumber: true,
            date: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('Error fetching extracted items:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch extracted items' },
      { status: 500 }
    )
  }
}
