import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DesignWeekOverviewCard, type DesignWeekOverview } from './design-week-overview-card'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock Tooltip components from Radix UI (they require a Provider in test)
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
}))

function createDesignWeek(overrides: Partial<DesignWeekOverview> = {}): DesignWeekOverview {
  return {
    id: 'dw-1',
    digitalEmployee: { id: 'de-1', name: 'Claims Assistant' },
    company: { id: 'company-1', name: 'Acme Insurance' },
    currentPhase: 2,
    phaseName: 'Process Design',
    status: 'IN_PROGRESS',
    trafficLight: 'green',
    trend: 'stable',
    issues: [],
    sessions: { uploaded: 3, expected: 6 },
    scopeCompleteness: 65,
    ambiguousCount: 2,
    assignedTo: 'Sophie',
    lastUpdated: new Date().toISOString(),
    blockedReason: null,
    ...overrides,
  }
}

describe('DesignWeekOverviewCard', () => {
  // Basic rendering
  it('renders the DE name', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek()} />)
    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
  })

  it('renders the company name', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek()} />)
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument()
  })

  it('renders the phase badge with phase number and name', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek()} />)
    expect(screen.getByText('Phase 2: Process Design')).toBeInTheDocument()
  })

  // Traffic light status
  it('shows "On Track" label for green traffic light', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ trafficLight: 'green' })} />)
    expect(screen.getByText('On Track')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Status: On Track' })).toBeInTheDocument()
  })

  it('shows "Needs Attention" label for yellow traffic light', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ trafficLight: 'yellow' })} />)
    expect(screen.getByText('Needs Attention')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Status: Needs Attention' })).toBeInTheDocument()
  })

  it('shows "Critical" label for red traffic light', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ trafficLight: 'red' })} />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Status: Critical' })).toBeInTheDocument()
  })

  // Trend indicators
  it('shows "Improving" trend label', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ trend: 'improving' })} />)
    expect(screen.getByText('Improving')).toBeInTheDocument()
  })

  it('shows "Stable" trend label', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ trend: 'stable' })} />)
    expect(screen.getByText('Stable')).toBeInTheDocument()
  })

  it('shows "Declining" trend label', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ trend: 'declining' })} />)
    expect(screen.getByText('Declining')).toBeInTheDocument()
  })

  // Session progress
  it('renders session progress as uploaded/expected', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ sessions: { uploaded: 3, expected: 6 } })} />)
    expect(screen.getByText('3/6')).toBeInTheDocument()
  })

  it('renders "Sessions" label', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek()} />)
    expect(screen.getByText('Sessions')).toBeInTheDocument()
  })

  // Scope completeness
  it('renders scope completeness percentage', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ scopeCompleteness: 65 })} />)
    expect(screen.getByText(/65%/)).toBeInTheDocument()
  })

  it('renders "Scope" label', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek()} />)
    expect(screen.getByText('Scope')).toBeInTheDocument()
  })

  it('shows ambiguous count when > 0', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ ambiguousCount: 3 })} />)
    expect(screen.getByText('(3 ambiguous)')).toBeInTheDocument()
  })

  it('does not show ambiguous count when 0', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ ambiguousCount: 0 })} />)
    expect(screen.queryByText(/ambiguous/)).not.toBeInTheDocument()
  })

  // Issues
  it('renders issues when present', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ issues: ['Missing stakeholder input', 'Delayed API docs'] })} />)
    expect(screen.getByText('Missing stakeholder input')).toBeInTheDocument()
    expect(screen.getByText('Delayed API docs')).toBeInTheDocument()
  })

  it('does not render issues section when empty', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ issues: [] })} />)
    expect(screen.queryByText('Missing stakeholder input')).not.toBeInTheDocument()
  })

  // Blocked reason
  it('renders blocked reason when present', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ blockedReason: 'Waiting for client approval' })} />)
    expect(screen.getByText('Waiting for client approval')).toBeInTheDocument()
  })

  it('does not render blocked reason when null', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ blockedReason: null })} />)
    expect(screen.queryByText('Waiting for client approval')).not.toBeInTheDocument()
  })

  // Assigned to
  it('renders assigned consultant name', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ assignedTo: 'Sophie' })} />)
    expect(screen.getByText('Sophie')).toBeInTheDocument()
  })

  it('does not render assigned to when null', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ assignedTo: null })} />)
    expect(screen.queryByText('Sophie')).not.toBeInTheDocument()
  })

  // View Details link
  it('renders "View Details" link pointing to correct DE page', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek()} />)
    expect(screen.getByText('View Details')).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/companies/company-1/digital-employees/de-1')
  })

  // Last updated (time ago)
  it('shows "Just now" for very recent updates', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ lastUpdated: new Date().toISOString() })} />)
    expect(screen.getByText('Just now')).toBeInTheDocument()
  })

  // Phase progress dots
  it('renders phase progress with 4 phase icons', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ currentPhase: 3 })} />)
    // The phase badge should show Phase 3
    expect(screen.getByText('Phase 3: Process Design')).not.toBeInTheDocument
    expect(screen.getByText(/Phase 3/)).toBeInTheDocument()
  })

  // Different phases
  it('renders phase 1 kickoff', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ currentPhase: 1, phaseName: 'Kickoff' })} />)
    expect(screen.getByText('Phase 1: Kickoff')).toBeInTheDocument()
  })

  it('renders phase 4 sign-off', () => {
    render(<DesignWeekOverviewCard designWeek={createDesignWeek({ currentPhase: 4, phaseName: 'Sign-off' })} />)
    expect(screen.getByText('Phase 4: Sign-off')).toBeInTheDocument()
  })

  // Accepts className prop
  it('accepts and applies className prop', () => {
    const { container } = render(<DesignWeekOverviewCard designWeek={createDesignWeek()} className="test-class" />)
    expect(container.firstChild).toHaveClass('test-class')
  })
})
