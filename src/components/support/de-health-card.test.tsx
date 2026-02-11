import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEHealthCard } from './de-health-card'
import type { SupportDE } from './types'

// Mock the TrendIndicator component
vi.mock('./trend-indicator', () => ({
  TrendIndicator: ({ trend }: { trend: { direction: string; delta: number } }) => (
    <span data-testid="trend-indicator" data-direction={trend.direction}>
      {trend.delta > 0 ? `+${trend.delta}` : trend.delta}
    </span>
  ),
}))

function createMockDE(overrides: Partial<SupportDE> = {}): SupportDE {
  return {
    id: 'de-1',
    name: 'Claims Assistant',
    description: 'Handles insurance claims intake',
    status: 'LIVE',
    channels: ['EMAIL', 'WEBCHAT'],
    companyId: 'company-1',
    companyName: 'Acme Insurance',
    currentJourneyPhase: 'HYPERCARE',
    trackerStatus: 'ON_TRACK',
    riskLevel: 'LOW',
    blocker: null,
    goLiveDate: '2024-06-15',
    updatedAt: new Date().toISOString(),
    healthScore: 92,
    escalationRuleCount: 5,
    scopeItemCount: 12,
    integrationCount: 3,
    scenarioCount: 8,
    ...overrides,
  }
}

describe('DEHealthCard', () => {
  it('renders the DE name', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE()} onSelect={onSelect} />)
    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
  })

  it('renders the company name', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE()} onSelect={onSelect} />)
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument()
  })

  it('displays the health score', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ healthScore: 85 })} onSelect={onSelect} />)
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  // Health indicator colors based on score
  it('displays "Healthy" label for score >= 80', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ healthScore: 92 })} onSelect={onSelect} />)
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('displays "Attention" label for score 60-79', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ healthScore: 65 })} onSelect={onSelect} />)
    expect(screen.getByText('Attention')).toBeInTheDocument()
  })

  it('displays "Critical" label for score < 60', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ healthScore: 45 })} onSelect={onSelect} />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  // Critical alert bar
  it('shows critical alert bar when health score is critical', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ healthScore: 30 })} onSelect={onSelect} />)
    expect(screen.getByText('Needs immediate attention')).toBeInTheDocument()
  })

  it('does not show critical alert bar when health score is healthy', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ healthScore: 90 })} onSelect={onSelect} />)
    expect(screen.queryByText('Needs immediate attention')).not.toBeInTheDocument()
  })

  it('does not show critical alert bar when health score is attention', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ healthScore: 70 })} onSelect={onSelect} />)
    expect(screen.queryByText('Needs immediate attention')).not.toBeInTheDocument()
  })

  // Status badges
  it('displays "Live" badge for LIVE status', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ status: 'LIVE' })} onSelect={onSelect} />)
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('displays "Design" badge for DESIGN status', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ status: 'DESIGN' })} onSelect={onSelect} />)
    expect(screen.getByText('Design')).toBeInTheDocument()
  })

  it('displays "Onboarding" badge for ONBOARDING status', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ status: 'ONBOARDING' })} onSelect={onSelect} />)
    expect(screen.getByText('Onboarding')).toBeInTheDocument()
  })

  it('displays "Paused" badge for PAUSED status', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ status: 'PAUSED' })} onSelect={onSelect} />)
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  // Tracker status badges
  it('shows "Blocked" badge when tracker status is BLOCKED', () => {
    const onSelect = vi.fn()
    render(
      <DEHealthCard
        de={createMockDE({ trackerStatus: 'BLOCKED' })}
        onSelect={onSelect}
      />
    )
    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('shows "Needs Attention" badge when tracker status is ATTENTION', () => {
    const onSelect = vi.fn()
    render(
      <DEHealthCard
        de={createMockDE({ trackerStatus: 'ATTENTION' })}
        onSelect={onSelect}
      />
    )
    expect(screen.getByText('Needs Attention')).toBeInTheDocument()
  })

  it('does not show tracker badge when tracker status is ON_TRACK', () => {
    const onSelect = vi.fn()
    render(
      <DEHealthCard
        de={createMockDE({ trackerStatus: 'ON_TRACK' })}
        onSelect={onSelect}
      />
    )
    expect(screen.queryByText('Blocked')).not.toBeInTheDocument()
    expect(screen.queryByText('Needs Attention')).not.toBeInTheDocument()
  })

  // Blocker notice
  it('displays blocker text when blocker is present', () => {
    const onSelect = vi.fn()
    render(
      <DEHealthCard
        de={createMockDE({ blocker: 'Waiting for API credentials from client' })}
        onSelect={onSelect}
      />
    )
    expect(screen.getByText(/Waiting for API credentials from client/)).toBeInTheDocument()
  })

  it('does not display blocker section when blocker is null', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ blocker: null })} onSelect={onSelect} />)
    expect(screen.queryByText(/Blocker:/)).not.toBeInTheDocument()
  })

  // Quick stats
  it('shows scope item count', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ scopeItemCount: 15 })} onSelect={onSelect} />)
    expect(screen.getByText('15 scope')).toBeInTheDocument()
  })

  it('shows integration count', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ integrationCount: 4 })} onSelect={onSelect} />)
    expect(screen.getByText('4 integrations')).toBeInTheDocument()
  })

  it('shows escalation rule count', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ escalationRuleCount: 7 })} onSelect={onSelect} />)
    expect(screen.getByText('7 rules')).toBeInTheDocument()
  })

  // Journey phase
  it('displays formatted journey phase', () => {
    const onSelect = vi.fn()
    render(
      <DEHealthCard
        de={createMockDE({ currentJourneyPhase: 'DESIGN_WEEK' })}
        onSelect={onSelect}
      />
    )
    expect(screen.getByText('Design Week')).toBeInTheDocument()
  })

  // Click handling
  it('calls onSelect when card is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const de = createMockDE()
    render(<DEHealthCard de={de} onSelect={onSelect} />)

    await user.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(de)
  })

  it('calls onSelect on Enter key press', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const de = createMockDE()
    render(<DEHealthCard de={de} onSelect={onSelect} />)

    const card = screen.getByRole('button')
    card.focus()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(de)
  })

  it('has correct aria-label with DE name and health score', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE({ healthScore: 75 })} onSelect={onSelect} />)
    expect(
      screen.getByLabelText('View details for Claims Assistant - Health score 75')
    ).toBeInTheDocument()
  })

  // Trend indicator
  it('renders trend indicator when healthTrend is provided', () => {
    const onSelect = vi.fn()
    const de = createMockDE({
      healthTrend: { direction: 'up', delta: 5, history: [80, 82, 85, 87, 90, 92, 95] },
    })
    render(<DEHealthCard de={de} onSelect={onSelect} />)
    expect(screen.getByTestId('trend-indicator')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
  })

  it('does not render trend indicator when healthTrend is not provided', () => {
    const onSelect = vi.fn()
    render(<DEHealthCard de={createMockDE()} onSelect={onSelect} />)
    expect(screen.queryByTestId('trend-indicator')).not.toBeInTheDocument()
  })
})
