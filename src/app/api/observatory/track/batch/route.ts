import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const MetadataSchema = z.record(z.string().max(200), z.any()).optional()

const BatchEventDataSchema = z.record(z.string().max(200), z.any())

const BatchEventSchema = z.object({
  type: z.enum(['FEATURE_USAGE', 'PAGE_VIEW', 'API_CALL', 'ERROR', 'LLM_OPERATION']),
  data: BatchEventDataSchema,
  timestamp: z.string().max(100).optional(),
})

const BatchRequestSchema = z.object({
  events: z.array(BatchEventSchema).min(1).max(500),
})

// Validate individual event data fields after initial parse
const RegularEventDataSchema = z.object({
  featureId: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
  sessionId: z.string().max(100).optional(),
  metadata: MetadataSchema,
  duration: z.number().int().min(0).max(86400000).optional(),
  success: z.boolean().optional().default(true),
})

const LLMEventDataSchema = z.object({
  pipelineName: z.string().max(200).optional().default('unknown'),
  model: z.string().max(200).optional().default('unknown'),
  inputTokens: z.number().int().min(0).max(10000000).optional().default(0),
  outputTokens: z.number().int().min(0).max(10000000).optional().default(0),
  latencyMs: z.number().int().min(0).max(600000).optional().default(0),
  cost: z.number().min(0).max(10000).optional(),
  success: z.boolean().optional().default(true),
  errorMessage: z.string().max(5000).optional(),
  metadata: MetadataSchema,
})

const ErrorEventDataSchema = z.object({
  message: z.string().max(5000).optional().default('Unknown error'),
  stack: z.string().max(50000).optional(),
  featureId: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
  endpoint: z.string().max(500).optional(),
  metadata: MetadataSchema,
})

// POST /api/observatory/track/batch - Record multiple events at once
export async function POST(req: Request) {
  try {
    const raw = await req.json()
    const parseResult = BatchRequestSchema.safeParse(raw)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.issues.map(e => ({ path: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }

    const { events } = parseResult.data

    // Process events in parallel, grouped by type
    const regularEvents: Array<{
      type: 'FEATURE_USAGE' | 'PAGE_VIEW' | 'API_CALL'
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
      const timestamp = event.timestamp ? new Date(event.timestamp) : new Date()

      switch (event.type) {
        case 'FEATURE_USAGE':
        case 'PAGE_VIEW':
        case 'API_CALL': {
          const parsed = RegularEventDataSchema.safeParse(event.data)
          if (!parsed.success) continue // skip malformed events in batch
          const eventData = parsed.data
          regularEvents.push({
            type: event.type,
            featureId: eventData.featureId,
            userId: eventData.userId,
            sessionId: eventData.sessionId,
            metadata: eventData.metadata as object | undefined,
            duration: eventData.duration,
            success: eventData.success,
            timestamp,
          })
          break
        }

        case 'LLM_OPERATION': {
          const parsed = LLMEventDataSchema.safeParse(event.data)
          if (!parsed.success) continue
          const eventData = parsed.data
          llmOperations.push({
            pipelineName: eventData.pipelineName,
            model: eventData.model,
            inputTokens: eventData.inputTokens,
            outputTokens: eventData.outputTokens,
            latencyMs: eventData.latencyMs,
            cost: eventData.cost,
            success: eventData.success,
            errorMessage: eventData.errorMessage,
            metadata: eventData.metadata as object | undefined,
            timestamp,
          })
          break
        }

        case 'ERROR': {
          const parsed = ErrorEventDataSchema.safeParse(event.data)
          if (!parsed.success) continue
          const eventData = parsed.data
          errors.push({
            message: eventData.message,
            stack: eventData.stack,
            featureId: eventData.featureId,
            userId: eventData.userId,
            endpoint: eventData.endpoint,
            metadata: eventData.metadata as object | undefined,
          })
          break
        }
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
                status: 'NEW',
              },
            })
          }
        })()
      )
    }

    await Promise.all(promises)

    const totalProcessed = regularEvents.length + llmOperations.length + errors.length
    const skipped = events.length - totalProcessed

    return NextResponse.json({
      success: true,
      processed: {
        events: regularEvents.length,
        llmOperations: llmOperations.length,
        errors: errors.length,
        total: totalProcessed,
      },
      ...(skipped > 0 && { skipped }),
    })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
    console.error('[Observatory Batch] Error recording events:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record events' },
      { status: 500 }
    )
  }
}
