import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateDocument } from '@/lib/claude'
import { GeneratedDocType } from '@prisma/client'

// Generate a document for a design week
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const body = await request.json()
    const { documentType } = body as {
      documentType: 'DE_DESIGN' | 'SOLUTION_DESIGN' | 'TEST_PLAN'
    }

    if (!documentType) {
      return NextResponse.json(
        { error: 'documentType is required' },
        { status: 400 }
      )
    }

    // Verify design week exists
    const designWeek = await prisma.designWeek.findUnique({
      where: { id: designWeekId },
      include: {
        sessions: {
          include: {
            extractedItems: {
              where: { status: 'APPROVED' },
            },
          },
        },
      },
    })

    if (!designWeek) {
      return NextResponse.json(
        { error: 'Design week not found' },
        { status: 404 }
      )
    }

    // Check if there are approved items
    const approvedCount = designWeek.sessions.reduce(
      (sum, s) => sum + s.extractedItems.length,
      0
    )

    if (approvedCount === 0) {
      return NextResponse.json(
        { error: 'No approved extracted items found. Review and approve items first.' },
        { status: 400 }
      )
    }

    // Get existing version count
    const existingDoc = await prisma.generatedDocument.findFirst({
      where: { designWeekId, type: documentType as GeneratedDocType },
      orderBy: { version: 'desc' },
    })

    // Generate document
    const result = await generateDocument(designWeekId, documentType)

    // Save to database
    const document = await prisma.generatedDocument.create({
      data: {
        designWeekId,
        type: documentType as GeneratedDocType,
        version: existingDoc ? existingDoc.version + 1 : 1,
        status: 'DRAFT',
        content: result.content,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
      },
    })

    // Log to observatory
    await prisma.observatoryLLMOperation.create({
      data: {
        pipelineName: `generate_${documentType.toLowerCase()}`,
        model: 'claude-sonnet-4-20250514',
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
        success: true,
        metadata: {
          designWeekId,
          documentId: document.id,
          version: document.version,
          approvedItemsCount: approvedCount,
        },
      },
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        version: document.version,
        content: document.content,
      },
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
      },
    })
  } catch (error) {
    console.error('Document generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

// Get generated documents for a design week
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params

    const documents = await prisma.generatedDocument.findMany({
      where: { designWeekId },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    })

    // Group by type and return latest version of each
    const latestByType = documents.reduce(
      (acc, doc) => {
        if (!acc[doc.type]) {
          acc[doc.type] = doc
        }
        return acc
      },
      {} as Record<string, (typeof documents)[0]>
    )

    return NextResponse.json({
      documents: Object.values(latestByType),
      allVersions: documents,
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}
