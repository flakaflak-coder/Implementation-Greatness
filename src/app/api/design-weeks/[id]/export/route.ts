import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db'
import { DEDesignPDF, mapToDocument } from '@/lib/documents'
import {
  generateDocumentContent,
  buildGenerationContext,
  mergeGeneratedContent,
  type DocumentLanguage,
  LANGUAGE_NAMES,
} from '@/lib/documents/generate-document'
import {
  generateMeetYourDEContent,
  MeetYourDEPDF,
  type MeetYourDEContext,
} from '@/lib/documents/meet-your-de'
import { generateDEAvatar } from '@/lib/gemini'

export const maxDuration = 120 // 2 minutes for LLM + PDF generation

// Error types for client-side handling
type ExportErrorCode =
  | 'DESIGN_WEEK_NOT_FOUND'
  | 'INVALID_LANGUAGE'
  | 'INVALID_TYPE'
  | 'AI_GENERATION_FAILED'
  | 'PDF_RENDER_FAILED'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR'

interface ExportError {
  error: string
  code: ExportErrorCode
  phase?: string
  details?: string
}

function createErrorResponse(
  code: ExportErrorCode,
  message: string,
  status: number,
  phase?: string,
  details?: string
): NextResponse<ExportError> {
  console.error(`[Export] Error (${code}): ${message}`, details ? `Details: ${details}` : '')
  return NextResponse.json(
    { error: message, code, phase, details },
    { status }
  )
}

/**
 * GET /api/design-weeks/[id]/export
 *
 * Generate and download a PDF document for the design week
 *
 * Query params:
 * - type: Document type (default: design)
 *   - design: Full DE Design Document (all sections)
 *   - meet: "Meet Your Digital Employee" one-pager
 *   - test-plan: Test Plan document only
 *   - process: Process Design document
 *   - executive: Executive Summary
 *   - technical: Technical Foundation document
 * - format: 'pdf' | 'json' (default: pdf)
 * - language: 'en' | 'nl' | 'de' | 'fr' | 'es' (default: en)
 * - enhanced: 'true' | 'false' (default: true) - Use LLM to generate polished content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params

  try {
    const { searchParams } = new URL(request.url)
    const docType = searchParams.get('type') || 'design' // 'design' or 'meet'
    const format = searchParams.get('format') || 'pdf'
    const language = (searchParams.get('language') || 'en') as DocumentLanguage
    const enhanced = searchParams.get('enhanced') !== 'false' // Default to true

    // Validate language
    if (!LANGUAGE_NAMES[language]) {
      return createErrorResponse(
        'INVALID_LANGUAGE',
        'Invalid language. Supported: en, nl, de, fr, es',
        400,
        'validation'
      )
    }

    // Validate document type
    const validTypes = ['design', 'meet', 'test-plan', 'process', 'executive', 'technical']
    if (!validTypes.includes(docType)) {
      return createErrorResponse(
        'INVALID_TYPE',
        `Invalid type. Supported: ${validTypes.join(', ')}`,
        400,
        'validation'
      )
    }

    console.log(`[Export] Starting export for design week ${resolvedParams.id}`)
    console.log(`[Export] Type: ${docType}, Language: ${language}, Enhanced: ${enhanced}, Format: ${format}`)

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
      return createErrorResponse(
        'DESIGN_WEEK_NOT_FOUND',
        'Design week not found',
        404,
        'data_fetch'
      )
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MEET YOUR DE DOCUMENT
    // ═══════════════════════════════════════════════════════════════════════════
    if (docType === 'meet') {
      console.log(`[Export] Generating "Meet Your DE" document...`)

      // Build context for Meet Your DE
      const meetContext: MeetYourDEContext = {
        companyName: designWeek.digitalEmployee.company.name,
        digitalEmployeeName: designWeek.digitalEmployee.name,
        deDescription: designWeek.digitalEmployee.description || undefined,
        channels: designWeek.digitalEmployee.channels || [],
        brandTone: undefined, // Could extract from business profile if available
        scopeItems: designWeek.scopeItems.map((item) => ({
          description: item.statement,
          classification: item.classification,
        })),
        guardrails: designWeek.sessions
          .flatMap((s) => s.extractedItems)
          .filter((item) => item.type.includes('GUARDRAIL') || item.type === 'LEGAL_RESTRICTION')
          .map((item) => ({
            type: item.type,
            description: item.content,
          })),
        language,
      }

      // Generate personable content and avatar in parallel
      console.log(`[Export] Generating content and avatar in parallel...`)
      const [meetContent, avatarBase64] = await Promise.all([
        generateMeetYourDEContent(meetContext),
        generateDEAvatar(
          designWeek.digitalEmployee.name,
          meetContext.deDescription || 'Customer service assistant',
          'Friendly, helpful, professional',
          meetContext.brandTone || 'Professional and approachable'
        ),
      ])

      // Add avatar to content if generation succeeded
      if (avatarBase64) {
        meetContent.avatarBase64 = avatarBase64
        console.log(`[Export] Avatar generated successfully`)
      } else {
        console.log(`[Export] Avatar generation skipped or failed, continuing without`)
      }

      // Return JSON if requested
      if (format === 'json') {
        return NextResponse.json({
          success: true,
          type: 'meet',
          language,
          data: meetContent,
        })
      }

      // Generate PDF
      console.log(`[Export] Rendering Meet Your DE PDF...`)
      const pdfElement = React.createElement(MeetYourDEPDF, {
        content: meetContent,
        companyName: designWeek.digitalEmployee.company.name,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfBuffer = await renderToBuffer(pdfElement as any)

      // Create filename
      const sanitizedName = designWeek.digitalEmployee.name
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase()
      const date = new Date().toISOString().split('T')[0]
      const langSuffix = language !== 'en' ? `-${language}` : ''
      const filename = `meet-${sanitizedName}${langSuffix}-${date}.pdf`

      console.log(`[Export] Meet Your DE PDF generated: ${filename} (${pdfBuffer.length} bytes)`)

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FOCUSED DOCUMENT TYPES (test-plan, process, executive, technical)
    // ═══════════════════════════════════════════════════════════════════════════

    // Import focused document templates dynamically
    const {
      TestPlanPDF,
      ProcessDesignPDF,
      ExecutiveSummaryPDF,
      TechnicalFoundationPDF
    } = await import('@/lib/documents/focused-templates')

    // Helper to create filename
    const createFilename = (typePrefix: string) => {
      const sanitizedName = designWeek.digitalEmployee.name
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase()
      const date = new Date().toISOString().split('T')[0]
      const langSuffix = language !== 'en' ? `-${language}` : ''
      return `${sanitizedName}-${typePrefix}${langSuffix}-${date}.pdf`
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

    // ═══════════════════════════════════════════════════════════════════════════
    // FOCUSED DOCUMENT: TEST PLAN
    // ═══════════════════════════════════════════════════════════════════════════
    if (docType === 'test-plan') {
      console.log(`[Export] Generating Test Plan document...`)

      const testPlanContext = {
        companyName: designWeek.digitalEmployee.company.name,
        digitalEmployeeName: designWeek.digitalEmployee.name,
        testCases: testPlanData?.testCases || [],
        scopeItems: designWeek.scopeItems.map(item => ({
          description: item.statement,
          classification: item.classification,
        })),
      }

      if (format === 'json') {
        return NextResponse.json({ success: true, type: 'test-plan', data: testPlanContext })
      }

      const pdfElement = React.createElement(TestPlanPDF, { data: testPlanContext })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfBuffer = await renderToBuffer(pdfElement as any)
      const filename = createFilename('test-plan')

      console.log(`[Export] Test Plan PDF generated: ${filename} (${pdfBuffer.length} bytes)`)

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FOCUSED DOCUMENT: PROCESS DESIGN
    // ═══════════════════════════════════════════════════════════════════════════
    if (docType === 'process') {
      console.log(`[Export] Generating Process Design document...`)

      const extractedItems = designWeek.sessions.flatMap(s => s.extractedItems)
      const processContext = {
        companyName: designWeek.digitalEmployee.company.name,
        digitalEmployeeName: designWeek.digitalEmployee.name,
        happyPathSteps: extractedItems
          .filter(i => i.type === 'HAPPY_PATH_STEP')
          .map(i => ({ content: i.content, structuredData: i.structuredData })),
        exceptions: extractedItems
          .filter(i => i.type === 'EXCEPTION_CASE')
          .map(i => ({ content: i.content, structuredData: i.structuredData })),
        escalationTriggers: extractedItems
          .filter(i => i.type === 'ESCALATION_TRIGGER')
          .map(i => ({ content: i.content, structuredData: i.structuredData })),
        caseTypes: extractedItems
          .filter(i => i.type === 'CASE_TYPE')
          .map(i => ({ content: i.content, structuredData: i.structuredData })),
        channels: extractedItems
          .filter(i => i.type === 'CHANNEL')
          .map(i => ({ content: i.content })),
        scopeItems: designWeek.scopeItems.map(item => ({
          description: item.statement,
          classification: item.classification,
        })),
      }

      if (format === 'json') {
        return NextResponse.json({ success: true, type: 'process', data: processContext })
      }

      const pdfElement = React.createElement(ProcessDesignPDF, { data: processContext })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfBuffer = await renderToBuffer(pdfElement as any)
      const filename = createFilename('process-design')

      console.log(`[Export] Process Design PDF generated: ${filename} (${pdfBuffer.length} bytes)`)

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FOCUSED DOCUMENT: EXECUTIVE SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════
    if (docType === 'executive') {
      console.log(`[Export] Generating Executive Summary document...`)

      const extractedItems = designWeek.sessions.flatMap(s => s.extractedItems)
      const executiveContext = {
        companyName: designWeek.digitalEmployee.company.name,
        digitalEmployeeName: designWeek.digitalEmployee.name,
        description: designWeek.digitalEmployee.description,
        goals: extractedItems
          .filter(i => i.type === 'GOAL' || i.type === 'BUSINESS_CASE')
          .map(i => ({ content: i.content })),
        kpis: extractedItems
          .filter(i => i.type === 'KPI_TARGET')
          .map(i => ({ content: i.content, structuredData: i.structuredData })),
        stakeholders: extractedItems
          .filter(i => i.type === 'STAKEHOLDER')
          .map(i => ({ content: i.content, structuredData: i.structuredData })),
        volumes: extractedItems
          .filter(i => i.type === 'VOLUME_EXPECTATION')
          .map(i => ({ content: i.content, structuredData: i.structuredData })),
        integrationCount: designWeek.integrations.length,
        scopeInCount: designWeek.scopeItems.filter(s => s.classification === 'IN_SCOPE').length,
        scopeOutCount: designWeek.scopeItems.filter(s => s.classification === 'OUT_OF_SCOPE').length,
      }

      if (format === 'json') {
        return NextResponse.json({ success: true, type: 'executive', data: executiveContext })
      }

      const pdfElement = React.createElement(ExecutiveSummaryPDF, { data: executiveContext })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfBuffer = await renderToBuffer(pdfElement as any)
      const filename = createFilename('executive-summary')

      console.log(`[Export] Executive Summary PDF generated: ${filename} (${pdfBuffer.length} bytes)`)

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FOCUSED DOCUMENT: TECHNICAL FOUNDATION
    // ═══════════════════════════════════════════════════════════════════════════
    if (docType === 'technical') {
      console.log(`[Export] Generating Technical Foundation document...`)

      const extractedItems = designWeek.sessions.flatMap(s => s.extractedItems)
      const technicalContext = {
        companyName: designWeek.digitalEmployee.company.name,
        digitalEmployeeName: designWeek.digitalEmployee.name,
        integrations: designWeek.integrations.map(item => ({
          systemName: item.systemName,
          purpose: item.purpose,
          type: item.type,
          authMethod: item.authMethod,
          endpoint: item.endpoint,
        })),
        dataFields: extractedItems
          .filter(i => i.type === 'DATA_FIELD')
          .map(i => ({ content: i.content, structuredData: i.structuredData })),
        securityRequirements: extractedItems
          .filter(i => i.type === 'SECURITY_REQUIREMENT')
          .map(i => ({ content: i.content })),
        complianceRequirements: extractedItems
          .filter(i => i.type === 'COMPLIANCE_REQUIREMENT')
          .map(i => ({ content: i.content })),
        apiEndpoints: extractedItems
          .filter(i => i.type === 'API_ENDPOINT')
          .map(i => ({ content: i.content, structuredData: i.structuredData })),
      }

      if (format === 'json') {
        return NextResponse.json({ success: true, type: 'technical', data: technicalContext })
      }

      const pdfElement = React.createElement(TechnicalFoundationPDF, { data: technicalContext })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfBuffer = await renderToBuffer(pdfElement as any)
      const filename = createFilename('technical-foundation')

      console.log(`[Export] Technical Foundation PDF generated: ${filename} (${pdfBuffer.length} bytes)`)

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DESIGN DOCUMENT (default - full document)
    // ═══════════════════════════════════════════════════════════════════════════

    // Build the raw data structure needed for mapping
    const rawData = {
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
        description: item.statement,
        classification: item.classification as 'IN_SCOPE' | 'OUT_OF_SCOPE' | 'AMBIGUOUS',
        skill: item.skill,
        conditions: item.conditions,
        notes: item.notes,
      })),
      integrations: designWeek.integrations.map(item => ({
        id: item.id,
        systemName: item.systemName,
        purpose: item.purpose || 'read_write',
        connectionType: item.type || 'API',
        authMethod: item.authMethod,
        notes: item.endpoint,
      })),
      businessRules: [],
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
    }

    // Map data to document structure
    let documentData = mapToDocument(rawData)

    // If enhanced mode, use LLM to generate polished content
    if (enhanced) {
      console.log(`[Export] Generating enhanced content with LLM...`)

      try {
        // Build context for LLM generation
        const generationContext = buildGenerationContext(
          {
            digitalEmployee: {
              name: designWeek.digitalEmployee.name,
              description: designWeek.digitalEmployee.description,
              company: { name: designWeek.digitalEmployee.company.name },
            },
            sessions: designWeek.sessions.map(session => ({
              extractedItems: session.extractedItems.map(item => ({
                type: item.type,
                content: item.content,
                status: item.status,
                structuredData: item.structuredData as Record<string, unknown> | null,
              })),
            })),
            scopeItems: designWeek.scopeItems.map(item => ({
              description: item.statement,
              classification: item.classification,
              skill: item.skill,
              conditions: item.conditions,
              notes: item.notes,
            })),
            integrations: designWeek.integrations.map(item => ({
              systemName: item.systemName,
              purpose: item.purpose || 'read_write',
              connectionType: item.type || 'API',
            })),
            businessRules: [],
          },
          language
        )

        // Generate polished content
        const generatedContent = await generateDocumentContent(generationContext)

        // Check if generation fell back to placeholder content
        if (generatedContent._metadata?.isFallback) {
          console.warn(`[Export] AI generation used fallback content`)
        }

        // Merge generated content into document
        documentData = mergeGeneratedContent(documentData, generatedContent)

        console.log(`[Export] Enhanced content generated successfully`)
      } catch (aiError) {
        console.error(`[Export] AI generation failed:`, aiError)
        return createErrorResponse(
          'AI_GENERATION_FAILED',
          'Failed to generate AI-enhanced content. Try again or use basic mode.',
          500,
          'ai_generation',
          aiError instanceof Error ? aiError.message : 'Unknown AI error'
        )
      }
    }

    // Return JSON if requested
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        language,
        enhanced,
        data: documentData,
      })
    }

    // Generate PDF
    console.log(`[Export] Rendering PDF...`)
    const pdfElement = DEDesignPDF({ data: documentData })
    const pdfBuffer = await renderToBuffer(pdfElement as Parameters<typeof renderToBuffer>[0])

    // Create filename
    const sanitizedName = designWeek.digitalEmployee.name
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
    const date = new Date().toISOString().split('T')[0]
    const langSuffix = language !== 'en' ? `-${language}` : ''
    const filename = `${sanitizedName}-design-document${langSuffix}-${date}.pdf`

    console.log(`[Export] PDF generated: ${filename} (${pdfBuffer.length} bytes)`)

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[Export] Error:', error)

    // Determine error type based on error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    let code: ExportErrorCode = 'UNKNOWN_ERROR'
    let phase = 'unknown'

    if (errorMessage.includes('Prisma') || errorMessage.includes('database')) {
      code = 'DATABASE_ERROR'
      phase = 'data_fetch'
    } else if (errorMessage.includes('Claude') || errorMessage.includes('Anthropic') || errorMessage.includes('AI')) {
      code = 'AI_GENERATION_FAILED'
      phase = 'ai_generation'
    } else if (errorMessage.includes('PDF') || errorMessage.includes('render')) {
      code = 'PDF_RENDER_FAILED'
      phase = 'pdf_render'
    }

    return createErrorResponse(
      code,
      'Failed to generate document',
      500,
      phase,
      errorMessage
    )
  }
}
