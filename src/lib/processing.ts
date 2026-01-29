import { prisma } from './db'
import { processRecording, processDocument, getMimeType, ExtractionResult } from './gemini'
import { getFile } from './storage'

export interface ProcessingJob {
  sessionId: string
  filePath: string
  filename: string
  sourceType: 'RECORDING' | 'DOCUMENT'
}

export async function processSession(job: ProcessingJob): Promise<void> {
  const { sessionId, filePath, filename, sourceType } = job

  try {
    // Update session status to processing
    await prisma.session.update({
      where: { id: sessionId },
      data: { processingStatus: 'PROCESSING' },
    })

    // Get the file buffer
    const fileBuffer = await getFile(filePath)
    const mimeType = getMimeType(filename)

    // Process with Gemini
    let result: ExtractionResult

    if (sourceType === 'RECORDING') {
      result = await processRecording(fileBuffer, mimeType)
    } else {
      result = await processDocument(fileBuffer, mimeType)
    }

    // Get the session's design week for linking
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { designWeek: true },
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Store the transcript as segments
    if (result.transcript) {
      // For simplicity, store as a single segment
      // In production, you'd parse timestamps from the transcript
      await prisma.transcriptSegment.create({
        data: {
          sessionId,
          startTime: 0,
          endTime: 0,
          text: result.transcript,
        },
      })
    }

    // Create scope items with evidence
    for (const item of result.scopeItems || []) {
      const scopeItem = await prisma.scopeItem.create({
        data: {
          designWeekId: session.designWeekId,
          statement: item.statement,
          classification: item.classification,
          skill: item.skill,
          conditions: item.conditions,
          status: 'NEEDS_DISCUSSION',
        },
      })

      // Create evidence link
      await prisma.evidence.create({
        data: {
          scopeItemId: scopeItem.id,
          sourceType,
          sourceId: sessionId,
          timestampStart: item.timestampStart,
          timestampEnd: item.timestampEnd,
          quote: item.quote,
        },
      })
    }

    // Create scenarios
    for (const scenario of result.scenarios || []) {
      const createdScenario = await prisma.scenario.create({
        data: {
          designWeekId: session.designWeekId,
          name: scenario.title,
          trigger: scenario.description,
          actor: 'Customer',
          expectedOutcome: scenario.expectedOutcome,
          successCriteria: scenario.steps || [],
        },
      })

      // Create scenario steps
      if (scenario.steps) {
        for (let i = 0; i < scenario.steps.length; i++) {
          await prisma.scenarioStep.create({
            data: {
              scenarioId: createdScenario.id,
              order: i + 1,
              actor: 'DIGITAL_EMPLOYEE',
              action: scenario.steps[i],
            },
          })
        }
      }

      // Create edge cases from exceptions
      if (scenario.exceptions) {
        for (const exception of scenario.exceptions) {
          await prisma.edgeCase.create({
            data: {
              scenarioId: createdScenario.id,
              condition: exception,
              handling: 'To be determined',
              escalate: true,
            },
          })
        }
      }

      // Create evidence link
      await prisma.evidence.create({
        data: {
          scenarioId: createdScenario.id,
          sourceType,
          sourceId: sessionId,
          timestampStart: scenario.timestampStart,
          timestampEnd: scenario.timestampEnd,
          quote: scenario.quote,
        },
      })
    }

    // Create KPIs
    for (const kpi of result.kpis || []) {
      const createdKpi = await prisma.kPI.create({
        data: {
          designWeekId: session.designWeekId,
          name: kpi.name,
          targetValue: kpi.targetValue,
          description: `Unit: ${kpi.unit}`,
          measurementMethod: kpi.measurementMethod,
          status: 'NEEDS_DISCUSSION',
        },
      })

      await prisma.evidence.create({
        data: {
          kpiId: createdKpi.id,
          sourceType,
          sourceId: sessionId,
          quote: kpi.quote,
        },
      })
    }

    // Create integrations
    for (const integration of result.integrations || []) {
      const createdIntegration = await prisma.integration.create({
        data: {
          designWeekId: session.designWeekId,
          systemName: integration.systemName,
          purpose: integration.purpose,
          fieldsRead: integration.dataFields || [],
          status: 'IDENTIFIED',
        },
      })

      await prisma.evidence.create({
        data: {
          integrationId: createdIntegration.id,
          sourceType,
          sourceId: sessionId,
          quote: integration.quote,
        },
      })
    }

    // Create escalation rules
    for (const rule of result.escalationRules || []) {
      const createdRule = await prisma.escalationRule.create({
        data: {
          designWeekId: session.designWeekId,
          trigger: rule.triggerCondition,
          conditionType: 'KEYWORD',
          action: 'ESCALATE_WITH_SUMMARY',
          handoverContext: [rule.action],
          priority: rule.slaMinutes && rule.slaMinutes < 30 ? 'HIGH' : 'MEDIUM',
        },
      })

      await prisma.evidence.create({
        data: {
          escalationRuleId: createdRule.id,
          sourceType,
          sourceId: sessionId,
          quote: rule.quote,
        },
      })
    }

    // Update session status to complete
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        processingStatus: 'COMPLETE',
        processedAt: new Date(),
      },
    })

    console.log(`Successfully processed session ${sessionId}`)
  } catch (error) {
    console.error(`Error processing session ${sessionId}:`, error)

    // Update session status to error
    await prisma.session.update({
      where: { id: sessionId },
      data: { processingStatus: 'FAILED' },
    })

    throw error
  }
}
