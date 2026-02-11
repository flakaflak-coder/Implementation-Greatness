import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateBody, BatchResolveScopeItemsSchema } from '@/lib/validation'
import { withErrorTracking } from '@/lib/api-utils'

// POST /api/scope-items/batch-resolve - Resolve multiple ambiguous scope items at once
export const POST = withErrorTracking(async (request: NextRequest) => {
  const validation = await validateBody(request, BatchResolveScopeItemsSchema)
  if (!validation.success) {
    return validation.response
  }

  const { ids, classification, notes } = validation.data

  // Verify all items exist and are ambiguous
  const existingItems = await prisma.scopeItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, classification: true, notes: true },
  })

  if (existingItems.length !== ids.length) {
    const foundIds = new Set(existingItems.map((item) => item.id))
    const missingIds = ids.filter((id) => !foundIds.has(id))
    return NextResponse.json(
      {
        success: false,
        error: 'Some scope items were not found',
        details: { missingIds },
      },
      { status: 404 }
    )
  }

  const nonAmbiguous = existingItems.filter(
    (item) => item.classification !== 'AMBIGUOUS'
  )
  if (nonAmbiguous.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Some scope items are not ambiguous',
        details: {
          nonAmbiguousIds: nonAmbiguous.map((item) => item.id),
        },
      },
      { status: 400 }
    )
  }

  // Update all items in a transaction
  const result = await prisma.$transaction(
    ids.map((id) => {
      const existingItem = existingItems.find((item) => item.id === id)
      return prisma.scopeItem.update({
        where: { id },
        data: {
          classification,
          status: 'CONFIRMED',
          notes: notes
            ? `${existingItem?.notes || ''}\n\nResolution: ${notes}`.trim()
            : existingItem?.notes,
        },
      })
    })
  )

  return NextResponse.json({
    success: true,
    data: { count: result.length },
  })
}, '/api/scope-items/batch-resolve')
