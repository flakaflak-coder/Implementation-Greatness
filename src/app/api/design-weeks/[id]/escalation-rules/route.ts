import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId, validateBody, CreateEscalationRuleSchema } from '@/lib/validation'

/**
 * GET /api/design-weeks/[id]/escalation-rules
 * Get all escalation rules for a design week
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const idCheck = validateId(resolvedParams.id)
  if (!idCheck.success) return idCheck.response

  try {
    const escalationRules = await prisma.escalationRule.findMany({
      where: { designWeekId: resolvedParams.id },
      include: {
        evidence: true,
      },
      orderBy: [
        { priority: 'asc' }, // HIGH first
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ escalationRules })
  } catch (error) {
    console.error('[EscalationRules GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch escalation rules' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/design-weeks/[id]/escalation-rules
 * Create a new escalation rule
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const idCheck = validateId(resolvedParams.id)
  if (!idCheck.success) return idCheck.response

  try {
    const validation = await validateBody(request, CreateEscalationRuleSchema)
    if (!validation.success) return validation.response
    const {
      trigger,
      conditionType,
      threshold,
      keywords,
      action,
      handoverContext,
      priority,
    } = validation.data

    const escalationRule = await prisma.escalationRule.create({
      data: {
        designWeekId: resolvedParams.id,
        trigger,
        conditionType,
        threshold,
        keywords,
        action,
        handoverContext,
        priority,
      },
      include: {
        evidence: true,
      },
    })

    return NextResponse.json({ escalationRule }, { status: 201 })
  } catch (error) {
    console.error('[EscalationRules POST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create escalation rule' },
      { status: 500 }
    )
  }
}
