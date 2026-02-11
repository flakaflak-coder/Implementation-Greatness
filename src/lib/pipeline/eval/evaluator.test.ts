import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock judges module
vi.mock('./judges', () => ({
  runClassificationJudge: vi.fn(),
  runHallucinationJudge: vi.fn(),
  runCoverageJudge: vi.fn(),
  runConsistencyJudge: vi.fn(),
  validateSchema: vi.fn(),
  checkConfidenceGate: vi.fn(),
}))

import {
  evaluateClassification,
  evaluateExtraction,
  evaluateSpecialized,
  evaluatePipeline,
  quickEvaluate,
} from './evaluator'
import {
  runClassificationJudge,
  runHallucinationJudge,
  runCoverageJudge,
  runConsistencyJudge,
  validateSchema,
  checkConfidenceGate,
} from './judges'
import type { JudgeResult, EvaluatorConfig } from './evaluator'
import { DEFAULT_THRESHOLDS } from './types'

describe('evaluator module', () => {
  const makePassingJudge = (judge: string): JudgeResult => ({
    judge,
    verdict: 'pass',
    score: 0.9,
    issues: [],
    details: {},
    latencyMs: 50,
  })

  const makeFailingJudge = (judge: string, issues: string[] = ['Failed check']): JudgeResult => ({
    judge,
    verdict: 'fail',
    score: 0.3,
    issues,
    details: {},
    latencyMs: 50,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('evaluateClassification', () => {
    const classInput = {
      contentExcerpt: 'Welcome to the kickoff meeting.',
      classificationType: 'KICKOFF_SESSION',
      confidence: 0.92,
      keyIndicators: ['kickoff', 'meeting'],
    }

    it('passes with high confidence and correct classification', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({
        passed: true,
        recommendation: 'High confidence, auto-approve',
      })
      vi.mocked(runClassificationJudge).mockResolvedValue(
        makePassingJudge('classification') as never
      )

      const result = await evaluateClassification(classInput)

      expect(result.passed).toBe(true)
      expect(result.overallScore).toBe(0.9)
      expect(result.criticalIssues).toHaveLength(0)
      expect(result.metadata.stage).toBe('classification')
    })

    it('fails with low confidence', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({
        passed: false,
        recommendation: 'Low confidence, review classification',
      })
      vi.mocked(runClassificationJudge).mockResolvedValue(
        makePassingJudge('classification') as never
      )

      const result = await evaluateClassification(classInput)

      expect(result.passed).toBe(false)
      expect(result.criticalIssues).toContain('Low confidence, review classification')
    })

    it('fails when classification judge fails', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({
        passed: true,
        recommendation: 'OK',
      })
      vi.mocked(runClassificationJudge).mockResolvedValue(
        makeFailingJudge('classification', ['Wrong content type']) as never
      )

      const result = await evaluateClassification(classInput)

      expect(result.passed).toBe(false)
      expect(result.criticalIssues).toContain('Wrong content type')
    })

    it('uses default score when classification judge disabled', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({
        passed: true,
        recommendation: 'OK',
      })

      const config: EvaluatorConfig = {
        thresholds: DEFAULT_THRESHOLDS,
        sampleRate: { hallucination: 0.2, qualityGate: 0.1 },
        enabledJudges: {
          classification: false,
          hallucination: true,
          coverage: true,
          consistency: true,
        },
      }

      const result = await evaluateClassification(classInput, config)

      expect(result.verdicts).toHaveLength(0)
      // With confidence passed and no verdicts, score defaults to 0.8
      expect(result.overallScore).toBe(0.8)
    })

    it('uses lower default score when confidence gate fails and no verdicts', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({
        passed: false,
        recommendation: 'Very low confidence',
      })

      const config: EvaluatorConfig = {
        thresholds: DEFAULT_THRESHOLDS,
        sampleRate: { hallucination: 0.2, qualityGate: 0.1 },
        enabledJudges: {
          classification: false,
          hallucination: true,
          coverage: true,
          consistency: true,
        },
      }

      const result = await evaluateClassification(classInput, config)

      expect(result.overallScore).toBe(0.4)
    })
  })

  describe('evaluateExtraction', () => {
    const extractInput = {
      sourceContent: 'Test source content about reducing costs by 30%',
      contentType: 'KICKOFF_SESSION',
      entities: [
        { id: '1', category: 'BUSINESS', type: 'GOAL', content: 'Reduce costs by 30%' },
      ],
      summary: { totalEntities: 1, byCategory: { BUSINESS: 1 } },
    }

    it('passes with valid schema and passing judges', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runCoverageJudge).mockResolvedValue(
        makePassingJudge('coverage') as never
      )

      // Mock Math.random to ensure hallucination judge is run
      vi.spyOn(Math, 'random').mockReturnValue(0)

      vi.mocked(runHallucinationJudge).mockResolvedValue(
        makePassingJudge('hallucination') as never
      )

      const result = await evaluateExtraction(extractInput)

      expect(result.passed).toBe(true)
      expect(result.metadata.stage).toBe('extraction')
    })

    it('fails with invalid schema', async () => {
      vi.mocked(validateSchema).mockReturnValue({
        valid: false,
        issues: ['Entity missing id', 'Entity missing type', 'Entity missing content', 'Extra issue'],
      })
      vi.mocked(runCoverageJudge).mockResolvedValue(
        makePassingJudge('coverage') as never
      )

      const result = await evaluateExtraction(extractInput)

      expect(result.passed).toBe(false)
      // Only first 3 schema issues are included
      expect(result.criticalIssues).toHaveLength(3)
    })

    it('includes hallucination check when sampled', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })

      // Force hallucination check to be sampled (random < 0.2)
      vi.spyOn(Math, 'random').mockReturnValue(0.1)

      vi.mocked(runHallucinationJudge).mockResolvedValue({
        ...makePassingJudge('hallucination'),
        details: { hallucinatedCount: 0 },
      } as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(
        makePassingJudge('coverage') as never
      )

      const result = await evaluateExtraction(extractInput)

      expect(runHallucinationJudge).toHaveBeenCalled()
      expect(result.verdicts.some(v => v.judge === 'hallucination')).toBe(true)
    })

    it('skips hallucination check when not sampled', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })

      // Force hallucination check to be skipped (random >= 0.2)
      vi.spyOn(Math, 'random').mockReturnValue(0.5)

      vi.mocked(runCoverageJudge).mockResolvedValue(
        makePassingJudge('coverage') as never
      )

      await evaluateExtraction(extractInput)

      expect(runHallucinationJudge).not.toHaveBeenCalled()
    })

    it('reports hallucinated entities as critical', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.spyOn(Math, 'random').mockReturnValue(0.1)

      vi.mocked(runHallucinationJudge).mockResolvedValue({
        ...makeFailingJudge('hallucination'),
        details: { hallucinatedCount: 3 },
      } as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(
        makePassingJudge('coverage') as never
      )

      const result = await evaluateExtraction(extractInput)

      expect(result.criticalIssues).toContainEqual(
        expect.stringContaining('3 hallucinated entities')
      )
    })

    it('reports low coverage as critical', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.spyOn(Math, 'random').mockReturnValue(0.9)

      vi.mocked(runCoverageJudge).mockResolvedValue({
        ...makeFailingJudge('coverage'),
        details: { coverageScore: 0.4 },
      } as never)

      const result = await evaluateExtraction(extractInput)

      expect(result.criticalIssues).toContainEqual(
        expect.stringContaining('Low coverage')
      )
    })

    it('uses default score when schema valid but no verdicts', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })

      const config: EvaluatorConfig = {
        thresholds: DEFAULT_THRESHOLDS,
        sampleRate: { hallucination: 0, qualityGate: 0 },
        enabledJudges: {
          classification: true,
          hallucination: false,
          coverage: false,
          consistency: true,
        },
      }

      const result = await evaluateExtraction(extractInput, config)

      expect(result.overallScore).toBe(0.7)
    })

    it('uses low default score when schema invalid and no verdicts', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: false, issues: ['bad'] })

      const config: EvaluatorConfig = {
        thresholds: DEFAULT_THRESHOLDS,
        sampleRate: { hallucination: 0, qualityGate: 0 },
        enabledJudges: {
          classification: true,
          hallucination: false,
          coverage: false,
          consistency: true,
        },
      }

      const result = await evaluateExtraction(extractInput, config)

      expect(result.overallScore).toBe(0.3)
    })
  })

  describe('evaluateSpecialized', () => {
    const specInput = {
      stage2Summary: { totalEntities: 10, byCategory: { BUSINESS: 5, PROCESS: 5 } },
      stage3Items: [
        { type: 'GOAL', content: 'Reduce costs', confidence: 0.9 },
        { type: 'HAPPY_PATH_STEP', content: 'Step 1', confidence: 0.85 },
      ],
      checklist: {
        questionsAsked: ['Q1', 'Q2', 'Q3'],
        questionsMissing: ['Q4'],
        coverageScore: 0.75,
      },
    }

    it('passes with good checklist coverage and consistency', async () => {
      vi.mocked(runConsistencyJudge).mockResolvedValue(
        makePassingJudge('consistency') as never
      )

      const result = await evaluateSpecialized(specInput)

      expect(result.passed).toBe(true)
      expect(result.metadata.stage).toBe('specialized')
    })

    it('fails with low checklist coverage', async () => {
      const lowCoverageInput = {
        ...specInput,
        checklist: {
          questionsAsked: ['Q1'],
          questionsMissing: ['Q2', 'Q3', 'Q4'],
          coverageScore: 0.25,
        },
      }

      vi.mocked(runConsistencyJudge).mockResolvedValue(
        makePassingJudge('consistency') as never
      )

      const result = await evaluateSpecialized(lowCoverageInput)

      expect(result.passed).toBe(false)
      expect(result.criticalIssues).toContainEqual(
        expect.stringContaining('Low checklist coverage: 25%')
      )
    })

    it('fails when consistency judge fails', async () => {
      vi.mocked(runConsistencyJudge).mockResolvedValue(
        makeFailingJudge('consistency', ['Stage 2 and 3 misaligned', 'Extra issue', 'Another issue', 'Fourth issue']) as never
      )

      const result = await evaluateSpecialized(specInput)

      expect(result.passed).toBe(false)
      // Only first 3 issues from consistency judge
      expect(result.criticalIssues.length).toBeLessThanOrEqual(3)
    })

    it('uses checklist coverage as score when no verdicts', async () => {
      const config: EvaluatorConfig = {
        thresholds: DEFAULT_THRESHOLDS,
        sampleRate: { hallucination: 0.2, qualityGate: 0.1 },
        enabledJudges: {
          classification: true,
          hallucination: true,
          coverage: true,
          consistency: false,
        },
      }

      const result = await evaluateSpecialized(specInput, config)

      expect(result.overallScore).toBe(0.75) // coverageScore from input
    })
  })

  describe('evaluatePipeline', () => {
    const classInput = {
      contentExcerpt: 'Kickoff meeting',
      classificationType: 'KICKOFF_SESSION',
      confidence: 0.9,
      keyIndicators: ['kickoff'],
    }

    const extractInput = {
      sourceContent: 'Test content',
      contentType: 'KICKOFF_SESSION',
      entities: [
        { id: '1', category: 'BUSINESS', type: 'GOAL', content: 'Reduce costs' },
      ],
      summary: { totalEntities: 1, byCategory: { BUSINESS: 1 } },
    }

    const specInput = {
      stage2Summary: { totalEntities: 1, byCategory: { BUSINESS: 1 } },
      stage3Items: [{ type: 'GOAL', content: 'Reduce costs', confidence: 0.9 }],
      checklist: {
        questionsAsked: ['Q1'],
        questionsMissing: [],
        coverageScore: 1.0,
      },
    }

    it('passes when all stages pass', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({ passed: true, recommendation: 'OK' })
      vi.mocked(runClassificationJudge).mockResolvedValue(makePassingJudge('classification') as never)
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)
      vi.mocked(runConsistencyJudge).mockResolvedValue(makePassingJudge('consistency') as never)
      vi.spyOn(Math, 'random').mockReturnValue(0.9)

      const result = await evaluatePipeline(
        'job-1',
        classInput,
        extractInput,
        specInput
      )

      expect(result.overallPassed).toBe(true)
      expect(result.jobId).toBe('job-1')
      expect(result.stages.classification.metadata.jobId).toBe('job-1')
      expect(result.stages.extraction.metadata.jobId).toBe('job-1')
      expect(result.stages.specialized.metadata.jobId).toBe('job-1')
    })

    it('calculates weighted overall score', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({ passed: true, recommendation: 'OK' })
      vi.mocked(runClassificationJudge).mockResolvedValue({
        ...makePassingJudge('classification'),
        score: 1.0,
      } as never)
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runCoverageJudge).mockResolvedValue({
        ...makePassingJudge('coverage'),
        score: 0.8,
      } as never)
      vi.mocked(runConsistencyJudge).mockResolvedValue({
        ...makePassingJudge('consistency'),
        score: 0.9,
      } as never)
      vi.spyOn(Math, 'random').mockReturnValue(0.9)

      const result = await evaluatePipeline(
        'job-1',
        classInput,
        extractInput,
        specInput
      )

      // Score = classification * 0.2 + extraction * 0.5 + specialized * 0.3
      // classification score = 1.0, extraction score = 0.8 (coverage only), specialized = 0.9
      const expectedScore = 1.0 * 0.2 + 0.8 * 0.5 + 0.9 * 0.3
      expect(result.overallScore).toBeCloseTo(expectedScore, 1)
    })

    it('requires human review when any stage fails', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({
        passed: false,
        recommendation: 'Low confidence',
      })
      vi.mocked(runClassificationJudge).mockResolvedValue(
        makeFailingJudge('classification') as never
      )
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)
      vi.mocked(runConsistencyJudge).mockResolvedValue(makePassingJudge('consistency') as never)
      vi.spyOn(Math, 'random').mockReturnValue(0.9)

      const result = await evaluatePipeline(
        'job-1',
        classInput,
        extractInput,
        specInput
      )

      expect(result.requiresHumanReview).toBe(true)
      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Review classification')
      )
    })

    it('flags hallucinations in recommendations', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({ passed: true, recommendation: 'OK' })
      vi.mocked(runClassificationJudge).mockResolvedValue(makePassingJudge('classification') as never)
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.spyOn(Math, 'random').mockReturnValue(0.1)
      vi.mocked(runHallucinationJudge).mockResolvedValue({
        ...makeFailingJudge('hallucination'),
        details: { hallucinatedCount: 2 },
      } as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)
      vi.mocked(runConsistencyJudge).mockResolvedValue(makePassingJudge('consistency') as never)

      const result = await evaluatePipeline(
        'job-1',
        classInput,
        extractInput,
        specInput
      )

      expect(result.recommendations).toContainEqual(
        expect.stringContaining('CRITICAL: Hallucinations')
      )
    })

    it('includes orphaned entity recommendations', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({ passed: true, recommendation: 'OK' })
      vi.mocked(runClassificationJudge).mockResolvedValue(makePassingJudge('classification') as never)
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      vi.mocked(runConsistencyJudge).mockResolvedValue({
        ...makePassingJudge('consistency'),
        details: {
          stageAlignment: 0.8,
          orphanedEntities: ['PROCESS', 'INTEGRATIONS'],
          inconsistencies: [],
        },
      } as never)

      const result = await evaluatePipeline(
        'job-1',
        classInput,
        extractInput,
        specInput
      )

      expect(result.recommendations).toContainEqual(
        expect.stringContaining('PROCESS, INTEGRATIONS')
      )
    })

    it('includes coverage recommendations for missing topics', async () => {
      vi.mocked(checkConfidenceGate).mockReturnValue({ passed: true, recommendation: 'OK' })
      vi.mocked(runClassificationJudge).mockResolvedValue(makePassingJudge('classification') as never)
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)
      vi.spyOn(Math, 'random').mockReturnValue(0.9)

      const lowCoverageSpecInput = {
        ...specInput,
        checklist: {
          questionsAsked: ['Q1'],
          questionsMissing: ['Q2', 'Q3'],
          coverageScore: 0.33,
        },
      }

      vi.mocked(runConsistencyJudge).mockResolvedValue(makePassingJudge('consistency') as never)

      const result = await evaluatePipeline(
        'job-1',
        classInput,
        extractInput,
        lowCoverageSpecInput
      )

      expect(result.recommendations).toContainEqual(
        expect.stringContaining('follow-up session')
      )
    })
  })

  describe('quickEvaluate (sync)', () => {
    it('passes with good metrics', () => {
      const result = quickEvaluate(0.9, 25, 0.8)
      expect(result.passed).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('fails with low classification confidence', () => {
      const result = quickEvaluate(0.5, 25, 0.8)
      expect(result.passed).toBe(false)
      expect(result.issues).toContain('Low classification confidence')
    })

    it('fails with very few entities', () => {
      const result = quickEvaluate(0.9, 3, 0.8)
      expect(result.passed).toBe(false)
      expect(result.issues).toContain('Very few entities extracted')
    })

    it('fails with low checklist coverage', () => {
      const result = quickEvaluate(0.9, 25, 0.3)
      expect(result.passed).toBe(false)
      expect(result.issues).toContain('Low checklist coverage')
    })

    it('reports all three issues together', () => {
      const result = quickEvaluate(0.3, 1, 0.1)
      expect(result.issues).toHaveLength(3)
    })

    it('calculates weighted score correctly', () => {
      // Score = confidence * 0.3 + min(entities/20, 1) * 0.3 + coverage * 0.4
      const result = quickEvaluate(1.0, 20, 1.0)
      expect(result.score).toBeCloseTo(1.0, 2)
    })

    it('caps entity score at 1.0 for high entity counts', () => {
      const result20 = quickEvaluate(1.0, 20, 1.0)
      const result100 = quickEvaluate(1.0, 100, 1.0)
      expect(result20.score).toBe(result100.score)
    })

    it('exactly 5 entities passes the entity threshold', () => {
      const result = quickEvaluate(0.9, 5, 0.8)
      expect(result.issues).not.toContain('Very few entities extracted')
    })

    it('exactly 4 entities fails the entity threshold', () => {
      const result = quickEvaluate(0.9, 4, 0.8)
      expect(result.issues).toContain('Very few entities extracted')
    })
  })
})
