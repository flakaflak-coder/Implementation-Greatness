/**
 * API Validation Utilities
 *
 * Centralized Zod schemas and validation helpers for API routes.
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'
import { ReviewStatus, DesignWeekStatus, ProcessingStatus, RiskLevel, TrackerStatus, PrerequisiteCategory, PrerequisiteOwner, PrerequisiteStatus, Priority, ExtractedItemType, GeneratedDocType, JourneyPhaseType, NotificationType, SignOffStatus, ConditionType, EscalationAction } from '@prisma/client'

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
  contactName: z.string().max(255).trim().nullable().optional(),
  contactEmail: EmailSchema.nullable().optional(),
  contactPhone: z.string().max(50).trim().nullable().optional(),
  logoUrl: SafeUrlSchema.nullable().optional(),
  vision: z.string().max(5000).trim().nullable().optional(),
  journeyStartDate: z.string().datetime().nullable().optional(),
  journeyTargetDate: z.string().datetime().nullable().optional(),
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
  status: z.enum(['DESIGN', 'ONBOARDING', 'LIVE', 'PAUSED']).optional(),
  goLiveDate: z.string().datetime().nullable().optional(),
  startWeek: z.number().int().min(1).max(52).nullable().optional(),
  endWeek: z.number().int().min(1).max(52).nullable().optional(),
  goLiveWeek: z.number().int().min(1).max(52).nullable().optional(),
  trackerStatus: z.nativeEnum(TrackerStatus).optional(),
  riskLevel: z.nativeEnum(RiskLevel).optional(),
  blocker: z.string().max(2000).trim().nullable().optional(),
  ownerClient: z.string().max(255).trim().nullable().optional(),
  ownerFreedayProject: z.string().max(255).trim().nullable().optional(),
  ownerFreedayEngineering: z.string().max(255).trim().nullable().optional(),
  thisWeekActions: z.string().max(2000).trim().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
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
// PREREQUISITE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CreatePrerequisiteSchema = z.object({
  title: z.string().min(1).max(500).trim(),
  description: z.string().max(2000).trim().nullable().optional(),
  category: z.nativeEnum(PrerequisiteCategory),
  ownerType: z.nativeEnum(PrerequisiteOwner),
  ownerName: z.string().max(255).trim().nullable().optional(),
  ownerEmail: EmailSchema.nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  integrationId: IdSchema.nullable().optional(),
  blocksPhase: z.nativeEnum(JourneyPhaseType).nullable().optional(),
})

export const UpdatePrerequisiteSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  description: z.string().max(2000).trim().nullable().optional(),
  status: z.nativeEnum(PrerequisiteStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  ownerName: z.string().max(255).trim().nullable().optional(),
  ownerEmail: EmailSchema.nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  receivedAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).trim().nullable().optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT GENERATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const GenerateDocumentSchema = z.object({
  documentType: z.nativeEnum(GeneratedDocType),
  language: z.enum(['en', 'nl', 'de', 'fr', 'es']).optional().default('en'),
})

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const ExtractSessionSchema = z.object({
  transcript: z.string().min(1).max(500000),
  promptType: z.string().max(100).optional(),
})

export const CreateExtractedItemSchema = z.object({
  sessionId: IdSchema,
  type: z.nativeEnum(ExtractedItemType),
  content: SafeStringSchema.min(1),
  category: z.string().max(200).trim().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  structuredData: z.record(z.string(), z.unknown()).nullable().optional(),
  sourceQuote: z.string().max(10000).nullable().optional(),
  sourceSpeaker: z.string().max(255).nullable().optional(),
  sourceTimestamp: z.number().min(0).nullable().optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CreatePromptSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: z.string().min(1).max(100),
  description: z.string().max(500).trim().optional(),
  prompt: z.string().min(1).max(100000),
  model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(200000).optional(),
})

export const UpdatePromptSchema = z.object({
  prompt: z.string().min(1).max(100000).optional(),
  description: z.string().max(500).trim().optional(),
  model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(200000).optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const ProfileUpdateSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
})

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKLIST SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const UpdateChecklistItemSchema = z.object({
  itemId: IdSchema,
  isCompleted: z.boolean(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const SearchQuerySchema = z.string().min(1).max(200).trim()

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE DESCRIPTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const GenerateDescriptionSchema = z.object({
  name: z.string().min(1).max(255),
  companyName: z.string().min(1).max(255),
  channels: z.array(z.string().max(50)).max(10).optional(),
})

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
// JOURNEY PHASE TRANSITION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const JourneyPhaseTransitionSchema = z.object({
  action: z.enum(['advance', 'set']),
  targetPhase: z.nativeEnum(JourneyPhaseType).optional(),
  force: z.boolean().optional().default(false),
}).refine(
  (data) => data.action !== 'set' || data.targetPhase !== undefined,
  { message: 'targetPhase is required when action is "set"', path: ['targetPhase'] }
)

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(500).trim(),
  message: z.string().min(1).max(2000).trim(),
  link: z.string().max(1000).trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const MarkNotificationsReadSchema = z.union([
  z.object({
    ids: z.array(IdSchema).min(1).max(100),
    all: z.undefined().optional(),
  }),
  z.object({
    all: z.literal(true),
    ids: z.undefined().optional(),
  }),
])

// ═══════════════════════════════════════════════════════════════════════════════
// SCOPE ITEM BATCH SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const BatchResolveScopeItemsSchema = z.object({
  ids: z.array(IdSchema).min(1, 'At least one ID is required').max(100, 'Maximum 100 items per batch'),
  classification: z.enum(['IN_SCOPE', 'OUT_OF_SCOPE'], {
    error: 'classification must be IN_SCOPE or OUT_OF_SCOPE',
  }),
  notes: z.string().max(5000).trim().optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// SIGN-OFF SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateSignOffSchema = z.object({
  stakeholder: z.string().min(1).max(255).trim(),
  role: z.string().min(1).max(255).trim(),
  comments: z.string().max(2000).trim().nullable().optional(),
})

export const UpdateSignOffSchema = z.object({
  status: z.nativeEnum(SignOffStatus).optional(),
  comments: z.string().max(2000).trim().nullable().optional(),
})

// ═══════════════════════════════════════════════════════════════════════════════
// ESCALATION RULE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CreateEscalationRuleSchema = z.object({
  trigger: z.string().min(1).max(1000).trim(),
  conditionType: z.nativeEnum(ConditionType),
  threshold: z.number().min(0).max(1).nullable().optional(),
  keywords: z.array(z.string().max(200).trim()).max(50).optional().default([]),
  action: z.nativeEnum(EscalationAction),
  handoverContext: z.array(z.string().max(500).trim()).max(20).optional().default([]),
  priority: z.nativeEnum(Priority).optional().default('MEDIUM'),
})

export const UpdateEscalationRuleSchema = z.object({
  trigger: z.string().min(1).max(1000).trim().optional(),
  conditionType: z.nativeEnum(ConditionType).optional(),
  threshold: z.number().min(0).max(1).nullable().optional(),
  keywords: z.array(z.string().max(200).trim()).max(50).optional(),
  action: z.nativeEnum(EscalationAction).optional(),
  handoverContext: z.array(z.string().max(500).trim()).max(20).optional(),
  priority: z.nativeEnum(Priority).optional(),
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
