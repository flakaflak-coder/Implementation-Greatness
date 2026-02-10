import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { extractFromTranscript, saveExtractedItems } from '@/lib/claude'
import { validateId } from '@/lib/validation'

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

const ExtractRequestSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required').max(500000),
  sessionType: z.enum(['kickoff', 'process', 'technical', 'signoff', 'persona'], {
    error: 'sessionType must be one of: kickoff, process, technical, signoff, persona',
  }),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const idCheck = validateId(sessionId)
    if (!idCheck.success) return idCheck.response

    let body: z.infer<typeof ExtractRequestSchema>
    try {
      const raw = await request.json()
      body = ExtractRequestSchema.parse(raw)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.issues.map(e => ({ path: e.path.join('.'), message: e.message })) },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { transcript, sessionType } = body

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
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
    const message = error instanceof Error ? error.message : 'Unknown error'
    // Sanitize error message for user display
    const safeMessage = message
      .replace(/(?:key|token|api[_-]?key)[=:\s]+\S+/gi, '[redacted]')
      .replace(/https?:\/\/\S+/gi, '[service-url]')
    return NextResponse.json(
      { success: false, error: `Extraction failed: ${safeMessage.length > 200 ? safeMessage.substring(0, 197) + '...' : safeMessage}` },
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
    const idCheck = validateId(sessionId)
    if (!idCheck.success) return idCheck.response

    const items = await prisma.extractedItem.findMany({
      where: { sessionId },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching extracted items:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch extracted items' },
      { status: 500 }
    )
  }
}
