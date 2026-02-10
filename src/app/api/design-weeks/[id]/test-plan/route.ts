import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { TestPlan, TestCase } from '@/components/de-workspace/profile-types'
import { createEmptyTestPlan } from '@/components/de-workspace/profile-types'

/**
 * GET /api/design-weeks/[id]/test-plan
 *
 * Returns the test plan for a design week.
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
                    'HAPPY_PATH_STEP',
                    'EXCEPTION_CASE',
                    'GUARDRAIL_NEVER',
                    'GUARDRAIL_ALWAYS',
                    'SCOPE_IN',
                    'SCOPE_OUT',
                    'LAUNCH_CRITERION',
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

    let testPlan: TestPlan

    if (designWeek.testPlan) {
      testPlan = designWeek.testPlan as unknown as TestPlan
    } else {
      // Generate from extracted items
      const allItems = designWeek.sessions.flatMap((s) => s.extractedItems)
      testPlan = mapExtractedItemsToTestPlan(allItems)
    }

    // Calculate stats
    const totalTests = testPlan.testCases.length
    const passedTests = testPlan.testCases.filter((t) => t.status === 'pass').length
    const failedTests = testPlan.testCases.filter((t) => t.status === 'fail').length
    const notRunTests = testPlan.testCases.filter((t) => t.status === 'not_run').length
    const blockedTests = testPlan.testCases.filter((t) => t.status === 'blocked').length

    return NextResponse.json({
      testPlan,
      stats: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        notRun: notRunTests,
        blocked: blockedTests,
        coveragePercent: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
        hasSavedPlan: !!designWeek.testPlan,
      },
    })
  } catch (error) {
    console.error('Error loading test plan:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load test plan' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/design-weeks/[id]/test-plan
 *
 * Saves the test plan for a design week.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const body = await request.json()
    const { testPlan } = body as { testPlan: TestPlan }

    if (!testPlan) {
      return NextResponse.json({ error: 'Test plan is required' }, { status: 400 })
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
        testPlan: {
          ...testPlan,
          lastUpdated: new Date().toISOString(),
        } as object,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving test plan:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save test plan' },
      { status: 500 }
    )
  }
}

/**
 * Map extracted items to test plan structure
 */
function mapExtractedItemsToTestPlan(
  items: Array<{ type: string; content: string; structuredData: unknown; id: string }>
): TestPlan {
  const testPlan = createEmptyTestPlan()

  for (const item of items) {
    const structured = item.structuredData as Record<string, unknown> | null

    switch (item.type) {
      case 'HAPPY_PATH_STEP':
        testPlan.testCases.push({
          id: `tc-${item.id}`,
          name: `Verify: ${(structured?.title as string) || item.content}`,
          type: 'happy_path',
          priority: 'high',
          status: 'not_run',
          steps: [(structured?.description as string) || item.content],
          expectedResult: `Step completes successfully: ${(structured?.title as string) || item.content}`,
          sourceItemId: item.id,
        })
        break

      case 'EXCEPTION_CASE':
        testPlan.testCases.push({
          id: `tc-${item.id}`,
          name: `Exception: ${(structured?.trigger as string) || item.content}`,
          type: 'exception',
          priority: 'high',
          status: 'not_run',
          steps: [`Trigger: ${(structured?.trigger as string) || item.content}`],
          expectedResult: `System handles exception: ${(structured?.action as string) || 'as expected'}`,
          sourceItemId: item.id,
        })
        break

      case 'GUARDRAIL_NEVER':
        testPlan.testCases.push({
          id: `tc-${item.id}`,
          name: `Guardrail: Never ${item.content}`,
          type: 'guardrail',
          priority: 'critical',
          status: 'not_run',
          steps: [`Attempt to trigger forbidden action: ${item.content}`],
          expectedResult: 'System prevents the action',
          sourceItemId: item.id,
        })
        break

      case 'GUARDRAIL_ALWAYS':
        testPlan.testCases.push({
          id: `tc-${item.id}`,
          name: `Guardrail: Always ${item.content}`,
          type: 'guardrail',
          priority: 'critical',
          status: 'not_run',
          steps: [`Verify mandatory behavior: ${item.content}`],
          expectedResult: 'System always performs this action',
          sourceItemId: item.id,
        })
        break

      case 'SCOPE_IN':
        testPlan.testCases.push({
          id: `tc-${item.id}`,
          name: `In Scope: ${item.content}`,
          type: 'scope',
          priority: 'medium',
          status: 'not_run',
          steps: [`Present in-scope request: ${item.content}`],
          expectedResult: 'System handles the request correctly',
          sourceItemId: item.id,
        })
        break

      case 'SCOPE_OUT':
        testPlan.testCases.push({
          id: `tc-${item.id}`,
          name: `Out of Scope: ${item.content}`,
          type: 'boundary',
          priority: 'medium',
          status: 'not_run',
          steps: [`Present out-of-scope request: ${item.content}`],
          expectedResult: 'System rejects or escalates appropriately',
          sourceItemId: item.id,
        })
        break
    }
  }

  return testPlan
}
