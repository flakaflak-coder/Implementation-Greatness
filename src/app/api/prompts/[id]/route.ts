import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Get a specific prompt template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = await prisma.promptTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    )
  }
}

// Update a prompt template (creates new version)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { prompt, model, temperature, maxTokens, description } = body as {
      prompt?: string
      model?: string
      temperature?: number
      maxTokens?: number
      description?: string
    }

    const existing = await prisma.promptTemplate.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    // Deactivate current version
    await prisma.promptTemplate.update({
      where: { id },
      data: { isActive: false },
    })

    // Create new version
    const template = await prisma.promptTemplate.create({
      data: {
        name: existing.name,
        type: existing.type,
        description: description ?? existing.description,
        prompt: prompt ?? existing.prompt,
        model: model ?? existing.model,
        temperature: temperature ?? existing.temperature,
        maxTokens: maxTokens ?? existing.maxTokens,
        version: existing.version + 1,
        isActive: true,
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    )
  }
}

// Delete a prompt template (soft delete - just deactivate)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.promptTemplate.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prompt:', error)
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    )
  }
}
