import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JourneyTimeline } from './journey-timeline'

// Minimal phases for most tests: just the main journey phases
const allPhaseIds = [
  'SALES_HANDOVER',
  'KICKOFF',
  'DESIGN_WEEK',
  'ONBOARDING',
  'UAT',
  'GO_LIVE',
  'HYPERCARE',
  'HANDOVER_TO_SUPPORT',
]

const allPhaseLabels = [
  'Sales Handover',
  'Kickoff',
  'Design Week',
  'Onboarding',
  'UAT',
  'Go Live',
  'Hypercare',
  'Handover to Support',
]

describe('JourneyTimeline', () => {
  // --- Basic rendering ---

  it('renders all journey phase labels', () => {
    render(
      <JourneyTimeline
        currentPhase="KICKOFF"
        phases={[{ id: 'KICKOFF', status: 'current' }]}
      />
    )

    for (const label of allPhaseLabels) {
      // "Kickoff" appears twice: as a main phase and a Design Week sub-phase
      const elements = screen.getAllByText(label)
      expect(elements.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('renders phase descriptions in non-compact mode', () => {
    render(
      <JourneyTimeline
        currentPhase="KICKOFF"
        phases={[{ id: 'KICKOFF', status: 'current' }]}
      />
    )

    expect(screen.getByText('Project initiation and alignment')).toBeInTheDocument()
    expect(screen.getByText('Initial client information transfer')).toBeInTheDocument()
  })

  it('hides phase descriptions in compact mode', () => {
    render(
      <JourneyTimeline
        currentPhase="KICKOFF"
        phases={[{ id: 'KICKOFF', status: 'current' }]}
        compact={true}
      />
    )

    // Descriptions should not be rendered in compact mode
    expect(screen.queryByText('Project initiation and alignment')).not.toBeInTheDocument()
  })

  // --- Phase status styling ---

  it('shows completion percentage badge for the current phase when provided', () => {
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[
          { id: 'SALES_HANDOVER', status: 'complete' },
          { id: 'KICKOFF', status: 'complete' },
          { id: 'DESIGN_WEEK', status: 'current', completionPercentage: 65 },
        ]}
      />
    )

    expect(screen.getByText('65%')).toBeInTheDocument()
  })

  it('does not show completion percentage for non-current phases', () => {
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[
          { id: 'SALES_HANDOVER', status: 'complete', completionPercentage: 100 },
          { id: 'DESIGN_WEEK', status: 'current' },
        ]}
      />
    )

    // Completion percentage should not appear for completed phase
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
  })

  it('shows blocker indicator when phase has blockers', () => {
    const { container } = render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[
          { id: 'DESIGN_WEEK', status: 'current', hasBlockers: true },
        ]}
      />
    )

    // AlertCircle icon should be rendered for blockers
    // We check for the amber-500 colored alert icon
    const alertIcons = container.querySelectorAll('.text-amber-500')
    expect(alertIcons.length).toBeGreaterThan(0)
  })

  it('shows blocker message instead of description when present', () => {
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[
          {
            id: 'DESIGN_WEEK',
            status: 'current',
            hasBlockers: true,
            blockerMessage: 'Waiting for client feedback',
          },
        ]}
      />
    )

    expect(screen.getByText('Waiting for client feedback')).toBeInTheDocument()
  })

  // --- Design Week sub-phases ---

  it('renders Design Week sub-phases expanded by default', () => {
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[{ id: 'DESIGN_WEEK', status: 'current' }]}
      />
    )

    // Sub-phase labels should be visible
    // Note: "Kickoff" appears both as a main phase and a Design Week sub-phase
    expect(screen.getByText('Process Design')).toBeInTheDocument()
    expect(screen.getByText('Technical')).toBeInTheDocument()
    expect(screen.getByText('Sign-off')).toBeInTheDocument()
  })

  it('renders sub-phase indicators with phase numbers', () => {
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[{ id: 'DESIGN_WEEK', status: 'current' }]}
      />
    )

    expect(screen.getByText('P1')).toBeInTheDocument()
    expect(screen.getByText('P2')).toBeInTheDocument()
    expect(screen.getByText('P3')).toBeInTheDocument()
    expect(screen.getByText('P4')).toBeInTheDocument()
  })

  it('renders sub-phase descriptions in non-compact mode', () => {
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[{ id: 'DESIGN_WEEK', status: 'current' }]}
      />
    )

    expect(screen.getByText('Goals, stakeholders, success metrics')).toBeInTheDocument()
    expect(screen.getByText('Happy path, exceptions, scope')).toBeInTheDocument()
    expect(screen.getByText('Systems, integrations, data')).toBeInTheDocument()
    expect(screen.getByText('Final confirmations, go/no-go')).toBeInTheDocument()
  })

  it('hides sub-phase descriptions in compact mode', () => {
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[{ id: 'DESIGN_WEEK', status: 'current' }]}
        compact={true}
      />
    )

    expect(screen.queryByText('Goals, stakeholders, success metrics')).not.toBeInTheDocument()
  })

  it('shows session progress for sub-phases when provided', () => {
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[
          {
            id: 'DESIGN_WEEK',
            status: 'current',
            subPhases: [
              { id: 1, status: 'complete', sessionsCompleted: 1, sessionsTotal: 1 },
              { id: 2, status: 'current', sessionsCompleted: 1, sessionsTotal: 2 },
              { id: 3, status: 'upcoming', sessionsCompleted: 0, sessionsTotal: 2 },
              { id: 4, status: 'upcoming', sessionsCompleted: 0, sessionsTotal: 1 },
            ],
          },
        ]}
      />
    )

    expect(screen.getByText('1/1 sessions')).toBeInTheDocument()
    expect(screen.getByText('1/2 sessions')).toBeInTheDocument()
    expect(screen.getByText('0/2 sessions')).toBeInTheDocument()
    expect(screen.getByText('0/1 sessions')).toBeInTheDocument()
  })

  // --- Collapsing/Expanding ---

  it('collapses Design Week sub-phases when clicked', async () => {
    const user = userEvent.setup()
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[{ id: 'DESIGN_WEEK', status: 'current' }]}
      />
    )

    // Sub-phases should be visible initially
    expect(screen.getByText('P1')).toBeInTheDocument()

    // Click the Design Week phase to toggle
    await user.click(screen.getByText('Design Week'))

    // Sub-phases should now be hidden
    expect(screen.queryByText('P1')).not.toBeInTheDocument()
  })

  it('re-expands Design Week sub-phases when clicked again', async () => {
    const user = userEvent.setup()
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[{ id: 'DESIGN_WEEK', status: 'current' }]}
      />
    )

    // Collapse
    await user.click(screen.getByText('Design Week'))
    expect(screen.queryByText('P1')).not.toBeInTheDocument()

    // Re-expand
    await user.click(screen.getByText('Design Week'))
    expect(screen.getByText('P1')).toBeInTheDocument()
  })

  // --- Click handlers ---

  it('calls onPhaseClick when a non-locked, non-expandable phase is clicked', async () => {
    const user = userEvent.setup()
    const onPhaseClick = vi.fn()
    render(
      <JourneyTimeline
        currentPhase="KICKOFF"
        phases={[
          { id: 'SALES_HANDOVER', status: 'complete' },
          { id: 'KICKOFF', status: 'current' },
        ]}
        onPhaseClick={onPhaseClick}
      />
    )

    await user.click(screen.getByText('Sales Handover'))
    expect(onPhaseClick).toHaveBeenCalledWith('SALES_HANDOVER')
  })

  it('does not call onPhaseClick for locked phases', async () => {
    const user = userEvent.setup()
    const onPhaseClick = vi.fn()
    render(
      <JourneyTimeline
        currentPhase="KICKOFF"
        phases={[
          { id: 'KICKOFF', status: 'current' },
        ]}
        onPhaseClick={onPhaseClick}
      />
    )

    // ONBOARDING is locked (no progress provided, defaults to 'locked')
    await user.click(screen.getByText('Onboarding'))
    expect(onPhaseClick).not.toHaveBeenCalled()
  })

  it('calls onSubPhaseClick when a sub-phase is clicked', async () => {
    const user = userEvent.setup()
    const onSubPhaseClick = vi.fn()
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[
          {
            id: 'DESIGN_WEEK',
            status: 'current',
            subPhases: [
              { id: 1, status: 'complete', sessionsCompleted: 1, sessionsTotal: 1 },
              { id: 2, status: 'current', sessionsCompleted: 1, sessionsTotal: 2 },
            ],
          },
        ]}
        designWeekPhase={2}
        onSubPhaseClick={onSubPhaseClick}
      />
    )

    await user.click(screen.getByText('Process Design'))
    expect(onSubPhaseClick).toHaveBeenCalledWith('DESIGN_WEEK', 2)
  })

  // --- Phases shown as locked by default ---

  it('treats phases without progress data as locked', () => {
    render(
      <JourneyTimeline
        currentPhase="KICKOFF"
        phases={[
          { id: 'KICKOFF', status: 'current' },
        ]}
      />
    )

    // Phases without progress data should show lock styling
    // The "Handover to Support" label should have the locked text color
    const handoverLabel = screen.getByText('Handover to Support')
    expect(handoverLabel).toHaveClass('text-space-500')
  })

  // --- Design Week phase number highlighting ---

  it('highlights the current Design Week sub-phase based on designWeekPhase prop', () => {
    render(
      <JourneyTimeline
        currentPhase="DESIGN_WEEK"
        phases={[
          {
            id: 'DESIGN_WEEK',
            status: 'current',
            subPhases: [
              { id: 1, status: 'complete', sessionsCompleted: 1, sessionsTotal: 1 },
              { id: 2, status: 'current', sessionsCompleted: 0, sessionsTotal: 2 },
              { id: 3, status: 'upcoming', sessionsCompleted: 0, sessionsTotal: 2 },
              { id: 4, status: 'upcoming', sessionsCompleted: 0, sessionsTotal: 1 },
            ],
          },
        ]}
        designWeekPhase={2}
      />
    )

    // The sub-phase label for Process Design (id=2) should have the current style
    const processDesignLabel = screen.getByText('Process Design')
    expect(processDesignLabel).toHaveClass('text-cosmic-purple')
  })
})
