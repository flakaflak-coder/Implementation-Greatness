import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the ai-client module
vi.mock('./ai-client', () => ({
  generateWithFallback: vi.fn(),
  parseJSONFromResponse: vi.fn(),
}))

// Mock classify module for checklist
vi.mock('./classify', () => ({
  getChecklistForType: vi.fn(),
}))

import { extractSpecializedEntities, mapToExtractedItemType } from './extract-specialized'
import { generateWithFallback, parseJSONFromResponse } from './ai-client'
import { getChecklistForType } from './classify'
import type { GeneralExtractionResult } from './types'

describe('extract-specialized module', () => {
  const mockGeneralExtraction: GeneralExtractionResult = {
    entities: [
      {
        id: 'e1',
        category: 'BUSINESS',
        type: 'GOAL',
        content: 'Reduce processing time',
        confidence: 0.9,
      },
      {
        id: 'e2',
        category: 'BUSINESS',
        type: 'STAKEHOLDER',
        content: 'Sarah Jones, PM',
        confidence: 0.85,
      },
    ],
    summary: {
      totalEntities: 2,
      byCategory: { BUSINESS: 2 },
      processingTime: 150,
      tokensUsed: { input: 100, output: 50 },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('extractSpecializedEntities', () => {
    it('extracts specialized items for kickoff session', async () => {
      vi.mocked(getChecklistForType).mockReturnValue([
        'What problem are we solving?',
        'Who are the key stakeholders?',
      ])

      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        extractedItems: [
          { type: 'GOAL', content: 'Reduce processing time', confidence: 0.9 },
          { type: 'STAKEHOLDER', content: 'Sarah Jones, PM', confidence: 0.85 },
        ],
        checklist: {
          questionsAsked: ['What problem are we solving?'],
          questionsMissing: ['Who are the key stakeholders?'],
          coverageScore: 0.5,
        },
      })

      const result = await extractSpecializedEntities(
        mockGeneralExtraction,
        'KICKOFF_SESSION'
      )

      expect(result.extractedItems).toHaveLength(2)
      expect(result.extractedItems[0].type).toBe('GOAL')
      expect(result.checklist.coverageScore).toBe(0.5)
      expect(result.checklist.questionsAsked).toContain('What problem are we solving?')
    })

    it('uses correct specialized prompt for content type', async () => {
      vi.mocked(getChecklistForType).mockReturnValue(['Check 1'])
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        extractedItems: [],
        checklist: { questionsAsked: [], questionsMissing: [], coverageScore: 0 },
      })

      await extractSpecializedEntities(mockGeneralExtraction, 'TECHNICAL_SESSION')

      const callArgs = vi.mocked(generateWithFallback).mock.calls[0][0]
      expect(callArgs.prompt).toContain('TECHNICAL session')
      expect(callArgs.prompt).toContain('Integration Completeness')
    })

    it('sends entities from general extraction in prompt', async () => {
      vi.mocked(getChecklistForType).mockReturnValue(['Check 1'])
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        extractedItems: [],
        checklist: { questionsAsked: [], questionsMissing: [], coverageScore: 0 },
      })

      await extractSpecializedEntities(mockGeneralExtraction, 'KICKOFF_SESSION')

      const callArgs = vi.mocked(generateWithFallback).mock.calls[0][0]
      expect(callArgs.prompt).toContain('Reduce processing time')
      expect(callArgs.prompt).toContain('Sarah Jones')
    })

    it('does not send file buffer (uses extracted entities only)', async () => {
      vi.mocked(getChecklistForType).mockReturnValue(['Check 1'])
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        extractedItems: [],
        checklist: { questionsAsked: [], questionsMissing: [], coverageScore: 0 },
      })

      await extractSpecializedEntities(mockGeneralExtraction, 'KICKOFF_SESSION')

      const callArgs = vi.mocked(generateWithFallback).mock.calls[0][0]
      expect(callArgs.fileBuffer).toBeUndefined()
    })

    it('uses higher maxTokens (32768)', async () => {
      vi.mocked(getChecklistForType).mockReturnValue(['Check 1'])
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        extractedItems: [],
        checklist: { questionsAsked: [], questionsMissing: [], coverageScore: 0 },
      })

      await extractSpecializedEntities(mockGeneralExtraction, 'KICKOFF_SESSION')

      expect(generateWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 32768,
        })
      )
    })

    it('returns extracted items with checklist from AI response', async () => {
      vi.mocked(getChecklistForType).mockReturnValue([
        'Q1',
        'Q2',
        'Q3',
      ])

      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        extractedItems: [
          { type: 'GOAL', content: 'Test', confidence: 0.9 },
        ],
        checklist: {
          questionsAsked: ['Q1'],
          questionsMissing: ['Q2', 'Q3'],
          coverageScore: 0.33,
        },
      })

      const result = await extractSpecializedEntities(
        mockGeneralExtraction,
        'KICKOFF_SESSION'
      )

      expect(result.extractedItems).toHaveLength(1)
      expect(result.checklist.questionsAsked).toEqual(['Q1'])
      expect(result.checklist.questionsMissing).toEqual(['Q2', 'Q3'])
      expect(result.checklist.coverageScore).toBe(0.33)
    })

    it('handles empty extractedItems array', async () => {
      vi.mocked(getChecklistForType).mockReturnValue(['Check 1'])
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })

      vi.mocked(parseJSONFromResponse).mockReturnValue({
        extractedItems: [],
        checklist: {
          questionsAsked: [],
          questionsMissing: ['Check 1'],
          coverageScore: 0,
        },
      })

      const result = await extractSpecializedEntities(
        mockGeneralExtraction,
        'KICKOFF_SESSION'
      )

      expect(result.extractedItems).toEqual([])
      expect(result.checklist.coverageScore).toBe(0)
    })

    it('logs warning when response is truncated', async () => {
      vi.mocked(getChecklistForType).mockReturnValue(['Check 1'])
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
        truncated: true,
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        extractedItems: [],
        checklist: { questionsAsked: [], questionsMissing: [], coverageScore: 0 },
      })

      await extractSpecializedEntities(mockGeneralExtraction, 'KICKOFF_SESSION')

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('truncated')
      )
    })

    it('throws PipelineError on AI failure', async () => {
      vi.mocked(getChecklistForType).mockReturnValue(['Check 1'])
      vi.mocked(generateWithFallback).mockRejectedValue(
        new Error('Service unavailable')
      )

      await expect(
        extractSpecializedEntities(mockGeneralExtraction, 'KICKOFF_SESSION')
      ).rejects.toThrow('Specialized extraction failed: Service unavailable')
    })

    it('re-throws PipelineError without wrapping', async () => {
      const { PipelineError } = await import('./types')
      vi.mocked(getChecklistForType).mockReturnValue(['Check 1'])
      vi.mocked(generateWithFallback).mockRejectedValue(
        new PipelineError('Pipeline specific error', 'SPECIALIZED_EXTRACTION', false)
      )

      await expect(
        extractSpecializedEntities(mockGeneralExtraction, 'KICKOFF_SESSION')
      ).rejects.toThrow('Pipeline specific error')
    })

    it('handles non-Error thrown values', async () => {
      vi.mocked(getChecklistForType).mockReturnValue(['Check 1'])
      vi.mocked(generateWithFallback).mockRejectedValue(42)

      await expect(
        extractSpecializedEntities(mockGeneralExtraction, 'KICKOFF_SESSION')
      ).rejects.toThrow('Specialized extraction failed: Unknown extraction error')
    })

    it('includes checklist in prompt', async () => {
      vi.mocked(getChecklistForType).mockReturnValue([
        'What problem are we solving?',
        'Who are the key stakeholders?',
        'What does success look like?',
      ])
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        extractedItems: [],
        checklist: { questionsAsked: [], questionsMissing: [], coverageScore: 0 },
      })

      await extractSpecializedEntities(mockGeneralExtraction, 'KICKOFF_SESSION')

      const callArgs = vi.mocked(generateWithFallback).mock.calls[0][0]
      expect(callArgs.prompt).toContain('1. What problem are we solving?')
      expect(callArgs.prompt).toContain('2. Who are the key stakeholders?')
      expect(callArgs.prompt).toContain('3. What does success look like?')
    })

    it('works with all content types', async () => {
      vi.mocked(getChecklistForType).mockReturnValue(['Check 1'])
      vi.mocked(generateWithFallback).mockResolvedValue({
        provider: 'claude',
        text: '{}',
      })
      vi.mocked(parseJSONFromResponse).mockReturnValue({
        extractedItems: [],
        checklist: { questionsAsked: [], questionsMissing: [], coverageScore: 0 },
      })

      const contentTypes = [
        'KICKOFF_SESSION',
        'PROCESS_DESIGN_SESSION',
        'SKILLS_GUARDRAILS_SESSION',
        'TECHNICAL_SESSION',
        'SIGNOFF_SESSION',
        'REQUIREMENTS_DOCUMENT',
        'TECHNICAL_SPEC',
        'PROCESS_DOCUMENT',
        'UNKNOWN',
      ] as const

      for (const contentType of contentTypes) {
        vi.clearAllMocks()
        await extractSpecializedEntities(mockGeneralExtraction, contentType)
        expect(generateWithFallback).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('mapToExtractedItemType', () => {
    it('maps exact type names correctly', () => {
      expect(mapToExtractedItemType('GOAL')).toBe('GOAL')
      expect(mapToExtractedItemType('STAKEHOLDER')).toBe('STAKEHOLDER')
      expect(mapToExtractedItemType('KPI_TARGET')).toBe('KPI_TARGET')
      expect(mapToExtractedItemType('HAPPY_PATH_STEP')).toBe('HAPPY_PATH_STEP')
      expect(mapToExtractedItemType('SYSTEM_INTEGRATION')).toBe('SYSTEM_INTEGRATION')
    })

    it('maps business type aliases', () => {
      expect(mapToExtractedItemType('OBJECTIVE')).toBe('GOAL')
      expect(mapToExtractedItemType('TARGET')).toBe('GOAL')
      expect(mapToExtractedItemType('PROBLEM')).toBe('BUSINESS_CASE')
      expect(mapToExtractedItemType('BUSINESS_CONTEXT')).toBe('BUSINESS_CASE')
      expect(mapToExtractedItemType('KPI')).toBe('KPI_TARGET')
      expect(mapToExtractedItemType('SUCCESS_METRIC')).toBe('KPI_TARGET')
      expect(mapToExtractedItemType('VOLUME')).toBe('VOLUME_EXPECTATION')
      expect(mapToExtractedItemType('COST')).toBe('COST_PER_CASE')
    })

    it('maps process type aliases', () => {
      expect(mapToExtractedItemType('PROCESS_STEP')).toBe('HAPPY_PATH_STEP')
      expect(mapToExtractedItemType('WORKFLOW_STEP')).toBe('HAPPY_PATH_STEP')
      expect(mapToExtractedItemType('STEP')).toBe('HAPPY_PATH_STEP')
      expect(mapToExtractedItemType('EXCEPTION')).toBe('EXCEPTION_CASE')
      expect(mapToExtractedItemType('ERROR_CASE')).toBe('EXCEPTION_CASE')
      expect(mapToExtractedItemType('ESCALATION')).toBe('ESCALATION_TRIGGER')
      expect(mapToExtractedItemType('ESCALATION_RULE')).toBe('ESCALATION_TRIGGER')
    })

    it('maps scope type aliases', () => {
      expect(mapToExtractedItemType('IN_SCOPE')).toBe('SCOPE_IN')
      expect(mapToExtractedItemType('SCOPE_IN')).toBe('SCOPE_IN')
      expect(mapToExtractedItemType('OUT_OF_SCOPE')).toBe('SCOPE_OUT')
      expect(mapToExtractedItemType('SCOPE_OUT')).toBe('SCOPE_OUT')
      expect(mapToExtractedItemType('EXCLUDED')).toBe('SCOPE_OUT')
    })

    it('maps channel type aliases', () => {
      expect(mapToExtractedItemType('INPUT_CHANNEL')).toBe('CHANNEL')
      expect(mapToExtractedItemType('OUTPUT_CHANNEL')).toBe('CHANNEL')
      expect(mapToExtractedItemType('COMMUNICATION_CHANNEL')).toBe('CHANNEL')
      expect(mapToExtractedItemType('SLA')).toBe('CHANNEL_SLA')
      expect(mapToExtractedItemType('RESPONSE_TIME')).toBe('CHANNEL_SLA')
    })

    it('maps skill type aliases', () => {
      expect(mapToExtractedItemType('SKILL')).toBe('SKILL_OTHER')
      expect(mapToExtractedItemType('CAPABILITY')).toBe('SKILL_OTHER')
      expect(mapToExtractedItemType('ANSWER')).toBe('SKILL_ANSWER')
      expect(mapToExtractedItemType('ROUTING')).toBe('SKILL_ROUTE')
      expect(mapToExtractedItemType('NOTIFICATION')).toBe('SKILL_NOTIFY')
      expect(mapToExtractedItemType('KNOWLEDGE')).toBe('KNOWLEDGE_SOURCE')
      expect(mapToExtractedItemType('TEMPLATE')).toBe('RESPONSE_TEMPLATE')
    })

    it('maps guardrail type aliases', () => {
      expect(mapToExtractedItemType('NEVER')).toBe('GUARDRAIL_NEVER')
      expect(mapToExtractedItemType('PROHIBITED')).toBe('GUARDRAIL_NEVER')
      expect(mapToExtractedItemType('ALWAYS')).toBe('GUARDRAIL_ALWAYS')
      expect(mapToExtractedItemType('MANDATORY')).toBe('GUARDRAIL_ALWAYS')
      expect(mapToExtractedItemType('LIMIT')).toBe('FINANCIAL_LIMIT')
      expect(mapToExtractedItemType('LEGAL')).toBe('LEGAL_RESTRICTION')
      expect(mapToExtractedItemType('COMPLIANCE')).toBe('COMPLIANCE_REQUIREMENT')
    })

    it('maps integration type aliases', () => {
      expect(mapToExtractedItemType('INTEGRATION')).toBe('SYSTEM_INTEGRATION')
      expect(mapToExtractedItemType('SYSTEM')).toBe('SYSTEM_INTEGRATION')
      expect(mapToExtractedItemType('FIELD')).toBe('DATA_FIELD')
      expect(mapToExtractedItemType('API')).toBe('API_ENDPOINT')
      expect(mapToExtractedItemType('ENDPOINT')).toBe('API_ENDPOINT')
      expect(mapToExtractedItemType('SECURITY')).toBe('SECURITY_REQUIREMENT')
      expect(mapToExtractedItemType('AUTH_REQUIREMENT')).toBe('SECURITY_REQUIREMENT')
    })

    it('maps sign-off type aliases', () => {
      expect(mapToExtractedItemType('TODO')).toBe('OPEN_ITEM')
      expect(mapToExtractedItemType('ACTION_ITEM')).toBe('OPEN_ITEM')
      expect(mapToExtractedItemType('PENDING')).toBe('OPEN_ITEM')
      expect(mapToExtractedItemType('DECISION_POINT')).toBe('DECISION')
      expect(mapToExtractedItemType('SIGN_OFF')).toBe('APPROVAL')
      expect(mapToExtractedItemType('CONCERN')).toBe('RISK')
      expect(mapToExtractedItemType('ISSUE')).toBe('RISK')
    })

    it('maps persona and conversational design types', () => {
      expect(mapToExtractedItemType('PERSONA_TRAIT')).toBe('PERSONA_TRAIT')
      expect(mapToExtractedItemType('PERSONALITY')).toBe('PERSONA_TRAIT')
      expect(mapToExtractedItemType('TRAIT')).toBe('PERSONA_TRAIT')
      expect(mapToExtractedItemType('TONE_RULE')).toBe('TONE_RULE')
      expect(mapToExtractedItemType('TONE_OF_VOICE')).toBe('TONE_RULE')
      expect(mapToExtractedItemType('DOS_AND_DONTS')).toBe('DOS_AND_DONTS')
      expect(mapToExtractedItemType('EXAMPLE_DIALOGUE')).toBe('EXAMPLE_DIALOGUE')
      expect(mapToExtractedItemType('DIALOGUE')).toBe('EXAMPLE_DIALOGUE')
      expect(mapToExtractedItemType('ESCALATION_SCRIPT')).toBe('ESCALATION_SCRIPT')
      expect(mapToExtractedItemType('HANDOVER_SCRIPT')).toBe('ESCALATION_SCRIPT')
    })

    it('maps monitoring and launch types', () => {
      expect(mapToExtractedItemType('MONITORING_METRIC')).toBe('MONITORING_METRIC')
      expect(mapToExtractedItemType('MONITORING_KPI')).toBe('MONITORING_METRIC')
      expect(mapToExtractedItemType('DASHBOARD_METRIC')).toBe('MONITORING_METRIC')
      expect(mapToExtractedItemType('LAUNCH_CRITERION')).toBe('LAUNCH_CRITERION')
      expect(mapToExtractedItemType('GO_NO_GO')).toBe('LAUNCH_CRITERION')
      expect(mapToExtractedItemType('SOFT_LAUNCH')).toBe('LAUNCH_CRITERION')
      expect(mapToExtractedItemType('DECISION_TREE')).toBe('DECISION_TREE')
      expect(mapToExtractedItemType('ROUTING_RULE')).toBe('DECISION_TREE')
    })

    it('maps sales handover types', () => {
      expect(mapToExtractedItemType('DEAL_SUMMARY')).toBe('DEAL_SUMMARY')
      expect(mapToExtractedItemType('CONTRACT_DEADLINE')).toBe('CONTRACT_DEADLINE')
      expect(mapToExtractedItemType('SALES_WATCH_OUT')).toBe('SALES_WATCH_OUT')
      expect(mapToExtractedItemType('PROMISED_CAPABILITY')).toBe('PROMISED_CAPABILITY')
      expect(mapToExtractedItemType('CLIENT_PREFERENCE')).toBe('CLIENT_PREFERENCE')
    })

    it('returns original type and warns for unknown types', () => {
      const result = mapToExtractedItemType('COMPLETELY_UNKNOWN_TYPE')
      expect(result).toBe('COMPLETELY_UNKNOWN_TYPE')
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown entity type: COMPLETELY_UNKNOWN_TYPE')
      )
    })

    it('maps requirement aliases to BUSINESS_CASE', () => {
      expect(mapToExtractedItemType('REQUIREMENT')).toBe('BUSINESS_CASE')
      expect(mapToExtractedItemType('FUNCTIONAL_REQUIREMENT')).toBe('BUSINESS_CASE')
      expect(mapToExtractedItemType('NON_FUNCTIONAL_REQUIREMENT')).toBe('BUSINESS_CASE')
      expect(mapToExtractedItemType('ACCEPTANCE_CRITERIA')).toBe('BUSINESS_CASE')
    })

    it('maps communication type aliases', () => {
      expect(mapToExtractedItemType('TONE')).toBe('BRAND_TONE')
      expect(mapToExtractedItemType('LANGUAGE')).toBe('COMMUNICATION_STYLE')
      expect(mapToExtractedItemType('FORMALITY')).toBe('COMMUNICATION_STYLE')
    })

    it('maps stakeholder aliases', () => {
      expect(mapToExtractedItemType('ROLE')).toBe('STAKEHOLDER')
      expect(mapToExtractedItemType('PERSON')).toBe('STAKEHOLDER')
      expect(mapToExtractedItemType('CONTACT')).toBe('STAKEHOLDER')
    })

    it('maps timeline aliases', () => {
      expect(mapToExtractedItemType('TIMELINE')).toBe('TIMELINE_CONSTRAINT')
      expect(mapToExtractedItemType('DEADLINE')).toBe('TIMELINE_CONSTRAINT')
    })
  })
})
