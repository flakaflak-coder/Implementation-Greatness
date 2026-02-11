import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK
const mockMessagesCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockMessagesCreate,
      }
    },
  }
})

import {
  runClassificationJudge,
  runHallucinationJudge,
  runCoverageJudge,
  runConsistencyJudge,
  runConfidenceCalibrationJudge,
  runDocumentAlignmentJudge,
  runAvatarQualityJudge,
  runPromptRegressionJudge,
  validateSchema,
  checkConfidenceGate,
} from './judges'
import { DEFAULT_THRESHOLDS } from './types'

describe('judges module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateSchema', () => {
    it('validates correct entities', () => {
      const result = validateSchema([
        { id: '1', category: 'BUSINESS', type: 'GOAL', content: 'Test' },
        { id: '2', category: 'PROCESS', type: 'STEP', content: 'Step 1' },
      ])

      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('detects entity missing id', () => {
      const result = validateSchema([
        { id: '', category: 'BUSINESS', type: 'GOAL', content: 'Test' },
      ])

      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Entity missing id')
    })

    it('detects entity missing category', () => {
      const result = validateSchema([
        { id: '1', category: '', type: 'GOAL', content: 'Test' },
      ])

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual(expect.stringContaining('missing category'))
    })

    it('detects entity missing type', () => {
      const result = validateSchema([
        { id: '1', category: 'BUSINESS', type: '', content: 'Test' },
      ])

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual(expect.stringContaining('missing type'))
    })

    it('detects entity missing content', () => {
      const result = validateSchema([
        { id: '1', category: 'BUSINESS', type: 'GOAL', content: '' },
      ])

      expect(result.valid).toBe(false)
      expect(result.issues).toContainEqual(expect.stringContaining('missing content'))
    })

    it('detects multiple issues across entities', () => {
      const result = validateSchema([
        { id: '', category: 'BUSINESS', type: 'GOAL', content: 'Test' },
        { id: '2', category: '', type: '', content: '' },
      ])

      expect(result.valid).toBe(false)
      expect(result.issues.length).toBeGreaterThanOrEqual(4)
    })

    it('validates empty entities array', () => {
      const result = validateSchema([])
      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })
  })

  describe('checkConfidenceGate', () => {
    it('passes with high confidence (>= 0.9)', () => {
      const result = checkConfidenceGate(0.95)
      expect(result.passed).toBe(true)
      expect(result.recommendation).toContain('auto-approve')
    })

    it('passes with 0.9 exactly', () => {
      const result = checkConfidenceGate(0.9)
      expect(result.passed).toBe(true)
      expect(result.recommendation).toContain('auto-approve')
    })

    it('passes with acceptable confidence (>= threshold, < 0.9)', () => {
      const result = checkConfidenceGate(0.75)
      expect(result.passed).toBe(true)
      expect(result.recommendation).toContain('Acceptable')
    })

    it('fails with low confidence (>= 0.5, < threshold)', () => {
      const result = checkConfidenceGate(0.6)
      expect(result.passed).toBe(false)
      expect(result.recommendation).toContain('review')
    })

    it('fails with very low confidence (< 0.5)', () => {
      const result = checkConfidenceGate(0.3)
      expect(result.passed).toBe(false)
      expect(result.recommendation).toContain('misclassified')
    })

    it('respects custom threshold', () => {
      const result = checkConfidenceGate(0.55, 0.5)
      expect(result.passed).toBe(true)
      expect(result.recommendation).toContain('Acceptable')
    })

    it('handles edge case at exactly 0.5', () => {
      const result = checkConfidenceGate(0.5)
      expect(result.passed).toBe(false)
      expect(result.recommendation).toContain('review')
    })

    it('handles edge case at exactly 0.7 (default threshold)', () => {
      const result = checkConfidenceGate(0.7)
      expect(result.passed).toBe(true)
    })

    it('handles zero confidence', () => {
      const result = checkConfidenceGate(0)
      expect(result.passed).toBe(false)
      expect(result.recommendation).toContain('misclassified')
    })
  })

  describe('runClassificationJudge', () => {
    const classInput = {
      contentExcerpt: 'Welcome to the kickoff meeting. We will discuss goals.',
      classificationType: 'KICKOFF_SESSION',
      confidence: 0.92,
      keyIndicators: ['kickoff', 'goals'],
    }

    it('returns pass verdict for correct classification', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          classification_correct: true,
          correct_type: null,
          indicators_verified: true,
          confidence_appropriate: true,
          issues: [],
          score: 0.95,
        })}],
      })

      const result = await runClassificationJudge(classInput)

      expect(result.judge).toBe('classification')
      expect(result.verdict).toBe('pass')
      expect(result.score).toBe(0.95)
      expect(result.details.classificationCorrect).toBe(true)
      expect(result.details.indicatorsVerified).toBe(true)
    })

    it('returns fail verdict for incorrect classification', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          classification_correct: false,
          correct_type: 'TECHNICAL_SESSION',
          indicators_verified: false,
          confidence_appropriate: false,
          issues: ['Content discusses APIs, not business goals'],
          score: 0.2,
        })}],
      })

      const result = await runClassificationJudge(classInput)

      expect(result.verdict).toBe('fail')
      expect(result.details.correctType).toBe('TECHNICAL_SESSION')
      expect(result.issues).toContain('Content discusses APIs, not business goals')
    })

    it('returns review verdict on API error', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('API timeout'))

      const result = await runClassificationJudge(classInput)

      expect(result.verdict).toBe('review')
      expect(result.score).toBe(0)
      expect(result.issues).toContainEqual(
        expect.stringContaining('API timeout')
      )
    })

    it('returns review when judge response has no JSON', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'I cannot provide a valid analysis' }],
      })

      const result = await runClassificationJudge(classInput)

      expect(result.verdict).toBe('review')
    })
  })

  describe('runHallucinationJudge', () => {
    const extractionInput = {
      sourceContent: 'Sarah is the project manager. We want to reduce costs by 30%.',
      contentType: 'KICKOFF_SESSION',
      entities: [
        { id: '1', category: 'BUSINESS', type: 'STAKEHOLDER', content: 'Sarah, Project Manager' },
        { id: '2', category: 'BUSINESS', type: 'GOAL', content: 'Reduce costs by 30%' },
      ],
      summary: { totalEntities: 2, byCategory: { BUSINESS: 2 } },
    }

    it('passes when no hallucinations detected', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          entities: [
            { id: '1', found_in_source: true, quote_accurate: true, speaker_correct: true },
            { id: '2', found_in_source: true, quote_accurate: true, speaker_correct: true },
          ],
          hallucination_count: 0,
          score: 1.0,
        })}],
      })

      const result = await runHallucinationJudge(extractionInput)

      expect(result.judge).toBe('hallucination')
      expect(result.verdict).toBe('pass')
      expect(result.details.hallucinatedCount).toBe(0)
    })

    it('returns review for single hallucination', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          entities: [
            { id: '1', found_in_source: true, quote_accurate: true, speaker_correct: true },
            { id: '2', found_in_source: false, quote_accurate: false, speaker_correct: false, issue: 'Not found in source' },
          ],
          hallucination_count: 1,
          score: 0.5,
        })}],
      })

      const result = await runHallucinationJudge(extractionInput)

      expect(result.verdict).toBe('review')
      expect(result.issues).toContain('Not found in source')
    })

    it('returns fail for multiple hallucinations', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          entities: [
            { id: '1', found_in_source: false, issue: 'Fabricated' },
            { id: '2', found_in_source: false, issue: 'Fabricated too' },
          ],
          hallucination_count: 2,
          score: 0.0,
        })}],
      })

      const result = await runHallucinationJudge(extractionInput)

      expect(result.verdict).toBe('fail')
      expect(result.details.hallucinatedCount).toBe(2)
    })

    it('respects sample size parameter', async () => {
      const manyEntities = {
        ...extractionInput,
        entities: Array.from({ length: 20 }, (_, i) => ({
          id: `e${i}`,
          category: 'BUSINESS',
          type: 'GOAL',
          content: `Entity ${i}`,
        })),
      }

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          entities: [],
          hallucination_count: 0,
          score: 1.0,
        })}],
      })

      await runHallucinationJudge(manyEntities, 3)

      // The prompt should reference the sample size
      const callArgs = mockMessagesCreate.mock.calls[0][0]
      expect(callArgs.messages[0].content).toContain('sample of 3')
    })

    it('returns review on API error', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('Service down'))

      const result = await runHallucinationJudge(extractionInput)

      expect(result.verdict).toBe('review')
      expect(result.score).toBe(0)
      expect(result.details.entitiesChecked).toBe(0)
    })
  })

  describe('runCoverageJudge', () => {
    const extractionInput = {
      sourceContent: 'Sarah is PM. Goal: reduce costs. KPI: 85% automation.',
      contentType: 'KICKOFF_SESSION',
      entities: [
        { id: '1', category: 'BUSINESS', type: 'STAKEHOLDER', content: 'Sarah, PM' },
        { id: '2', category: 'BUSINESS', type: 'GOAL', content: 'Reduce costs' },
      ],
      summary: { totalEntities: 2, byCategory: { BUSINESS: 2 } },
    }

    it('passes with good coverage', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          missed_entities: [],
          coverage_score: 0.9,
        })}],
      })

      const result = await runCoverageJudge(extractionInput)

      expect(result.judge).toBe('coverage')
      expect(result.verdict).toBe('pass')
      expect(result.details.coverageScore).toBe(0.9)
    })

    it('returns review for moderate coverage', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          missed_entities: [
            { content: 'KPI target', category: 'KPI', quote: '85% automation' },
          ],
          coverage_score: 0.65,
        })}],
      })

      const result = await runCoverageJudge(extractionInput)

      expect(result.verdict).toBe('review')
      expect(result.issues).toContainEqual(
        expect.stringContaining('Missed KPI')
      )
    })

    it('returns fail for low coverage', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          missed_entities: [
            { content: 'Missing 1', category: 'CAT1', quote: 'q1' },
            { content: 'Missing 2', category: 'CAT2', quote: 'q2' },
          ],
          coverage_score: 0.3,
        })}],
      })

      const result = await runCoverageJudge(extractionInput)

      expect(result.verdict).toBe('fail')
      expect(result.details.missedEntities).toHaveLength(2)
    })

    it('uses custom thresholds', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          missed_entities: [],
          coverage_score: 0.6,
        })}],
      })

      const strictThresholds = { ...DEFAULT_THRESHOLDS, coverageScore: 0.9 }
      const result = await runCoverageJudge(extractionInput, strictThresholds)

      expect(result.verdict).not.toBe('pass')
    })

    it('returns review on API error', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('Timeout'))

      const result = await runCoverageJudge(extractionInput)

      expect(result.verdict).toBe('review')
      expect(result.details.coverageScore).toBe(0)
    })
  })

  describe('runConsistencyJudge', () => {
    const specInput = {
      stage2Summary: { totalEntities: 10, byCategory: { BUSINESS: 5, PROCESS: 5 } },
      stage3Items: [
        { type: 'GOAL', content: 'Test', confidence: 0.9 },
      ],
      checklist: {
        questionsAsked: ['Q1'],
        questionsMissing: ['Q2'],
        coverageScore: 0.5,
      },
    }

    it('passes with good stage alignment', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          stage_alignment: 0.9,
          orphaned_entities: [],
          inconsistencies: [],
        })}],
      })

      const result = await runConsistencyJudge(specInput)

      expect(result.judge).toBe('consistency')
      expect(result.verdict).toBe('pass')
      expect(result.details.stageAlignment).toBe(0.9)
    })

    it('returns review for moderate alignment', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          stage_alignment: 0.7,
          orphaned_entities: ['PROCESS'],
          inconsistencies: ['Some items lost'],
        })}],
      })

      const result = await runConsistencyJudge(specInput)

      expect(result.verdict).toBe('review')
      expect(result.details.orphanedEntities).toContain('PROCESS')
    })

    it('returns fail for poor alignment', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          stage_alignment: 0.4,
          orphaned_entities: ['BUSINESS', 'PROCESS'],
          inconsistencies: ['Major data loss', 'Mismatched categories'],
        })}],
      })

      const result = await runConsistencyJudge(specInput)

      expect(result.verdict).toBe('fail')
    })

    it('returns review on API error', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('Error'))

      const result = await runConsistencyJudge(specInput)

      expect(result.verdict).toBe('review')
      expect(result.details.stageAlignment).toBe(0)
    })
  })

  describe('runConfidenceCalibrationJudge', () => {
    const calibrationInput = {
      predictions: [
        { id: '1', predictedConfidence: 0.9, itemContent: 'Reduce costs by 30%', itemType: 'GOAL', sourceQuote: 'reduce costs by 30 percent' },
      ],
      sourceContent: 'Our goal is to reduce costs by 30 percent.',
      contentType: 'KICKOFF_SESSION',
    }

    it('passes with well-calibrated confidence', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          items: [
            { id: '1', claimed_confidence: 0.9, estimated_true_confidence: 0.88, is_actually_correct: true, calibration_error: 0.02, reasoning: 'Well calibrated' },
          ],
          avg_calibration_error: 0.02,
          overconfident_count: 0,
          underconfident_count: 0,
          calibration_score: 0.95,
        })}],
      })

      const result = await runConfidenceCalibrationJudge(calibrationInput)

      expect(result.judge).toBe('confidence-calibration')
      expect(result.verdict).toBe('pass')
      expect(result.details.calibrationScore).toBe(0.95)
    })

    it('returns review for moderate calibration error', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          items: [
            { id: '1', claimed_confidence: 0.9, estimated_true_confidence: 0.7, is_actually_correct: true, calibration_error: 0.2, reasoning: 'Overconfident' },
          ],
          avg_calibration_error: 0.2,
          overconfident_count: 1,
          underconfident_count: 0,
          calibration_score: 0.6,
        })}],
      })

      const result = await runConfidenceCalibrationJudge(calibrationInput)

      expect(result.verdict).toBe('review')
      expect(result.issues).toContainEqual(
        expect.stringContaining('overconfident')
      )
    })

    it('returns fail for high calibration error', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          items: [
            { id: '1', claimed_confidence: 0.95, estimated_true_confidence: 0.4, is_actually_correct: false, calibration_error: 0.55, reasoning: 'Fabricated' },
          ],
          avg_calibration_error: 0.55,
          overconfident_count: 1,
          underconfident_count: 0,
          calibration_score: 0.2,
        })}],
      })

      const result = await runConfidenceCalibrationJudge(calibrationInput)

      expect(result.verdict).toBe('fail')
    })

    it('returns review on API error', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('Timeout'))

      const result = await runConfidenceCalibrationJudge(calibrationInput)

      expect(result.verdict).toBe('review')
      expect(result.details.avgCalibrationError).toBe(1)
    })
  })

  describe('runDocumentAlignmentJudge', () => {
    const docInput = {
      extractedData: {
        stakeholders: [{ name: 'Sarah', role: 'PM' }],
        goals: ['Reduce costs'],
        kpis: [{ name: 'Cost', target: '< $10' }],
        processSteps: ['Step 1'],
        integrations: ['SAP'],
        scopeIn: ['Claims'],
        scopeOut: ['Payments'],
      },
      generatedContent: {
        executiveSummary: 'Led by Sarah (PM), goal is to reduce costs.',
        currentState: 'Process: Step 1',
        futureState: 'Automated process',
        processAnalysis: 'Step 1 analysis',
        scopeAnalysis: 'In: Claims. Out: Payments.',
        technicalFoundation: 'Integrates with SAP',
        riskAssessment: 'Low risk',
      },
      language: 'en',
    }

    it('passes when content aligns with extracted data', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          fabricated_claims: [],
          missed_data_points: [],
          section_scores: { executiveSummary: 0.95, currentState: 0.9 },
          overall_alignment_score: 0.92,
        })}],
      })

      const result = await runDocumentAlignmentJudge(docInput)

      expect(result.judge).toBe('document-alignment')
      expect(result.verdict).toBe('pass')
      expect(result.details.alignmentScore).toBe(0.92)
    })

    it('fails when high-severity fabrications detected', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          fabricated_claims: [
            { claim: 'Company saves $1M annually', section: 'executiveSummary', severity: 'high', reason: 'No financial data in extracted data' },
          ],
          missed_data_points: [],
          section_scores: { executiveSummary: 0.3 },
          overall_alignment_score: 0.5,
        })}],
      })

      const result = await runDocumentAlignmentJudge(docInput)

      expect(result.verdict).toBe('fail')
      expect(result.issues).toContainEqual(
        expect.stringContaining('HIGH')
      )
    })

    it('returns review for low-severity fabrications', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          fabricated_claims: [
            { claim: 'Standard practice', section: 'riskAssessment', severity: 'low', reason: 'Generic consulting language' },
          ],
          missed_data_points: [],
          section_scores: {},
          overall_alignment_score: 0.75,
        })}],
      })

      const result = await runDocumentAlignmentJudge(docInput)

      expect(result.verdict).toBe('review')
    })

    it('returns review on API error', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('API error'))

      const result = await runDocumentAlignmentJudge(docInput)

      expect(result.verdict).toBe('review')
      expect(result.details.alignmentScore).toBe(0)
    })
  })

  describe('runAvatarQualityJudge', () => {
    const avatarInput = {
      imageBase64: 'base64image',
      deName: 'Alex',
      deRole: 'Claims Assistant',
      dePersonality: ['helpful', 'professional'],
      brandTone: 'Modern corporate',
    }

    it('passes for quality non-photorealistic avatar', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          professionalism_score: 0.9,
          style_compliant: true,
          brand_alignment_score: 0.85,
          quality_issues: [],
          personality_match: true,
          recommendations: [],
          overall_score: 0.88,
        })}],
      })

      const result = await runAvatarQualityJudge(avatarInput)

      expect(result.judge).toBe('avatar-quality')
      expect(result.verdict).toBe('pass')
      expect(result.details.styleCompliance).toBe(true)
    })

    it('fails for photorealistic avatar', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          professionalism_score: 0.8,
          style_compliant: false,
          brand_alignment_score: 0.5,
          quality_issues: ['Photorealistic face'],
          personality_match: false,
          recommendations: ['Use illustrated style'],
          overall_score: 0.4,
        })}],
      })

      const result = await runAvatarQualityJudge(avatarInput)

      expect(result.verdict).toBe('fail')
      expect(result.issues).toContain('CRITICAL: Avatar is photorealistic')
    })

    it('returns review for borderline quality', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          professionalism_score: 0.6,
          style_compliant: true,
          brand_alignment_score: 0.5,
          quality_issues: ['Low resolution'],
          personality_match: false,
          recommendations: ['Increase resolution'],
          overall_score: 0.55,
        })}],
      })

      const result = await runAvatarQualityJudge(avatarInput)

      expect(result.verdict).toBe('review')
    })

    it('returns review on API error', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('Vision API error'))

      const result = await runAvatarQualityJudge(avatarInput)

      expect(result.verdict).toBe('review')
      expect(result.details.qualityIssues).toContain('Could not evaluate image')
    })
  })

  describe('runPromptRegressionJudge', () => {
    const promptInput = {
      promptType: 'EXTRACT_KICKOFF',
      beforePrompt: 'Extract stakeholders.',
      afterPrompt: 'Extract stakeholders with confidence.',
      testCases: [
        {
          input: 'Sarah is PM',
          beforeOutput: [{ name: 'Sarah' }],
          afterOutput: [{ name: 'Sarah', confidence: 0.9 }],
        },
      ],
    }

    it('passes when prompt improves quality', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          case_assessments: [
            { test_case_index: 0, before_quality: 0.7, after_quality: 0.9, delta: 1, notes: 'Better output' },
          ],
          degraded_cases: 0,
          improved_cases: 1,
          unchanged_cases: 0,
          critical_regressions: [],
          quality_delta: 0.2,
          recommendation: 'approve',
        })}],
      })

      const result = await runPromptRegressionJudge(promptInput)

      expect(result.judge).toBe('prompt-regression')
      expect(result.verdict).toBe('pass')
      expect(result.details.qualityDelta).toBe(0.2)
      expect(result.details.recommendation).toBe('approve')
    })

    it('returns review for marginal improvement', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          case_assessments: [
            { test_case_index: 0, before_quality: 0.8, after_quality: 0.82, delta: 0, notes: 'Marginal' },
          ],
          degraded_cases: 0,
          improved_cases: 0,
          unchanged_cases: 1,
          critical_regressions: [],
          quality_delta: 0.02,
          recommendation: 'review',
        })}],
      })

      const result = await runPromptRegressionJudge(promptInput)

      expect(result.verdict).toBe('review')
    })

    it('fails when critical regressions detected', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          case_assessments: [
            { test_case_index: 0, before_quality: 0.9, after_quality: 0.3, delta: -1, notes: 'Major regression' },
          ],
          degraded_cases: 1,
          improved_cases: 0,
          unchanged_cases: 0,
          critical_regressions: [
            { test_case_index: 0, description: 'Lost all stakeholder extraction' },
          ],
          quality_delta: -0.6,
          recommendation: 'reject',
        })}],
      })

      const result = await runPromptRegressionJudge(promptInput)

      expect(result.verdict).toBe('fail')
      expect(result.issues).toContainEqual(
        expect.stringContaining('Quality decreased')
      )
      expect(result.details.criticalRegressions).toHaveLength(1)
    })

    it('normalizes quality delta score to 0-1 range', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          case_assessments: [],
          degraded_cases: 0,
          improved_cases: 1,
          unchanged_cases: 0,
          critical_regressions: [],
          quality_delta: 0.5,
          recommendation: 'approve',
        })}],
      })

      const result = await runPromptRegressionJudge(promptInput)

      // Score = (quality_delta + 1) / 2 = (0.5 + 1) / 2 = 0.75
      expect(result.score).toBeCloseTo(0.75, 2)
    })

    it('returns review with neutral score on API error', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('API error'))

      const result = await runPromptRegressionJudge(promptInput)

      expect(result.verdict).toBe('review')
      expect(result.score).toBe(0.5) // Neutral score on error
      expect(result.details.recommendation).toBe('review')
    })
  })
})
