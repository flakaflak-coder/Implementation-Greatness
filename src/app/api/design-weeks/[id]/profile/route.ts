import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { mapExtractedItemsToProfile, mergeProfiles } from '@/lib/profile-mapper'
import type { BusinessProfile } from '@/components/de-workspace/profile-types'
import { createEmptyProfile } from '@/components/de-workspace/profile-types'
import { validateId, validateBody, ProfileUpdateSchema } from '@/lib/validation'

/**
 * GET /api/design-weeks/[id]/profile
 *
 * Returns the business profile for a design week.
 * If a saved profile exists, returns it.
 * Otherwise, generates one from extracted items.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const idCheck = validateId(designWeekId)
    if (!idCheck.success) return idCheck.response

    // Get design week with extracted items
    const designWeek = await prisma.designWeek.findUnique({
      where: { id: designWeekId },
      include: {
        digitalEmployee: true,
        sessions: {
          include: {
            extractedItems: {
              where: { status: 'APPROVED' },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })

    if (!designWeek) {
      return NextResponse.json({ error: 'Design week not found' }, { status: 404 })
    }

    // Check if there's a saved profile
    let profile: BusinessProfile

    if (designWeek.businessProfile) {
      // Use saved profile
      profile = designWeek.businessProfile as unknown as BusinessProfile
    } else {
      // Generate profile from extracted items
      const allItems = designWeek.sessions.flatMap((s) => s.extractedItems)
      profile = mapExtractedItemsToProfile(allItems)

      // Set default identity from DE if not extracted
      if (!profile.identity.name && designWeek.digitalEmployee) {
        profile.identity.name = designWeek.digitalEmployee.name
        profile.identity.description = designWeek.digitalEmployee.description || ''
      }
    }

    // Count extracted items for stats
    const totalItems = designWeek.sessions.reduce(
      (sum, s) => sum + s.extractedItems.length,
      0
    )

    return NextResponse.json({
      profile,
      stats: {
        extractedItemsCount: totalItems,
        hasSavedProfile: !!designWeek.businessProfile,
      },
    })
  } catch (error) {
    console.error('Error loading profile:', error)
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/design-weeks/[id]/profile
 *
 * Saves the business profile for a design week.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const idCheck = validateId(designWeekId)
    if (!idCheck.success) return idCheck.response

    const validation = await validateBody(request, ProfileUpdateSchema)
    if (!validation.success) return validation.response
    const { profile } = validation.data as unknown as { profile: BusinessProfile }

    if (!profile) {
      return NextResponse.json({ error: 'Profile is required' }, { status: 400 })
    }

    // Verify design week exists
    const designWeek = await prisma.designWeek.findUnique({
      where: { id: designWeekId },
    })

    if (!designWeek) {
      return NextResponse.json({ error: 'Design week not found' }, { status: 404 })
    }

    // Save the profile
    await prisma.designWeek.update({
      where: { id: designWeekId },
      data: {
        businessProfile: profile as object,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving profile:', error)
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/design-weeks/[id]/profile
 *
 * Regenerates the profile from extracted items.
 * Optionally merges with existing profile (preserving manual edits).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const idCheck = validateId(designWeekId)
    if (!idCheck.success) return idCheck.response

    const body = await request.json().catch(() => ({}))
    const { merge = true } = body as { merge?: boolean }

    // Get design week with extracted items
    const designWeek = await prisma.designWeek.findUnique({
      where: { id: designWeekId },
      include: {
        digitalEmployee: true,
        sessions: {
          include: {
            extractedItems: {
              where: { status: 'APPROVED' },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })

    if (!designWeek) {
      return NextResponse.json({ error: 'Design week not found' }, { status: 404 })
    }

    // Generate profile from extracted items
    const allItems = designWeek.sessions.flatMap((s) => s.extractedItems)
    let newProfile = mapExtractedItemsToProfile(allItems)

    // Set default identity from DE
    if (!newProfile.identity.name && designWeek.digitalEmployee) {
      newProfile.identity.name = designWeek.digitalEmployee.name
      newProfile.identity.description = designWeek.digitalEmployee.description || ''
    }

    // Optionally merge with existing profile
    if (merge && designWeek.businessProfile) {
      const existingProfile = designWeek.businessProfile as unknown as BusinessProfile
      newProfile = mergeProfiles(existingProfile, newProfile)
    }

    // Save the regenerated profile
    await prisma.designWeek.update({
      where: { id: designWeekId },
      data: {
        businessProfile: newProfile as object,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      profile: newProfile,
      stats: {
        extractedItemsCount: allItems.length,
        merged: merge && !!designWeek.businessProfile,
      },
    })
  } catch (error) {
    console.error('Error regenerating profile:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate profile' },
      { status: 500 }
    )
  }
}
