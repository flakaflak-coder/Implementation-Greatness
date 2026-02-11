import { describe, it, expect } from 'vitest'
import {
  IdSchema,
  SafeStringSchema,
  EmailSchema,
  SafeUrlSchema,
  CreateCompanySchema,
  UpdateCompanySchema,
  CreateDigitalEmployeeSchema,
  UpdateDigitalEmployeeSchema,
  UpdateExtractedItemSchema,
  CreateSessionSchema,
  UpdateSessionSchema,
  UpdateDesignWeekSchema,
  ExtractionModeSchema,
  CreatePrerequisiteSchema,
  UpdatePrerequisiteSchema,
  GenerateDocumentSchema,
  ExtractSessionSchema,
  CreateExtractedItemSchema,
  CreatePromptSchema,
  UpdatePromptSchema,
  ProfileUpdateSchema,
  UpdateChecklistItemSchema,
  SearchQuerySchema,
  GenerateDescriptionSchema,
  AssistantMessageSchema,
  TrackEventSchema,
  FeedbackSchema,
  PortfolioTimelineUpdateSchema,
  JourneyPhaseTransitionSchema,
  CreateNotificationSchema,
  MarkNotificationsReadSchema,
  validateValue,
  validateId,
} from './validation'

// ═══════════════════════════════════════════════════════════════════════════════
// COMMON SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('IdSchema', () => {
  it('accepts valid CUID-like IDs', () => {
    expect(IdSchema.safeParse('clm1234abc').success).toBe(true)
    expect(IdSchema.safeParse('abc-123_def').success).toBe(true)
    expect(IdSchema.safeParse('a').success).toBe(true)
  })

  it('rejects empty strings', () => {
    expect(IdSchema.safeParse('').success).toBe(false)
  })

  it('rejects strings exceeding 100 characters', () => {
    expect(IdSchema.safeParse('a'.repeat(101)).success).toBe(false)
  })

  it('rejects strings with invalid characters', () => {
    expect(IdSchema.safeParse('id with spaces').success).toBe(false)
    expect(IdSchema.safeParse('id@special!').success).toBe(false)
    expect(IdSchema.safeParse('id.with.dots').success).toBe(false)
    expect(IdSchema.safeParse('<script>alert(1)</script>').success).toBe(false)
  })
})

describe('SafeStringSchema', () => {
  it('accepts normal strings', () => {
    expect(SafeStringSchema.safeParse('Hello world').success).toBe(true)
    expect(SafeStringSchema.safeParse('A business discussion about claims').success).toBe(true)
  })

  it('rejects strings with script tags', () => {
    expect(SafeStringSchema.safeParse('<script>alert(1)</script>').success).toBe(false)
  })

  it('rejects strings with javascript: protocol', () => {
    expect(SafeStringSchema.safeParse('click javascript:alert(1)').success).toBe(false)
  })

  it('rejects strings with data: protocol', () => {
    expect(SafeStringSchema.safeParse('load data:text/html,<h1>bad</h1>').success).toBe(false)
  })

  it('rejects strings exceeding 10000 characters', () => {
    expect(SafeStringSchema.safeParse('a'.repeat(10001)).success).toBe(false)
  })

  it('accepts strings at maximum length', () => {
    expect(SafeStringSchema.safeParse('a'.repeat(10000)).success).toBe(true)
  })
})

describe('EmailSchema', () => {
  it('accepts valid email addresses', () => {
    expect(EmailSchema.safeParse('user@example.com').success).toBe(true)
    expect(EmailSchema.safeParse('name.last@company.co.uk').success).toBe(true)
  })

  it('rejects invalid email addresses', () => {
    expect(EmailSchema.safeParse('not-an-email').success).toBe(false)
    expect(EmailSchema.safeParse('@missing.domain').success).toBe(false)
    expect(EmailSchema.safeParse('no-domain@').success).toBe(false)
  })

  it('rejects emails exceeding 255 characters', () => {
    const longEmail = 'a'.repeat(250) + '@b.com'
    expect(EmailSchema.safeParse(longEmail).success).toBe(false)
  })
})

describe('SafeUrlSchema', () => {
  it('accepts valid HTTP URLs', () => {
    expect(SafeUrlSchema.safeParse('http://example.com').success).toBe(true)
    expect(SafeUrlSchema.safeParse('https://example.com/path?q=1').success).toBe(true)
  })

  it('rejects non-HTTP URLs', () => {
    expect(SafeUrlSchema.safeParse('ftp://example.com').success).toBe(false)
    expect(SafeUrlSchema.safeParse('javascript:alert(1)').success).toBe(false)
  })

  it('rejects non-URL strings', () => {
    expect(SafeUrlSchema.safeParse('not a url').success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// COMPANY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CreateCompanySchema', () => {
  it('accepts valid company data', () => {
    const result = CreateCompanySchema.safeParse({ name: 'Acme Insurance' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Acme Insurance')
    }
  })

  it('accepts company with optional industry', () => {
    const result = CreateCompanySchema.safeParse({ name: 'Acme', industry: 'Insurance' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.industry).toBe('Insurance')
    }
  })

  it('rejects empty name', () => {
    expect(CreateCompanySchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects missing name', () => {
    expect(CreateCompanySchema.safeParse({}).success).toBe(false)
  })

  it('rejects name exceeding 255 characters', () => {
    expect(CreateCompanySchema.safeParse({ name: 'a'.repeat(256) }).success).toBe(false)
  })

  it('trims whitespace from name', () => {
    const result = CreateCompanySchema.safeParse({ name: '  Acme  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Acme')
    }
  })
})

describe('UpdateCompanySchema', () => {
  it('accepts partial updates', () => {
    expect(UpdateCompanySchema.safeParse({ name: 'New Name' }).success).toBe(true)
    expect(UpdateCompanySchema.safeParse({ industry: 'Tech' }).success).toBe(true)
    expect(UpdateCompanySchema.safeParse({}).success).toBe(true)
  })

  it('accepts nullable fields set to null', () => {
    const result = UpdateCompanySchema.safeParse({
      contactName: null,
      contactEmail: null,
      logoUrl: null,
      vision: null,
    })
    expect(result.success).toBe(true)
  })

  it('validates email format for contactEmail', () => {
    expect(UpdateCompanySchema.safeParse({ contactEmail: 'bad-email' }).success).toBe(false)
    expect(UpdateCompanySchema.safeParse({ contactEmail: 'valid@example.com' }).success).toBe(true)
  })

  it('validates URL format for logoUrl', () => {
    expect(UpdateCompanySchema.safeParse({ logoUrl: 'not-a-url' }).success).toBe(false)
    expect(UpdateCompanySchema.safeParse({ logoUrl: 'https://example.com/logo.png' }).success).toBe(true)
  })

  it('validates datetime format for journey dates', () => {
    expect(UpdateCompanySchema.safeParse({ journeyStartDate: '2026-01-01T00:00:00.000Z' }).success).toBe(true)
    expect(UpdateCompanySchema.safeParse({ journeyStartDate: 'not-a-date' }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DIGITAL EMPLOYEE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CreateDigitalEmployeeSchema', () => {
  it('accepts valid DE data', () => {
    const result = CreateDigitalEmployeeSchema.safeParse({
      name: 'Claims Assistant',
      companyId: 'clm1234abc',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional description and channels', () => {
    const result = CreateDigitalEmployeeSchema.safeParse({
      name: 'Claims Assistant',
      companyId: 'clm1234abc',
      description: 'Handles claims intake',
      channels: ['EMAIL', 'WEBCHAT'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(CreateDigitalEmployeeSchema.safeParse({
      name: '',
      companyId: 'clm1234abc',
    }).success).toBe(false)
  })

  it('rejects invalid companyId', () => {
    expect(CreateDigitalEmployeeSchema.safeParse({
      name: 'Test',
      companyId: '',
    }).success).toBe(false)
  })

  it('rejects more than 10 channels', () => {
    const channels = Array.from({ length: 11 }, (_, i) => `channel-${i}`)
    expect(CreateDigitalEmployeeSchema.safeParse({
      name: 'Test',
      companyId: 'clm1234abc',
      channels,
    }).success).toBe(false)
  })
})

describe('UpdateDigitalEmployeeSchema', () => {
  it('accepts partial updates', () => {
    expect(UpdateDigitalEmployeeSchema.safeParse({ name: 'New Name' }).success).toBe(true)
    expect(UpdateDigitalEmployeeSchema.safeParse({}).success).toBe(true)
  })

  it('validates lifecycle enum', () => {
    expect(UpdateDigitalEmployeeSchema.safeParse({ lifecycle: 'DESIGN' }).success).toBe(true)
    expect(UpdateDigitalEmployeeSchema.safeParse({ lifecycle: 'BUILD' }).success).toBe(true)
    expect(UpdateDigitalEmployeeSchema.safeParse({ lifecycle: 'INVALID' }).success).toBe(false)
  })

  it('validates status enum', () => {
    expect(UpdateDigitalEmployeeSchema.safeParse({ status: 'LIVE' }).success).toBe(true)
    expect(UpdateDigitalEmployeeSchema.safeParse({ status: 'INVALID' }).success).toBe(false)
  })

  it('validates week number ranges', () => {
    expect(UpdateDigitalEmployeeSchema.safeParse({ startWeek: 1 }).success).toBe(true)
    expect(UpdateDigitalEmployeeSchema.safeParse({ startWeek: 52 }).success).toBe(true)
    expect(UpdateDigitalEmployeeSchema.safeParse({ startWeek: 0 }).success).toBe(false)
    expect(UpdateDigitalEmployeeSchema.safeParse({ startWeek: 53 }).success).toBe(false)
  })

  it('validates sortOrder is non-negative integer', () => {
    expect(UpdateDigitalEmployeeSchema.safeParse({ sortOrder: 0 }).success).toBe(true)
    expect(UpdateDigitalEmployeeSchema.safeParse({ sortOrder: 100 }).success).toBe(true)
    expect(UpdateDigitalEmployeeSchema.safeParse({ sortOrder: -1 }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTED ITEM SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('UpdateExtractedItemSchema', () => {
  it('accepts valid review status', () => {
    expect(UpdateExtractedItemSchema.safeParse({ status: 'APPROVED' }).success).toBe(true)
    expect(UpdateExtractedItemSchema.safeParse({ status: 'REJECTED' }).success).toBe(true)
    expect(UpdateExtractedItemSchema.safeParse({ status: 'PENDING' }).success).toBe(true)
  })

  it('rejects unsafe content', () => {
    expect(UpdateExtractedItemSchema.safeParse({
      content: '<script>alert("xss")</script>',
    }).success).toBe(false)
  })

  it('accepts valid content', () => {
    expect(UpdateExtractedItemSchema.safeParse({
      content: 'Process claims within 24 hours',
    }).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CreateSessionSchema', () => {
  it('accepts valid session data', () => {
    const result = CreateSessionSchema.safeParse({
      designWeekId: 'clm1234',
      sessionNumber: 1,
      phase: 1,
    })
    expect(result.success).toBe(true)
  })

  it('validates phase range (1-6)', () => {
    expect(CreateSessionSchema.safeParse({
      designWeekId: 'clm1234',
      sessionNumber: 1,
      phase: 0,
    }).success).toBe(false)

    expect(CreateSessionSchema.safeParse({
      designWeekId: 'clm1234',
      sessionNumber: 1,
      phase: 7,
    }).success).toBe(false)
  })

  it('validates session number range (1-100)', () => {
    expect(CreateSessionSchema.safeParse({
      designWeekId: 'clm1234',
      sessionNumber: 0,
      phase: 1,
    }).success).toBe(false)

    expect(CreateSessionSchema.safeParse({
      designWeekId: 'clm1234',
      sessionNumber: 101,
      phase: 1,
    }).success).toBe(false)
  })

  it('accepts optional date', () => {
    const result = CreateSessionSchema.safeParse({
      designWeekId: 'clm1234',
      sessionNumber: 1,
      phase: 1,
      date: '2026-01-27T10:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })
})

describe('UpdateSessionSchema', () => {
  it('accepts topics covered', () => {
    const result = UpdateSessionSchema.safeParse({
      topicsCovered: ['Claims processing', 'Escalation rules'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects more than 50 topics', () => {
    const topics = Array.from({ length: 51 }, (_, i) => `Topic ${i}`)
    expect(UpdateSessionSchema.safeParse({ topicsCovered: topics }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN WEEK SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('UpdateDesignWeekSchema', () => {
  it('accepts valid design week status', () => {
    expect(UpdateDesignWeekSchema.safeParse({ status: 'NOT_STARTED' }).success).toBe(true)
    expect(UpdateDesignWeekSchema.safeParse({ status: 'IN_PROGRESS' }).success).toBe(true)
    expect(UpdateDesignWeekSchema.safeParse({ status: 'PENDING_SIGNOFF' }).success).toBe(true)
    expect(UpdateDesignWeekSchema.safeParse({ status: 'COMPLETE' }).success).toBe(true)
  })

  it('validates phase range (1-6)', () => {
    expect(UpdateDesignWeekSchema.safeParse({ currentPhase: 1 }).success).toBe(true)
    expect(UpdateDesignWeekSchema.safeParse({ currentPhase: 6 }).success).toBe(true)
    expect(UpdateDesignWeekSchema.safeParse({ currentPhase: 0 }).success).toBe(false)
    expect(UpdateDesignWeekSchema.safeParse({ currentPhase: 7 }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION MODE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

describe('ExtractionModeSchema', () => {
  it('accepts all valid extraction modes', () => {
    const modes = ['standard', 'auto', 'exhaustive', 'multi-model', 'two-pass', 'section-based']
    for (const mode of modes) {
      expect(ExtractionModeSchema.safeParse(mode).success).toBe(true)
    }
  })

  it('rejects invalid modes', () => {
    expect(ExtractionModeSchema.safeParse('invalid').success).toBe(false)
    expect(ExtractionModeSchema.safeParse('').success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PREREQUISITE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CreatePrerequisiteSchema', () => {
  it('accepts valid prerequisite data', () => {
    const result = CreatePrerequisiteSchema.safeParse({
      title: 'API Key for Claims System',
      category: 'API_CREDENTIALS',
      ownerType: 'CLIENT',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    expect(CreatePrerequisiteSchema.safeParse({
      title: '',
      category: 'API_CREDENTIALS',
      ownerType: 'CLIENT',
    }).success).toBe(false)
  })

  it('rejects missing category', () => {
    expect(CreatePrerequisiteSchema.safeParse({
      title: 'API Key',
      ownerType: 'CLIENT',
    }).success).toBe(false)
  })

  it('validates category enum values', () => {
    expect(CreatePrerequisiteSchema.safeParse({
      title: 'Test',
      category: 'INVALID_CATEGORY',
      ownerType: 'CLIENT',
    }).success).toBe(false)
  })

  it('accepts all valid owner types', () => {
    for (const ownerType of ['CLIENT', 'FREEDAY', 'THIRD_PARTY']) {
      expect(CreatePrerequisiteSchema.safeParse({
        title: 'Test',
        category: 'API_CREDENTIALS',
        ownerType,
      }).success).toBe(true)
    }
  })
})

describe('UpdatePrerequisiteSchema', () => {
  it('accepts status updates', () => {
    expect(UpdatePrerequisiteSchema.safeParse({ status: 'RECEIVED' }).success).toBe(true)
    expect(UpdatePrerequisiteSchema.safeParse({ status: 'BLOCKED' }).success).toBe(true)
  })

  it('accepts nullable date fields', () => {
    expect(UpdatePrerequisiteSchema.safeParse({ dueDate: null }).success).toBe(true)
    expect(UpdatePrerequisiteSchema.safeParse({ receivedAt: null }).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT GENERATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('GenerateDocumentSchema', () => {
  it('accepts valid document type', () => {
    const result = GenerateDocumentSchema.safeParse({ documentType: 'DE_DESIGN' })
    expect(result.success).toBe(true)
  })

  it('defaults language to en', () => {
    const result = GenerateDocumentSchema.safeParse({ documentType: 'DE_DESIGN' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.language).toBe('en')
    }
  })

  it('accepts valid language codes', () => {
    for (const lang of ['en', 'nl', 'de', 'fr', 'es']) {
      expect(GenerateDocumentSchema.safeParse({
        documentType: 'DE_DESIGN',
        language: lang,
      }).success).toBe(true)
    }
  })

  it('rejects invalid language codes', () => {
    expect(GenerateDocumentSchema.safeParse({
      documentType: 'DE_DESIGN',
      language: 'xx',
    }).success).toBe(false)
  })

  it('rejects invalid document types', () => {
    expect(GenerateDocumentSchema.safeParse({
      documentType: 'INVALID_TYPE',
    }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ExtractSessionSchema', () => {
  it('accepts valid transcript', () => {
    const result = ExtractSessionSchema.safeParse({
      transcript: 'This is a session transcript about claims processing.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty transcript', () => {
    expect(ExtractSessionSchema.safeParse({ transcript: '' }).success).toBe(false)
  })

  it('rejects transcript exceeding max length', () => {
    expect(ExtractSessionSchema.safeParse({
      transcript: 'a'.repeat(500001),
    }).success).toBe(false)
  })
})

describe('CreateExtractedItemSchema', () => {
  it('accepts valid extracted item', () => {
    const result = CreateExtractedItemSchema.safeParse({
      sessionId: 'clm1234',
      type: 'GOAL',
      content: 'Reduce claim processing time by 50%',
    })
    expect(result.success).toBe(true)
  })

  it('validates confidence range (0-1)', () => {
    expect(CreateExtractedItemSchema.safeParse({
      sessionId: 'clm1234',
      type: 'GOAL',
      content: 'Test',
      confidence: 0.5,
    }).success).toBe(true)

    expect(CreateExtractedItemSchema.safeParse({
      sessionId: 'clm1234',
      type: 'GOAL',
      content: 'Test',
      confidence: 1.5,
    }).success).toBe(false)

    expect(CreateExtractedItemSchema.safeParse({
      sessionId: 'clm1234',
      type: 'GOAL',
      content: 'Test',
      confidence: -0.1,
    }).success).toBe(false)
  })

  it('rejects unsafe content', () => {
    expect(CreateExtractedItemSchema.safeParse({
      sessionId: 'clm1234',
      type: 'GOAL',
      content: '<script>alert(1)</script>',
    }).success).toBe(false)
  })

  it('rejects empty content', () => {
    expect(CreateExtractedItemSchema.safeParse({
      sessionId: 'clm1234',
      type: 'GOAL',
      content: '',
    }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CreatePromptSchema', () => {
  it('accepts valid prompt data', () => {
    const result = CreatePromptSchema.safeParse({
      name: 'Kickoff Extraction',
      type: 'EXTRACT_KICKOFF',
      prompt: 'Extract stakeholders from the following transcript...',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional temperature and maxTokens', () => {
    const result = CreatePromptSchema.safeParse({
      name: 'Test',
      type: 'TEST',
      prompt: 'Test prompt',
      temperature: 0.7,
      maxTokens: 4000,
    })
    expect(result.success).toBe(true)
  })

  it('validates temperature range (0-2)', () => {
    expect(CreatePromptSchema.safeParse({
      name: 'Test',
      type: 'TEST',
      prompt: 'Test',
      temperature: 2.1,
    }).success).toBe(false)

    expect(CreatePromptSchema.safeParse({
      name: 'Test',
      type: 'TEST',
      prompt: 'Test',
      temperature: -0.1,
    }).success).toBe(false)
  })

  it('validates maxTokens range', () => {
    expect(CreatePromptSchema.safeParse({
      name: 'Test',
      type: 'TEST',
      prompt: 'Test',
      maxTokens: 0,
    }).success).toBe(false)

    expect(CreatePromptSchema.safeParse({
      name: 'Test',
      type: 'TEST',
      prompt: 'Test',
      maxTokens: 200001,
    }).success).toBe(false)
  })
})

describe('UpdatePromptSchema', () => {
  it('accepts partial updates', () => {
    expect(UpdatePromptSchema.safeParse({ prompt: 'New prompt text' }).success).toBe(true)
    expect(UpdatePromptSchema.safeParse({ temperature: 0.5 }).success).toBe(true)
    expect(UpdatePromptSchema.safeParse({}).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE & CHECKLIST SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ProfileUpdateSchema', () => {
  it('accepts valid profile object', () => {
    const result = ProfileUpdateSchema.safeParse({
      profile: { name: 'Sophie', role: 'Implementation Lead' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing profile field', () => {
    expect(ProfileUpdateSchema.safeParse({}).success).toBe(false)
  })
})

describe('UpdateChecklistItemSchema', () => {
  it('accepts valid checklist update', () => {
    const result = UpdateChecklistItemSchema.safeParse({
      itemId: 'clm1234',
      isCompleted: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing fields', () => {
    expect(UpdateChecklistItemSchema.safeParse({ itemId: 'clm1234' }).success).toBe(false)
    expect(UpdateChecklistItemSchema.safeParse({ isCompleted: true }).success).toBe(false)
  })

  it('rejects non-boolean isCompleted', () => {
    expect(UpdateChecklistItemSchema.safeParse({
      itemId: 'clm1234',
      isCompleted: 'yes',
    }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

describe('SearchQuerySchema', () => {
  it('accepts valid search queries', () => {
    expect(SearchQuerySchema.safeParse('claims').success).toBe(true)
    expect(SearchQuerySchema.safeParse('acme insurance').success).toBe(true)
  })

  it('rejects empty query', () => {
    expect(SearchQuerySchema.safeParse('').success).toBe(false)
  })

  it('rejects query exceeding 200 characters', () => {
    expect(SearchQuerySchema.safeParse('a'.repeat(201)).success).toBe(false)
  })

  it('trims whitespace', () => {
    const result = SearchQuerySchema.safeParse('  claims  ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('claims')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE DESCRIPTION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

describe('GenerateDescriptionSchema', () => {
  it('accepts valid description input', () => {
    const result = GenerateDescriptionSchema.safeParse({
      name: 'Claims Assistant',
      companyName: 'Acme Insurance',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional channels', () => {
    const result = GenerateDescriptionSchema.safeParse({
      name: 'Claims Assistant',
      companyName: 'Acme Insurance',
      channels: ['EMAIL', 'WEBCHAT'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    expect(GenerateDescriptionSchema.safeParse({
      name: '',
      companyName: 'Acme Insurance',
    }).success).toBe(false)
  })

  it('rejects empty companyName', () => {
    expect(GenerateDescriptionSchema.safeParse({
      name: 'Test',
      companyName: '',
    }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// ASSISTANT MESSAGE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

describe('AssistantMessageSchema', () => {
  const validContext = {
    deId: 'clm1234',
    deName: 'Claims Bot',
    companyName: 'Acme Insurance',
    designWeekId: 'clm5678',
    currentPhase: 2,
    status: 'IN_PROGRESS',
    ambiguousCount: 5,
    sessionsCount: 3,
    scopeItemsCount: 10,
    completeness: { business: 60, technical: 40 },
  }

  it('accepts valid assistant message', () => {
    const result = AssistantMessageSchema.safeParse({
      message: 'What topics should we cover in the technical session?',
      context: validContext,
    })
    expect(result.success).toBe(true)
  })

  it('defaults history to empty array', () => {
    const result = AssistantMessageSchema.safeParse({
      message: 'Hello',
      context: validContext,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.history).toEqual([])
    }
  })

  it('rejects empty message', () => {
    expect(AssistantMessageSchema.safeParse({
      message: '',
      context: validContext,
    }).success).toBe(false)
  })

  it('rejects message with script injection', () => {
    expect(AssistantMessageSchema.safeParse({
      message: '<script>alert(1)</script>',
      context: validContext,
    }).success).toBe(false)
  })

  it('validates phase range in context', () => {
    expect(AssistantMessageSchema.safeParse({
      message: 'Hello',
      context: { ...validContext, currentPhase: 0 },
    }).success).toBe(false)

    expect(AssistantMessageSchema.safeParse({
      message: 'Hello',
      context: { ...validContext, currentPhase: 7 },
    }).success).toBe(false)
  })

  it('limits history to 50 entries', () => {
    const history = Array.from({ length: 51 }, () => ({
      role: 'user' as const,
      content: 'message',
    }))
    expect(AssistantMessageSchema.safeParse({
      message: 'Hello',
      context: validContext,
      history,
    }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVATORY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('TrackEventSchema', () => {
  it('accepts valid event tracking data', () => {
    const result = TrackEventSchema.safeParse({
      eventType: 'FEATURE_USAGE',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional event data', () => {
    const result = TrackEventSchema.safeParse({
      eventType: 'PAGE_VIEW',
      eventData: { page: '/dashboard', duration: 5000 },
    })
    expect(result.success).toBe(true)
  })
})

describe('FeedbackSchema', () => {
  it('accepts valid feedback', () => {
    const result = FeedbackSchema.safeParse({
      featureId: 'command-palette',
      rating: 4,
    })
    expect(result.success).toBe(true)
  })

  it('validates rating range (1-5)', () => {
    expect(FeedbackSchema.safeParse({ featureId: 'test', rating: 0 }).success).toBe(false)
    expect(FeedbackSchema.safeParse({ featureId: 'test', rating: 6 }).success).toBe(false)
    expect(FeedbackSchema.safeParse({ featureId: 'test', rating: 1 }).success).toBe(true)
    expect(FeedbackSchema.safeParse({ featureId: 'test', rating: 5 }).success).toBe(true)
  })

  it('requires integer rating', () => {
    expect(FeedbackSchema.safeParse({ featureId: 'test', rating: 3.5 }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TIMELINE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

describe('PortfolioTimelineUpdateSchema', () => {
  it('accepts valid timeline update', () => {
    const result = PortfolioTimelineUpdateSchema.safeParse({
      id: 'clm1234',
      startWeek: 5,
      endWeek: 17,
    })
    expect(result.success).toBe(true)
  })

  it('validates week number ranges', () => {
    expect(PortfolioTimelineUpdateSchema.safeParse({
      id: 'clm1234',
      startWeek: 0,
    }).success).toBe(false)

    expect(PortfolioTimelineUpdateSchema.safeParse({
      id: 'clm1234',
      startWeek: 53,
    }).success).toBe(false)
  })

  it('accepts nullable goLiveWeek', () => {
    expect(PortfolioTimelineUpdateSchema.safeParse({
      id: 'clm1234',
      goLiveWeek: null,
    }).success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNEY PHASE TRANSITION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

describe('JourneyPhaseTransitionSchema', () => {
  it('accepts advance action without target phase', () => {
    const result = JourneyPhaseTransitionSchema.safeParse({
      action: 'advance',
    })
    expect(result.success).toBe(true)
  })

  it('accepts set action with target phase', () => {
    const result = JourneyPhaseTransitionSchema.safeParse({
      action: 'set',
      targetPhase: 'DESIGN_WEEK',
    })
    expect(result.success).toBe(true)
  })

  it('rejects set action without target phase', () => {
    const result = JourneyPhaseTransitionSchema.safeParse({
      action: 'set',
    })
    expect(result.success).toBe(false)
  })

  it('defaults force to false', () => {
    const result = JourneyPhaseTransitionSchema.safeParse({
      action: 'advance',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.force).toBe(false)
    }
  })

  it('rejects invalid actions', () => {
    expect(JourneyPhaseTransitionSchema.safeParse({
      action: 'invalid',
    }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

describe('CreateNotificationSchema', () => {
  it('accepts valid notification', () => {
    const result = CreateNotificationSchema.safeParse({
      type: 'EXTRACTION_COMPLETE',
      title: 'Extraction finished',
      message: 'Session 1 extraction completed successfully.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    expect(CreateNotificationSchema.safeParse({
      type: 'EXTRACTION_COMPLETE',
      title: '',
      message: 'Test',
    }).success).toBe(false)
  })

  it('rejects invalid notification type', () => {
    expect(CreateNotificationSchema.safeParse({
      type: 'INVALID_TYPE',
      title: 'Test',
      message: 'Test',
    }).success).toBe(false)
  })
})

describe('MarkNotificationsReadSchema', () => {
  it('accepts array of IDs', () => {
    const result = MarkNotificationsReadSchema.safeParse({
      ids: ['clm1234', 'clm5678'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts all: true', () => {
    const result = MarkNotificationsReadSchema.safeParse({
      all: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty IDs array', () => {
    expect(MarkNotificationsReadSchema.safeParse({
      ids: [],
    }).success).toBe(false)
  })

  it('rejects both ids and all together', () => {
    expect(MarkNotificationsReadSchema.safeParse({
      ids: ['clm1234'],
      all: true,
    }).success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateValue', () => {
  it('returns success for valid values', () => {
    const result = validateValue('clm1234', IdSchema)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('clm1234')
    }
  })

  it('returns error for invalid values', () => {
    const result = validateValue('', IdSchema)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(typeof result.error).toBe('string')
      expect(result.error.length).toBeGreaterThan(0)
    }
  })
})

describe('validateId', () => {
  it('returns success for valid IDs', () => {
    const result = validateId('clm1234abc')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.id).toBe('clm1234abc')
    }
  })

  it('returns error response for invalid IDs', () => {
    const result = validateId('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.response).toBeDefined()
    }
  })

  it('returns error response for IDs with special characters', () => {
    const result = validateId('<script>alert(1)</script>')
    expect(result.success).toBe(false)
  })
})
