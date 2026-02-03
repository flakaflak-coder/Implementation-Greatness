/**
 * Pipeline Diagnostic Script
 *
 * Run with: npx tsx scripts/diagnose-pipeline.ts
 */

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function diagnose() {
  console.log('\n' + '='.repeat(60))
  console.log('🔍 EXTRACTION PIPELINE DIAGNOSTIC')
  console.log('='.repeat(60))

  try {
    // 1. Database connection
    console.log('\n📡 Testing database connection...')
    await prisma.$queryRaw`SELECT 1`
    console.log('   ✅ Database connected')

    // 2. Upload Jobs
    const uploadJobs = await prisma.uploadJob.count()
    const completedJobs = await prisma.uploadJob.count({ where: { status: 'COMPLETE' } })
    const failedJobs = await prisma.uploadJob.count({ where: { status: 'FAILED' } })
    console.log(`\n📤 Upload Jobs: ${uploadJobs}`)
    console.log(`   ✅ Complete: ${completedJobs}`)
    console.log(`   ❌ Failed: ${failedJobs}`)

    if (failedJobs > 0) {
      const errors = await prisma.uploadJob.findMany({
        where: { status: 'FAILED' },
        select: { filename: true, error: true, currentStage: true },
        take: 3
      })
      console.log('   Recent failures:')
      errors.forEach(e => {
        console.log(`   - ${e.filename} @ ${e.currentStage}: ${e.error?.slice(0, 100)}`)
      })
    }

    // 3. Raw Extractions
    const rawExtractions = await prisma.rawExtraction.count()
    console.log(`\n📄 Raw Extractions: ${rawExtractions}`)

    if (rawExtractions > 0) {
      const sample = await prisma.rawExtraction.findFirst({
        select: { contentType: true, sourceFileName: true }
      })
      console.log(`   Sample: ${sample?.sourceFileName} (${sample?.contentType})`)
    }

    // 4. Sessions
    const sessions = await prisma.session.count()
    console.log(`\n📹 Sessions: ${sessions}`)

    // 5. Extracted Items
    const extractedItems = await prisma.extractedItem.count()
    console.log(`\n📋 Extracted Items: ${extractedItems}`)

    if (extractedItems > 0) {
      // By status
      const byStatus = await prisma.extractedItem.groupBy({
        by: ['status'],
        _count: true,
      })
      console.log('   By status:')
      byStatus.forEach(s => {
        console.log(`      ${s.status}: ${s._count}`)
      })

      // By type (top 10)
      const byType = await prisma.extractedItem.groupBy({
        by: ['type'],
        _count: true,
        orderBy: { _count: { type: 'desc' } },
        take: 10,
      })
      console.log('   By type (top 10):')
      byType.forEach(t => {
        console.log(`      ${t.type}: ${t._count}`)
      })
    }

    // 6. APPROVED items specifically
    const approvedItems = await prisma.extractedItem.count({ where: { status: 'APPROVED' } })
    console.log(`\n✅ APPROVED Items: ${approvedItems}`)

    if (approvedItems === 0 && extractedItems > 0) {
      console.log('   ⚠️ WARNING: Items exist but none are APPROVED')
      console.log('   → Profile tabs will show empty data')
      console.log('   → Items need status=APPROVED to appear in profiles')
    }

    // 7. Design Weeks with data
    const designWeeks = await prisma.designWeek.findMany({
      include: {
        digitalEmployee: { select: { name: true } },
        sessions: {
          include: {
            _count: { select: { extractedItems: true } }
          }
        }
      }
    })

    console.log(`\n📅 Design Weeks: ${designWeeks.length}`)
    for (const dw of designWeeks) {
      const totalItems = dw.sessions.reduce((sum, s) => sum + s._count.extractedItems, 0)
      console.log(`\n   DE: ${dw.digitalEmployee?.name || 'Unknown'}`)
      console.log(`      Sessions: ${dw.sessions.length}`)
      console.log(`      Extracted Items: ${totalItems}`)
      console.log(`      Has Business Profile: ${!!dw.businessProfile}`)
      console.log(`      Has Technical Profile: ${!!dw.technicalProfile}`)
      console.log(`      Has Test Plan: ${!!dw.testPlan}`)
    }

    // 8. Gap Analysis
    console.log('\n' + '='.repeat(60))
    console.log('🔍 GAP ANALYSIS')
    console.log('='.repeat(60))

    if (uploadJobs === 0) {
      console.log('\n❌ PROBLEM: No uploads found')
      console.log('   → Pipeline has never been triggered')
      console.log('   → Try uploading a file through the UI')
    } else if (rawExtractions === 0 && uploadJobs > 0) {
      console.log('\n❌ PROBLEM: Uploads exist but no RawExtractions')
      console.log('   → Stage 2 (General Extraction) may be failing')
      console.log('   → Check if GOOGLE_API_KEY is set in .env')
      console.log('   → Check failed jobs for errors')
    } else if (extractedItems === 0 && rawExtractions > 0) {
      console.log('\n❌ PROBLEM: RawExtractions exist but no ExtractedItems')
      console.log('   → Stage 4 (Tab Population) may be failing')
      console.log('   → Check populate-tabs.ts for issues')
    } else if (approvedItems === 0 && extractedItems > 0) {
      console.log('\n⚠️ WARNING: Items exist but none APPROVED')
      console.log('   → Profiles will appear empty')
      console.log('   → Check confidence threshold (default: 0.8)')
      console.log('   → Consider manually approving items')
    } else if (approvedItems > 0) {
      console.log('\n✅ Pipeline appears to be working!')
      console.log(`   ${approvedItems} APPROVED items ready for profile display`)

      // Check if profile mapping would work
      const approvedByType = await prisma.extractedItem.groupBy({
        by: ['type'],
        where: { status: 'APPROVED' },
        _count: true,
      })

      const businessTypes = ['STAKEHOLDER', 'GOAL', 'KPI_TARGET', 'CHANNEL', 'SKILL_ANSWER',
        'HAPPY_PATH_STEP', 'EXCEPTION_CASE', 'GUARDRAIL_NEVER', 'GUARDRAIL_ALWAYS']
      const technicalTypes = ['SYSTEM_INTEGRATION', 'DATA_FIELD', 'API_ENDPOINT',
        'SECURITY_REQUIREMENT', 'TECHNICAL_CONTACT']

      const businessCount = approvedByType
        .filter(t => businessTypes.includes(t.type))
        .reduce((sum, t) => sum + t._count, 0)
      const technicalCount = approvedByType
        .filter(t => technicalTypes.includes(t.type))
        .reduce((sum, t) => sum + t._count, 0)

      console.log(`\n   📊 Profile Data Available:`)
      console.log(`      Business Profile items: ${businessCount}`)
      console.log(`      Technical Profile items: ${technicalCount}`)
    }

    // 9. Test a specific design week profile load
    if (designWeeks.length > 0 && approvedItems > 0) {
      console.log('\n' + '='.repeat(60))
      console.log('🧪 TESTING PROFILE LOAD')
      console.log('='.repeat(60))

      const testDW = designWeeks[0]
      const items = await prisma.extractedItem.findMany({
        where: {
          session: { designWeekId: testDW.id },
          status: 'APPROVED'
        }
      })

      console.log(`\n   Testing DE: ${testDW.digitalEmployee?.name}`)
      console.log(`   APPROVED items found: ${items.length}`)

      if (items.length > 0) {
        console.log(`   Item types present:`)
        const types = [...new Set(items.map(i => i.type))]
        types.forEach(t => console.log(`      - ${t}`))

        // Test the API endpoint
        console.log(`\n   ℹ️ To test profile loading, visit:`)
        console.log(`      /api/design-weeks/${testDW.id}/profile`)
        console.log(`      /api/design-weeks/${testDW.id}/technical-profile`)
        console.log(`      /api/design-weeks/${testDW.id}/test-plan`)
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }

  console.log('\n' + '='.repeat(60))
  console.log('Done!')
  console.log('='.repeat(60) + '\n')
}

diagnose()
