import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractFromTranscript, saveExtractedItems } from '@/lib/claude'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const body = await request.json()
    const { transcript, sessionType } = body as {
      transcript: string
      sessionType: 'kickoff' | 'process' | 'technical' | 'signoff'
    }

    if (!transcript || !sessionType) {
      return NextResponse.json(
        { error: 'transcript and sessionType are required' },
        { status: 400 }
      )
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Update session status
    await prisma.session.update({
      where: { id: sessionId },
      data: { processingStatus: 'PROCESSING' },
    })

    try {
      // Check for existing items and delete them (re-extraction replaces previous)
      const existingItems = await prisma.extractedItem.count({
        where: { sessionId },
      })

      if (existingItems > 0) {
        // Delete existing items before re-extracting
        await prisma.extractedItem.deleteMany({
          where: { sessionId },
        })
      }

      // Extract items using Claude
      const result = await extractFromTranscript(transcript, sessionType)

      // Save extracted items
      await saveExtractedItems(sessionId, result.items)

      // Update session status
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          processingStatus: 'COMPLETE',
          processedAt: new Date(),
        },
      })

      // Log to observatory
      await prisma.observatoryLLMOperation.create({
        data: {
          pipelineName: `extract_${sessionType}`,
          model: 'claude-sonnet-4-20250514',
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs: result.latencyMs,
          success: true,
          metadata: {
            sessionId,
            itemCount: result.items.length,
          },
        },
      })

      return NextResponse.json({
        success: true,
        itemCount: result.items.length,
        items: result.items,
        usage: {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs: result.latencyMs,
        },
      })
    } catch (extractionError) {
      // Update session status on failure
      await prisma.session.update({
        where: { id: sessionId },
        data: { processingStatus: 'FAILED' },
      })

      // Log error to observatory
      await prisma.observatoryLLMOperation.create({
        data: {
          pipelineName: `extract_${sessionType}`,
          model: 'claude-sonnet-4-20250514',
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: 0,
          success: false,
          errorMessage:
            extractionError instanceof Error
              ? extractionError.message
              : 'Unknown error',
          metadata: { sessionId },
        },
      })

      throw extractionError
    }
  } catch (error) {
    console.error('Extraction error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Extraction failed' },
      { status: 500 }
    )
  }
}

// Get extracted items for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    const items = await prisma.extractedItem.findMany({
      where: { sessionId },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching extracted items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch extracted items' },
      { status: 500 }
    )
  }
}
