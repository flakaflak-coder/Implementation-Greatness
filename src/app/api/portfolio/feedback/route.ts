import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

// Lazy-initialized Gemini client
let _ai: GoogleGenAI | null = null

function getAI(): GoogleGenAI {
  if (!_ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  }
  return _ai
}

// Request validation schema
const FeedbackRequestSchema = z.object({
  feedback: z.string().min(1).max(2000),
  section: z.enum(['timeline', 'dashboard', 'weekplan', 'global']).default('global'),
  digitalEmployees: z.array(z.object({
    id: z.string(),
    name: z.string(),
    companyName: z.string(),
    trackerStatus: z.string(),
    riskLevel: z.string(),
    percentComplete: z.number(),
    startWeek: z.number().nullable(),
    endWeek: z.number().nullable(),
    goLiveWeek: z.number().nullable(),
    blocker: z.string().nullable(),
    thisWeekActions: z.string().nullable(),
    ownerClient: z.string().nullable(),
    ownerFreedayProject: z.string().nullable(),
    ownerFreedayEngineering: z.string().nullable(),
  })),
})

// Field label mapping
const fieldLabels: Record<string, string> = {
  trackerStatus: 'Status',
  riskLevel: 'Risk Level',
  percentComplete: 'Progress (%)',
  startWeek: 'Start Week',
  endWeek: 'End Week',
  goLiveWeek: 'Go-Live Week',
  blocker: 'Blocker',
  thisWeekActions: 'This Week Actions',
  ownerClient: 'Client Owner',
  ownerFreedayProject: 'Freeday Project Owner',
  ownerFreedayEngineering: 'Freeday Engineering Owner',
}

/**
 * POST /api/portfolio/feedback
 * Process natural language feedback with AI and suggest changes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = FeedbackRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { feedback, section, digitalEmployees } = validation.data

    if (digitalEmployees.length === 0) {
      return NextResponse.json({
        success: false,
        changes: [],
        explanation: 'No Digital Employees provided for analysis.',
      })
    }

    const ai = getAI()

    const prompt = `You are an AI assistant helping manage Digital Employee implementation projects.

## Context
The user manages Digital Employee implementations with these fields:
- trackerStatus: 'ON_TRACK' | 'ATTENTION' | 'BLOCKED' | 'TO_PLAN' (current status)
- riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' (risk level)
- percentComplete: 0-100 (progress percentage)
- startWeek: 1-52 (start week number)
- endWeek: 1-52 (end week number)
- goLiveWeek: 1-52 or null (target go-live week)
- blocker: string or null (current blocker description)
- thisWeekActions: string or null (actions for this week)
- ownerClient: string or null (client owner name)
- ownerFreedayProject: string or null (Freeday project owner)
- ownerFreedayEngineering: string or null (Freeday engineering owner)

## Current Digital Employees
${JSON.stringify(digitalEmployees, null, 2)}

## User Feedback
"${feedback}"

## Section Focus
${section === 'timeline' ? 'Focus on timeline fields: startWeek, endWeek, goLiveWeek' : ''}
${section === 'dashboard' ? 'Focus on status fields: trackerStatus, riskLevel, percentComplete, blocker' : ''}
${section === 'weekplan' ? 'Focus on actions: thisWeekActions' : ''}
${section === 'global' ? 'All fields are relevant' : ''}

## Instructions
Analyze the feedback and determine what changes are needed.
Return a JSON response with EXACTLY this format:

{
  "changes": [
    {
      "deId": "uuid-of-digital-employee",
      "deName": "Name of DE",
      "companyName": "Company name",
      "field": "fieldname",
      "fieldLabel": "Human readable label",
      "oldValue": "current value",
      "newValue": "new value"
    }
  ],
  "explanation": "Brief explanation of the changes",
  "warnings": ["Optional warnings if there are risks"]
}

## Rules
1. Use ONLY existing DE IDs from the context
2. Use ONLY valid values for enum fields - USE UPPERCASE with underscores (ON_TRACK, not on_track)
3. For week shifts, adjust both startWeek AND endWeek (preserve duration)
4. If you can't identify a DE, explain in explanation and return empty changes array
5. Give a warning if the change is risky (e.g., setting everything to blocked)
6. Interpret both English and Dutch input
7. When shifting "X weeks forward/backward", adjust both start and end weeks by X

Respond ONLY with valid JSON, no markdown code blocks.`

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    })

    const responseText = response.text?.trim() || ''

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonText = responseText
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    let result
    try {
      result = JSON.parse(jsonText)
    } catch {
      console.error('Failed to parse AI response:', responseText.slice(0, 500))
      return NextResponse.json({
        success: false,
        changes: [],
        explanation: 'Could not process AI response. Try rephrasing your feedback.',
      }, { status: 500 })
    }

    // Validate response structure
    if (!result.changes || !Array.isArray(result.changes)) {
      result.changes = []
    }

    // Add field labels to changes
    result.changes = result.changes.map((change: Record<string, unknown>) => ({
      ...change,
      fieldLabel: change.fieldLabel || fieldLabels[change.field as string] || change.field,
    }))

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error processing portfolio feedback:', error)
    return NextResponse.json({
      success: false,
      changes: [],
      explanation: 'An error occurred processing your feedback. Please try again.',
    }, { status: 500 })
  }
}

/**
 * PATCH /api/portfolio/feedback
 * Apply AI-suggested changes to Digital Employees
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { changes } = body

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No changes to apply' },
        { status: 400 }
      )
    }

    // Group changes by DE
    const changesByDE = new Map<string, Record<string, unknown>>()
    for (const change of changes) {
      const deId = change.deId
      if (!changesByDE.has(deId)) {
        changesByDE.set(deId, {})
      }
      const deChanges = changesByDE.get(deId)!
      deChanges[change.field] = change.newValue
    }

    // Apply changes
    const updates = []
    for (const [deId, data] of changesByDE) {
      updates.push(
        prisma.digitalEmployee.update({
          where: { id: deId },
          data,
        })
      )
    }

    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      message: `Applied ${changes.length} change(s) to ${changesByDE.size} Digital Employee(s)`,
    })
  } catch (error) {
    console.error('Error applying feedback changes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to apply changes' },
      { status: 500 }
    )
  }
}
