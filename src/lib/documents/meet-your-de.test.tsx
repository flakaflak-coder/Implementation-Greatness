import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @react-pdf/renderer before importing the components
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Image: ({ src }: { src: string }) => null,
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
}))

// Mock Anthropic SDK
const mockMessagesCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: (...args: unknown[]) => mockMessagesCreate(...args),
    }
  },
}))

import {
  generateMeetYourDEContent,
  MeetYourDEPDF,
  type MeetYourDEContent,
  type MeetYourDEContext,
} from './meet-your-de'

// Helper to create minimal context
function createContext(overrides: Partial<MeetYourDEContext> = {}): MeetYourDEContext {
  return {
    companyName: 'Acme Insurance',
    digitalEmployeeName: 'Ben',
    deDescription: 'Customer service automation',
    channels: ['Email', 'Web'],
    brandTone: 'Professional and friendly',
    scopeItems: [
      { description: 'Handle simple claims', classification: 'IN_SCOPE' },
      { description: 'Complex litigation', classification: 'OUT_OF_SCOPE' },
    ],
    guardrails: [
      { type: 'NEVER', description: 'Share customer passwords' },
    ],
    language: 'en',
    ...overrides,
  }
}

// Helper to create full content
function createContent(overrides: Partial<MeetYourDEContent> = {}): MeetYourDEContent {
  return {
    introduction: {
      greeting: 'Hi, I\'m Ben!',
      tagline: 'Your new colleague for customer service',
      personalIntro: 'I\'m excited to join the team at Acme Insurance!',
      myMission: 'My goal is to handle routine questions so you can focus on complex cases.',
    },
    personality: {
      communicationStyle: 'I\'m friendly and clear in every interaction.',
      tone: 'Friendly and professional',
      quirks: ['I always double-check details', 'I never promise what I can\'t deliver'],
      whatMakesMe: 'I respond quickly and consistently.',
    },
    howIWork: {
      typicalDay: 'I help customers with their questions all day.',
      myStrengths: ['Quick responses', 'Consistent accuracy', '24/7 availability'],
      whereINeedHelp: ['Complex situations', 'Angry customers', 'Policy exceptions'],
      handoffStyle: 'I provide a complete summary when transferring.',
    },
    workingTogether: {
      howToReachMe: 'Check the dashboard for my activity.',
      whatITellCustomers: 'I\'m transparent about being AI.',
      customerGreeting: 'Hi! I\'m Ben, your digital assistant. How can I help?',
      escalationMessage: 'Let me connect you with a human colleague.',
    },
    forTheTeam: {
      whatThisDoesntMean: ['I\'m NOT here to replace anyone', 'Your jobs are NOT at risk'],
      whatThisMeans: ['Less repetitive questions', 'More time for complex cases'],
      howToHelpMe: 'Share feedback when you see me making mistakes.',
      feedbackChannel: 'Submit via the team dashboard.',
    },
    quickFacts: {
      name: 'Ben',
      role: 'Customer Service Assistant',
      startDate: 'Coming soon',
      workingHours: '24/7 - I never sleep!',
      languages: ['English'],
      superpower: 'Finding the right answer in seconds',
      favoriteTask: 'Helping customers get quick answers',
    },
    ...overrides,
  }
}

describe('meet-your-de', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateMeetYourDEContent', () => {
    it('generates content from LLM response', async () => {
      const mockContent = createContent()

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockContent) }],
      } as never)

      const ctx = createContext()
      const result = await generateMeetYourDEContent(ctx)

      expect(result.introduction.greeting).toBe('Hi, I\'m Ben!')
      expect(result.quickFacts.name).toBe('Ben')
      expect(result.howIWork.myStrengths).toHaveLength(3)
      expect(mockMessagesCreate).toHaveBeenCalledOnce()
    })

    it('returns fallback content when LLM fails', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('API error'))

      const ctx = createContext()
      const result = await generateMeetYourDEContent(ctx)

      // Should return fallback content with DE name and company
      expect(result.introduction.greeting).toContain('Ben')
      expect(result.introduction.personalIntro).toContain('Acme Insurance')
      expect(result.quickFacts.name).toBe('Ben')
      expect(result.personality.tone).toBe('Friendly and professional')
    })

    it('returns fallback content when response has no text', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'image', source: 'data' }],
      } as never)

      const ctx = createContext()
      const result = await generateMeetYourDEContent(ctx)

      // Should return fallback since no text content found
      expect(result.introduction.greeting).toContain('Ben')
      expect(result.quickFacts.name).toBe('Ben')
    })

    it('returns fallback content when JSON parsing fails', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'This is not valid JSON at all' }],
      } as never)

      const ctx = createContext()
      const result = await generateMeetYourDEContent(ctx)

      // Should return fallback
      expect(result.introduction.greeting).toContain('Ben')
    })

    it('passes correct model and parameters to Anthropic', async () => {
      const mockContent = createContent()
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockContent) }],
      } as never)

      const ctx = createContext()
      await generateMeetYourDEContent(ctx)

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4000,
          temperature: 0.5,
        })
      )
    })

    it('includes language instruction for non-English languages', async () => {
      const mockContent = createContent()
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockContent) }],
      } as never)

      const ctx = createContext({ language: 'nl' })
      await generateMeetYourDEContent(ctx)

      const calledPrompt = mockMessagesCreate.mock.calls[0][0].messages[0].content
      expect(calledPrompt).toContain('Nederlands')
      expect(calledPrompt).toContain('CRITICAL')
    })

    it('does not include language instruction for English', async () => {
      const mockContent = createContent()
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockContent) }],
      } as never)

      const ctx = createContext({ language: 'en' })
      await generateMeetYourDEContent(ctx)

      const calledPrompt = mockMessagesCreate.mock.calls[0][0].messages[0].content
      expect(calledPrompt).not.toContain('CRITICAL: Write ALL content')
    })

    it('includes scope items in the prompt', async () => {
      const mockContent = createContent()
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockContent) }],
      } as never)

      const ctx = createContext()
      await generateMeetYourDEContent(ctx)

      const calledPrompt = mockMessagesCreate.mock.calls[0][0].messages[0].content
      expect(calledPrompt).toContain('Handle simple claims')
      expect(calledPrompt).toContain('Complex litigation')
    })

    it('handles context with empty arrays', async () => {
      const mockContent = createContent()
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockContent) }],
      } as never)

      const ctx = createContext({
        channels: [],
        scopeItems: [],
        guardrails: [],
      })
      await generateMeetYourDEContent(ctx)

      const calledPrompt = mockMessagesCreate.mock.calls[0][0].messages[0].content
      // When empty, fallbacks are used
      expect(calledPrompt).toContain('General customer inquiries')
      expect(calledPrompt).toContain('Complex escalations')
      expect(calledPrompt).toContain('Always be helpful and honest')
    })

    it('handles JSON wrapped in markdown code blocks', async () => {
      const mockContent = createContent()
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Here is the JSON:\n```json\n' + JSON.stringify(mockContent) + '\n```' }],
      } as never)

      const ctx = createContext()
      const result = await generateMeetYourDEContent(ctx)

      expect(result.introduction.greeting).toBe("Hi, I'm Ben!")
    })
  })

  describe('MeetYourDEPDF', () => {
    it('renders without errors with full content', () => {
      const content = createContent()
      const result = MeetYourDEPDF({ content, companyName: 'Acme Insurance' })
      expect(result).toBeDefined()
    })

    it('renders without avatar when not provided', () => {
      const content = createContent()
      expect(content.avatarBase64).toBeUndefined()
      const result = MeetYourDEPDF({ content, companyName: 'Acme' })
      expect(result).toBeDefined()
    })

    it('renders with avatar when provided', () => {
      const content = createContent({ avatarBase64: 'iVBORw0KGgoAAAA...' })
      const result = MeetYourDEPDF({ content, companyName: 'Acme' })
      expect(result).toBeDefined()
    })

    it('renders all personality quirks', () => {
      const content = createContent({
        personality: {
          communicationStyle: 'Friendly',
          tone: 'Warm',
          quirks: ['Quirk 1', 'Quirk 2', 'Quirk 3'],
          whatMakesMe: 'Speed',
        },
      })
      expect(content.personality.quirks).toHaveLength(3)
      const result = MeetYourDEPDF({ content, companyName: 'Acme' })
      expect(result).toBeDefined()
    })

    it('renders strengths and needs-help lists', () => {
      const content = createContent()
      expect(content.howIWork.myStrengths).toHaveLength(3)
      expect(content.howIWork.whereINeedHelp).toHaveLength(3)
      const result = MeetYourDEPDF({ content, companyName: 'Acme' })
      expect(result).toBeDefined()
    })

    it('renders customer greeting and escalation message', () => {
      const content = createContent()
      expect(content.workingTogether.customerGreeting).toContain('Ben')
      expect(content.workingTogether.escalationMessage).toContain('human colleague')
      const result = MeetYourDEPDF({ content, companyName: 'Acme' })
      expect(result).toBeDefined()
    })

    it('renders "what this means" and "what this does not mean" sections', () => {
      const content = createContent()
      expect(content.forTheTeam.whatThisDoesntMean).toHaveLength(2)
      expect(content.forTheTeam.whatThisMeans).toHaveLength(2)
      const result = MeetYourDEPDF({ content, companyName: 'Acme' })
      expect(result).toBeDefined()
    })

    it('renders quick facts card', () => {
      const content = createContent()
      expect(content.quickFacts.workingHours).toBe('24/7 - I never sleep!')
      expect(content.quickFacts.superpower).toBe('Finding the right answer in seconds')
      const result = MeetYourDEPDF({ content, companyName: 'Acme' })
      expect(result).toBeDefined()
    })

    it('renders footer with company name and feedback channel', () => {
      const content = createContent()
      expect(content.forTheTeam.feedbackChannel).toBe('Submit via the team dashboard.')
      const result = MeetYourDEPDF({ content, companyName: 'Acme Insurance' })
      expect(result).toBeDefined()
    })
  })

  describe('fallback content generation', () => {
    it('generates correct fallback for different DE names', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('API error'))

      const ctx1 = createContext({ digitalEmployeeName: 'Emma' })
      const result1 = await generateMeetYourDEContent(ctx1)
      expect(result1.introduction.greeting).toContain('Emma')
      expect(result1.quickFacts.name).toBe('Emma')
      expect(result1.workingTogether.customerGreeting).toContain('Emma')

      const ctx2 = createContext({ digitalEmployeeName: 'Max', companyName: 'TechCo' })
      const result2 = await generateMeetYourDEContent(ctx2)
      expect(result2.introduction.greeting).toContain('Max')
      expect(result2.introduction.personalIntro).toContain('TechCo')
      expect(result2.workingTogether.customerGreeting).toContain('Max')
      expect(result2.workingTogether.customerGreeting).toContain('TechCo')
    })

    it('fallback content has all required fields', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('API error'))

      const ctx = createContext()
      const result = await generateMeetYourDEContent(ctx)

      // Check all top-level sections exist
      expect(result.introduction).toBeDefined()
      expect(result.personality).toBeDefined()
      expect(result.howIWork).toBeDefined()
      expect(result.workingTogether).toBeDefined()
      expect(result.forTheTeam).toBeDefined()
      expect(result.quickFacts).toBeDefined()

      // Check arrays are non-empty
      expect(result.personality.quirks.length).toBeGreaterThan(0)
      expect(result.howIWork.myStrengths.length).toBeGreaterThan(0)
      expect(result.howIWork.whereINeedHelp.length).toBeGreaterThan(0)
      expect(result.forTheTeam.whatThisDoesntMean.length).toBeGreaterThan(0)
      expect(result.forTheTeam.whatThisMeans.length).toBeGreaterThan(0)
      expect(result.quickFacts.languages.length).toBeGreaterThan(0)
    })
  })
})
