/**
 * Reprocess existing RawExtractions through the fixed populate-tabs pipeline
 *
 * Run with: npx tsx scripts/reprocess-extractions.ts
 */

import { PrismaClient, ExtractedItemType } from '@prisma/client'
import { mapToExtractedItemType } from '../src/lib/pipeline/extract-specialized'

const prisma = new PrismaClient()

interface RawEntity {
  type: string
  content: string
  confidence?: number
  sourceQuote?: string
  sourceSpeaker?: string
  sourceTimestamp?: number
  structuredData?: Record<string, unknown>
}

async function reprocess() {
  console.log('\n' + '='.repeat(60))
  console.log('🔄 REPROCESSING EXISTING EXTRACTIONS')
  console.log('='.repeat(60))

  // Get all raw extractions
  const rawExtractions = await prisma.rawExtraction.findMany({
    include: {
      designWeek: {
        include: {
          sessions: { orderBy: { sessionNumber: 'desc' }, take: 1 }
        }
      }
    }
  })

  console.log(`\n📄 Found ${rawExtractions.length} RawExtractions to process\n`)

  const validTypes = Object.values(ExtractedItemType)
  let totalCreated = 0
  let totalSkipped = 0
  const typeStats: Record<string, number> = {}
  const unmappedTypes: Record<string, number> = {}

  for (const raw of rawExtractions) {
    console.log(`\n📄 Processing: ${raw.sourceFileName}`)
    console.log(`   Design Week: ${raw.designWeekId}`)
    console.log(`   Content Type: ${raw.contentType}`)

    const json = raw.rawJson as { entities?: RawEntity[]; summary?: string }
    const entities = json.entities || []

    console.log(`   Entities: ${entities.length}`)

    // Get or create session
    let sessionId: string

    if (raw.designWeek.sessions.length > 0) {
      sessionId = raw.designWeek.sessions[0].id
    } else {
      const session = await prisma.session.create({
        data: {
          designWeekId: raw.designWeekId,
          phase: 2,
          sessionNumber: 1,
          date: new Date(),
          processingStatus: 'COMPLETE',
        },
      })
      sessionId = session.id
      console.log(`   Created new session: ${sessionId}`)
    }

    let created = 0
    let skipped = 0

    for (const entity of entities) {
      const mappedType = mapToExtractedItemType(entity.type)

      // Track stats
      typeStats[mappedType] = (typeStats[mappedType] || 0) + 1

      // Check if valid type
      if (!validTypes.includes(mappedType as ExtractedItemType)) {
        unmappedTypes[entity.type] = (unmappedTypes[entity.type] || 0) + 1
        skipped++
        continue
      }

      try {
        // Check for duplicate
        const existing = await prisma.extractedItem.findFirst({
          where: {
            sessionId,
            type: mappedType as ExtractedItemType,
            content: entity.content,
          }
        })

        if (existing) {
          skipped++
          continue
        }

        // Create the extracted item
        await prisma.extractedItem.create({
          data: {
            sessionId,
            type: mappedType as ExtractedItemType,
            content: entity.content,
            confidence: entity.confidence || 0.8,
            sourceQuote: entity.sourceQuote || '',
            sourceSpeaker: entity.sourceSpeaker,
            sourceTimestamp: entity.sourceTimestamp,
            status: (entity.confidence || 0.8) >= 0.8 ? 'APPROVED' : 'PENDING',
            structuredData: entity.structuredData ? (entity.structuredData as object) : undefined,
          },
        })

        created++
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.log(`   ⚠️ Failed to create ${entity.type}: ${message.slice(0, 50)}`)
        skipped++
      }
    }

    console.log(`   ✅ Created: ${created}, Skipped: ${skipped}`)
    totalCreated += created
    totalSkipped += skipped
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))

  console.log(`\n✅ Total items created: ${totalCreated}`)
  console.log(`⏭️ Total items skipped: ${totalSkipped}`)

  console.log('\n📋 Items by type:')
  Object.entries(typeStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      const valid = validTypes.includes(type as ExtractedItemType)
      console.log(`   ${valid ? '✅' : '❌'} ${type}: ${count}`)
    })

  if (Object.keys(unmappedTypes).length > 0) {
    console.log('\n⚠️ Unmapped types (need to add to schema or mapping):')
    Object.entries(unmappedTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`)
      })
  }

  // Verify final state
  const approvedCount = await prisma.extractedItem.count({ where: { status: 'APPROVED' } })
  const byType = await prisma.extractedItem.groupBy({
    by: ['type'],
    where: { status: 'APPROVED' },
    _count: true,
    orderBy: { _count: { type: 'desc' } },
    take: 15
  })

  console.log(`\n✅ Total APPROVED items now: ${approvedCount}`)
  console.log('\n📋 APPROVED items by type:')
  byType.forEach(t => {
    console.log(`   ${t.type}: ${t._count}`)
  })

  await prisma.$disconnect()

  console.log('\n' + '='.repeat(60))
  console.log('Done! Profiles should now show data.')
  console.log('='.repeat(60) + '\n')
}

reprocess()
