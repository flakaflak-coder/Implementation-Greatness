import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock judges module
vi.mock('./judges', () => ({
  runClassificationJudge: vi.fn(),
  runHallucinationJudge: vi.fn(),
  runCoverageJudge: vi.fn(),
  runConsistencyJudge: vi.fn(),
  runConfidenceCalibrationJudge: vi.fn(),
  runDocumentAlignmentJudge: vi.fn(),
  runAvatarQualityJudge: vi.fn(),
  runPromptRegressionJudge: vi.fn(),
  validateSchema: vi.fn(),
  checkConfidenceGate: vi.fn(),
}))

// Mock observatory tracking
vi.mock('@/lib/observatory/tracking', () => ({
  trackLLMOperationServer: vi.fn(),
}))

import {
  evaluateExtraction,
  evaluateDocumentGeneration,
  evaluateAvatarGeneration,
  evaluatePromptChange,
  quickEvaluate,
} from './orchestrator'
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
import { trackLLMOperationServer } from '@/lib/observatory/tracking'
import type { JudgeResult } from './types'

describe('eval orchestrator', () => {
  const makePassingJudge = (judge: string): JudgeResult => ({
    judge,
    verdict: 'pass',
    score: 0.9,
    issues: [],
    details: {},
    latencyMs: 100,
  })

  const makeFailingJudge = (judge: string, issues: string[] = []): JudgeResult => ({
    judge,
    verdict: 'fail',
    score: 0.3,
    issues,
    details: {},
    latencyMs: 100,
  })

  const makeReviewJudge = (judge: string, issues: string[] = []): JudgeResult => ({
    judge,
    verdict: 'review',
    score: 0.6,
    issues,
    details: {},
    latencyMs: 100,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('evaluateExtraction', () => {
    const extractionInput = {
      sourceContent: 'Test content about a kickoff meeting',
      contentType: 'KICKOFF_SESSION',
      entities: [
        { id: '1', category: 'BUSINESS', type: 'GOAL', content: 'Reduce costs' },
      ],
      summary: { totalEntities: 1, byCategory: { BUSINESS: 1 } },
    }

    it('passes when all judges pass', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(makePassingJudge('hallucination') as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)

      const result = await evaluateExtraction({
        extractionInput,
        jobId: 'job-1',
      })

      expect(result.overallPassed).toBe(true)
      expect(result.overallScore).toBeGreaterThan(0)
      expect(result.stages.extraction.passed).toBe(true)
    })

    it('fails when hallucination judge fails', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(
        makeFailingJudge('hallucination', ['2 hallucinated entities']) as never
      )
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)

      const result = await evaluateExtraction({
        extractionInput,
        jobId: 'job-1',
      })

      expect(result.overallPassed).toBe(false)
    })

    it('includes classification evaluation when classificationInput provided', async () => {
      const classificationInput = {
        contentExcerpt: 'Welcome to the kickoff',
        classificationType: 'KICKOFF_SESSION',
        confidence: 0.92,
        keyIndicators: ['kickoff'],
      }

      vi.mocked(runClassificationJudge).mockResolvedValue(makePassingJudge('classification') as never)
      vi.mocked(checkConfidenceGate).mockReturnValue({ passed: true, recommendation: 'High confidence' })
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(makePassingJudge('hallucination') as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)

      const result = await evaluateExtraction({
        classificationInput,
        extractionInput,
        jobId: 'job-1',
      })

      expect(runClassificationJudge).toHaveBeenCalled()
      expect(result.stages.classification.verdicts).toHaveLength(1)
    })

    it('adds confidence gate issue when gate fails', async () => {
      const classificationInput = {
        contentExcerpt: 'Some content',
        classificationType: 'KICKOFF_SESSION',
        confidence: 0.5,
        keyIndicators: [],
      }

      vi.mocked(runClassificationJudge).mockResolvedValue(makePassingJudge('classification') as never)
      vi.mocked(checkConfidenceGate).mockReturnValue({
        passed: false,
        recommendation: 'Low confidence, review classification',
      })
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(makePassingJudge('hallucination') as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)

      const result = await evaluateExtraction({
        classificationInput,
        extractionInput,
        jobId: 'job-1',
      })

      // The confidence gate failure adds "Confidence gate: ..." to allIssues
      // which doesn't contain 'hallucinated', 'CRITICAL', or 'fail'
      // so criticalIssues remains empty and overallPassed is still true (all judges pass)
      expect(checkConfidenceGate).toHaveBeenCalledWith(0.5, expect.any(Number))
      expect(result.overallPassed).toBe(true) // All judge verdicts are pass, no critical issues
    })

    it('includes schema validation failure in results', async () => {
      vi.mocked(validateSchema).mockReturnValue({
        valid: false,
        issues: ['Entity missing id', 'Entity 2 missing content'],
      })
      vi.mocked(runHallucinationJudge).mockResolvedValue(makePassingJudge('hallucination') as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)

      const result = await evaluateExtraction({
        extractionInput,
        jobId: 'job-1',
      })

      const schemaVerdict = result.stages.extraction.verdicts.find(
        v => v.judge === 'schema-validation'
      )
      expect(schemaVerdict).toBeDefined()
      expect(schemaVerdict!.verdict).toBe('fail')
      expect(schemaVerdict!.issues).toHaveLength(2)
    })

    it('includes consistency judge when specializedInput provided', async () => {
      const specializedInput = {
        stage2Summary: { totalEntities: 5, byCategory: { BUSINESS: 5 } },
        stage3Items: [{ type: 'GOAL', content: 'Test', confidence: 0.9 }],
        checklist: { questionsAsked: ['Q1'], questionsMissing: [], coverageScore: 1.0 },
      }

      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(makePassingJudge('hallucination') as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)
      vi.mocked(runConsistencyJudge).mockResolvedValue(makePassingJudge('consistency') as never)

      const result = await evaluateExtraction({
        extractionInput,
        specializedInput,
        jobId: 'job-1',
      })

      expect(runConsistencyJudge).toHaveBeenCalled()
      expect(result.stages.specialized.verdicts).toHaveLength(1)
    })

    it('includes confidence calibration judge when input provided', async () => {
      const confidenceInput = {
        predictions: [
          { id: '1', predictedConfidence: 0.9, itemContent: 'Test', itemType: 'GOAL' },
        ],
        sourceContent: 'Test source',
        contentType: 'KICKOFF_SESSION',
      }

      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(makePassingJudge('hallucination') as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)
      vi.mocked(runConfidenceCalibrationJudge).mockResolvedValue(
        makePassingJudge('confidence-calibration') as never
      )

      const result = await evaluateExtraction({
        extractionInput,
        confidenceInput,
        jobId: 'job-1',
      })

      expect(runConfidenceCalibrationJudge).toHaveBeenCalled()
      expect(result.stages.extraction.verdicts).toContainEqual(
        expect.objectContaining({ judge: 'confidence-calibration' })
      )
    })

    it('generates recommendations for failing judges', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(
        makeFailingJudge('hallucination') as never
      )
      vi.mocked(runCoverageJudge).mockResolvedValue(
        makeFailingJudge('coverage') as never
      )

      const result = await evaluateExtraction({
        extractionInput,
        jobId: 'job-1',
      })

      expect(result.recommendations).toContain(
        'Strengthen source verification in extraction prompts'
      )
      expect(result.recommendations).toContain(
        'Review extraction prompts for completeness, consider adding checklist items'
      )
    })

    it('generates recommendations for review-verdict judges', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(
        makeReviewJudge('hallucination', ['borderline scores']) as never
      )
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)

      const result = await evaluateExtraction({
        extractionInput,
        jobId: 'job-1',
      })

      expect(result.recommendations).toContainEqual(
        expect.stringContaining('Manual review recommended')
      )
    })

    it('requires human review when any judge returns review', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(
        makeReviewJudge('hallucination') as never
      )
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)

      const result = await evaluateExtraction({
        extractionInput,
        jobId: 'job-1',
      })

      expect(result.requiresHumanReview).toBe(true)
    })

    it('tracks evaluation in observatory', async () => {
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(makePassingJudge('hallucination') as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)

      await evaluateExtraction({
        extractionInput,
        jobId: 'job-1',
      })

      expect(trackLLMOperationServer).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineName: 'extraction_evaluation',
          metadata: expect.objectContaining({ jobId: 'job-1' }),
        })
      )
    })

    it('deduplicates recommendations', async () => {
      const classificationInput = {
        contentExcerpt: 'Test',
        classificationType: 'KICKOFF_SESSION',
        confidence: 0.9,
        keyIndicators: [],
      }

      vi.mocked(runClassificationJudge).mockResolvedValue(
        makeFailingJudge('classification') as never
      )
      vi.mocked(checkConfidenceGate).mockReturnValue({ passed: true, recommendation: 'OK' })
      vi.mocked(validateSchema).mockReturnValue({ valid: true, issues: [] })
      vi.mocked(runHallucinationJudge).mockResolvedValue(makePassingJudge('hallucination') as never)
      vi.mocked(runCoverageJudge).mockResolvedValue(makePassingJudge('coverage') as never)

      const result = await evaluateExtraction({
        classificationInput,
        extractionInput,
        jobId: 'job-1',
      })

      // Classification recommendation should appear only once
      const classRecommendations = result.recommendations.filter(r =>
        r.includes('classification')
      )
      expect(classRecommendations.length).toBeLessThanOrEqual(1)
    })
  })

  describe('evaluateDocumentGeneration', () => {
    const documentInput = {
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
        executiveSummary: 'Summary',
        currentState: 'Current',
        futureState: 'Future',
        processAnalysis: 'Process',
        scopeAnalysis: 'Scope',
        technicalFoundation: 'Technical',
        riskAssessment: 'Risk',
      },
      language: 'en',
    }

    it('passes when alignment score is high', async () => {
      vi.mocked(runDocumentAlignmentJudge).mockResolvedValue({
        judge: 'document-alignment',
        verdict: 'pass',
        score: 0.9,
        issues: [],
        details: {
          alignmentScore: 0.9,
          fabricatedClaims: [],
          missedDataPoints: [],
          sectionScores: {},
        },
        latencyMs: 100,
      } as never)

      const result = await evaluateDocumentGeneration({
        documentInput,
        jobId: 'doc-1',
      })

      expect(result.passed).toBe(true)
      expect(result.overallScore).toBe(0.9)
    })

    it('fails when alignment score is low', async () => {
      vi.mocked(runDocumentAlignmentJudge).mockResolvedValue({
        judge: 'document-alignment',
        verdict: 'fail',
        score: 0.4,
        issues: ['[HIGH] Fabricated claim about cost savings'],
        details: {
          alignmentScore: 0.4,
          fabricatedClaims: [{ claim: 'cost savings', section: 'summary', severity: 'high' }],
          missedDataPoints: [],
          sectionScores: {},
        },
        latencyMs: 100,
      } as never)

      const result = await evaluateDocumentGeneration({
        documentInput,
        jobId: 'doc-1',
      })

      expect(result.passed).toBe(false)
      expect(result.criticalIssues).toContainEqual(
        expect.stringContaining('HIGH')
      )
    })

    it('tracks in observatory', async () => {
      vi.mocked(runDocumentAlignmentJudge).mockResolvedValue(
        makePassingJudge('document-alignment') as never
      )

      await evaluateDocumentGeneration({
        documentInput,
        jobId: 'doc-1',
      })

      expect(trackLLMOperationServer).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineName: 'document_evaluation',
        })
      )
    })
  })

  describe('evaluateAvatarGeneration', () => {
    const avatarInput = {
      imageBase64: 'base64encodedimage',
      deName: 'Alex',
      deRole: 'Claims Assistant',
      dePersonality: ['helpful', 'professional'],
      brandTone: 'Modern corporate',
    }

    it('passes when avatar quality is good', async () => {
      vi.mocked(runAvatarQualityJudge).mockResolvedValue({
        judge: 'avatar-quality',
        verdict: 'pass',
        score: 0.85,
        issues: [],
        details: {
          professionalismScore: 0.9,
          styleCompliance: true,
          brandAlignment: 0.8,
          qualityIssues: [],
          recommendations: [],
        },
        latencyMs: 200,
      } as never)

      const result = await evaluateAvatarGeneration({
        avatarInput,
        jobId: 'avatar-1',
      })

      expect(result.passed).toBe(true)
      expect(result.overallScore).toBe(0.85)
    })

    it('fails when avatar is photorealistic', async () => {
      vi.mocked(runAvatarQualityJudge).mockResolvedValue({
        judge: 'avatar-quality',
        verdict: 'fail',
        score: 0.3,
        issues: ['CRITICAL: Avatar is photorealistic'],
        details: {
          professionalismScore: 0.8,
          styleCompliance: false,
          brandAlignment: 0.5,
          qualityIssues: ['Photorealistic face detected'],
          recommendations: ['Use illustrated style'],
        },
        latencyMs: 200,
      } as never)

      const result = await evaluateAvatarGeneration({
        avatarInput,
        jobId: 'avatar-1',
      })

      expect(result.passed).toBe(false)
      expect(result.criticalIssues).toContainEqual(
        expect.stringContaining('CRITICAL')
      )
    })

    it('tracks in observatory', async () => {
      vi.mocked(runAvatarQualityJudge).mockResolvedValue(
        makePassingJudge('avatar-quality') as never
      )

      await evaluateAvatarGeneration({
        avatarInput,
        jobId: 'avatar-1',
      })

      expect(trackLLMOperationServer).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineName: 'avatar_evaluation',
        })
      )
    })
  })

  describe('evaluatePromptChange', () => {
    const promptInput = {
      promptType: 'EXTRACT_KICKOFF',
      beforePrompt: 'Extract stakeholders from the transcript.',
      afterPrompt: 'Extract stakeholders from the transcript with confidence scores.',
      testCases: [
        {
          input: 'Sarah is the PM',
          beforeOutput: [{ name: 'Sarah', role: 'PM' }],
          afterOutput: [{ name: 'Sarah', role: 'PM', confidence: 0.9 }],
        },
      ],
    }

    it('passes when prompt change improves quality', async () => {
      vi.mocked(runPromptRegressionJudge).mockResolvedValue({
        judge: 'prompt-regression',
        verdict: 'pass',
        score: 0.8,
        issues: [],
        details: {
          qualityDelta: 0.15,
          degradedCases: 0,
          improvedCases: 1,
          unchangedCases: 0,
          criticalRegressions: [],
          recommendation: 'approve',
        },
        latencyMs: 150,
      } as never)

      const result = await evaluatePromptChange({
        promptInput,
        jobId: 'prompt-1',
      })

      expect(result.passed).toBe(true)
    })

    it('fails when prompt change degrades quality', async () => {
      vi.mocked(runPromptRegressionJudge).mockResolvedValue({
        judge: 'prompt-regression',
        verdict: 'fail',
        score: 0.3,
        issues: ['Quality decreased by 20%'],
        details: {
          qualityDelta: -0.2,
          degradedCases: 3,
          improvedCases: 0,
          unchangedCases: 0,
          criticalRegressions: [{ testCaseIndex: 0, description: 'Lost stakeholders' }],
          recommendation: 'reject',
        },
        latencyMs: 150,
      } as never)

      const result = await evaluatePromptChange({
        promptInput,
        jobId: 'prompt-1',
      })

      expect(result.passed).toBe(false)
      expect(result.criticalIssues).toContainEqual(
        expect.stringContaining('Quality decreased')
      )
    })

    it('tracks in observatory', async () => {
      vi.mocked(runPromptRegressionJudge).mockResolvedValue({
        ...makePassingJudge('prompt-regression'),
        details: { qualityDelta: 0.1 },
      } as never)

      await evaluatePromptChange({
        promptInput,
        jobId: 'prompt-1',
      })

      expect(trackLLMOperationServer).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineName: 'prompt_evaluation',
        })
      )
    })
  })

  describe('quickEvaluate', () => {
    it('passes when hallucination check passes', async () => {
      vi.mocked(runHallucinationJudge).mockResolvedValue(
        makePassingJudge('hallucination') as never
      )

      const result = await quickEvaluate({
        sourceContent: 'Test content',
        contentType: 'KICKOFF_SESSION',
        entities: [{ id: '1', category: 'BUSINESS', type: 'GOAL', content: 'Test' }],
        summary: { totalEntities: 1, byCategory: { BUSINESS: 1 } },
      })

      expect(result.passed).toBe(true)
      expect(result.score).toBe(0.9)
      expect(result.topIssue).toBeNull()
    })

    it('fails when hallucination check fails', async () => {
      vi.mocked(runHallucinationJudge).mockResolvedValue({
        ...makeFailingJudge('hallucination', ['Hallucinated entity found']),
      } as never)

      const result = await quickEvaluate({
        sourceContent: 'Test content',
        contentType: 'KICKOFF_SESSION',
        entities: [{ id: '1', category: 'BUSINESS', type: 'GOAL', content: 'Test' }],
        summary: { totalEntities: 1, byCategory: { BUSINESS: 1 } },
      })

      expect(result.passed).toBe(false)
      expect(result.topIssue).toBe('Hallucinated entity found')
    })

    it('uses custom sample size', async () => {
      vi.mocked(runHallucinationJudge).mockResolvedValue(
        makePassingJudge('hallucination') as never
      )

      await quickEvaluate(
        {
          sourceContent: 'Test',
          contentType: 'KICKOFF_SESSION',
          entities: [],
          summary: { totalEntities: 0, byCategory: {} },
        },
        10
      )

      expect(runHallucinationJudge).toHaveBeenCalledWith(
        expect.anything(),
        10
      )
    })

    it('tracks in observatory', async () => {
      vi.mocked(runHallucinationJudge).mockResolvedValue(
        makePassingJudge('hallucination') as never
      )

      await quickEvaluate({
        sourceContent: 'Test',
        contentType: 'KICKOFF_SESSION',
        entities: [],
        summary: { totalEntities: 0, byCategory: {} },
      })

      expect(trackLLMOperationServer).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineName: 'quick_evaluation',
        })
      )
    })
  })
})
