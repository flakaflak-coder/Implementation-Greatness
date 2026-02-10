import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { SalesHandoverProfile } from '@/components/de-workspace/profile-types'
import { createEmptySalesHandoverProfile } from '@/components/de-workspace/profile-types'
import { getPhaseLabel } from '@/lib/utils'
import { validateId } from '@/lib/validation'

// Zod schema for status transitions
const StatusTransitionSchema = z.object({
  action: z.enum(['submit', 'accept', 'request_changes']),
  comment: z.string().max(2000).optional(),
})

/**
 * GET /api/design-weeks/[id]/sales-handover
 *
 * Returns the sales handover profile, checklist, and implementation pulse data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const idCheck = validateId(designWeekId)
    if (!idCheck.success) return idCheck.response

    const designWeek = await prisma.designWeek.findUnique({
      where: { id: designWeekId },
      include: {
        sessions: {
          include: {
            extractedItems: {
              where: {
                status: 'APPROVED',
                type: {
                  in: [
                    'DEAL_SUMMARY',
                    'CONTRACT_DEADLINE',
                    'SALES_WATCH_OUT',
                    'PROMISED_CAPABILITY',
                    'CLIENT_PREFERENCE',
                    'STAKEHOLDER',
                    'VOLUME_EXPECTATION',
                    'GOAL',
                  ],
                },
              },
            },
          },
        },
        digitalEmployee: {
          include: {
            journeyPhases: {
              include: { checklistItems: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' },
            },
          },
        },
        _count: {
          select: { sessions: true },
        },
      },
    })

    if (!designWeek) {
      return NextResponse.json({ error: 'Design week not found' }, { status: 404 })
    }

    let profile: SalesHandoverProfile

    if (designWeek.salesHandoverProfile) {
      profile = designWeek.salesHandoverProfile as unknown as SalesHandoverProfile
    } else {
      // Generate from extracted items if available
      const allItems = designWeek.sessions.flatMap((s) => s.extractedItems)
      profile = mapExtractedItemsToSalesProfile(allItems)
    }

    // Include checklist items for the sales handover journey phase
    const salesHandoverPhase = designWeek.digitalEmployee.journeyPhases.find(
      (p) => p.phaseType === 'SALES_HANDOVER'
    )
    const checklist = salesHandoverPhase?.checklistItems ?? []

    // Build implementation pulse (only when handover is submitted or accepted)
    const handoverStatus = profile.handoverStatus || 'draft'
    const isPostHandover = handoverStatus === 'accepted' || handoverStatus === 'submitted'

    let implementationPulse = null
    if (isPostHandover) {
      // Check for blocked/pending prerequisites
      const prerequisites = await prisma.prerequisite.findMany({
        where: {
          designWeekId,
          status: { in: ['PENDING', 'REQUESTED', 'BLOCKED'] },
        },
        select: { id: true, status: true, dueDate: true },
      })

      const overdueDeadlines = (profile.deadlines ?? []).filter((d) => {
        if (!d.date) return false
        return new Date(d.date) < new Date() && d.isHard
      }).length

      implementationPulse = {
        designWeekStatus: designWeek.status,
        currentPhase: designWeek.currentPhase,
        phaseName: getPhaseLabel(designWeek.currentPhase),
        sessionsProcessed: designWeek._count.sessions,
        daysSinceAccepted: profile.reviewedAt
          ? Math.floor((Date.now() - new Date(profile.reviewedAt).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        blockedPrerequisites: prerequisites.filter((p) => p.status === 'BLOCKED').length,
        pendingPrerequisites: prerequisites.length,
        overdueDeadlines,
        hasBusinessProfile: !!designWeek.businessProfile,
        hasTechnicalProfile: !!designWeek.technicalProfile,
      }
    }

    return NextResponse.json({
      profile,
      checklist,
      journeyPhaseId: salesHandoverPhase?.id ?? null,
      journeyPhaseStatus: salesHandoverPhase?.status ?? 'NOT_STARTED',
      implementationPulse,
    })
  } catch (error) {
    console.error('Error loading sales handover profile:', error)
    return NextResponse.json(
      { error: 'Failed to load sales handover profile' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/design-weeks/[id]/sales-handover
 *
 * Handles two types of requests:
 * 1. Regular auto-save: { profile: SalesHandoverProfile }
 * 2. Status transition: { action: 'submit' | 'accept' | 'request_changes', comment?: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const idCheck = validateId(designWeekId)
    if (!idCheck.success) return idCheck.response

    const body = await request.json()

    // Check if this is a status transition
    if (body.action) {
      return handleStatusTransition(designWeekId, body)
    }

    // Regular auto-save
    const { profile } = body as { profile: SalesHandoverProfile }

    if (!profile) {
      return NextResponse.json({ error: 'Profile is required' }, { status: 400 })
    }

    const designWeek = await prisma.designWeek.findUnique({
      where: { id: designWeekId },
    })

    if (!designWeek) {
      return NextResponse.json({ error: 'Design week not found' }, { status: 404 })
    }

    // Update the lastUpdatedAt timestamp
    profile.lastUpdatedAt = new Date().toISOString()

    await prisma.designWeek.update({
      where: { id: designWeekId },
      data: {
        salesHandoverProfile: profile as object,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving sales handover profile:', error)
    return NextResponse.json(
      { error: 'Failed to save sales handover profile' },
      { status: 500 }
    )
  }
}

/**
 * Handle status transitions for the handover workflow
 */
async function handleStatusTransition(designWeekId: string, body: unknown) {
  const parsed = StatusTransitionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid action', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { action, comment } = parsed.data

  const designWeek = await prisma.designWeek.findUnique({
    where: { id: designWeekId },
  })

  if (!designWeek) {
    return NextResponse.json({ error: 'Design week not found' }, { status: 404 })
  }

  const profile = {
    ...createEmptySalesHandoverProfile(),
    ...(designWeek.salesHandoverProfile as object ?? {}),
  } as SalesHandoverProfile

  const currentStatus = profile.handoverStatus || 'draft'
  const now = new Date().toISOString()

  switch (action) {
    case 'submit': {
      if (currentStatus !== 'draft' && currentStatus !== 'changes_requested') {
        return NextResponse.json(
          { error: 'Can only submit from draft or changes_requested state' },
          { status: 400 }
        )
      }
      profile.handoverStatus = 'submitted'
      profile.submittedAt = now
      profile.submittedBy = profile.context.salesOwner || 'Sales'
      break
    }

    case 'accept': {
      if (currentStatus !== 'submitted') {
        return NextResponse.json(
          { error: 'Can only accept a submitted handover' },
          { status: 400 }
        )
      }
      profile.handoverStatus = 'accepted'
      profile.reviewedAt = now
      profile.reviewedBy = 'Sophie' // Placeholder until auth is implemented
      profile.reviewComment = comment || ''
      break
    }

    case 'request_changes': {
      if (currentStatus !== 'submitted') {
        return NextResponse.json(
          { error: 'Can only request changes on a submitted handover' },
          { status: 400 }
        )
      }
      profile.handoverStatus = 'changes_requested'
      profile.reviewedAt = now
      profile.reviewedBy = 'Sophie'
      profile.reviewComment = comment || ''
      break
    }
  }

  profile.lastUpdatedAt = now

  await prisma.designWeek.update({
    where: { id: designWeekId },
    data: {
      salesHandoverProfile: profile as object,
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true, profile })
}

/**
 * Map extracted items to sales handover profile structure
 */
function mapExtractedItemsToSalesProfile(
  items: Array<{ type: string; content: string; structuredData: unknown; id: string }>
): SalesHandoverProfile {
  const profile = createEmptySalesHandoverProfile()

  for (const item of items) {
    const structured = item.structuredData as Record<string, unknown> | null

    switch (item.type) {
      case 'DEAL_SUMMARY':
        if (!profile.context.dealSummary) {
          profile.context.dealSummary = item.content
        } else {
          profile.context.dealSummary += '\n' + item.content
        }
        break

      case 'CONTRACT_DEADLINE':
        profile.deadlines.push({
          id: item.id,
          date: (structured?.date as string) || '',
          description: item.content,
          type: (structured?.type as 'contract' | 'go_live' | 'milestone' | 'review' | 'other') || 'other',
          isHard: (structured?.isHard as boolean) ?? true,
        })
        break

      case 'SALES_WATCH_OUT':
        profile.watchOuts.push({
          id: item.id,
          description: item.content,
          severity: (structured?.severity as 'info' | 'warning' | 'critical') || 'warning',
          category: (structured?.category as 'political' | 'technical' | 'timeline' | 'scope' | 'other') || 'other',
        })
        break

      case 'PROMISED_CAPABILITY':
        profile.specialNotes.promisedCapabilities.push({
          id: item.id,
          description: item.content,
          source: (structured?.source as string) || 'sales document',
          priority: (structured?.priority as 'must_have' | 'should_have' | 'nice_to_have') || 'should_have',
        })
        break

      case 'CLIENT_PREFERENCE':
        profile.specialNotes.clientPreferences.push(item.content)
        break

      case 'STAKEHOLDER':
        profile.stakeholders.push({
          id: item.id,
          name: (structured?.name as string) || item.content,
          role: (structured?.role as string) || '',
          email: structured?.email as string | undefined,
          isDecisionMaker: (structured?.isDecisionMaker as boolean) ?? false,
        })
        break

      case 'GOAL':
        if (!profile.context.clientMotivation) {
          profile.context.clientMotivation = item.content
        }
        break

      case 'VOLUME_EXPECTATION':
        // Add volume context to deal summary if empty
        if (!profile.context.dealSummary) {
          profile.context.dealSummary = `Expected volume: ${item.content}`
        }
        break
    }
  }

  return profile
}
