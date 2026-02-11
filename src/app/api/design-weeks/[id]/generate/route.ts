import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateDocument } from '@/lib/claude'
import { GeneratedDocType } from '@prisma/client'
import { validateId, validateBody, GenerateDocumentSchema } from '@/lib/validation'

// Generate a document for a design week
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const idCheck = validateId(designWeekId)
    if (!idCheck.success) return idCheck.response

    const validation = await validateBody(request, GenerateDocumentSchema)
    if (!validation.success) return validation.response
    const { documentType } = validation.data as { documentType: 'DE_DESIGN' | 'SOLUTION_DESIGN' | 'TEST_PLAN' }

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
        scopeItems: {
          where: { excludeFromDocument: false },
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

    // Check if there are approved items
    const allItems = designWeek.sessions.flatMap(s => s.extractedItems)
    const approvedCount = allItems.length

    if (approvedCount === 0) {
      return NextResponse.json(
        { error: 'No approved extracted items found. Review and approve items first.' },
        { status: 400 }
      )
    }

    // Detect missing fields
    const missingFields: string[] = []
    if (!allItems.some(i => i.type === 'STAKEHOLDER')) missingFields.push('Stakeholders')
    if (!allItems.some(i => i.type === 'GOAL' || i.type === 'BUSINESS_CASE')) missingFields.push('Goals')
    if (!allItems.some(i => i.type === 'KPI_TARGET')) missingFields.push('KPIs')
    if (!allItems.some(i => i.type === 'HAPPY_PATH_STEP')) missingFields.push('Process Steps')
    if (designWeek.scopeItems.length === 0) missingFields.push('Scope Items')
    if (designWeek.integrations.length === 0 && !allItems.some(i => i.type === 'SYSTEM_INTEGRATION')) missingFields.push('Technical Integrations')
    if (!allItems.some(i => i.type === 'SECURITY_REQUIREMENT' || i.type === 'COMPLIANCE_REQUIREMENT')) missingFields.push('Security Requirements')

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
        model: 'claude-sonnet-4-5-20250929',
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
      missingFields,
    })
  } catch (error) {
    console.error('Document generation error:', error)
    return NextResponse.json(
      { error: 'Document generation failed. Please try again.' },
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
    const idCheck = validateId(designWeekId)
    if (!idCheck.success) return idCheck.response

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
