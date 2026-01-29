import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db'
import { DEDesignPDF, mapToDocument } from '@/lib/documents'

export const maxDuration = 60 // 1 minute for PDF generation

/**
 * GET /api/design-weeks/[id]/export
 *
 * Generate and download a PDF document for the design week
 *
 * Query params:
 * - type: 'DE_DESIGN' | 'SOLUTION_DESIGN' | 'TEST_PLAN' (default: DE_DESIGN)
 * - format: 'pdf' | 'json' (default: pdf)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params

  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'pdf'

    // Fetch design week with all related data
    const designWeek = await prisma.designWeek.findUnique({
      where: { id: resolvedParams.id },
      include: {
        digitalEmployee: {
          include: {
            company: true,
          },
        },
        sessions: {
          include: {
            extractedItems: {
              where: {
                status: { in: ['APPROVED', 'PENDING'] },
              },
            },
          },
        },
        scopeItems: {
          where: {
            excludeFromDocument: false,
          },
        },
        integrations: true,
      },
    })

    if (!designWeek) {
      return NextResponse.json(
        { error: 'Design week not found' },
        { status: 404 }
      )
    }

    // Extract test cases from testPlan JSON field
    const testPlanData = designWeek.testPlan as { testCases?: Array<{
      id: string
      name: string
      type: string
      priority: string
      preconditions?: string
      steps: string[]
      expectedResult: string
    }> } | null

    // Map data to document structure
    const documentData = mapToDocument({
      id: designWeek.id,
      digitalEmployee: {
        id: designWeek.digitalEmployee.id,
        name: designWeek.digitalEmployee.name,
        description: designWeek.digitalEmployee.description,
        company: {
          name: designWeek.digitalEmployee.company.name,
        },
      },
      sessions: designWeek.sessions.map(session => ({
        extractedItems: session.extractedItems.map(item => ({
          id: item.id,
          type: item.type,
          content: item.content,
          rawJson: item.structuredData as Record<string, unknown> | null,
          confidence: item.confidence ?? undefined,
          status: item.status,
        })),
      })),
      scopeItems: designWeek.scopeItems.map(item => ({
        id: item.id,
        description: item.statement, // schema uses 'statement'
        classification: item.classification as 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS',
        skill: item.skill,
        conditions: item.conditions,
        notes: item.notes,
      })),
      integrations: designWeek.integrations.map(item => ({
        id: item.id,
        systemName: item.systemName,
        purpose: item.purpose || 'read_write',
        connectionType: item.type || 'API', // schema uses 'type'
        authMethod: item.authMethod,
        notes: item.endpoint, // use endpoint as notes
      })),
      // Business rules come from extracted items (mapped in data-mapper)
      businessRules: [],
      // Test cases come from testPlan JSON field
      testCases: testPlanData?.testCases?.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        priority: item.priority,
        preconditions: item.preconditions || null,
        steps: item.steps,
        expectedResult: item.expectedResult,
      })) || [],
      businessProfile: designWeek.businessProfile as Record<string, unknown> | null,
      technicalProfile: designWeek.technicalProfile as Record<string, unknown> | null,
    })

    // Return JSON if requested
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: documentData,
      })
    }

    // Generate PDF
    const pdfElement = DEDesignPDF({ data: documentData })
    const pdfBuffer = await renderToBuffer(pdfElement as React.ReactElement)

    // Create filename
    const sanitizedName = designWeek.digitalEmployee.name
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
    const date = new Date().toISOString().split('T')[0]
    const filename = `${sanitizedName}-design-document-${date}.pdf`

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
