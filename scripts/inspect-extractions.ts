/**
 * Inspect existing extractions in detail
 */

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function inspect() {
  console.log('🔍 Inspecting Extractions...\n')

  // 1. Check Raw Extractions content
  const rawExtractions = await prisma.rawExtraction.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' }
  })

  console.log(`📄 Raw Extractions (${rawExtractions.length} found):\n`)

  for (const raw of rawExtractions) {
    console.log(`   File: ${raw.sourceFileName}`)
    console.log(`   Type: ${raw.contentType}`)
    console.log(`   Created: ${raw.createdAt}`)

    // Look at the structure of rawJson
    const json = raw.rawJson as Record<string, unknown>
    console.log(`   JSON keys: ${Object.keys(json).join(', ')}`)

    // Count entities if present
    if (json.entities && Array.isArray(json.entities)) {
      console.log(`   Entities count: ${json.entities.length}`)
      const types = json.entities.map((e: { type?: string }) => e.type || 'unknown')
      const typeCounts = types.reduce((acc: Record<string, number>, t: string) => {
        acc[t] = (acc[t] || 0) + 1
        return acc
      }, {})
      console.log(`   Entity types:`)
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`)
      })
    }
    console.log('')
  }

  // 2. Check the 1 ExtractedItem
  const items = await prisma.extractedItem.findMany({
    include: {
      session: {
        select: { designWeekId: true, phase: true }
      }
    }
  })

  console.log(`📋 Extracted Items (${items.length} found):\n`)

  for (const item of items) {
    console.log(`   ID: ${item.id}`)
    console.log(`   Type: ${item.type}`)
    console.log(`   Status: ${item.status}`)
    console.log(`   Content: ${item.content.slice(0, 100)}...`)
    console.log(`   Confidence: ${item.confidence}`)
    console.log(`   Has structuredData: ${!!item.structuredData}`)
    if (item.structuredData) {
      console.log(`   structuredData: ${JSON.stringify(item.structuredData).slice(0, 200)}`)
    }
    console.log('')
  }

  // 3. Check if there's a gap between RawExtraction and ExtractedItem
  console.log('🔍 Gap Analysis:\n')

  const rawCount = await prisma.rawExtraction.count()
  const itemCount = await prisma.extractedItem.count()

  console.log(`   Raw Extractions: ${rawCount}`)
  console.log(`   Extracted Items: ${itemCount}`)

  if (rawCount > 0 && itemCount < rawCount * 10) {
    console.log('\n   ⚠️ POTENTIAL GAP: Raw extractions exist but few items created')
    console.log('   This could mean populate-tabs.ts is not running or not finding items')
  }

  // 4. Check upload jobs that completed
  const completedJobs = await prisma.uploadJob.findMany({
    where: { status: 'COMPLETE' },
    include: {
      rawExtraction: {
        select: { id: true, contentType: true }
      }
    }
  })

  console.log(`\n✅ Completed Upload Jobs (${completedJobs.length}):\n`)

  for (const job of completedJobs) {
    console.log(`   File: ${job.filename}`)
    console.log(`   Raw Extraction: ${job.rawExtractionId ? 'Yes' : 'No'}`)
    console.log(`   Content Type: ${job.rawExtraction?.contentType || 'N/A'}`)

    // Check population result
    const popResult = job.populationResult as Record<string, unknown> | null
    if (popResult) {
      console.log(`   Population Result:`)
      console.log(`      ${JSON.stringify(popResult)}`)
    } else {
      console.log(`   Population Result: Not recorded`)
    }
    console.log('')
  }

  // 5. Check the pipeline stages for latest job
  console.log('\n📊 Latest Upload Job Details:\n')

  const latestJob = await prisma.uploadJob.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      rawExtraction: true
    }
  })

  if (latestJob) {
    console.log(`   File: ${latestJob.filename}`)
    console.log(`   Status: ${latestJob.status}`)
    console.log(`   Current Stage: ${latestJob.currentStage}`)
    console.log(`   Error: ${latestJob.error || 'None'}`)

    if (latestJob.classificationResult) {
      console.log(`   Classification: ${JSON.stringify(latestJob.classificationResult)}`)
    }
  }

  await prisma.$disconnect()
}

inspect()
