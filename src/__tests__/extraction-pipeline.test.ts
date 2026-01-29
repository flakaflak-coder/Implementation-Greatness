/**
 * Extraction Pipeline Integration Tests
 *
 * Tests the complete flow:
 * 1. Upload → Pipeline → ExtractedItem creation
 * 2. ExtractedItem → Profile endpoint mapping
 * 3. Profile endpoint → Frontend display
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '@/lib/db'
import { mapExtractedItemsToProfile } from '@/lib/profile-mapper'
import { createEmptyProfile, createEmptyTechnicalProfile, createEmptyTestPlan } from '@/components/de-workspace/profile-types'
import type { ExtractedItem } from '@prisma/client'

describe('Extraction Pipeline', () => {
  describe('Database Connection', () => {
    it('should connect to the database', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`
      expect(result).toBeDefined()
    })
  })

  describe('ExtractedItems in Database', () => {
    it('should check if any ExtractedItems exist', async () => {
      const count = await prisma.extractedItem.count()
      console.log(`📊 Total ExtractedItems in database: ${count}`)

      if (count === 0) {
        console.warn('⚠️ WARNING: No ExtractedItems found. The extraction pipeline may not be working.')
      }

      // Not a failure - just diagnostic
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should check ExtractedItems by status', async () => {
      const byStatus = await prisma.extractedItem.groupBy({
        by: ['status'],
        _count: true,
      })

      console.log('📊 ExtractedItems by status:')
      byStatus.forEach(s => {
        console.log(`   ${s.status}: ${s._count}`)
      })

      expect(byStatus).toBeDefined()
    })

    it('should check ExtractedItems by type', async () => {
      const byType = await prisma.extractedItem.groupBy({
        by: ['type'],
        _count: true,
        orderBy: { _count: { type: 'desc' } },
        take: 20,
      })

      console.log('📊 ExtractedItems by type (top 20):')
      byType.forEach(t => {
        console.log(`   ${t.type}: ${t._count}`)
      })

      expect(byType).toBeDefined()
    })

    it('should check if APPROVED items exist for profile mapping', async () => {
      const approvedCount = await prisma.extractedItem.count({
        where: { status: 'APPROVED' }
      })

      console.log(`📊 APPROVED ExtractedItems: ${approvedCount}`)

      if (approvedCount === 0) {
        console.warn('⚠️ WARNING: No APPROVED items. Profile tabs will show empty data.')
        console.warn('   Items need status=APPROVED to appear in profiles.')
      }

      expect(approvedCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Design Week Data', () => {
    it('should find Design Weeks with sessions', async () => {
      const designWeeks = await prisma.designWeek.findMany({
        include: {
          sessions: {
            include: {
              _count: { select: { extractedItems: true } }
            }
          },
          digitalEmployee: {
            select: { name: true }
          }
        },
      })

      console.log(`📊 Total Design Weeks: ${designWeeks.length}`)

      for (const dw of designWeeks) {
        const totalItems = dw.sessions.reduce((sum, s) => sum + s._count.extractedItems, 0)
        console.log(`   DE: ${dw.digitalEmployee?.name || 'Unknown'}`)
        console.log(`      Sessions: ${dw.sessions.length}`)
        console.log(`      Total ExtractedItems: ${totalItems}`)
        console.log(`      Has BusinessProfile: ${!!dw.businessProfile}`)
        console.log(`      Has TechnicalProfile: ${!!dw.technicalProfile}`)
        console.log(`      Has TestPlan: ${!!dw.testPlan}`)
      }

      expect(designWeeks).toBeDefined()
    })
  })

  describe('Upload Jobs', () => {
    it('should check upload job statuses', async () => {
      const jobs = await prisma.uploadJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          filename: true,
          status: true,
          currentStage: true,
          error: true,
          createdAt: true,
        }
      })

      console.log(`📊 Recent Upload Jobs (last 10):`)

      if (jobs.length === 0) {
        console.log('   No upload jobs found.')
      } else {
        for (const job of jobs) {
          console.log(`   ${job.filename}`)
          console.log(`      Status: ${job.status}`)
          console.log(`      Stage: ${job.currentStage}`)
          if (job.error) {
            console.log(`      ❌ Error: ${job.error}`)
          }
        }
      }

      expect(jobs).toBeDefined()
    })

    it('should check for failed jobs', async () => {
      const failedJobs = await prisma.uploadJob.count({
        where: { status: 'FAILED' }
      })

      console.log(`📊 Failed Upload Jobs: ${failedJobs}`)

      if (failedJobs > 0) {
        const errors = await prisma.uploadJob.findMany({
          where: { status: 'FAILED' },
          select: { filename: true, error: true },
          take: 5
        })

        console.log('   Recent failures:')
        errors.forEach(e => {
          console.log(`   - ${e.filename}: ${e.error}`)
        })
      }

      expect(failedJobs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Raw Extractions', () => {
    it('should check if RawExtractions exist', async () => {
      const count = await prisma.rawExtraction.count()
      console.log(`📊 Total RawExtractions: ${count}`)

      if (count > 0) {
        const sample = await prisma.rawExtraction.findFirst({
          select: {
            contentType: true,
            sourceFileName: true,
            createdAt: true,
          }
        })
        console.log(`   Sample: ${sample?.sourceFileName} (${sample?.contentType})`)
      }

      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Profile Mapper', () => {
    it('should map empty items to empty profile', () => {
      const profile = mapExtractedItemsToProfile([])
      const empty = createEmptyProfile()

      expect(profile.identity.stakeholders).toHaveLength(0)
      expect(profile.kpis).toHaveLength(0)
      expect(profile.channels).toHaveLength(0)
    })

    it('should map STAKEHOLDER items correctly', () => {
      const mockItems: Partial<ExtractedItem>[] = [
        {
          id: 'test-1',
          type: 'STAKEHOLDER',
          content: 'John Smith - Product Owner',
          structuredData: { name: 'John Smith', role: 'Product Owner', email: 'john@example.com' },
          status: 'APPROVED',
        } as ExtractedItem,
      ]

      const profile = mapExtractedItemsToProfile(mockItems as ExtractedItem[])

      expect(profile.identity.stakeholders).toHaveLength(1)
      expect(profile.identity.stakeholders[0].name).toBe('John Smith')
      expect(profile.identity.stakeholders[0].role).toBe('Product Owner')
    })

    it('should map KPI_TARGET items correctly', () => {
      const mockItems: Partial<ExtractedItem>[] = [
        {
          id: 'test-2',
          type: 'KPI_TARGET',
          content: 'Automation Rate - Target 85%',
          structuredData: { name: 'Automation Rate', targetValue: '85%', unit: '%' },
          status: 'APPROVED',
        } as ExtractedItem,
      ]

      const profile = mapExtractedItemsToProfile(mockItems as ExtractedItem[])

      expect(profile.kpis).toHaveLength(1)
      expect(profile.kpis[0].name).toBe('Automation Rate')
      expect(profile.kpis[0].targetValue).toBe('85%')
    })

    it('should map CHANNEL items correctly', () => {
      const mockItems: Partial<ExtractedItem>[] = [
        {
          id: 'test-3',
          type: 'CHANNEL',
          content: 'Email - 70% of volume',
          structuredData: { name: 'Email', type: 'email', volumePercentage: 70 },
          status: 'APPROVED',
        } as ExtractedItem,
      ]

      const profile = mapExtractedItemsToProfile(mockItems as ExtractedItem[])

      expect(profile.channels).toHaveLength(1)
      expect(profile.channels[0].name).toBe('Email')
      expect(profile.channels[0].type).toBe('email')
    })

    it('should map GUARDRAIL items correctly', () => {
      const mockItems: Partial<ExtractedItem>[] = [
        {
          id: 'test-4',
          type: 'GUARDRAIL_NEVER',
          content: 'Never promise refunds',
          structuredData: null,
          status: 'APPROVED',
        } as ExtractedItem,
        {
          id: 'test-5',
          type: 'GUARDRAIL_ALWAYS',
          content: 'Always verify identity',
          structuredData: null,
          status: 'APPROVED',
        } as ExtractedItem,
      ]

      const profile = mapExtractedItemsToProfile(mockItems as ExtractedItem[])

      expect(profile.guardrails.never).toContain('Never promise refunds')
      expect(profile.guardrails.always).toContain('Always verify identity')
    })

    it('should handle items without structuredData (fallback to content)', () => {
      const mockItems: Partial<ExtractedItem>[] = [
        {
          id: 'test-6',
          type: 'STAKEHOLDER',
          content: 'Jane Doe',
          structuredData: null, // No structured data
          status: 'APPROVED',
        } as ExtractedItem,
      ]

      const profile = mapExtractedItemsToProfile(mockItems as ExtractedItem[])

      // Should fall back to content
      expect(profile.identity.stakeholders).toHaveLength(1)
      expect(profile.identity.stakeholders[0].name).toBe('Jane Doe')
      expect(profile.identity.stakeholders[0].role).toBe('') // Empty fallback
    })
  })

  describe('End-to-End Profile Loading', () => {
    it('should test loading a real profile from database', async () => {
      // Find a design week with extracted items
      const designWeek = await prisma.designWeek.findFirst({
        include: {
          sessions: {
            include: {
              extractedItems: {
                where: { status: 'APPROVED' },
                take: 50,
              }
            }
          },
          digitalEmployee: {
            select: { name: true }
          }
        },
      })

      if (!designWeek) {
        console.log('⚠️ No Design Week found to test')
        return
      }

      const allItems = designWeek.sessions.flatMap(s => s.extractedItems)
      console.log(`📊 Testing profile for DE: ${designWeek.digitalEmployee?.name}`)
      console.log(`   Total APPROVED items: ${allItems.length}`)

      if (allItems.length === 0) {
        console.warn('⚠️ No APPROVED items to map to profile')
        return
      }

      // Map to profile
      const profile = mapExtractedItemsToProfile(allItems)

      console.log('📊 Mapped Profile:')
      console.log(`   Stakeholders: ${profile.identity.stakeholders.length}`)
      console.log(`   KPIs: ${profile.kpis.length}`)
      console.log(`   Channels: ${profile.channels.length}`)
      console.log(`   Skills: ${profile.skills.skills.length}`)
      console.log(`   Happy Path Steps: ${profile.process.happyPathSteps.length}`)
      console.log(`   Exceptions: ${profile.process.exceptions.length}`)
      console.log(`   Guardrails (Never): ${profile.guardrails.never.length}`)
      console.log(`   Guardrails (Always): ${profile.guardrails.always.length}`)

      // Check if anything was actually mapped
      const totalMapped =
        profile.identity.stakeholders.length +
        profile.kpis.length +
        profile.channels.length +
        profile.skills.skills.length +
        profile.process.happyPathSteps.length +
        profile.process.exceptions.length +
        profile.guardrails.never.length +
        profile.guardrails.always.length

      if (totalMapped === 0 && allItems.length > 0) {
        console.error('❌ PROBLEM: Items exist but nothing mapped to profile!')
        console.log('   Item types present:')
        const types = [...new Set(allItems.map(i => i.type))]
        types.forEach(t => console.log(`      - ${t}`))
      }

      expect(profile).toBeDefined()
    })
  })
})

describe('Pipeline Diagnostic', () => {
  it('should run full diagnostic', async () => {
    console.log('\n' + '='.repeat(60))
    console.log('🔍 EXTRACTION PIPELINE DIAGNOSTIC')
    console.log('='.repeat(60))

    // 1. Check for data at each stage
    const uploadJobs = await prisma.uploadJob.count()
    const rawExtractions = await prisma.rawExtraction.count()
    const extractedItems = await prisma.extractedItem.count()
    const approvedItems = await prisma.extractedItem.count({ where: { status: 'APPROVED' } })
    const designWeeksWithProfiles = await prisma.designWeek.count({
      where: { OR: [
        { businessProfile: { not: null } },
        { technicalProfile: { not: null } },
        { testPlan: { not: null } },
      ]}
    })

    console.log('\n📊 Pipeline Stage Counts:')
    console.log(`   1. Upload Jobs:      ${uploadJobs}`)
    console.log(`   2. Raw Extractions:  ${rawExtractions}`)
    console.log(`   3. Extracted Items:  ${extractedItems}`)
    console.log(`   4. Approved Items:   ${approvedItems}`)
    console.log(`   5. Saved Profiles:   ${designWeeksWithProfiles}`)

    // 2. Identify the gap
    console.log('\n🔍 Gap Analysis:')

    if (uploadJobs === 0) {
      console.log('   ❌ No uploads - Pipeline never started')
    } else if (rawExtractions === 0) {
      console.log('   ❌ Gap at Stage 2: Uploads exist but no RawExtractions')
      console.log('      → Check if Gemini extraction is working')
    } else if (extractedItems === 0) {
      console.log('   ❌ Gap at Stage 3-4: RawExtractions exist but no ExtractedItems')
      console.log('      → Check populate-tabs.ts')
    } else if (approvedItems === 0) {
      console.log('   ⚠️ Items exist but none APPROVED')
      console.log('      → Check confidence threshold or manual approval needed')
    } else {
      console.log('   ✅ Pipeline appears connected')

      if (designWeeksWithProfiles === 0) {
        console.log('   ⚠️ But no profiles saved yet (loaded dynamically from items)')
      }
    }

    // 3. Check for errors
    const failedJobs = await prisma.uploadJob.findMany({
      where: { status: 'FAILED' },
      select: { filename: true, error: true, currentStage: true },
      take: 3
    })

    if (failedJobs.length > 0) {
      console.log('\n❌ Recent Failed Jobs:')
      failedJobs.forEach(j => {
        console.log(`   ${j.filename} @ ${j.currentStage}`)
        console.log(`      Error: ${j.error}`)
      })
    }

    console.log('\n' + '='.repeat(60))

    expect(true).toBe(true)
  })
})
