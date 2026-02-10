import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId } from '@/lib/validation'

const PHASE_NAMES: Record<number, string> = {
  1: 'Kickoff',
  2: 'Process Design',
  3: 'Technical',
  4: 'Sign-off',
}

const PHASE_FOCUS: Record<number, string> = {
  1: 'aligning on goals, stakeholders, and success criteria',
  2: 'mapping out the core workflows and processes',
  3: 'working through the technical integration details',
  4: 'finalizing everything for go-live approval',
}

const PHASE_ACCOMPLISHMENTS: Record<number, string[]> = {
  1: [
    'Aligned on project goals and success criteria',
    'Identified key stakeholders and decision-makers',
  ],
  2: [
    'Completed initial discovery and goal alignment',
    'Mapped out core processes and workflows',
    'Identified key decision points and escalation paths',
  ],
  3: [
    'Fully mapped all core processes and edge cases',
    'Defined escalation paths and handoff points',
    'Began technical integration planning',
  ],
  4: [
    'Completed process design and technical integration planning',
    'Finalized all system integration requirements',
    'Prepared implementation documentation for review',
  ],
}

const PHASE_NEXT_STEPS: Record<number, string[]> = {
  1: [
    'Begin process discovery sessions to map out core workflows',
    'Define success metrics and volume expectations',
  ],
  2: [
    'Continue refining process maps and edge cases',
    'Move into technical integration planning',
  ],
  3: [
    'Finalize integration specifications and data requirements',
    'Prepare sign-off documentation for your review',
  ],
  4: [
    'Complete final review of all implementation details',
    'Obtain sign-off and move into the build phase',
  ],
}

interface StatusUpdateParams {
  params: Promise<{ id: string }>
}

// GET /api/digital-employees/[id]/status-update - Generate client-facing status update
export async function GET(
  request: Request,
  { params }: StatusUpdateParams
) {
  try {
    const { id } = await params
    const idCheck = validateId(id)
    if (!idCheck.success) return idCheck.response

    // Fetch the Digital Employee with all relevant data
    const de = await prisma.digitalEmployee.findUnique({
      where: { id },
      include: {
        company: {
          select: { name: true },
        },
        designWeek: {
          include: {
            sessions: {
              select: {
                id: true,
                phase: true,
                processingStatus: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
            scopeItems: {
              select: {
                id: true,
                classification: true,
                status: true,
              },
            },
          },
        },
        journeyPhases: {
          select: {
            phaseType: true,
            status: true,
            blockedReason: true,
          },
        },
      },
    })

    if (!de) {
      return NextResponse.json(
        { success: false, error: 'Digital Employee not found' },
        { status: 404 }
      )
    }

    const dw = de.designWeek
    if (!dw) {
      return NextResponse.json(
        { success: false, error: 'No Design Week found for this Digital Employee' },
        { status: 404 }
      )
    }

    // Calculate stats
    const currentPhase = dw.currentPhase
    const phaseName = PHASE_NAMES[currentPhase] || `Phase ${currentPhase}`
    const phaseFocus = PHASE_FOCUS[currentPhase] || 'ongoing work'

    const totalSessions = dw.sessions.length
    const currentPhaseSessions = dw.sessions.filter(s => s.phase === currentPhase).length

    const ambiguousScope = dw.scopeItems.filter(s => s.classification === 'AMBIGUOUS').length

    // Check for blockers
    const blockedPhases = de.journeyPhases?.filter(p => p.status === 'BLOCKED') || []
    const hasBlocker = blockedPhases.length > 0

    // Calculate progress percentage (rough estimate based on phase)
    const phaseProgress = Math.min(100, (currentPhase - 1) * 25 + (currentPhaseSessions > 0 ? 15 : 0))

    // Build accomplishments from completed phases
    const accomplishments: string[] = []
    for (let p = 1; p <= currentPhase; p++) {
      const phaseAccomplishments = PHASE_ACCOMPLISHMENTS[p] || []
      if (p < currentPhase) {
        accomplishments.push(...phaseAccomplishments)
      } else if (currentPhaseSessions > 0) {
        accomplishments.push(phaseAccomplishments[0])
      }
    }
    // Add session-based accomplishment if we have sessions
    if (totalSessions > 0 && accomplishments.length < 2) {
      accomplishments.push(`Completed ${totalSessions} design session${totalSessions !== 1 ? 's' : ''}`)
    }

    const nextSteps = PHASE_NEXT_STEPS[currentPhase] || []

    // Generate the status update text
    const lines: string[] = []

    // Header
    lines.push(`# ${de.name} — Status Update`)
    lines.push(`**${de.company.name}** · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`)
    lines.push('')

    // Status line
    if (hasBlocker) {
      lines.push(`**Status: ⚠️ Needs attention** — we're progressing well, with ${blockedPhases.length === 1 ? 'one item' : 'a few items'} that need resolution.`)
    } else {
      lines.push(`**Status: ✅ On track** — implementation is progressing well (~${phaseProgress}% through the design phase).`)
    }
    lines.push('')

    // Progress - what we've accomplished
    if (accomplishments.length > 0) {
      lines.push(`### What we've accomplished`)
      for (const item of accomplishments.slice(0, 5)) {
        lines.push(`- ${item}`)
      }
      lines.push('')
    }

    // Where we are now
    lines.push(`### Where we are now`)
    lines.push(`We're currently focused on ${phaseFocus} for ${de.name}. ${currentPhaseSessions > 0 ? `We've completed ${currentPhaseSessions} session${currentPhaseSessions !== 1 ? 's' : ''} in this phase so far.` : 'Sessions for this phase are being scheduled.'}`)
    lines.push('')

    // What's coming next
    if (nextSteps.length > 0) {
      lines.push(`### Coming up next`)
      for (const step of nextSteps) {
        lines.push(`- ${step}`)
      }
      lines.push('')
    }

    // Input needed (only if applicable)
    if (ambiguousScope > 0) {
      lines.push(`### Your input needed`)
      lines.push(`- We have ${ambiguousScope} item${ambiguousScope !== 1 ? 's' : ''} that would benefit from your clarification — happy to walk through ${ambiguousScope === 1 ? 'it' : 'them'} on a quick call`)
      lines.push('')
    }

    // Blockers — always last before footer
    if (hasBlocker) {
      lines.push(`### Blockers`)
      for (const blocked of blockedPhases) {
        lines.push(`- **${blocked.phaseType}:** ${blocked.blockedReason || 'Awaiting information to proceed'}`)
      }
      lines.push('')
      lines.push(`We've identified a path forward for ${blockedPhases.length === 1 ? 'this' : 'each of these'} — let's connect this week to get things moving again.`)
      lines.push('')
    }

    // Footer
    lines.push(`---`)
    lines.push(`*For questions, reach out to your assigned consultant directly.*`)

    const statusUpdate = lines.join('\n')

    // Shorter version for quick sharing
    const shortUpdate = hasBlocker
      ? `${de.name}: ⚠️ Needs attention — ${blockedPhases[0].blockedReason || 'Awaiting resolution'}. Currently in ${phaseName} phase (~${phaseProgress}%).`
      : `${de.name}: ✅ On track — ${phaseName} phase (~${phaseProgress}% complete). Making strong progress.`

    return NextResponse.json({
      success: true,
      data: {
        digitalEmployee: {
          id: de.id,
          name: de.name,
        },
        company: de.company.name,
        currentPhase,
        phaseName,
        isBlocked: hasBlocker,
        blockedReason: blockedPhases[0]?.blockedReason || null,
        progress: phaseProgress,
        statusUpdate,
        shortUpdate,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error generating status update:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate status update' },
      { status: 500 }
    )
  }
}
