import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { TechnicalProfile } from '@/components/de-workspace/profile-types'
import { createEmptyTechnicalProfile } from '@/components/de-workspace/profile-types'

/**
 * GET /api/design-weeks/[id]/technical-profile
 *
 * Returns the technical profile for a design week.
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
                    'SYSTEM_INTEGRATION',
                    'DATA_FIELD',
                    'API_ENDPOINT',
                    'SECURITY_REQUIREMENT',
                    'COMPLIANCE_REQUIREMENT',
                    'ERROR_HANDLING',
                    'TECHNICAL_CONTACT',
                  ],
                },
              },
            },
          },
        },
      },
    })

    if (!designWeek) {
      return NextResponse.json({ error: 'Design week not found' }, { status: 404 })
    }

    let profile: TechnicalProfile

    if (designWeek.technicalProfile) {
      profile = designWeek.technicalProfile as unknown as TechnicalProfile
    } else {
      // Generate from extracted items
      const allItems = designWeek.sessions.flatMap((s) => s.extractedItems)
      profile = mapExtractedItemsToTechnicalProfile(allItems)
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error loading technical profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load profile' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/design-weeks/[id]/technical-profile
 *
 * Saves the technical profile for a design week.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const body = await request.json()
    const { profile } = body as { profile: TechnicalProfile }

    if (!profile) {
      return NextResponse.json({ error: 'Profile is required' }, { status: 400 })
    }

    const designWeek = await prisma.designWeek.findUnique({
      where: { id: designWeekId },
    })

    if (!designWeek) {
      return NextResponse.json({ error: 'Design week not found' }, { status: 404 })
    }

    await prisma.designWeek.update({
      where: { id: designWeekId },
      data: {
        technicalProfile: profile as object,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving technical profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save profile' },
      { status: 500 }
    )
  }
}

/**
 * Map extracted items to technical profile structure
 */
function mapExtractedItemsToTechnicalProfile(
  items: Array<{ type: string; content: string; structuredData: unknown; id: string }>
): TechnicalProfile {
  const profile = createEmptyTechnicalProfile()

  for (const item of items) {
    const structured = item.structuredData as Record<string, unknown> | null

    switch (item.type) {
      case 'SYSTEM_INTEGRATION':
        profile.integrations.push({
          id: item.id,
          systemName: (structured?.systemName as string) || item.content,
          purpose: (structured?.purpose as string) || '',
          type: (structured?.type as TechnicalProfile['integrations'][0]['type']) || 'api',
          authMethod: (structured?.authMethod as TechnicalProfile['integrations'][0]['authMethod']) || 'api_key',
          fieldsRead: (structured?.fieldsRead as string[]) || [],
          fieldsWrite: (structured?.fieldsWrite as string[]) || [],
          status: 'identified',
        })
        break

      case 'DATA_FIELD':
        profile.dataFields.push({
          id: item.id,
          name: (structured?.name as string) || item.content,
          source: (structured?.source as string) || '',
          type: (structured?.type as string) || 'string',
          required: (structured?.required as boolean) || false,
          description: structured?.description as string | undefined,
        })
        break

      case 'API_ENDPOINT':
        profile.apiEndpoints.push({
          id: item.id,
          name: (structured?.name as string) || item.content,
          method: (structured?.method as TechnicalProfile['apiEndpoints'][0]['method']) || 'GET',
          path: (structured?.path as string) || '',
          description: (structured?.description as string) || item.content,
        })
        break

      case 'SECURITY_REQUIREMENT':
        profile.securityRequirements.push({
          id: item.id,
          category: (structured?.category as TechnicalProfile['securityRequirements'][0]['category']) || 'other',
          requirement: item.content,
          status: 'identified',
        })
        break

      case 'COMPLIANCE_REQUIREMENT':
        profile.securityRequirements.push({
          id: item.id,
          category: 'compliance',
          requirement: item.content,
          status: 'identified',
        })
        break

      case 'ERROR_HANDLING':
        // Add to notes for now - could be enhanced to a dedicated field
        profile.notes.push(`Error Handling: ${item.content}`)
        break

      case 'TECHNICAL_CONTACT':
        profile.technicalContacts.push({
          id: item.id,
          name: (structured?.name as string) || item.content,
          role: (structured?.role as string) || '',
          system: (structured?.system as string) || '',
          email: structured?.email as string | undefined,
        })
        break
    }
  }

  return profile
}
