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

// ============================================================================
// NEW JUDGE TEST CASES
// ============================================================================

describe('Confidence Calibration Test Cases (data only)', () => {
  const WELL_CALIBRATED_ITEMS = [
    {
      id: 'cal-1',
      predictedConfidence: 0.95,
      itemContent: 'Reduce costs by 30%',
      itemType: 'GOAL',
      sourceQuote: 'Our primary goal is to reduce costs by 30 percent',
    },
    {
      id: 'cal-2',
      predictedConfidence: 0.70,
      itemContent: 'Sarah mentioned integration concerns',
      itemType: 'RISK',
      sourceQuote: 'I think there might be some integration issues',
    },
  ]

  const OVERCONFIDENT_ITEMS = [
    {
      id: 'over-1',
      predictedConfidence: 0.95, // Too high - vague source
      itemContent: 'Process takes 2-3 days',
      itemType: 'PROCESS_DETAIL',
      sourceQuote: 'It usually takes a few days',
    },
  ]

  const UNDERCONFIDENT_ITEMS = [
    {
      id: 'under-1',
      predictedConfidence: 0.50, // Too low - very clear source
      itemContent: 'John is the decision maker',
      itemType: 'STAKEHOLDER',
      sourceQuote: 'John is the final decision maker for this project',
    },
  ]

  it('identifies well-calibrated predictions', () => {
    expect(WELL_CALIBRATED_ITEMS[0].predictedConfidence).toBeGreaterThan(0.9)
    expect(WELL_CALIBRATED_ITEMS[0].sourceQuote).toContain('30 percent')
  })

  it('identifies overconfident predictions', () => {
    expect(OVERCONFIDENT_ITEMS[0].predictedConfidence).toBeGreaterThan(0.9)
    expect(OVERCONFIDENT_ITEMS[0].sourceQuote).toContain('a few days')
    // Vague "few days" shouldn't warrant 0.95 confidence
  })

  it('identifies underconfident predictions', () => {
    expect(UNDERCONFIDENT_ITEMS[0].predictedConfidence).toBeLessThan(0.6)
    expect(UNDERCONFIDENT_ITEMS[0].sourceQuote).toContain('final decision maker')
    // Clear statement should have higher confidence
  })
})

describe('Document Alignment Test Cases (data only)', () => {
  const EXTRACTED_DATA = {
    stakeholders: [
      { name: 'Sarah Jones', role: 'Project Manager' },
      { name: 'Tom Wilson', role: 'IT Director' },
    ],
    goals: ['Reduce processing time by 50%', 'Improve customer satisfaction'],
    kpis: [{ name: 'Processing Time', target: '< 24 hours' }],
    processSteps: ['Receive request', 'Validate data', 'Process claim'],
    integrations: ['Salesforce', 'SAP'],
    scopeIn: ['Claims processing', 'Email notifications'],
    scopeOut: ['Payment processing', 'Fraud detection'],
  }

  const ALIGNED_CONTENT = {
    executiveSummary: 'This project, led by Sarah Jones (Project Manager) and Tom Wilson (IT Director), aims to reduce processing time by 50% and improve customer satisfaction.',
    currentState: 'The current process involves three main steps: receiving requests, validating data, and processing claims.',
    scopeAnalysis: 'In scope: Claims processing and email notifications. Out of scope: Payment processing and fraud detection.',
  }

  const FABRICATED_CONTENT = {
    executiveSummary: 'This project will achieve 70% cost savings and integrate with Microsoft Dynamics.', // 70% and Dynamics not in extracted data
    currentState: 'The process typically takes 5-7 business days.', // Time frame not in extracted data
    riskAssessment: 'The main risk is budget overruns estimated at $500K.', // Budget never mentioned
  }

  it('validates aligned content matches extracted data', () => {
    expect(ALIGNED_CONTENT.executiveSummary).toContain('Sarah Jones')
    expect(ALIGNED_CONTENT.executiveSummary).toContain('50%')
    expect(EXTRACTED_DATA.stakeholders.some(s => s.name === 'Sarah Jones')).toBe(true)
    expect(EXTRACTED_DATA.goals.some(g => g.includes('50%'))).toBe(true)
  })

  it('detects fabricated claims not in extracted data', () => {
    expect(FABRICATED_CONTENT.executiveSummary).toContain('70%')
    expect(FABRICATED_CONTENT.executiveSummary).toContain('Microsoft Dynamics')
    expect(EXTRACTED_DATA.goals.some(g => g.includes('70%'))).toBe(false)
    expect(EXTRACTED_DATA.integrations.includes('Microsoft Dynamics')).toBe(false)
  })

  it('detects invented metrics', () => {
    expect(FABRICATED_CONTENT.riskAssessment).toContain('$500K')
    // No budget figures in extracted data - this is fabricated
  })
})

describe('Avatar Quality Test Cases (data only)', () => {
  const GOOD_AVATAR_CONTEXT = {
    deName: 'Alex',
    deRole: 'Claims Processing Assistant',
    dePersonality: ['helpful', 'professional', 'friendly'],
    brandTone: 'Modern, approachable corporate',
  }

  const RISKY_AVATAR_CONTEXT = {
    deName: 'Max',
    deRole: 'Customer Service Bot',
    dePersonality: ['casual', 'playful'],
    brandTone: 'Youthful, startup culture',
  }

  it('provides clear context for good avatar generation', () => {
    expect(GOOD_AVATAR_CONTEXT.dePersonality).toContain('professional')
    expect(GOOD_AVATAR_CONTEXT.brandTone).toContain('corporate')
  })

  it('flags potentially problematic avatar contexts', () => {
    expect(RISKY_AVATAR_CONTEXT.dePersonality).toContain('playful')
    // Playful personas may result in less professional avatars
  })
})

describe('Prompt Regression Test Cases (data only)', () => {
  const BEFORE_PROMPT = `Extract stakeholders from the transcript. Return JSON with name, role, and isDecisionMaker fields.`

  const IMPROVED_PROMPT = `Extract stakeholders from the transcript.
For each stakeholder, identify:
- name: Full name as mentioned
- role: Job title or organizational role
- isDecisionMaker: true if they have final approval authority
- confidence: 0.0-1.0 based on clarity of mention

Return as JSON array. Only include people explicitly mentioned by name.`

  const DEGRADED_PROMPT = `Get the people from the text.` // Too vague

  const TEST_INPUT = 'Sarah, the project manager, mentioned that John as CTO will make the final call on this.'

  const GOOD_OUTPUT = [
    { name: 'Sarah', role: 'Project Manager', isDecisionMaker: false, confidence: 0.9 },
    { name: 'John', role: 'CTO', isDecisionMaker: true, confidence: 0.95 },
  ]

  const POOR_OUTPUT = [
    { name: 'Sarah', role: 'manager' }, // Missing fields, generic role
  ]

  it('improved prompt has more specific guidance', () => {
    expect(IMPROVED_PROMPT.length).toBeGreaterThan(BEFORE_PROMPT.length)
    expect(IMPROVED_PROMPT).toContain('confidence')
    expect(BEFORE_PROMPT).not.toContain('confidence')
  })

  it('degraded prompt lacks specificity', () => {
    expect(DEGRADED_PROMPT.length).toBeLessThan(50)
    expect(DEGRADED_PROMPT).not.toContain('stakeholder')
    expect(DEGRADED_PROMPT).not.toContain('JSON')
  })

  it('good output has complete fields', () => {
    expect(GOOD_OUTPUT).toHaveLength(2)
    expect(GOOD_OUTPUT.every(s => 'confidence' in s)).toBe(true)
    expect(GOOD_OUTPUT.find(s => s.name === 'John')?.isDecisionMaker).toBe(true)
  })

  it('poor output is incomplete', () => {
    expect(POOR_OUTPUT).toHaveLength(1) // Missing John
    expect(POOR_OUTPUT[0]).not.toHaveProperty('isDecisionMaker')
    expect(POOR_OUTPUT[0]).not.toHaveProperty('confidence')
  })
})
