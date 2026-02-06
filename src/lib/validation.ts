/**
 * API Validation Utilities
 *
 * Centralized Zod schemas and validation helpers for API routes.
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'
import { ReviewStatus, DesignWeekStatus, ProcessingStatus, RiskLevel, TrackerStatus } from '@prisma/client'

// ═══════════════════════════════════════════════════════════════════════════════
// COMMON SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * UUID/CUID validation - matches Prisma's default ID format
 */
export const IdSchema = z.string().min(1).max(100).regex(
  /^[a-zA-Z0-9_-]+$/,
  'Invalid ID format'
)

/**
 * Safe string that doesn't contain potential injection patterns
 */
export const SafeStringSchema = z.string().max(10000).refine(
  (val) => !/<script|javascript:|data:/i.test(val),
  'Invalid characters detected'
)

/**
 * Email validation
 */
export const EmailSchema = z.string().email().max(255)

/**
 * URL validation - only allow http/https
 */
export const SafeUrlSchema = z.string().url().refine(
  (val) => val.startsWith('http://') || val.startsWith('https://'),
  'Only HTTP/HTTPS URLs allowed'
)

// ═══════════════════════════════════════════════════════════════════════════════
// COMPANY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateCompanySchema = z.object({
  name: z.string().min(1).max(255).trim(),
  industry: z.string().max(100).trim().optional(),
})

export const UpdateCompanySchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  industry: z.string().max(100).trim().nullable().optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// DIGITAL EMPLOYEE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateDigitalEmployeeSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  companyId: IdSchema,
  description: z.string().max(2000).trim().optional(),
  channels: z.array(z.string().max(50)).max(10).optional(),
})

export const UpdateDigitalEmployeeSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).trim().nullable().optional(),
  channels: z.array(z.string().max(50)).max(10).optional(),
  lifecycle: z.enum(['DESIGN', 'BUILD', 'UAT', 'LIVE']).optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTED ITEM SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const UpdateExtractedItemSchema = z.object({
  status: z.nativeEnum(ReviewStatus).optional(),
  content: SafeStringSchema.optional(),
  reviewNotes: z.string().max(2000).trim().nullable().optional(),
  reviewedBy: z.string().max(255).trim().optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateSessionSchema = z.object({
  designWeekId: IdSchema,
  sessionNumber: z.number().int().min(1).max(100),
  phase: z.number().int().min(1).max(6),
  date: z.string().datetime().optional(),
})

export const UpdateSessionSchema = z.object({
  topicsCovered: z.array(z.string().max(200)).max(50).optional(),
  processingStatus: z.nativeEnum(ProcessingStatus).optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN WEEK SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const UpdateDesignWeekSchema = z.object({
  status: z.nativeEnum(DesignWeekStatus).optional(),
  currentPhase: z.number().int().min(1).max(6).optional(),
  notes: z.string().max(10000).trim().nullable().optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const ExtractionModeSchema = z.enum(['standard', 'auto', 'exhaustive', 'multi-model', 'two-pass', 'section-based'])

// ═══════════════════════════════════════════════════════════════════════════════
// ASSISTANT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const AssistantMessageSchema = z.object({
  message: SafeStringSchema.min(1).max(10000),
  context: z.object({
    deId: IdSchema,
    deName: z.string().max(255),
    companyName: z.string().max(255),
    designWeekId: IdSchema,
    currentPhase: z.number().int().min(1).max(6),
    status: z.string().max(50),
    ambiguousCount: z.number().int().min(0),
    sessionsCount: z.number().int().min(0),
    scopeItemsCount: z.number().int().min(0),
    completeness: z.object({
      business: z.number().min(0).max(100),
      technical: z.number().min(0).max(100),
    }),
  }),
  uiContext: z.object({
    activeTab: z.enum(['progress', 'business', 'technical', 'testplan']),
  }).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: SafeStringSchema,
  })).max(50).optional().default([]),
})

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVATORY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const TrackEventSchema = z.object({
  eventType: z.string().max(100),
  eventData: z.record(z.string(), z.unknown()).optional(),
  featureId: z.string().max(100).optional(),
  userId: z.string().max(100).optional(),
  sessionId: z.string().max(100).optional(),
})

export const FeedbackSchema = z.object({
  featureId: z.string().max(100),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).trim().optional(),
  userId: z.string().max(100).optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TRACKER SCHEMAS (Tracker merged into Portfolio)
// ═══════════════════════════════════════════════════════════════════════════════

export const PortfolioTimelineUpdateSchema = z.object({
  id: IdSchema,
  startWeek: z.number().int().min(1).max(52).optional(),
  endWeek: z.number().int().min(1).max(52).optional(),
  goLiveWeek: z.number().int().min(1).max(52).nullable().optional(),
  blocker: z.string().max(2000).trim().nullable().optional(),
  thisWeekActions: z.string().max(2000).trim().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate request body against a Zod schema.
 * Returns validated data or a NextResponse error.
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }))
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        ),
      }
    }

    return { success: true, data: result.data }
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validate a single value against a Zod schema.
 */
export function validateValue<T>(
  value: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(value)

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((e) => e.message).join(', '),
    }
  }

  return { success: true, data: result.data }
}

/**
 * Validate ID parameter from route params
 */
export function validateId(id: string): { success: true; id: string } | { success: false; response: NextResponse } {
  const result = IdSchema.safeParse(id)

  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      ),
    }
  }

  return { success: true, id: result.data }
}
