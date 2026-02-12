import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId, validateBody, UpdateEscalationRuleSchema } from '@/lib/validation'

/**
 * PATCH /api/design-weeks/[id]/escalation-rules/[ruleId]
 * Update an escalation rule
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const resolvedParams = await params
  const idCheck = validateId(resolvedParams.id)
  if (!idCheck.success) return idCheck.response
  const ruleIdCheck = validateId(resolvedParams.ruleId)
  if (!ruleIdCheck.success) return ruleIdCheck.response

  try {
    const validation = await validateBody(request, UpdateEscalationRuleSchema)
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

    // Build update data - only include defined fields
    const updateData: Record<string, unknown> = {}
    if (trigger !== undefined) updateData.trigger = trigger
    if (conditionType !== undefined) updateData.conditionType = conditionType
    if (threshold !== undefined) updateData.threshold = threshold
    if (keywords !== undefined) updateData.keywords = keywords
    if (action !== undefined) updateData.action = action
    if (handoverContext !== undefined) updateData.handoverContext = handoverContext
    if (priority !== undefined) updateData.priority = priority

    const escalationRule = await prisma.escalationRule.update({
      where: {
        id: resolvedParams.ruleId,
        designWeekId: resolvedParams.id,
      },
      data: updateData,
      include: {
        evidence: true,
      },
    })

    return NextResponse.json({ escalationRule })
  } catch (error) {
    console.error('[EscalationRules PATCH] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update escalation rule' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/design-weeks/[id]/escalation-rules/[ruleId]
 * Delete an escalation rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const resolvedParams = await params
  const idCheck = validateId(resolvedParams.id)
  if (!idCheck.success) return idCheck.response
  const ruleIdCheck = validateId(resolvedParams.ruleId)
  if (!ruleIdCheck.success) return ruleIdCheck.response

  try {
    await prisma.escalationRule.delete({
      where: {
        id: resolvedParams.ruleId,
        designWeekId: resolvedParams.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[EscalationRules DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete escalation rule' },
      { status: 500 }
    )
  }
}
