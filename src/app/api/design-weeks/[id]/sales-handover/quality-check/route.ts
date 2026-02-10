import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { trackLLMOperationServer } from '@/lib/observatory/tracking'
import { validateId } from '@/lib/validation'

// Lazy-initialize to avoid errors during Next.js build
let _anthropic: Anthropic | null = null
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }
  return _anthropic
}

const QUALITY_CHECK_PROMPT = `You are an expert implementation consultant reviewing a sales-to-implementation handover document for a Digital Employee (AI agent) project.

Analyze the following sales handover profile and provide a quality assessment.

Evaluate:
1. Is the deal context clear enough for an implementation lead to understand the engagement?
2. Are there any obvious missing pieces (watch-outs, deadlines, stakeholders)?
3. Are the promised capabilities specific enough to be actionable during Design Week?
4. Is there enough information about client politics, decision-makers, and constraints?
5. Are deadlines realistic and clearly categorized?

Respond ONLY with valid JSON in this exact format:
{
  "rating": "excellent" | "good" | "needs_work" | "insufficient",
  "summary": "One-sentence overall assessment",
  "missingItems": ["List of specific missing information that would help the implementation team"],
  "suggestions": ["Actionable suggestions to improve the handover quality"]
}

Rating criteria:
- "excellent": All sections well-filled, clear context, specific promises, identified risks
- "good": Most sections filled, some detail missing but workable
- "needs_work": Key sections incomplete, vague information, missing stakeholders or deadlines
- "insufficient": Too little information to begin implementation planning`

/**
 * POST /api/design-weeks/[id]/sales-handover/quality-check
 *
 * Runs an AI quality check on the sales handover profile.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: designWeekId } = await params
    const idCheck = validateId(designWeekId)
    if (!idCheck.success) return idCheck.response

    const body = await request.json()
    const { profile } = body

    if (!profile) {
      return NextResponse.json({ error: 'Profile is required' }, { status: 400 })
    }

    const prompt = `${QUALITY_CHECK_PROMPT}

SALES HANDOVER PROFILE:
${JSON.stringify(profile, null, 2)}`

    const startTime = Date.now()
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })
    const latencyMs = Date.now() - startTime

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = textContent.text.trim()
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const result = JSON.parse(jsonStr)

    // Track the LLM operation
    await trackLLMOperationServer({
      pipelineName: 'sales-handover-quality-check',
      model: 'claude-sonnet-4-20250514',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs,
      success: true,
      metadata: { designWeekId, rating: result.rating },
    }).catch(() => {}) // Don't fail the request if tracking fails

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error running quality check:', error)
    return NextResponse.json(
      { error: 'Quality check failed. Please try again.' },
      { status: 500 }
    )
  }
}
