import { NextRequest, NextResponse } from 'next/server'
import { generateDEDescription, generateDEDescriptionVariants, generateDETagline } from '@/lib/de-description-generator'
import { validateBody, GenerateDescriptionSchema } from '@/lib/validation'

/**
 * POST /api/digital-employees/generate-description
 *
 * Generates a personalized description for a Digital Employee.
 *
 * Body:
 * {
 *   name: string (required)
 *   department?: string
 *   companyName: string (required)
 *   channels?: string[]
 *   skills?: string[]
 *   variants?: number (default: 1, max: 5)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, GenerateDescriptionSchema.passthrough())
    if (!validation.success) return validation.response
    const { name, companyName, channels } = validation.data
    const { department, skills, variants = 1 } = validation.data as Record<string, unknown> as { department?: string; skills?: string[]; variants?: number }

    const input = {
      name,
      department,
      companyName,
      channels,
      skills,
    }

    // Generate description(s)
    const numVariants = Math.min(Math.max(1, variants), 5)

    if (numVariants === 1) {
      const description = generateDEDescription(input)
      const tagline = generateDETagline(input)

      return NextResponse.json({
        description,
        tagline,
      })
    }

    // Multiple variants requested
    const descriptions = generateDEDescriptionVariants(input, numVariants)
    const tagline = generateDETagline(input)

    return NextResponse.json({
      descriptions,
      tagline,
    })
  } catch (error) {
    console.error('Error generating description:', error)
    return NextResponse.json(
      { error: 'Failed to generate description. Please try again.' },
      { status: 500 }
    )
  }
}
