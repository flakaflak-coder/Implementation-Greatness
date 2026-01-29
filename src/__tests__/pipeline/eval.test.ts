/**
 * Tests for LLM Evaluation Pipeline
 */

import { describe, it, expect } from 'vitest'
import {
  quickEvaluate,
  validateSchema,
  checkConfidenceGate,
} from '@/lib/pipeline/eval'

describe('Quick Evaluate', () => {
  it('passes with good metrics', () => {
    const result = quickEvaluate(0.9, 25, 0.8)
    expect(result.passed).toBe(true)
    expect(result.score).toBeGreaterThan(0.7)
    expect(result.issues).toHaveLength(0)
  })

  it('fails with low confidence', () => {
    const result = quickEvaluate(0.5, 25, 0.8)
    expect(result.passed).toBe(false)
    expect(result.issues).toContain('Low classification confidence')
  })

  it('fails with few entities', () => {
    const result = quickEvaluate(0.9, 2, 0.8)
    expect(result.passed).toBe(false)
    expect(result.issues).toContain('Very few entities extracted')
  })

  it('fails with low checklist coverage', () => {
    const result = quickEvaluate(0.9, 25, 0.3)
    expect(result.passed).toBe(false)
    expect(result.issues).toContain('Low checklist coverage')
  })

  it('fails with multiple issues', () => {
    const result = quickEvaluate(0.4, 2, 0.2)
    expect(result.passed).toBe(false)
    expect(result.issues).toHaveLength(3)
    expect(result.score).toBeLessThan(0.5)
  })
})

describe('Schema Validator', () => {
  it('validates correct entities', () => {
    const entities = [
      { id: '1', category: 'BUSINESS', type: 'GOAL', content: 'Reduce costs' },
      { id: '2', category: 'PROCESS', type: 'STEP', content: 'Verify email' },
    ]
    const result = validateSchema(entities)
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('detects missing id', () => {
    const entities = [
      { id: '', category: 'BUSINESS', type: 'GOAL', content: 'Reduce costs' },
    ]
    const result = validateSchema(entities)
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('Entity missing id')
  })

  it('detects missing category', () => {
    const entities = [
      { id: '1', category: '', type: 'GOAL', content: 'Reduce costs' },
    ]
    const result = validateSchema(entities)
    expect(result.valid).toBe(false)
    expect(result.issues.some(i => i.includes('missing category'))).toBe(true)
  })

  it('detects missing content', () => {
    const entities = [
      { id: '1', category: 'BUSINESS', type: 'GOAL', content: '' },
    ]
    const result = validateSchema(entities)
    expect(result.valid).toBe(false)
    expect(result.issues.some(i => i.includes('missing content'))).toBe(true)
  })
})

describe('Confidence Gate', () => {
  it('passes high confidence', () => {
    const result = checkConfidenceGate(0.95)
    expect(result.passed).toBe(true)
    expect(result.recommendation).toContain('auto-approve')
  })

  it('passes acceptable confidence', () => {
    const result = checkConfidenceGate(0.75)
    expect(result.passed).toBe(true)
    expect(result.recommendation).toContain('Acceptable')
  })

  it('fails low confidence', () => {
    const result = checkConfidenceGate(0.6)
    expect(result.passed).toBe(false)
    expect(result.recommendation).toContain('review')
  })

  it('fails very low confidence', () => {
    const result = checkConfidenceGate(0.3)
    expect(result.passed).toBe(false)
    expect(result.recommendation).toContain('misclassified')
  })

  it('respects custom threshold', () => {
    const result = checkConfidenceGate(0.6, 0.5)
    expect(result.passed).toBe(true)
  })
})

// Test cases for LLM judges would require mocking the Anthropic API
// These are integration tests that should be run separately

describe('Judge Test Cases (data only)', () => {
  const GOOD_CLASSIFICATION = {
    contentExcerpt: 'Welcome everyone to the kickoff meeting. Today we will discuss the goals for the Digital Employee project and define success metrics.',
    classificationType: 'KICKOFF_SESSION',
    confidence: 0.92,
    keyIndicators: ['kickoff meeting', 'goals', 'success metrics'],
  }

  const BAD_CLASSIFICATION = {
    contentExcerpt: 'The API endpoint requires OAuth2 authentication and returns JSON data.',
    classificationType: 'KICKOFF_SESSION', // Wrong - should be TECHNICAL
    confidence: 0.85,
    keyIndicators: ['API', 'authentication'],
  }

  const HALLUCINATED_ENTITY = {
    id: 'fake-1',
    category: 'STAKEHOLDER',
    type: 'STAKEHOLDER',
    content: 'John Smith, CEO',
    sourceQuote: 'John Smith mentioned he wants to see 50% cost reduction',
    // But John Smith was never mentioned in the source content
  }

  const GOOD_ENTITY = {
    id: 'real-1',
    category: 'GOAL',
    type: 'GOAL',
    content: 'Reduce processing costs by 30%',
    sourceQuote: 'Our goal is to reduce processing costs by 30 percent',
  }

  it('has good classification test case', () => {
    expect(GOOD_CLASSIFICATION.confidence).toBeGreaterThan(0.9)
    expect(GOOD_CLASSIFICATION.classificationType).toBe('KICKOFF_SESSION')
  })

  it('has bad classification test case', () => {
    expect(BAD_CLASSIFICATION.classificationType).toBe('KICKOFF_SESSION')
    expect(BAD_CLASSIFICATION.contentExcerpt).toContain('API')
    // This mismatch should be caught by the classification judge
  })

  it('has hallucinated entity test case', () => {
    expect(HALLUCINATED_ENTITY.content).toContain('John Smith')
    // The judge should detect this doesn't appear in source
  })

  it('has good entity test case', () => {
    expect(GOOD_ENTITY.sourceQuote).toContain('30 percent')
    expect(GOOD_ENTITY.content).toContain('30%')
    // These should match and pass validation
  })
})
