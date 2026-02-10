import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const MetadataSchema = z.record(z.string().max(200), z.any()).optional()

const FeatureUsageEventSchema = z.object({
  type: z.enum(['FEATURE_USAGE', 'PAGE_VIEW', 'API_CALL']),
  featureId: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
  sessionId: z.string().max(100).optional(),
  metadata: MetadataSchema,
  duration: z.number().int().min(0).max(86400000).optional(), // max 24 hours in ms
  success: z.boolean().optional().default(true),
})

const ErrorEventSchema = z.object({
  type: z.literal('ERROR'),
  message: z.string().min(1).max(5000),
  stack: z.string().max(50000).optional(),
  featureId: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
  endpoint: z.string().max(500).optional(),
  metadata: MetadataSchema,
})

const LLMOperationEventSchema = z.object({
  type: z.literal('LLM_OPERATION'),
  pipelineName: z.string().min(1).max(200),
  model: z.string().min(1).max(200),
  inputTokens: z.number().int().min(0).max(10000000).optional().default(0),
  outputTokens: z.number().int().min(0).max(10000000).optional().default(0),
  latencyMs: z.number().int().min(0).max(600000).optional().default(0), // max 10 min
  cost: z.number().min(0).max(10000).optional(),
  success: z.boolean().optional().default(true),
  errorMessage: z.string().max(5000).optional(),
  metadata: MetadataSchema,
})

const TrackEventSchema = z.discriminatedUnion('type', [
  FeatureUsageEventSchema,
  ErrorEventSchema,
  LLMOperationEventSchema,
])

// POST /api/observatory/track - Record a single event
export async function POST(req: Request) {
  try {
    const raw = await req.json()
    const parseResult = TrackEventSchema.safeParse(raw)

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.issues.map(e => ({ path: e.path.join('.'), message: e.message })) },
        { status: 400 }
      )
    }

    const data = parseResult.data

    switch (data.type) {
      case 'FEATURE_USAGE':
      case 'PAGE_VIEW':
      case 'API_CALL':
        await prisma.observatoryEvent.create({
          data: {
            type: data.type,
            featureId: data.featureId,
            userId: data.userId,
            sessionId: data.sessionId,
            metadata: data.metadata,
            duration: data.duration,
            success: data.success,
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
              status: 'NEW',
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
            inputTokens: data.inputTokens,
            outputTokens: data.outputTokens,
            latencyMs: data.latencyMs,
            cost: data.cost,
            success: data.success,
            errorMessage: data.errorMessage,
            metadata: data.metadata,
          },
        })
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
    console.error('[Observatory Track] Error recording event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record event' },
      { status: 500 }
    )
  }
}
