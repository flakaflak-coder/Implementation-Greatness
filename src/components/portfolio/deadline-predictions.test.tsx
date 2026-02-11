import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeadlinePredictions } from './deadline-predictions'

function createPrediction(overrides: Partial<Parameters<typeof DeadlinePredictions>[0]['predictions'][0]> = {}) {
  return {
    deId: 'de-1',
    deName: 'Claims Assistant',
    companyName: 'Acme Insurance',
    currentPhase: 'Process Design',
    targetGoLive: '2026-04-15',
    predictedGoLive: '2026-04-10',
    velocityRatio: 1.15,
    blockerCount: 0,
    riskStatus: 'on_track' as const,
    daysAhead: 5,
    completedPhases: 2,
    totalPhases: 4,
    ...overrides,
  }
}

const defaultSummary = {
  total: 4,
  onTrack: 2,
  atRisk: 1,
  likelyDelayed: 1,
  noTarget: 0,
}

describe('DeadlinePredictions', () => {
  it('renders the title "Deadline Predictions"', () => {
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)
    expect(screen.getByText('Deadline Predictions')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)
    expect(screen.getByText('Go-live forecast based on velocity and blockers')).toBeInTheDocument()
  })

  // Summary section
  it('displays summary counts for on track', () => {
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)
    expect(screen.getByText('on track')).toBeInTheDocument()
  })

  it('displays summary counts for at risk', () => {
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)
    expect(screen.getByText('at risk')).toBeInTheDocument()
  })

  it('displays summary counts for likely delayed', () => {
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)
    expect(screen.getByText('likely delayed')).toBeInTheDocument()
  })

  it('displays "no target" when summary has noTarget > 0', () => {
    const summary = { ...defaultSummary, noTarget: 2 }
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={summary} />)
    expect(screen.getByText('no target')).toBeInTheDocument()
  })

  it('does not display "no target" when summary noTarget is 0', () => {
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)
    expect(screen.queryByText('no target')).not.toBeInTheDocument()
  })

  // Empty state
  it('shows empty state when predictions array is empty', () => {
    render(<DeadlinePredictions predictions={[]} summary={{ total: 0, onTrack: 0, atRisk: 0, likelyDelayed: 0, noTarget: 0 }} />)
    expect(screen.getByText('No active implementations to predict')).toBeInTheDocument()
  })

  // Prediction rows - component renders both mobile and desktop layouts
  // so text appears twice. Use getAllByText to accommodate both.
  it('renders DE name in prediction row', () => {
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)
    const names = screen.getAllByText('Claims Assistant')
    expect(names.length).toBeGreaterThanOrEqual(1)
  })

  it('renders company name in prediction row', () => {
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)
    const names = screen.getAllByText('Acme Insurance')
    expect(names.length).toBeGreaterThanOrEqual(1)
  })

  it('renders current phase in prediction row', () => {
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)
    const phases = screen.getAllByText('Process Design')
    expect(phases.length).toBeGreaterThanOrEqual(1)
  })

  // Risk status badges - rendered in both mobile and desktop layouts
  it('shows "On Track" badge for on_track status', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ riskStatus: 'on_track' })]} summary={defaultSummary} />)
    const badges = screen.getAllByText('On Track')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "At Risk" badge for at_risk status', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ riskStatus: 'at_risk' })]} summary={defaultSummary} />)
    const badges = screen.getAllByText('At Risk')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "Likely Delayed" badge for likely_delayed status', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ riskStatus: 'likely_delayed' })]} summary={defaultSummary} />)
    const badges = screen.getAllByText('Likely Delayed')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "No Target" badge for no_target status', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ riskStatus: 'no_target' })]} summary={defaultSummary} />)
    const badges = screen.getAllByText('No Target')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  // Velocity indicator - appears in both mobile and desktop layouts
  it('shows velocity ratio with trending up icon for high velocity (>= 1.1)', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ velocityRatio: 1.25 })]} summary={defaultSummary} />)
    const ratios = screen.getAllByText('1.25x')
    expect(ratios.length).toBeGreaterThanOrEqual(1)
  })

  it('shows velocity ratio for normal velocity (0.9-1.1)', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ velocityRatio: 1.0 })]} summary={defaultSummary} />)
    const ratios = screen.getAllByText('1.00x')
    expect(ratios.length).toBeGreaterThanOrEqual(1)
  })

  it('shows velocity ratio with trending down icon for low velocity (< 0.9)', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ velocityRatio: 0.7 })]} summary={defaultSummary} />)
    const ratios = screen.getAllByText('0.70x')
    expect(ratios.length).toBeGreaterThanOrEqual(1)
  })

  // Days ahead/behind - appears in both mobile and desktop layouts
  it('shows days ahead for positive daysAhead', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ daysAhead: 5 })]} summary={defaultSummary} />)
    const ahead = screen.getAllByText('5d ahead')
    expect(ahead.length).toBeGreaterThanOrEqual(1)
  })

  it('shows days behind for negative daysAhead', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ daysAhead: -3 })]} summary={defaultSummary} />)
    const behind = screen.getAllByText('3d behind')
    expect(behind.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "On target" when daysAhead is 0', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ daysAhead: 0 })]} summary={defaultSummary} />)
    const onTarget = screen.getAllByText('On target')
    expect(onTarget.length).toBeGreaterThanOrEqual(1)
  })

  it('shows "--" for days margin when risk status is no_target', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ riskStatus: 'no_target', daysAhead: 0 })]} summary={defaultSummary} />)
    const dashes = screen.getAllByText('--')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  // Target go-live date
  it('shows "--" when targetGoLive is null', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ targetGoLive: null })]} summary={defaultSummary} />)
    const dashes = screen.getAllByText('--')
    expect(dashes.length).toBeGreaterThan(0)
  })

  // Progress bar - appears in both layouts
  it('renders progress as completed/total', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ completedPhases: 2, totalPhases: 4 })]} summary={defaultSummary} />)
    const progress = screen.getAllByText('2/4')
    expect(progress.length).toBeGreaterThanOrEqual(1)
  })

  // Blocker count
  it('shows blocker count when blockerCount > 0', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ blockerCount: 2 })]} summary={defaultSummary} />)
    expect(screen.getByText('2 blockers')).toBeInTheDocument()
  })

  it('shows singular "blocker" for blockerCount of 1', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ blockerCount: 1 })]} summary={defaultSummary} />)
    expect(screen.getByText('1 blocker')).toBeInTheDocument()
  })

  it('does not show blocker text when blockerCount is 0', () => {
    render(<DeadlinePredictions predictions={[createPrediction({ blockerCount: 0 })]} summary={defaultSummary} />)
    // "blocker" also appears in subtitle, so check specifically for the blocker count pattern
    expect(screen.queryByText(/\d+ blockers?$/)).not.toBeInTheDocument()
  })

  // Collapse/expand
  it('collapses content when header is clicked', async () => {
    const user = userEvent.setup()
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)

    const names = screen.getAllByText('Claims Assistant')
    expect(names.length).toBeGreaterThanOrEqual(1)

    const headerButton = screen.getByRole('button')
    await user.click(headerButton)

    // Content should be hidden after collapse
    expect(screen.queryByText('Claims Assistant')).not.toBeInTheDocument()
  })

  it('re-expands content when header is clicked twice', async () => {
    const user = userEvent.setup()
    render(<DeadlinePredictions predictions={[createPrediction()]} summary={defaultSummary} />)

    const headerButton = screen.getByRole('button')
    await user.click(headerButton)
    await user.click(headerButton)

    const names = screen.getAllByText('Claims Assistant')
    expect(names.length).toBeGreaterThanOrEqual(1)
  })

  // Multiple predictions
  it('renders multiple prediction rows', () => {
    const predictions = [
      createPrediction({ deId: 'de-1', deName: 'Claims Assistant' }),
      createPrediction({ deId: 'de-2', deName: 'Support Bot', riskStatus: 'at_risk', daysAhead: -2 }),
      createPrediction({ deId: 'de-3', deName: 'Email Handler', riskStatus: 'likely_delayed', daysAhead: -10 }),
    ]
    render(<DeadlinePredictions predictions={predictions} summary={defaultSummary} />)

    expect(screen.getAllByText('Claims Assistant').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Support Bot').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Email Handler').length).toBeGreaterThanOrEqual(1)
  })

  // Summary header badges (conditionally rendered)
  it('does not render onTrack summary badge when count is 0', () => {
    const summary = { total: 1, onTrack: 0, atRisk: 1, likelyDelayed: 0, noTarget: 0 }
    render(<DeadlinePredictions predictions={[createPrediction({ riskStatus: 'at_risk' })]} summary={summary} />)
    const headerButton = screen.getByRole('button')
    expect(headerButton.querySelector('.bg-emerald-50')).toBeNull()
  })
})
