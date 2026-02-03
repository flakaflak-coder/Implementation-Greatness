import { describe, it, expect, vi } from 'vitest'

// Mock the profile-types module
vi.mock('@/components/de-workspace/profile-types', () => ({
  createEmptyProfile: () => ({
    identity: { stakeholders: [] },
    businessContext: {
      problemStatement: '',
      painPoints: [],
      peakPeriods: [],
    },
    kpis: [],
    channels: [],
    skills: {
      skills: [],
      communicationStyle: { tone: [], formality: null, languages: [] },
    },
    process: {
      happyPathSteps: [],
      exceptions: [],
      escalationRules: [],
      caseTypes: [],
    },
    scope: { inScope: [], outOfScope: [] },
    guardrails: {
      never: [],
      always: [],
      financialLimits: [],
      legalRestrictions: [],
    },
  }),
}))

// Import after mocks
import { mapExtractedItemsToProfile, mergeProfiles } from './profile-mapper'
import type { ExtractedItem } from '@prisma/client'

// Helper to create mock extracted items
function createMockItem(overrides: Partial<ExtractedItem>): ExtractedItem {
  return {
    id: 'item-1',
    sessionId: 'session-1',
    type: 'GOAL',
    content: 'Test content',
    confidence: 0.9,
    status: 'APPROVED',
    sourceQuote: '',
    sourceSpeaker: null,
    sourceTimestamp: null,
    structuredData: null,
    promptTemplateId: null,
    category: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ExtractedItem
}

describe('profile-mapper', () => {
  describe('mapExtractedItemsToProfile', () => {
    it('maps stakeholder items to identity section', () => {
      const items = [
        createMockItem({
          type: 'STAKEHOLDER',
          content: 'John Doe',
          structuredData: { name: 'John Doe', role: 'Manager', email: 'john@example.com' },
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.identity.stakeholders).toHaveLength(1)
      expect(profile.identity.stakeholders[0].name).toBe('John Doe')
      expect(profile.identity.stakeholders[0].role).toBe('Manager')
      expect(profile.identity.stakeholders[0].email).toBe('john@example.com')
    })

    it('maps goal items to business context', () => {
      const items = [
        createMockItem({
          type: 'GOAL',
          content: 'Reduce processing time by 50%',
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.businessContext.problemStatement).toBe('Reduce processing time by 50%')
    })

    it('maps business case with pain points', () => {
      const items = [
        createMockItem({
          type: 'BUSINESS_CASE',
          content: 'Multiple issues',
          structuredData: {
            problemStatement: 'High costs',
            painPoints: ['• Slow processing', '- Manual errors', 'High turnover'],
          },
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.businessContext.problemStatement).toBe('High costs')
      expect(profile.businessContext.painPoints).toContain('Slow processing')
      expect(profile.businessContext.painPoints).toContain('Manual errors')
      expect(profile.businessContext.painPoints).toContain('High turnover')
    })

    it('parses bullet points from content when no structured data', () => {
      const items = [
        createMockItem({
          type: 'BUSINESS_CASE',
          content: '• Point one • Point two • Point three',
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.businessContext.painPoints).toContain('Point one')
      expect(profile.businessContext.painPoints).toContain('Point two')
      expect(profile.businessContext.painPoints).toContain('Point three')
    })

    it('maps volume expectation with normalized data', () => {
      const items = [
        createMockItem({
          type: 'VOLUME_EXPECTATION',
          content: '5000 cases per month',
          structuredData: {
            monthlyVolume: 5000,
            originalValue: 250,
            originalUnit: 'per day',
            calculationNote: '250 * 20 working days',
          },
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.businessContext.volumePerMonth).toBe(5000)
      expect(profile.businessContext.volumeOriginalValue).toBe(250)
      expect(profile.businessContext.volumeOriginalUnit).toBe('per day')
    })

    it('maps cost per case with currency', () => {
      const items = [
        createMockItem({
          type: 'COST_PER_CASE',
          content: '€15 per case',
          structuredData: {
            costPerCase: 15,
            currency: 'EUR',
            totalMonthlyCost: 75000,
          },
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.businessContext.costPerCase).toBe(15)
      expect(profile.businessContext.currency).toBe('EUR')
      expect(profile.businessContext.totalMonthlyCost).toBe(75000)
    })

    it('maps KPI targets', () => {
      const items = [
        createMockItem({
          type: 'KPI_TARGET',
          content: 'Response time: 24 hours',
          structuredData: {
            name: 'Response Time',
            targetValue: '24 hours',
            unit: 'hours',
          },
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.kpis).toHaveLength(1)
      expect(profile.kpis[0].name).toBe('Response Time')
      expect(profile.kpis[0].targetValue).toBe('24 hours')
    })

    it('extracts target value from content when not in structured data', () => {
      const items = [
        createMockItem({
          type: 'KPI_TARGET',
          content: 'Achieve 85% automation rate',
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.kpis[0].targetValue).toBe('85%')
    })

    it('maps channel items with type inference', () => {
      const items = [
        createMockItem({
          type: 'CHANNEL',
          content: 'Email support',
        }),
        createMockItem({
          id: 'item-2',
          type: 'CHANNEL',
          content: 'Phone hotline',
        }),
        createMockItem({
          id: 'item-3',
          type: 'CHANNEL',
          content: 'Customer portal',
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.channels).toHaveLength(3)
      expect(profile.channels[0].type).toBe('email')
      expect(profile.channels[1].type).toBe('phone')
      expect(profile.channels[2].type).toBe('portal')
    })

    it('maps skill items with correct types', () => {
      const items = [
        createMockItem({
          type: 'SKILL_ANSWER',
          content: 'Answer FAQs',
          structuredData: { name: 'FAQ Handling' },
        }),
        createMockItem({
          id: 'item-2',
          type: 'SKILL_ROUTE',
          content: 'Route to specialists',
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.skills.skills).toHaveLength(2)
      expect(profile.skills.skills[0].type).toBe('answer')
      expect(profile.skills.skills[1].type).toBe('route')
    })

    it('maps happy path steps with ordering', () => {
      const items = [
        createMockItem({
          type: 'HAPPY_PATH_STEP',
          content: 'Third step',
          structuredData: { order: 3, title: 'Process' },
        }),
        createMockItem({
          id: 'item-2',
          type: 'HAPPY_PATH_STEP',
          content: 'First step',
          structuredData: { order: 1, title: 'Receive' },
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.process.happyPathSteps).toHaveLength(2)
      // Should be sorted by order
      expect(profile.process.happyPathSteps[0].order).toBe(1)
      expect(profile.process.happyPathSteps[1].order).toBe(3)
    })

    it('maps exception cases', () => {
      const items = [
        createMockItem({
          type: 'EXCEPTION_CASE',
          content: 'Customer complaint',
          structuredData: {
            trigger: 'Customer expresses dissatisfaction',
            action: 'Escalate to supervisor',
            escalateTo: 'Team Lead',
          },
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.process.exceptions).toHaveLength(1)
      expect(profile.process.exceptions[0].trigger).toBe('Customer expresses dissatisfaction')
      expect(profile.process.exceptions[0].escalateTo).toBe('Team Lead')
    })

    it('maps scope items', () => {
      const items = [
        createMockItem({
          type: 'SCOPE_IN',
          content: 'Handle simple claims',
          structuredData: { conditions: 'Under €5000' },
        }),
        createMockItem({
          id: 'item-2',
          type: 'SCOPE_OUT',
          content: 'Complex litigation',
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.scope.inScope).toHaveLength(1)
      expect(profile.scope.inScope[0].statement).toBe('Handle simple claims')
      expect(profile.scope.inScope[0].conditions).toBe('Under €5000')
      expect(profile.scope.outOfScope).toHaveLength(1)
    })

    it('maps guardrail items', () => {
      const items = [
        createMockItem({
          type: 'GUARDRAIL_NEVER',
          content: 'Never share passwords',
        }),
        createMockItem({
          id: 'item-2',
          type: 'GUARDRAIL_ALWAYS',
          content: 'Always verify identity',
        }),
        createMockItem({
          id: 'item-3',
          type: 'FINANCIAL_LIMIT',
          content: 'Approval limit: €10,000',
          structuredData: { type: 'Approval', amount: 10000, currency: 'EUR' },
        }),
        createMockItem({
          id: 'item-4',
          type: 'LEGAL_RESTRICTION',
          content: 'GDPR compliance required',
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.guardrails.never).toContain('Never share passwords')
      expect(profile.guardrails.always).toContain('Always verify identity')
      expect(profile.guardrails.financialLimits).toHaveLength(1)
      expect(profile.guardrails.financialLimits[0].amount).toBe(10000)
      expect(profile.guardrails.legalRestrictions).toContain('GDPR compliance required')
    })

    it('extracts amount from content for financial limits', () => {
      const items = [
        createMockItem({
          type: 'FINANCIAL_LIMIT',
          content: 'Maximum refund of 500.50',
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.guardrails.financialLimits[0].amount).toBe(500.5)
    })

    it('handles communication style items', () => {
      const items = [
        createMockItem({
          type: 'BRAND_TONE',
          content: 'Friendly and professional',
        }),
        createMockItem({
          id: 'item-2',
          type: 'COMMUNICATION_STYLE',
          content: 'Formal business style',
          structuredData: { formality: 'formal', languages: ['en', 'nl'] },
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.skills.communicationStyle.tone).toContain('Friendly and professional')
      expect(profile.skills.communicationStyle.formality).toBe('formal')
      expect(profile.skills.communicationStyle.languages).toEqual(['en', 'nl'])
    })

    it('handles case types', () => {
      const items = [
        createMockItem({
          type: 'CASE_TYPE',
          content: 'Standard claim',
          structuredData: {
            name: 'Standard Claim',
            volumePercent: 60,
            complexity: 'LOW',
            automatable: true,
          },
        }),
      ]

      const profile = mapExtractedItemsToProfile(items)

      expect(profile.process.caseTypes).toHaveLength(1)
      expect(profile.process.caseTypes[0].name).toBe('Standard Claim')
      expect(profile.process.caseTypes[0].volumePercent).toBe(60)
      expect(profile.process.caseTypes[0].complexity).toBe('LOW')
    })

    it('handles unknown item types gracefully', () => {
      const items = [
        createMockItem({
          type: 'UNKNOWN_TYPE' as any,
          content: 'Unknown content',
        }),
      ]

      // Should not throw
      const profile = mapExtractedItemsToProfile(items)
      expect(profile).toBeDefined()
    })

    it('handles mapping errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const items = [
        createMockItem({
          type: 'STAKEHOLDER',
          content: 'Valid',
          structuredData: { name: 'Valid User' },
        }),
        // This might cause issues but should be handled
        {
          ...createMockItem({ type: 'GOAL' }),
          structuredData: { get willFail() { throw new Error('Test error') } },
        } as any,
      ]

      const profile = mapExtractedItemsToProfile(items)

      // First item should still be mapped
      expect(profile.identity.stakeholders).toHaveLength(1)

      consoleSpy.mockRestore()
    })
  })

  describe('mergeProfiles', () => {
    const emptyProfile = {
      identity: { stakeholders: [] },
      businessContext: {
        problemStatement: '',
        painPoints: [],
        peakPeriods: [],
      },
      kpis: [],
      channels: [],
      skills: {
        skills: [],
        communicationStyle: { tone: [], formality: null, languages: [] },
      },
      process: {
        happyPathSteps: [],
        exceptions: [],
        escalationRules: [],
        caseTypes: [],
      },
      scope: { inScope: [], outOfScope: [] },
      guardrails: {
        never: [],
        always: [],
        financialLimits: [],
        legalRestrictions: [],
      },
    }

    it('merges identity section', () => {
      const existing = {
        ...emptyProfile,
        identity: { stakeholders: [{ id: '1', name: 'John', role: 'Manager' }] },
      }

      const updates = {
        identity: { stakeholders: [{ id: '2', name: 'Jane', role: 'Director' }] },
      }

      const merged = mergeProfiles(existing as any, updates as any)

      expect(merged.identity.stakeholders).toHaveLength(1)
      expect(merged.identity.stakeholders[0].name).toBe('Jane')
    })

    it('preserves existing values when updates are undefined', () => {
      const existing = {
        ...emptyProfile,
        businessContext: {
          ...emptyProfile.businessContext,
          problemStatement: 'Original problem',
          painPoints: ['Pain 1'],
        },
      }

      const merged = mergeProfiles(existing as any, {})

      expect(merged.businessContext.problemStatement).toBe('Original problem')
      expect(merged.businessContext.painPoints).toContain('Pain 1')
    })

    it('merges kpis array', () => {
      const existing = {
        ...emptyProfile,
        kpis: [{ id: '1', name: 'KPI 1' }],
      }

      const updates = {
        kpis: [{ id: '2', name: 'KPI 2' }],
      }

      const merged = mergeProfiles(existing as any, updates as any)

      expect(merged.kpis).toHaveLength(1)
      expect(merged.kpis[0].name).toBe('KPI 2')
    })

    it('merges channels array', () => {
      const existing = {
        ...emptyProfile,
        channels: [{ id: '1', name: 'Email' }],
      }

      const updates = {
        channels: [{ id: '2', name: 'Phone' }],
      }

      const merged = mergeProfiles(existing as any, updates as any)

      expect(merged.channels).toHaveLength(1)
      expect(merged.channels[0].name).toBe('Phone')
    })

    it('merges skills section with communication style', () => {
      const existing = {
        ...emptyProfile,
        skills: {
          skills: [{ id: '1', type: 'answer', name: 'FAQ' }],
          communicationStyle: { tone: ['formal'], formality: 'formal', languages: ['en'] },
        },
      }

      const updates = {
        skills: {
          communicationStyle: { tone: ['casual'], languages: ['nl'] },
        },
      }

      const merged = mergeProfiles(existing as any, updates as any)

      expect(merged.skills.communicationStyle.tone).toEqual(['casual'])
      expect(merged.skills.communicationStyle.languages).toEqual(['nl'])
    })

    it('merges process section', () => {
      const existing = {
        ...emptyProfile,
        process: {
          happyPathSteps: [{ id: '1', order: 1, title: 'Step 1' }],
          exceptions: [],
          escalationRules: ['Rule 1'],
          caseTypes: [],
        },
      }

      const updates = {
        process: {
          escalationRules: ['Rule 2'],
        },
      }

      const merged = mergeProfiles(existing as any, updates as any)

      expect(merged.process.happyPathSteps).toHaveLength(1)
      expect(merged.process.escalationRules).toEqual(['Rule 2'])
    })

    it('merges scope section', () => {
      const existing = {
        ...emptyProfile,
        scope: {
          inScope: [{ id: '1', statement: 'In 1' }],
          outOfScope: [{ id: '2', statement: 'Out 1' }],
        },
      }

      const updates = {
        scope: {
          inScope: [{ id: '3', statement: 'In 2' }],
        },
      }

      const merged = mergeProfiles(existing as any, updates as any)

      expect(merged.scope.inScope).toHaveLength(1)
      expect(merged.scope.inScope[0].statement).toBe('In 2')
      expect(merged.scope.outOfScope).toHaveLength(1)
    })

    it('merges guardrails section', () => {
      const existing = {
        ...emptyProfile,
        guardrails: {
          never: ['Never 1'],
          always: ['Always 1'],
          financialLimits: [],
          legalRestrictions: ['Legal 1'],
        },
      }

      const updates = {
        guardrails: {
          never: ['Never 2'],
        },
      }

      const merged = mergeProfiles(existing as any, updates as any)

      expect(merged.guardrails.never).toEqual(['Never 2'])
      expect(merged.guardrails.always).toEqual(['Always 1'])
      expect(merged.guardrails.legalRestrictions).toEqual(['Legal 1'])
    })
  })
})
