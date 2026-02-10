import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { SalesHandoverProfile } from '@/components/de-workspace/profile-types'
import { createEmptySalesHandoverProfile } from '@/components/de-workspace/profile-types'

/**
 * GET /api/design-weeks/[id]/sales-handover
 *
 * Returns the sales handover profile for a design week.
 * Falls back to generating from extracted items if no saved profile exists.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params

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
              where: { phaseType: 'SALES_HANDOVER' },
              include: { checklistItems: { orderBy: { order: 'asc' } } },
            },
          },
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
    const journeyPhase = designWeek.digitalEmployee.journeyPhases[0] ?? null
    const checklist = journeyPhase?.checklistItems ?? []

    return NextResponse.json({
      profile,
      checklist,
      journeyPhaseId: journeyPhase?.id ?? null,
      journeyPhaseStatus: journeyPhase?.status ?? 'NOT_STARTED',
    })
  } catch (error) {
    console.error('Error loading sales handover profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load profile' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/design-weeks/[id]/sales-handover
 *
 * Saves the sales handover profile for a design week.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const body = await request.json()
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
      { error: error instanceof Error ? error.message : 'Failed to save profile' },
      { status: 500 }
    )
  }
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
