import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EventType, ErrorStatus } from '@prisma/client'

// POST /api/observatory/track - Record a single event
export async function POST(req: Request) {
  try {
    const data = await req.json()

    switch (data.type) {
      case 'FEATURE_USAGE':
      case 'PAGE_VIEW':
      case 'API_CALL':
        await prisma.observatoryEvent.create({
          data: {
            type: data.type as EventType,
            featureId: data.featureId,
            userId: data.userId,
            sessionId: data.sessionId,
            metadata: data.metadata,
            duration: data.duration,
            success: data.success ?? true,
          },
        })
        break

      case 'ERROR': {
        // Upsert error - increment count if same message exists
        const existingError = await prisma.observatoryError.findFirst({
          where: {
            message: data.message,
            status: { in: ['NEW', 'INVESTIGATING'] },
          },
        })

        if (existingError) {
          await prisma.observatoryError.update({
            where: { id: existingError.id },
            data: {
              count: { increment: 1 },
              lastSeen: new Date(),
              metadata: data.metadata,
            },
          })
        } else {
          await prisma.observatoryError.create({
            data: {
              message: data.message,
              stack: data.stack,
              featureId: data.featureId,
              userId: data.userId,
              endpoint: data.endpoint,
              metadata: data.metadata,
              status: 'NEW' as ErrorStatus,
            },
          })
        }
        break
      }

      case 'LLM_OPERATION':
        await prisma.observatoryLLMOperation.create({
          data: {
            pipelineName: data.pipelineName,
            model: data.model,
            inputTokens: data.inputTokens ?? 0,
            outputTokens: data.outputTokens ?? 0,
            latencyMs: data.latencyMs ?? 0,
            cost: data.cost,
            success: data.success ?? true,
            errorMessage: data.errorMessage,
            metadata: data.metadata,
          },
        })
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unknown event type: ${data.type}` },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Observatory Track] Error recording event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record event' },
      { status: 500 }
    )
  }
}
