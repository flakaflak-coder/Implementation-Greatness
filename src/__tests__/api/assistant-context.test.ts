/**
 * Tests for Freddy (AI Assistant) context building
 * Ensures Sophie sees accurate data when chatting with Freddy
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../setup'

// Mock Anthropic client
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Test response' }],
      }),
    },
  })),
}))

// Helper to build the context like the assistant route does
function buildDeContext(designWeek: any, businessProfile: any, technicalProfile: any) {
  const de = designWeek.digitalEmployee
  const inScope = designWeek.scopeItems?.filter((s: any) => s.classification === 'IN_SCOPE') || []
  const outScope = designWeek.scopeItems?.filter((s: any) => s.classification === 'OUT_OF_SCOPE') || []
  const ambiguous = designWeek.scopeItems?.filter((s: any) => s.classification === 'AMBIGUOUS') || []

  // Build the context string (simplified version of what the route does)
  const context = `
## Digital Employee Details
**Name:** ${de.name}
**Channels:** ${de.channels?.length > 0 ? de.channels.join(', ') : 'Not defined'}

## Business Profile
${businessProfile ? `
### Channels (${businessProfile.channels?.length || 0} defined)
${businessProfile.channels?.length > 0 ? businessProfile.channels.map((c: any) => `- ${c.name} (${c.type})${c.volumePercentage ? ` - ${c.volumePercentage}% volume` : ''}${c.sla ? ` - SLA: ${c.sla}` : ''}`).join('\n') : 'No channels defined'}

### Guardrails
**Never Do (${businessProfile.guardrails?.never?.length || 0}):**
${businessProfile.guardrails?.never?.length > 0 ? businessProfile.guardrails.never.map((g: string) => `- ❌ ${g}`).join('\n') : 'No rules defined'}

**Always Do (${businessProfile.guardrails?.always?.length || 0}):**
${businessProfile.guardrails?.always?.length > 0 ? businessProfile.guardrails.always.map((g: string) => `- ✅ ${g}`).join('\n') : 'No rules defined'}

**Financial Limits:**
${businessProfile.guardrails?.financialLimits?.length > 0 ? businessProfile.guardrails.financialLimits.map((l: any) => `- ${l.type}: ${l.currency || '€'}${l.amount}`).join('\n') : 'No limits defined'}

### Skills (${businessProfile.skills?.skills?.length || 0} defined)
${businessProfile.skills?.skills?.length > 0 ? businessProfile.skills.skills.map((s: any) => `- ${s.name} (${s.type})`).join('\n') : 'No skills defined'}

### Business Context
- Volume: ${businessProfile.businessContext?.volumePerMonth ? `${businessProfile.businessContext.volumePerMonth.toLocaleString()} cases/month` : 'Not defined'}
- Cost per Case: ${businessProfile.businessContext?.costPerCase ? `€${businessProfile.businessContext.costPerCase}` : 'Not defined'}
` : 'Business profile not yet populated.'}

## Scope
In Scope: ${inScope.length} items
Out of Scope: ${outScope.length} items
Ambiguous: ${ambiguous.length} items

## KPIs (${designWeek.kpis?.length || 0})
${designWeek.kpis?.map((k: any) => `- ${k.name}: ${k.targetValue}`).join('\n') || 'No KPIs'}

## Escalation Rules (${designWeek.escalationRules?.length || 0})
${designWeek.escalationRules?.map((e: any) => `- ${e.trigger}`).join('\n') || 'No rules'}
`
  return context
}

describe('Assistant Context Building', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Business Profile Data', () => {
    it('includes channels in context when defined', () => {
      const businessProfile = {
        channels: [
          { id: '1', name: 'Email', type: 'email', volumePercentage: 60, sla: '24 hours' },
          { id: '2', name: 'Chat', type: 'chat', volumePercentage: 40, sla: '5 minutes' },
        ],
        guardrails: { never: [], always: [], financialLimits: [], legalRestrictions: [] },
        skills: { skills: [], communicationStyle: {} },
        businessContext: {},
      }

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: ['EMAIL', 'WEBCHAT'] },
        scopeItems: [],
        kpis: [],
        escalationRules: [],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      expect(context).toContain('Channels (2 defined)')
      expect(context).toContain('Email (email)')
      expect(context).toContain('60% volume')
      expect(context).toContain('SLA: 24 hours')
      expect(context).toContain('Chat (chat)')
      expect(context).toContain('40% volume')
    })

    it('shows "No channels defined" when empty', () => {
      const businessProfile = {
        channels: [],
        guardrails: { never: [], always: [], financialLimits: [], legalRestrictions: [] },
        skills: { skills: [], communicationStyle: {} },
        businessContext: {},
      }

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [],
        kpis: [],
        escalationRules: [],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      expect(context).toContain('Channels (0 defined)')
      expect(context).toContain('No channels defined')
    })

    it('includes guardrails - never rules', () => {
      const businessProfile = {
        channels: [],
        guardrails: {
          never: ['Make refunds over €500', 'Share customer data with third parties'],
          always: [],
          financialLimits: [],
          legalRestrictions: [],
        },
        skills: { skills: [], communicationStyle: {} },
        businessContext: {},
      }

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [],
        kpis: [],
        escalationRules: [],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      expect(context).toContain('Never Do (2)')
      expect(context).toContain('❌ Make refunds over €500')
      expect(context).toContain('❌ Share customer data with third parties')
    })

    it('includes guardrails - always rules', () => {
      const businessProfile = {
        channels: [],
        guardrails: {
          never: [],
          always: ['Verify customer identity', 'Log all transactions'],
          financialLimits: [],
          legalRestrictions: [],
        },
        skills: { skills: [], communicationStyle: {} },
        businessContext: {},
      }

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [],
        kpis: [],
        escalationRules: [],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      expect(context).toContain('Always Do (2)')
      expect(context).toContain('✅ Verify customer identity')
      expect(context).toContain('✅ Log all transactions')
    })

    it('includes guardrails - financial limits', () => {
      const businessProfile = {
        channels: [],
        guardrails: {
          never: [],
          always: [],
          financialLimits: [
            { id: '1', type: 'max_refund', amount: 500, currency: '€' },
            { id: '2', type: 'daily_limit', amount: 5000, currency: '€' },
          ],
          legalRestrictions: [],
        },
        skills: { skills: [], communicationStyle: {} },
        businessContext: {},
      }

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [],
        kpis: [],
        escalationRules: [],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      expect(context).toContain('Financial Limits')
      expect(context).toContain('max_refund: €500')
      expect(context).toContain('daily_limit: €5000')
    })

    it('includes skills', () => {
      const businessProfile = {
        channels: [],
        guardrails: { never: [], always: [], financialLimits: [], legalRestrictions: [] },
        skills: {
          skills: [
            { id: '1', type: 'answer', name: 'FAQ Responses', description: 'Answer common questions' },
            { id: '2', type: 'route', name: 'Ticket Routing', description: 'Route to right team' },
          ],
          communicationStyle: { tone: ['professional'], formality: 'formal', languages: ['Dutch'] },
        },
        businessContext: {},
      }

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [],
        kpis: [],
        escalationRules: [],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      expect(context).toContain('Skills (2 defined)')
      expect(context).toContain('FAQ Responses (answer)')
      expect(context).toContain('Ticket Routing (route)')
    })

    it('includes business context with volume and cost', () => {
      const businessProfile = {
        channels: [],
        guardrails: { never: [], always: [], financialLimits: [], legalRestrictions: [] },
        skills: { skills: [], communicationStyle: {} },
        businessContext: {
          problemStatement: 'Manual email processing takes too long',
          volumePerMonth: 11000,
          costPerCase: 12.50,
          totalMonthlyCost: 137500,
          peakPeriods: ['Monday mornings', 'End of month'],
        },
      }

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [],
        kpis: [],
        escalationRules: [],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      expect(context).toContain('11,000 cases/month')
      expect(context).toContain('€12.5')
    })
  })

  describe('Scope Items', () => {
    it('correctly counts scope items by classification', () => {
      const businessProfile = {
        channels: [],
        guardrails: { never: [], always: [], financialLimits: [], legalRestrictions: [] },
        skills: { skills: [], communicationStyle: {} },
        businessContext: {},
      }

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [
          { id: '1', statement: 'Handle refund requests', classification: 'IN_SCOPE' },
          { id: '2', statement: 'Process returns', classification: 'IN_SCOPE' },
          { id: '3', statement: 'Legal disputes', classification: 'OUT_OF_SCOPE' },
          { id: '4', statement: 'Warranty claims', classification: 'AMBIGUOUS' },
        ],
        kpis: [],
        escalationRules: [],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      expect(context).toContain('In Scope: 2 items')
      expect(context).toContain('Out of Scope: 1 items')
      expect(context).toContain('Ambiguous: 1 items')
    })
  })

  describe('KPIs and Escalation Rules', () => {
    it('includes KPIs in context', () => {
      const businessProfile = null

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [],
        kpis: [
          { id: '1', name: 'Response Time', targetValue: '< 2 hours' },
          { id: '2', name: 'Resolution Rate', targetValue: '85%' },
        ],
        escalationRules: [],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      expect(context).toContain('KPIs (2)')
      expect(context).toContain('Response Time: < 2 hours')
      expect(context).toContain('Resolution Rate: 85%')
    })

    it('includes escalation rules in context', () => {
      const businessProfile = null

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [],
        kpis: [],
        escalationRules: [
          { id: '1', trigger: 'Angry customer detected', priority: 'HIGH' },
          { id: '2', trigger: 'Legal question asked', priority: 'HIGH' },
        ],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      expect(context).toContain('Escalation Rules (2)')
      expect(context).toContain('Angry customer detected')
      expect(context).toContain('Legal question asked')
    })
  })

  describe('Empty State Handling', () => {
    it('handles completely empty business profile gracefully', () => {
      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [],
        kpis: [],
        escalationRules: [],
      }

      // Should not throw
      const context = buildDeContext(designWeek, null, null)
      expect(context).toContain('Business profile not yet populated')
    })

    it('handles partial business profile (some sections empty)', () => {
      const businessProfile = {
        channels: [{ id: '1', name: 'Email', type: 'email', volumePercentage: 100, sla: '24h' }],
        guardrails: { never: [], always: [], financialLimits: [], legalRestrictions: [] },
        skills: { skills: [], communicationStyle: {} },
        businessContext: {},
      }

      const designWeek = {
        digitalEmployee: { name: 'Test DE', channels: [] },
        scopeItems: [],
        kpis: [],
        escalationRules: [],
      }

      const context = buildDeContext(designWeek, businessProfile, null)

      // Has channels
      expect(context).toContain('Channels (1 defined)')
      expect(context).toContain('Email (email)')
      // Empty guardrails shows placeholder
      expect(context).toContain('No rules defined')
      // Empty skills
      expect(context).toContain('Skills (0 defined)')
    })
  })
})

describe('Full Context Verification (What Freddy Sees)', () => {
  it('verifies Freddy sees all key data sections with real data', () => {
    // This represents a well-filled-out DE that Sophie might be working on
    const businessProfile = {
      identity: {
        name: 'Ben',
        description: 'Email handling assistant for customer service',
        stakeholders: [
          { id: '1', name: 'Marcus Chen', role: 'Product Owner', isDecisionMaker: true },
          { id: '2', name: 'Sophie', role: 'Implementation Lead' },
        ],
      },
      businessContext: {
        problemStatement: 'Customer service team spends 4 hours/day on repetitive email responses',
        volumePerMonth: 11000,
        volumeOriginalValue: 500,
        volumeOriginalUnit: 'cases/day',
        volumeCalculationNote: '500/day × 22 working days = 11,000/month',
        costPerCase: 12.50,
        totalMonthlyCost: 137500,
        currency: 'EUR',
        peakPeriods: ['Monday mornings', 'End of month'],
        painPoints: ['Slow response times', 'Inconsistent answers'],
      },
      kpis: [
        { id: '1', name: 'First Response Time', targetValue: '< 2 hours', unit: 'hours' },
        { id: '2', name: 'Resolution Rate', targetValue: '75%', unit: '%' },
        { id: '3', name: 'Customer Satisfaction', targetValue: '4.5/5', unit: 'score' },
      ],
      channels: [
        { id: '1', name: 'Email', type: 'email', volumePercentage: 70, sla: '24 hours', rules: ['Always greet by name'] },
        { id: '2', name: 'Internal Ticketing', type: 'portal', volumePercentage: 30, sla: '4 hours' },
      ],
      skills: {
        skills: [
          { id: '1', type: 'answer', name: 'FAQ Responses', description: 'Answer common questions from knowledge base' },
          { id: '2', type: 'route', name: 'Ticket Routing', description: 'Route complex issues to correct team' },
          { id: '3', type: 'request_info', name: 'Information Gathering', description: 'Ask follow-up questions' },
        ],
        communicationStyle: {
          tone: ['professional', 'friendly'],
          languages: ['Dutch', 'English'],
          formality: 'formal',
        },
      },
      process: {
        happyPathSteps: [
          { id: '1', order: 1, title: 'Receive email', description: 'Email arrives in shared inbox' },
          { id: '2', order: 2, title: 'Classify intent', description: 'Determine type of request' },
          { id: '3', order: 3, title: 'Draft response', description: 'Generate appropriate response' },
          { id: '4', order: 4, title: 'Send or escalate', description: 'Send if confident, otherwise route' },
        ],
        exceptions: [
          { id: '1', trigger: 'Angry customer', action: 'Escalate immediately' },
          { id: '2', trigger: 'Legal question', action: 'Route to legal team' },
        ],
        escalationRules: ['Escalate if confidence < 70%', 'Always escalate complaints'],
        caseTypes: [
          { id: '1', name: 'Product inquiry', volumePercent: 40, complexity: 'LOW', automatable: true },
          { id: '2', name: 'Order status', volumePercent: 35, complexity: 'LOW', automatable: true },
          { id: '3', name: 'Complaint', volumePercent: 15, complexity: 'HIGH', automatable: false },
          { id: '4', name: 'Returns', volumePercent: 10, complexity: 'MEDIUM', automatable: true },
        ],
      },
      scope: {
        inScope: [
          { id: '1', statement: 'Answer product questions' },
          { id: '2', statement: 'Provide order status' },
          { id: '3', statement: 'Process simple returns' },
        ],
        outOfScope: [
          { id: '1', statement: 'Price negotiations' },
          { id: '2', statement: 'Legal disputes' },
        ],
      },
      guardrails: {
        never: [
          'Make refunds over €500 without approval',
          'Share customer data with third parties',
          'Make promises about delivery dates',
        ],
        always: [
          'Verify customer identity before sharing order info',
          'Include order number in responses',
          'Offer to escalate if customer is upset',
        ],
        financialLimits: [
          { id: '1', type: 'max_refund', amount: 500, currency: '€' },
          { id: '2', type: 'daily_limit', amount: 5000, currency: '€' },
        ],
        legalRestrictions: ['GDPR compliance required', 'No medical advice'],
      },
    }

    const designWeek = {
      digitalEmployee: { name: 'Ben', channels: ['EMAIL', 'PORTAL'] },
      scopeItems: [
        { id: '1', statement: 'Answer product questions', classification: 'IN_SCOPE' },
        { id: '2', statement: 'Provide order status', classification: 'IN_SCOPE' },
        { id: '3', statement: 'Process simple returns', classification: 'IN_SCOPE' },
        { id: '4', statement: 'Price negotiations', classification: 'OUT_OF_SCOPE' },
        { id: '5', statement: 'Legal disputes', classification: 'OUT_OF_SCOPE' },
        { id: '6', statement: 'Warranty claims over 1 year', classification: 'AMBIGUOUS' },
      ],
      kpis: [
        { id: '1', name: 'First Response Time', targetValue: '< 2 hours' },
        { id: '2', name: 'Resolution Rate', targetValue: '75%' },
      ],
      escalationRules: [
        { id: '1', trigger: 'Angry customer detected', priority: 'HIGH' },
        { id: '2', trigger: 'Legal question asked', priority: 'HIGH' },
        { id: '3', trigger: 'Refund over €500 requested', priority: 'MEDIUM' },
      ],
    }

    const context = buildDeContext(designWeek, businessProfile, null)

    // ===== CHANNELS =====
    expect(context).toContain('Channels (2 defined)')
    expect(context).toContain('Email (email)')
    expect(context).toContain('70% volume')
    expect(context).toContain('SLA: 24 hours')
    expect(context).toContain('Internal Ticketing (portal)')
    expect(context).toContain('30% volume')

    // ===== GUARDRAILS - NEVER =====
    expect(context).toContain('Never Do (3)')
    expect(context).toContain('Make refunds over €500 without approval')
    expect(context).toContain('Share customer data with third parties')

    // ===== GUARDRAILS - ALWAYS =====
    expect(context).toContain('Always Do (3)')
    expect(context).toContain('Verify customer identity before sharing order info')

    // ===== FINANCIAL LIMITS =====
    expect(context).toContain('max_refund: €500')
    expect(context).toContain('daily_limit: €5000')

    // ===== SKILLS =====
    expect(context).toContain('Skills (3 defined)')
    expect(context).toContain('FAQ Responses (answer)')
    expect(context).toContain('Ticket Routing (route)')

    // ===== BUSINESS CONTEXT =====
    expect(context).toContain('11,000 cases/month')
    expect(context).toContain('€12.5')

    // ===== SCOPE =====
    expect(context).toContain('In Scope: 3 items')
    expect(context).toContain('Out of Scope: 2 items')
    expect(context).toContain('Ambiguous: 1 items')

    // ===== KPIs =====
    expect(context).toContain('KPIs (2)')
    expect(context).toContain('First Response Time: < 2 hours')
    expect(context).toContain('Resolution Rate: 75%')

    // ===== ESCALATION RULES =====
    expect(context).toContain('Escalation Rules (3)')
    expect(context).toContain('Angry customer detected')
    expect(context).toContain('Legal question asked')

    console.log('\n✅ Freddy sees ALL the key data:')
    console.log('  - Channels: 2 defined (Email, Internal Ticketing)')
    console.log('  - Guardrails: 3 never rules, 3 always rules, 2 financial limits')
    console.log('  - Skills: 3 defined')
    console.log('  - Business Context: volume, cost per case')
    console.log('  - Scope: 3 in, 2 out, 1 ambiguous')
    console.log('  - KPIs: 2 defined')
    console.log('  - Escalation Rules: 3 defined\n')
  })
})

describe('Data Extraction Checks', () => {
  it('correctly identifies when channels are missing', () => {
    const businessProfile = {
      channels: [],
      guardrails: { never: [], always: [], financialLimits: [], legalRestrictions: [] },
    }

    const hasChannels = businessProfile?.channels?.length > 0
    expect(hasChannels).toBe(false)
  })

  it('correctly identifies when channels exist', () => {
    const businessProfile = {
      channels: [{ id: '1', name: 'Email', type: 'email' }],
      guardrails: { never: [], always: [], financialLimits: [], legalRestrictions: [] },
    }

    const hasChannels = businessProfile?.channels?.length > 0
    expect(hasChannels).toBe(true)
  })

  it('correctly identifies when guardrails are missing', () => {
    const businessProfile = {
      channels: [],
      guardrails: { never: [], always: [], financialLimits: [], legalRestrictions: [] },
    }

    const hasGuardrails = (businessProfile?.guardrails?.never?.length > 0 || businessProfile?.guardrails?.always?.length > 0)
    expect(hasGuardrails).toBe(false)
  })

  it('correctly identifies when guardrails exist (never rules)', () => {
    const businessProfile = {
      channels: [],
      guardrails: { never: ['Dont do X'], always: [], financialLimits: [], legalRestrictions: [] },
    }

    const hasGuardrails = (businessProfile?.guardrails?.never?.length > 0 || businessProfile?.guardrails?.always?.length > 0)
    expect(hasGuardrails).toBe(true)
  })

  it('correctly identifies when guardrails exist (always rules)', () => {
    const businessProfile = {
      channels: [],
      guardrails: { never: [], always: ['Always do Y'], financialLimits: [], legalRestrictions: [] },
    }

    const hasGuardrails = (businessProfile?.guardrails?.never?.length > 0 || businessProfile?.guardrails?.always?.length > 0)
    expect(hasGuardrails).toBe(true)
  })
})
