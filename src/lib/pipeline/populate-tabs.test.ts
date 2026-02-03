import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    designWeek: {
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
    },
    extractedItem: {
      create: vi.fn(),
    },
    scopeItem: {
      create: vi.fn(),
    },
  },
}))

vi.mock('./extract-specialized', () => ({
  mapToExtractedItemType: vi.fn((type: string) => type),
}))

// Import after mocks
import { populateTabs, createScopeItems, getProfileSection } from './populate-tabs'
import { prisma } from '@/lib/db'
import type { ClassificationResult, SpecializedItem } from './types'

describe('populate-tabs module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProfileSection', () => {
    it('maps identity items correctly', () => {
      expect(getProfileSection('DE_NAME')).toBe('identity')
      expect(getProfileSection('BUSINESS_CONTEXT')).toBe('identity')
      expect(getProfileSection('GOAL')).toBe('identity')
      expect(getProfileSection('PROBLEM')).toBe('identity')
    })

    it('maps business context items correctly', () => {
      expect(getProfileSection('VOLUME')).toBe('businessContext')
      expect(getProfileSection('COST')).toBe('businessContext')
      expect(getProfileSection('STAKEHOLDER')).toBe('businessContext')
    })

    it('maps channel items correctly', () => {
      expect(getProfileSection('CHANNEL')).toBe('channels')
      expect(getProfileSection('CHANNEL_RULE')).toBe('channels')
      expect(getProfileSection('SLA')).toBe('channels')
    })

    it('maps skill items correctly', () => {
      expect(getProfileSection('SKILL')).toBe('skills')
      expect(getProfileSection('KNOWLEDGE_SOURCE')).toBe('skills')
      expect(getProfileSection('TEMPLATE')).toBe('skills')
    })

    it('maps process items correctly', () => {
      expect(getProfileSection('HAPPY_PATH_STEP')).toBe('process')
      expect(getProfileSection('EXCEPTION_CASE')).toBe('process')
      expect(getProfileSection('CASE_TYPE')).toBe('process')
      expect(getProfileSection('DECISION_POINT')).toBe('process')
      expect(getProfileSection('ESCALATION_RULE')).toBe('process')
    })

    it('maps guardrail items correctly', () => {
      expect(getProfileSection('GUARDRAIL_NEVER')).toBe('guardrails')
      expect(getProfileSection('GUARDRAIL_ALWAYS')).toBe('guardrails')
      expect(getProfileSection('FINANCIAL_LIMIT')).toBe('guardrails')
      expect(getProfileSection('LEGAL_RESTRICTION')).toBe('guardrails')
      expect(getProfileSection('BRAND_TONE')).toBe('guardrails')
    })

    it('maps KPI items correctly', () => {
      expect(getProfileSection('KPI')).toBe('kpis')
    })

    it('maps integration items correctly', () => {
      expect(getProfileSection('SYSTEM_INTEGRATION')).toBe('integrations')
      expect(getProfileSection('API_ENDPOINT')).toBe('integrations')
      expect(getProfileSection('AUTH_REQUIREMENT')).toBe('integrations')
    })

    it('maps data field items correctly', () => {
      expect(getProfileSection('DATA_FIELD')).toBe('dataFields')
      expect(getProfileSection('DATA_HANDLING')).toBe('dataFields')
    })

    it('maps security items correctly', () => {
      expect(getProfileSection('SECURITY_REQUIREMENT')).toBe('security')
      expect(getProfileSection('COMPLIANCE_REQUIREMENT')).toBe('security')
    })

    it('returns other for unknown types', () => {
      expect(getProfileSection('UNKNOWN_TYPE')).toBe('other')
      expect(getProfileSection('')).toBe('other')
    })
  })

  describe('populateTabs', () => {
    const mockClassification: ClassificationResult = {
      type: 'KICKOFF_SESSION',
      confidence: 0.95,
      keyIndicators: [],
      missingQuestions: [],
    }

    const mockItems: SpecializedItem[] = [
      {
        type: 'GOAL',
        content: 'Reduce processing time',
        confidence: 0.9,
      },
      {
        type: 'STAKEHOLDER',
        content: 'John Doe',
        confidence: 0.85,
        structuredData: { name: 'John Doe', role: 'Manager' },
      },
    ]

    it('populates tabs with existing session', async () => {
      vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
        id: 'dw-123',
        sessions: [{ id: 'session-1', sessionNumber: 2 }],
      } as any)

      vi.mocked(prisma.extractedItem.create).mockResolvedValue({ id: 'item-1' } as any)

      const result = await populateTabs('dw-123', mockItems, mockClassification)

      expect(result.extractedItems).toBe(2)
      expect(prisma.extractedItem.create).toHaveBeenCalledTimes(2)
      expect(prisma.session.create).not.toHaveBeenCalled()
    })

    it('creates session when none exists', async () => {
      vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
        id: 'dw-123',
        sessions: [],
      } as any)

      vi.mocked(prisma.session.create).mockResolvedValue({
        id: 'new-session',
      } as any)

      vi.mocked(prisma.extractedItem.create).mockResolvedValue({ id: 'item-1' } as any)

      await populateTabs('dw-123', mockItems, mockClassification)

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          designWeekId: 'dw-123',
          phase: 1, // KICKOFF_SESSION maps to phase 1
          sessionNumber: 1,
          processingStatus: 'COMPLETE',
        }),
      })
    })

    it('throws error when design week not found', async () => {
      vi.mocked(prisma.designWeek.findUnique).mockResolvedValue(null)

      await expect(
        populateTabs('nonexistent', mockItems, mockClassification)
      ).rejects.toThrow('Design week not found')
    })

    it('tracks integration counts', async () => {
      vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
        id: 'dw-123',
        sessions: [{ id: 'session-1' }],
      } as any)

      vi.mocked(prisma.extractedItem.create).mockResolvedValue({ id: 'item-1' } as any)

      const integrationItems: SpecializedItem[] = [
        { type: 'SYSTEM_INTEGRATION', content: 'SAP', confidence: 0.9 },
        { type: 'SYSTEM_INTEGRATION', content: 'Salesforce', confidence: 0.85 },
      ]

      const result = await populateTabs('dw-123', integrationItems, mockClassification)

      expect(result.integrations).toBe(2)
    })

    it('tracks business rule counts', async () => {
      vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
        id: 'dw-123',
        sessions: [{ id: 'session-1' }],
      } as any)

      vi.mocked(prisma.extractedItem.create).mockResolvedValue({ id: 'item-1' } as any)

      const guardrailItems: SpecializedItem[] = [
        { type: 'GUARDRAIL_NEVER', content: 'Never share passwords', confidence: 0.9 },
        { type: 'GUARDRAIL_ALWAYS', content: 'Always verify identity', confidence: 0.9 },
      ]

      const result = await populateTabs('dw-123', guardrailItems, mockClassification)

      expect(result.businessRules).toBe(2)
    })

    it('tracks test case counts', async () => {
      vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
        id: 'dw-123',
        sessions: [{ id: 'session-1' }],
      } as any)

      vi.mocked(prisma.extractedItem.create).mockResolvedValue({ id: 'item-1' } as any)

      const processItems: SpecializedItem[] = [
        { type: 'HAPPY_PATH_STEP', content: 'Step 1', confidence: 0.9 },
        { type: 'EXCEPTION_CASE', content: 'Exception 1', confidence: 0.85 },
      ]

      const result = await populateTabs('dw-123', processItems, mockClassification)

      expect(result.testCases).toBe(2)
    })

    it('sets APPROVED status for high confidence items', async () => {
      vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
        id: 'dw-123',
        sessions: [{ id: 'session-1' }],
      } as any)

      vi.mocked(prisma.extractedItem.create).mockResolvedValue({ id: 'item-1' } as any)

      const highConfidenceItem: SpecializedItem[] = [
        { type: 'GOAL', content: 'Test', confidence: 0.9 },
      ]

      await populateTabs('dw-123', highConfidenceItem, mockClassification)

      expect(prisma.extractedItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'APPROVED',
        }),
      })
    })

    it('sets PENDING status for low confidence items', async () => {
      vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
        id: 'dw-123',
        sessions: [{ id: 'session-1' }],
      } as any)

      vi.mocked(prisma.extractedItem.create).mockResolvedValue({ id: 'item-1' } as any)

      const lowConfidenceItem: SpecializedItem[] = [
        { type: 'GOAL', content: 'Test', confidence: 0.6 },
      ]

      await populateTabs('dw-123', lowConfidenceItem, mockClassification)

      expect(prisma.extractedItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING',
        }),
      })
    })

    it('handles item creation errors gracefully', async () => {
      vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
        id: 'dw-123',
        sessions: [{ id: 'session-1' }],
      } as any)

      vi.mocked(prisma.extractedItem.create)
        .mockResolvedValueOnce({ id: 'item-1' } as any)
        .mockRejectedValueOnce(new Error('Database error'))

      const result = await populateTabs('dw-123', mockItems, mockClassification)

      expect(result.extractedItems).toBe(1)
      expect(result.warnings).toContain('Failed to create item STAKEHOLDER: Database error')
    })

    it('maps classification types to correct phases', async () => {
      vi.mocked(prisma.designWeek.findUnique).mockResolvedValue({
        id: 'dw-123',
        sessions: [],
      } as any)

      vi.mocked(prisma.session.create).mockResolvedValue({ id: 'session-1' } as any)
      vi.mocked(prisma.extractedItem.create).mockResolvedValue({ id: 'item-1' } as any)

      // Test PROCESS_DESIGN_SESSION -> phase 2
      await populateTabs('dw-123', [], { ...mockClassification, type: 'PROCESS_DESIGN_SESSION' })
      expect(prisma.session.create).toHaveBeenLastCalledWith({
        data: expect.objectContaining({ phase: 2 }),
      })

      // Test SKILLS_GUARDRAILS_SESSION -> phase 3
      await populateTabs('dw-123', [], { ...mockClassification, type: 'SKILLS_GUARDRAILS_SESSION' })
      expect(prisma.session.create).toHaveBeenLastCalledWith({
        data: expect.objectContaining({ phase: 3 }),
      })

      // Test TECHNICAL_SESSION -> phase 4
      await populateTabs('dw-123', [], { ...mockClassification, type: 'TECHNICAL_SESSION' })
      expect(prisma.session.create).toHaveBeenLastCalledWith({
        data: expect.objectContaining({ phase: 4 }),
      })

      // Test SIGNOFF_SESSION -> phase 6
      await populateTabs('dw-123', [], { ...mockClassification, type: 'SIGNOFF_SESSION' })
      expect(prisma.session.create).toHaveBeenLastCalledWith({
        data: expect.objectContaining({ phase: 6 }),
      })
    })
  })

  describe('createScopeItems', () => {
    it('creates scope items from specialized items', async () => {
      vi.mocked(prisma.scopeItem.create).mockResolvedValue({ id: 'scope-1' } as any)

      const scopeItems: SpecializedItem[] = [
        { type: 'IN_SCOPE', content: 'Handle simple claims', confidence: 0.9 },
        { type: 'OUT_OF_SCOPE', content: 'Complex litigation', confidence: 0.85 },
        { type: 'AMBIGUOUS', content: 'Edge cases', confidence: 0.7, sourceQuote: 'discussed briefly' },
      ]

      const count = await createScopeItems('dw-123', scopeItems)

      expect(count).toBe(3)
      expect(prisma.scopeItem.create).toHaveBeenCalledTimes(3)
    })

    it('maps scope types correctly', async () => {
      vi.mocked(prisma.scopeItem.create).mockResolvedValue({ id: 'scope-1' } as any)

      const scopeItems: SpecializedItem[] = [
        { type: 'IN_SCOPE', content: 'In scope item', confidence: 0.9 },
      ]

      await createScopeItems('dw-123', scopeItems)

      expect(prisma.scopeItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          designWeekId: 'dw-123',
          statement: 'In scope item',
          classification: 'IN_SCOPE',
        }),
      })
    })

    it('includes source quote in notes', async () => {
      vi.mocked(prisma.scopeItem.create).mockResolvedValue({ id: 'scope-1' } as any)

      const scopeItems: SpecializedItem[] = [
        { type: 'IN_SCOPE', content: 'Test', confidence: 0.9, sourceQuote: 'explicit agreement' },
      ]

      await createScopeItems('dw-123', scopeItems)

      expect(prisma.scopeItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: 'Source: "explicit agreement"',
        }),
      })
    })

    it('filters out non-scope items', async () => {
      vi.mocked(prisma.scopeItem.create).mockResolvedValue({ id: 'scope-1' } as any)

      const mixedItems: SpecializedItem[] = [
        { type: 'IN_SCOPE', content: 'Scope item', confidence: 0.9 },
        { type: 'GOAL', content: 'Goal item', confidence: 0.9 },
        { type: 'STAKEHOLDER', content: 'Stakeholder', confidence: 0.9 },
      ]

      const count = await createScopeItems('dw-123', mixedItems)

      expect(count).toBe(1)
      expect(prisma.scopeItem.create).toHaveBeenCalledTimes(1)
    })

    it('handles duplicate errors silently', async () => {
      vi.mocked(prisma.scopeItem.create)
        .mockResolvedValueOnce({ id: 'scope-1' } as any)
        .mockRejectedValueOnce(new Error('Unique constraint failed'))

      const scopeItems: SpecializedItem[] = [
        { type: 'IN_SCOPE', content: 'Item 1', confidence: 0.9 },
        { type: 'IN_SCOPE', content: 'Duplicate', confidence: 0.9 },
      ]

      const count = await createScopeItems('dw-123', scopeItems)

      expect(count).toBe(1) // Only first one counted
    })
  })
})
