import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/support/runbooks/[deId] - Fetch all runbook data for a Digital Employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deId: string }> }
) {
  try {
    const { deId } = await params

    if (!deId) {
      return NextResponse.json(
        { success: false, error: 'Digital Employee ID is required' },
        { status: 400 }
      )
    }

    const de = await prisma.digitalEmployee.findUnique({
      where: { id: deId },
      include: {
        company: { select: { id: true, name: true } },
        designWeek: {
          include: {
            scopeItems: {
              where: { excludeFromDocument: false },
              orderBy: { classification: 'asc' },
            },
            escalationRules: {
              where: { excludeFromDocument: false },
              orderBy: { priority: 'asc' },
            },
            scenarios: {
              where: { excludeFromDocument: false },
              include: {
                steps: { orderBy: { order: 'asc' } },
                edgeCases: true,
              },
            },
            integrations: {
              where: { excludeFromDocument: false },
            },
            kpis: {
              where: { excludeFromDocument: false },
            },
          },
        },
      },
    })

    if (!de) {
      return NextResponse.json(
        { success: false, error: 'Digital Employee not found' },
        { status: 404 }
      )
    }

    // Structure the runbook data by section
    const designWeek = de.designWeek

    const scopeItems = designWeek?.scopeItems ?? []
    const inScope = scopeItems.filter((s) => s.classification === 'IN_SCOPE')
    const outOfScope = scopeItems.filter((s) => s.classification === 'OUT_OF_SCOPE')

    const runbook = {
      digitalEmployee: {
        id: de.id,
        name: de.name,
        description: de.description,
        status: de.status,
        channels: de.channels,
        currentJourneyPhase: de.currentJourneyPhase,
        goLiveDate: de.goLiveDate?.toISOString() ?? null,
      },
      company: de.company,
      hasDesignWeek: !!designWeek,
      sections: {
        scope: {
          inScope: inScope.map((s) => ({
            id: s.id,
            statement: s.statement,
            skill: s.skill,
            conditions: s.conditions,
            notes: s.notes,
          })),
          outOfScope: outOfScope.map((s) => ({
            id: s.id,
            statement: s.statement,
            skill: s.skill,
            conditions: s.conditions,
            notes: s.notes,
          })),
        },
        escalationRules: (designWeek?.escalationRules ?? []).map((r) => ({
          id: r.id,
          trigger: r.trigger,
          conditionType: r.conditionType,
          threshold: r.threshold,
          keywords: r.keywords,
          action: r.action,
          handoverContext: r.handoverContext,
          priority: r.priority,
        })),
        scenarios: (designWeek?.scenarios ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          trigger: s.trigger,
          actor: s.actor,
          expectedOutcome: s.expectedOutcome,
          successCriteria: s.successCriteria,
          skill: s.skill,
          steps: s.steps.map((step) => ({
            id: step.id,
            order: step.order,
            actor: step.actor,
            action: step.action,
            systemAction: step.systemAction,
            decisionPoint: step.decisionPoint,
          })),
          edgeCases: s.edgeCases.map((ec) => ({
            id: ec.id,
            condition: ec.condition,
            handling: ec.handling,
            escalate: ec.escalate,
          })),
        })),
        integrations: (designWeek?.integrations ?? []).map((i) => ({
          id: i.id,
          systemName: i.systemName,
          purpose: i.purpose,
          type: i.type,
          endpoint: i.endpoint,
          authMethod: i.authMethod,
          authOwner: i.authOwner,
          fieldsRead: i.fieldsRead,
          fieldsWrite: i.fieldsWrite,
          rateLimits: i.rateLimits,
          onTimeout: i.onTimeout,
          onAuthFailure: i.onAuthFailure,
          onNotFound: i.onNotFound,
          status: i.status,
        })),
        kpis: (designWeek?.kpis ?? []).map((k) => ({
          id: k.id,
          name: k.name,
          description: k.description,
          targetValue: k.targetValue,
          baselineValue: k.baselineValue,
          measurementMethod: k.measurementMethod,
          dataSource: k.dataSource,
          frequency: k.frequency,
          owner: k.owner,
        })),
      },
    }

    return NextResponse.json({ success: true, data: runbook })
  } catch (error) {
    console.error('Error fetching runbook data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch runbook data' },
      { status: 500 }
    )
  }
}
