import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateId } from '@/lib/validation'

const PHASE_NAMES: Record<number, string> = {
  1: 'Kickoff',
  2: 'Process Design',
  3: 'Technical',
  4: 'Sign-off',
}

const PHASE_DESCRIPTIONS: Record<number, string> = {
  1: 'initial discovery and goal alignment',
  2: 'mapping out processes and workflows',
  3: 'technical integration planning',
  4: 'final review and approval',
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
    const phaseDescription = PHASE_DESCRIPTIONS[currentPhase] || 'ongoing work'

    const totalSessions = dw.sessions.length
    const currentPhaseSessions = dw.sessions.filter(s => s.phase === currentPhase).length

    const totalScope = dw.scopeItems.length
    const confirmedScope = dw.scopeItems.filter(s => s.classification === 'IN_SCOPE').length
    const outOfScope = dw.scopeItems.filter(s => s.classification === 'OUT_OF_SCOPE').length
    const ambiguousScope = dw.scopeItems.filter(s => s.classification === 'AMBIGUOUS').length

    // Check for blockers
    const blockedPhase = de.journeyPhases?.find(p => p.status === 'BLOCKED')
    const hasBlocker = !!blockedPhase

    // Calculate progress percentage (rough estimate based on phase)
    const phaseProgress = Math.min(100, (currentPhase - 1) * 25 + (currentPhaseSessions > 0 ? 15 : 0))

    // Generate the status update text
    const lines: string[] = []

    // Header
    lines.push(`# ${de.name} - Status Update`)
    lines.push(`**${de.company.name}**`)
    lines.push(`*Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*`)
    lines.push('')

    // Overall Status
    if (hasBlocker) {
      lines.push(`## ⚠️ Status: Blocked`)
      lines.push(`We've encountered a blocker that needs resolution: **${blockedPhase.blockedReason || 'Awaiting information'}**`)
      lines.push('')
      lines.push(`Once this is resolved, we'll continue with the implementation.`)
    } else {
      lines.push(`## ✅ Status: On Track`)
      lines.push(`Implementation is progressing well through the Design Week process.`)
    }
    lines.push('')

    // Current Phase
    lines.push(`## Current Phase: ${phaseName}`)
    lines.push(`We're currently in the **${phaseName}** phase, focused on ${phaseDescription}.`)
    lines.push('')

    // Progress
    lines.push(`### Progress`)
    lines.push(`- **Overall Progress:** ~${phaseProgress}% complete`)
    lines.push(`- **Sessions Completed:** ${totalSessions} session${totalSessions !== 1 ? 's' : ''}`)
    if (totalScope > 0) {
      lines.push(`- **Scope Items Identified:** ${totalScope} total`)
      if (confirmedScope > 0) {
        lines.push(`  - ${confirmedScope} confirmed in scope`)
      }
      if (outOfScope > 0) {
        lines.push(`  - ${outOfScope} marked out of scope`)
      }
      if (ambiguousScope > 0) {
        lines.push(`  - ${ambiguousScope} requiring clarification`)
      }
    }
    lines.push('')

    // What's Next
    lines.push(`### What's Next`)
    if (currentPhase === 1) {
      lines.push(`- Complete kickoff session and confirm project goals`)
      lines.push(`- Begin process discovery sessions`)
    } else if (currentPhase === 2) {
      lines.push(`- Continue mapping processes and workflows`)
      lines.push(`- Identify any edge cases or exceptions`)
      lines.push(`- Move to technical planning phase`)
    } else if (currentPhase === 3) {
      lines.push(`- Finalize technical integration requirements`)
      lines.push(`- Confirm data fields and API specifications`)
      lines.push(`- Prepare for sign-off phase`)
    } else if (currentPhase === 4) {
      lines.push(`- Complete final review of all scope items`)
      lines.push(`- Obtain sign-off on implementation plan`)
      lines.push(`- Begin development phase`)
    }
    lines.push('')

    // Action Items (if any)
    if (ambiguousScope > 0 || hasBlocker) {
      lines.push(`### Action Items`)
      if (hasBlocker) {
        lines.push(`- **Priority:** ${blockedPhase.blockedReason || 'Resolve blocking issue'}`)
      }
      if (ambiguousScope > 0) {
        lines.push(`- Clarify ${ambiguousScope} scope item${ambiguousScope !== 1 ? 's' : ''} that need${ambiguousScope === 1 ? 's' : ''} input`)
      }
      lines.push('')
    }

    // Footer
    lines.push(`---`)
    lines.push(`*This update was generated by the Implementation Team. For questions, please reach out to your assigned consultant.*`)

    const statusUpdate = lines.join('\n')

    // Also generate a shorter version for quick sharing
    const shortUpdate = hasBlocker
      ? `${de.name}: ⚠️ Blocked - ${blockedPhase.blockedReason || 'Awaiting resolution'}. Currently in ${phaseName} phase.`
      : `${de.name}: ✅ On Track - ${phaseName} phase (~${phaseProgress}% complete). ${totalSessions} session${totalSessions !== 1 ? 's' : ''} completed, ${totalScope} scope items identified.`

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
        blockedReason: blockedPhase?.blockedReason || null,
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
