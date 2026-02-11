import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PromptType } from '@prisma/client'
import { validateBody, CreatePromptSchema } from '@/lib/validation'

// Get all prompt templates
export async function GET() {
  try {
    const templates = await prisma.promptTemplate.findMany({
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    })

    // Group by type and return only active/latest
    const grouped = templates.reduce(
      (acc, template) => {
        if (!acc[template.type]) {
          acc[template.type] = template
        }
        return acc
      },
      {} as Record<string, (typeof templates)[0]>
    )

    return NextResponse.json({
      templates: Object.values(grouped),
      all: templates,
    })
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}

// Create or update a prompt template
export async function POST(request: NextRequest) {
  try {
    const bodyCheck = await validateBody(request, CreatePromptSchema)
    if (!bodyCheck.success) return bodyCheck.response

    const { type, name, description, prompt, model, temperature, maxTokens } =
      bodyCheck.data as {
        type: PromptType
        name?: string
        description?: string
        prompt: string
        model?: string
        temperature?: number
        maxTokens?: number
      }

    // Get current version
    const existing = await prisma.promptTemplate.findFirst({
      where: { type },
      orderBy: { version: 'desc' },
    })

    // Deactivate previous versions
    if (existing) {
      await prisma.promptTemplate.updateMany({
        where: { type },
        data: { isActive: false },
      })
    }

    // Create new version
    const template = await prisma.promptTemplate.create({
      data: {
        name: name || type.toLowerCase().replace(/_/g, '_'),
        type,
        description,
        prompt,
        model: model || 'claude-sonnet-4-5-20250929',
        temperature: temperature ?? 0.3,
        maxTokens: maxTokens ?? 4096,
        version: existing ? existing.version + 1 : 1,
        isActive: true,
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    )
  }
}
