import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Define mocks before imports - inline in factory
vi.mock('./db', () => ({
  prisma: {
    session: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    transcriptSegment: {
      create: vi.fn(),
    },
    scopeItem: {
      create: vi.fn(),
    },
    evidence: {
      create: vi.fn(),
    },
    scenario: {
      create: vi.fn(),
    },
    scenarioStep: {
      create: vi.fn(),
    },
    edgeCase: {
      create: vi.fn(),
    },
    kPI: {
      create: vi.fn(),
    },
    integration: {
      create: vi.fn(),
    },
    escalationRule: {
      create: vi.fn(),
    },
  },
}))

vi.mock('./storage', () => ({
  getFile: vi.fn(),
}))

vi.mock('./gemini', () => ({
  processRecording: vi.fn(),
  processDocument: vi.fn(),
  getMimeType: (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop()
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      pdf: 'application/pdf',
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  },
}))

import { processSession, ProcessingJob } from './processing'
import { prisma } from './db'
import { getFile } from './storage'
import { processRecording, processDocument } from './gemini'

// Cast to get mock methods
type MockFn = ReturnType<typeof vi.fn>
const mockPrisma = prisma as unknown as {
  session: { update: MockFn; findUnique: MockFn }
  transcriptSegment: { create: MockFn }
  scopeItem: { create: MockFn }
  evidence: { create: MockFn }
  scenario: { create: MockFn }
  scenarioStep: { create: MockFn }
  edgeCase: { create: MockFn }
  kPI: { create: MockFn }
  integration: { create: MockFn }
  escalationRule: { create: MockFn }
}
const mockGetFile = getFile as MockFn
const mockProcessRecording = processRecording as MockFn
const mockProcessDocument = processDocument as MockFn

describe('processSession', () => {
  const mockJob: ProcessingJob = {
    sessionId: 'session-123',
    filePath: '/uploads/session-123/recording.mp3',
    filename: 'recording.mp3',
    sourceType: 'RECORDING',
  }

  const mockExtractionResult = {
    transcript: 'This is the transcript of the session.',
    scopeItems: [
      {
        statement: 'Handle customer complaints',
        classification: 'IN_SCOPE' as const,
        skill: 'complaint-handling',
        conditions: 'Only for tier 1 issues',
        timestampStart: 60,
        timestampEnd: 120,
        quote: 'Yes, the DE should handle all tier 1 complaints',
      },
    ],
    scenarios: [
      {
        title: 'Customer Complaint Flow',
        description: 'Handle incoming complaints',
        steps: ['Receive complaint', 'Categorize', 'Respond'],
        expectedOutcome: 'Complaint resolved',
        exceptions: ['Complex cases escalate'],
        timestampStart: 200,
        timestampEnd: 300,
        quote: 'The process should work like this...',
      },
    ],
    kpis: [
      {
        name: 'Response Time',
        targetValue: '5',
        unit: 'minutes',
        measurementMethod: 'Average time to first response',
        quote: 'We want responses within 5 minutes',
      },
    ],
    integrations: [
      {
        systemName: 'Salesforce',
        purpose: 'API',
        dataFields: ['case_id', 'customer_name'],
        quote: 'We need to connect to Salesforce',
      },
    ],
    escalationRules: [
      {
        triggerCondition: 'Customer mentions legal action',
        action: 'Escalate to supervisor',
        targetTeam: 'Legal Team',
        slaMinutes: 15,
        quote: 'Any legal mentions should go to supervisor immediately',
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockGetFile.mockResolvedValue(Buffer.from('mock file content'))
    mockProcessRecording.mockResolvedValue(mockExtractionResult)
    mockProcessDocument.mockResolvedValue(mockExtractionResult)

    mockPrisma.session.findUnique.mockResolvedValue({
      id: 'session-123',
      designWeekId: 'dw-123',
      designWeek: { id: 'dw-123' },
    })

    mockPrisma.scopeItem.create.mockResolvedValue({ id: 'scope-1' })
    mockPrisma.scenario.create.mockResolvedValue({ id: 'scenario-1' })
    mockPrisma.kPI.create.mockResolvedValue({ id: 'kpi-1' })
    mockPrisma.integration.create.mockResolvedValue({ id: 'integration-1' })
    mockPrisma.escalationRule.create.mockResolvedValue({ id: 'rule-1' })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('updates session status to PROCESSING at start', async () => {
    await processSession(mockJob)

    expect(mockPrisma.session.update).toHaveBeenCalledWith({
      where: { id: 'session-123' },
      data: { processingStatus: 'PROCESSING' },
    })
  })

  it('retrieves file from storage', async () => {
    await processSession(mockJob)

    expect(mockGetFile).toHaveBeenCalledWith('/uploads/session-123/recording.mp3')
  })

  it('processes recording for RECORDING source type', async () => {
    await processSession(mockJob)

    expect(mockProcessRecording).toHaveBeenCalledWith(
      expect.any(Buffer),
      'audio/mpeg'
    )
    expect(mockProcessDocument).not.toHaveBeenCalled()
  })

  it('processes document for DOCUMENT source type', async () => {
    const docJob: ProcessingJob = {
      ...mockJob,
      sourceType: 'DOCUMENT',
      filename: 'notes.pdf',
      filePath: '/uploads/session-123/notes.pdf',
    }

    await processSession(docJob)

    expect(mockProcessDocument).toHaveBeenCalledWith(
      expect.any(Buffer),
      'application/pdf'
    )
    expect(mockProcessRecording).not.toHaveBeenCalled()
  })

  it('creates transcript segment when transcript is present', async () => {
    await processSession(mockJob)

    expect(mockPrisma.transcriptSegment.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-123',
        startTime: 0,
        endTime: 0,
        text: 'This is the transcript of the session.',
      },
    })
  })

  it('creates scope items with evidence', async () => {
    await processSession(mockJob)

    expect(mockPrisma.scopeItem.create).toHaveBeenCalledWith({
      data: {
        designWeekId: 'dw-123',
        statement: 'Handle customer complaints',
        classification: 'IN_SCOPE',
        skill: 'complaint-handling',
        conditions: 'Only for tier 1 issues',
        status: 'NEEDS_DISCUSSION',
      },
    })

    expect(mockPrisma.evidence.create).toHaveBeenCalledWith({
      data: {
        scopeItemId: 'scope-1',
        sourceType: 'RECORDING',
        sourceId: 'session-123',
        timestampStart: 60,
        timestampEnd: 120,
        quote: 'Yes, the DE should handle all tier 1 complaints',
      },
    })
  })

  it('creates scenarios with steps and edge cases', async () => {
    await processSession(mockJob)

    expect(mockPrisma.scenario.create).toHaveBeenCalledWith({
      data: {
        designWeekId: 'dw-123',
        name: 'Customer Complaint Flow',
        trigger: 'Handle incoming complaints',
        actor: 'Customer',
        expectedOutcome: 'Complaint resolved',
        successCriteria: ['Receive complaint', 'Categorize', 'Respond'],
      },
    })

    // Verify scenario steps were created
    expect(mockPrisma.scenarioStep.create).toHaveBeenCalledTimes(3)
    expect(mockPrisma.scenarioStep.create).toHaveBeenCalledWith({
      data: {
        scenarioId: 'scenario-1',
        order: 1,
        actor: 'DIGITAL_EMPLOYEE',
        action: 'Receive complaint',
      },
    })

    // Verify edge case was created
    expect(mockPrisma.edgeCase.create).toHaveBeenCalledWith({
      data: {
        scenarioId: 'scenario-1',
        condition: 'Complex cases escalate',
        handling: 'To be determined',
        escalate: true,
      },
    })
  })

  it('creates KPIs with evidence', async () => {
    await processSession(mockJob)

    expect(mockPrisma.kPI.create).toHaveBeenCalledWith({
      data: {
        designWeekId: 'dw-123',
        name: 'Response Time',
        targetValue: '5',
        description: 'Unit: minutes',
        measurementMethod: 'Average time to first response',
        status: 'NEEDS_DISCUSSION',
      },
    })

    expect(mockPrisma.evidence.create).toHaveBeenCalledWith({
      data: {
        kpiId: 'kpi-1',
        sourceType: 'RECORDING',
        sourceId: 'session-123',
        quote: 'We want responses within 5 minutes',
      },
    })
  })

  it('creates integrations with evidence', async () => {
    await processSession(mockJob)

    expect(mockPrisma.integration.create).toHaveBeenCalledWith({
      data: {
        designWeekId: 'dw-123',
        systemName: 'Salesforce',
        purpose: 'API',
        fieldsRead: ['case_id', 'customer_name'],
        status: 'IDENTIFIED',
      },
    })
  })

  it('creates escalation rules with HIGH priority for short SLA', async () => {
    await processSession(mockJob)

    expect(mockPrisma.escalationRule.create).toHaveBeenCalledWith({
      data: {
        designWeekId: 'dw-123',
        trigger: 'Customer mentions legal action',
        conditionType: 'KEYWORD',
        action: 'ESCALATE_WITH_SUMMARY',
        handoverContext: ['Escalate to supervisor'],
        priority: 'HIGH', // SLA < 30 mins
      },
    })
  })

  it('creates escalation rules with MEDIUM priority for longer SLA', async () => {
    const resultWithLongSLA = {
      ...mockExtractionResult,
      escalationRules: [
        {
          triggerCondition: 'General inquiry',
          action: 'Route to team',
          slaMinutes: 60,
          quote: 'General inquiries can wait',
        },
      ],
    }
    mockProcessRecording.mockResolvedValue(resultWithLongSLA)

    await processSession(mockJob)

    expect(mockPrisma.escalationRule.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        priority: 'MEDIUM',
      }),
    })
  })

  it('updates session status to COMPLETE on success', async () => {
    await processSession(mockJob)

    expect(mockPrisma.session.update).toHaveBeenLastCalledWith({
      where: { id: 'session-123' },
      data: {
        processingStatus: 'COMPLETE',
        processedAt: expect.any(Date),
      },
    })
  })

  it('updates session status to FAILED on error', async () => {
    mockGetFile.mockRejectedValue(new Error('File not found'))

    await expect(processSession(mockJob)).rejects.toThrow('File not found')

    expect(mockPrisma.session.update).toHaveBeenLastCalledWith({
      where: { id: 'session-123' },
      data: { processingStatus: 'FAILED' },
    })
  })

  it('throws error when session is not found', async () => {
    mockPrisma.session.findUnique.mockResolvedValue(null)

    await expect(processSession(mockJob)).rejects.toThrow('Session not found')

    expect(mockPrisma.session.update).toHaveBeenLastCalledWith({
      where: { id: 'session-123' },
      data: { processingStatus: 'FAILED' },
    })
  })

  it('handles empty extraction results gracefully', async () => {
    mockProcessRecording.mockResolvedValue({
      transcript: '',
      scopeItems: [],
      scenarios: [],
      kpis: [],
      integrations: [],
      escalationRules: [],
    })

    await processSession(mockJob)

    // Should not create any items
    expect(mockPrisma.transcriptSegment.create).not.toHaveBeenCalled()
    expect(mockPrisma.scopeItem.create).not.toHaveBeenCalled()
    expect(mockPrisma.scenario.create).not.toHaveBeenCalled()
    expect(mockPrisma.kPI.create).not.toHaveBeenCalled()
    expect(mockPrisma.integration.create).not.toHaveBeenCalled()
    expect(mockPrisma.escalationRule.create).not.toHaveBeenCalled()

    // But should still complete successfully
    expect(mockPrisma.session.update).toHaveBeenLastCalledWith({
      where: { id: 'session-123' },
      data: {
        processingStatus: 'COMPLETE',
        processedAt: expect.any(Date),
      },
    })
  })

  it('handles scenarios without steps', async () => {
    const resultNoSteps = {
      ...mockExtractionResult,
      scenarios: [
        {
          title: 'Simple Scenario',
          description: 'No steps',
          steps: [], // Empty steps array
          expectedOutcome: 'Done',
          timestampStart: 100,
          timestampEnd: 200,
          quote: 'Simple process',
        },
      ],
    }
    mockProcessRecording.mockResolvedValue(resultNoSteps)

    await processSession(mockJob)

    expect(mockPrisma.scenario.create).toHaveBeenCalled()
    expect(mockPrisma.scenarioStep.create).not.toHaveBeenCalled()
  })

  it('handles scenarios without exceptions', async () => {
    const resultNoExceptions = {
      ...mockExtractionResult,
      scenarios: [
        {
          title: 'Normal Flow',
          description: 'Standard process',
          steps: ['Step 1'],
          expectedOutcome: 'Complete',
          timestampStart: 100,
          timestampEnd: 200,
          quote: 'Normal flow',
        },
      ],
    }
    mockProcessRecording.mockResolvedValue(resultNoExceptions)

    await processSession(mockJob)

    expect(mockPrisma.edgeCase.create).not.toHaveBeenCalled()
  })
})
