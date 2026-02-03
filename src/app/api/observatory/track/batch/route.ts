import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EventType, ErrorStatus } from '@prisma/client'

interface BatchEvent {
  type: 'FEATURE_USAGE' | 'PAGE_VIEW' | 'API_CALL' | 'ERROR' | 'LLM_OPERATION'
  data: Record<string, unknown>
  timestamp: string
}

// POST /api/observatory/track/batch - Record multiple events at once
export async function POST(req: Request) {
  try {
    const { events } = (await req.json()) as { events: BatchEvent[] }

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Events array is required' },
        { status: 400 }
      )
    }

    // Process events in parallel, grouped by type
    const regularEvents: Array<{
      type: EventType
      featureId?: string
      userId?: string
      sessionId?: string
      metadata?: object
      duration?: number
      success: boolean
      timestamp: Date
    }> = []

    const llmOperations: Array<{
      pipelineName: string
      model: string
      inputTokens: number
      outputTokens: number
      latencyMs: number
      cost?: number
      success: boolean
      errorMessage?: string
      metadata?: object
      timestamp: Date
    }> = []

    const errors: Array<{
      message: string
      stack?: string
      featureId?: string
      userId?: string
      endpoint?: string
      metadata?: object
    }> = []

    for (const event of events) {
      const eventData = event.data as Record<string, unknown>
      const timestamp = event.timestamp ? new Date(event.timestamp) : new Date()

      switch (event.type) {
        case 'FEATURE_USAGE':
        case 'PAGE_VIEW':
        case 'API_CALL':
          regularEvents.push({
            type: event.type as EventType,
            featureId: eventData.featureId as string | undefined,
            userId: eventData.userId as string | undefined,
            sessionId: eventData.sessionId as string | undefined,
            metadata: eventData.metadata as object | undefined,
            duration: eventData.duration as number | undefined,
            success: (eventData.success as boolean) ?? true,
            timestamp,
          })
          break

        case 'LLM_OPERATION':
          llmOperations.push({
            pipelineName: (eventData.pipelineName as string) || 'unknown',
            model: (eventData.model as string) || 'unknown',
            inputTokens: (eventData.inputTokens as number) || 0,
            outputTokens: (eventData.outputTokens as number) || 0,
            latencyMs: (eventData.latencyMs as number) || 0,
            cost: eventData.cost as number | undefined,
            success: (eventData.success as boolean) ?? true,
            errorMessage: eventData.errorMessage as string | undefined,
            metadata: eventData.metadata as object | undefined,
            timestamp,
          })
          break

        case 'ERROR':
          errors.push({
            message: (eventData.message as string) || 'Unknown error',
            stack: eventData.stack as string | undefined,
            featureId: eventData.featureId as string | undefined,
            userId: eventData.userId as string | undefined,
            endpoint: eventData.endpoint as string | undefined,
            metadata: eventData.metadata as object | undefined,
          })
          break
      }
    }

    // Batch insert regular events and LLM operations
    const promises: Promise<unknown>[] = []

    if (regularEvents.length > 0) {
      promises.push(
        prisma.observatoryEvent.createMany({
          data: regularEvents,
        })
      )
    }

    if (llmOperations.length > 0) {
      promises.push(
        prisma.observatoryLLMOperation.createMany({
          data: llmOperations,
        })
      )
    }

    // Process errors individually (need upsert logic)
    for (const error of errors) {
      promises.push(
        (async () => {
          const existing = await prisma.observatoryError.findFirst({
            where: {
              message: error.message,
              status: { in: ['NEW', 'INVESTIGATING'] },
            },
          })

          if (existing) {
            await prisma.observatoryError.update({
              where: { id: existing.id },
              data: {
                count: { increment: 1 },
                lastSeen: new Date(),
              },
            })
          } else {
            await prisma.observatoryError.create({
              data: {
                ...error,
                status: 'NEW' as ErrorStatus,
              },
            })
          }
        })()
      )
    }

    await Promise.all(promises)

    return NextResponse.json({
      success: true,
      processed: {
        events: regularEvents.length,
        llmOperations: llmOperations.length,
        errors: errors.length,
      },
    })
  } catch (error) {
    console.error('[Observatory Batch] Error recording events:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record events' },
      { status: 500 }
    )
  }
}
