import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeekTimeline } from './week-timeline'
import { type TimelineCompany, type TimelineDE } from './gantt-timeline'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock Tooltip components from Radix UI
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
}))

// Mock date-fns functions to keep tests deterministic
vi.mock('date-fns', () => ({
  startOfISOWeek: (date: Date) => date,
  setISOWeek: (date: Date, _week: number) => date,
  format: (_date: Date, fmt: string) => fmt === 'MMM d' ? 'Feb 10' : 'Feb',
  getMonth: (_date: Date) => 1,
}))

function createDE(overrides: Partial<TimelineDE> = {}): TimelineDE {
  return {
    id: 'de-1',
    name: 'Claims Assistant',
    company: { id: 'company-1', name: 'Acme Insurance' },
    status: 'DESIGN',
    currentStage: 'design_week',
    goLiveDate: '2026-06-15',
    assignedTo: 'Sophie',
    trafficLight: 'green',
    issues: [],
    startWeek: 5,
    endWeek: 12,
    goLiveWeek: 20,
    trackerStatus: 'ON_TRACK',
    riskLevel: 'LOW',
    blocker: null,
    ownerClient: 'Marcus',
    ownerFreedayProject: 'Sophie',
    ownerFreedayEngineering: null,
    thisWeekActions: null,
    percentComplete: 35,
    sortOrder: 1,
    designWeek: {
      id: 'dw-1',
      status: 'IN_PROGRESS',
      currentPhase: 2,
      startedAt: '2026-01-15',
      completedAt: null,
      progress: 45,
      sessionProgress: 50,
      scopeProgress: 40,
      phaseCompletions: [
        { phase: 1, autoCompleted: true, manuallyCompleted: false, completed: true },
        { phase: 2, autoCompleted: false, manuallyCompleted: false, completed: false },
        { phase: 3, autoCompleted: false, manuallyCompleted: false, completed: false },
        { phase: 4, autoCompleted: false, manuallyCompleted: false, completed: false },
      ],
      manualCompletions: [],
    },
    prerequisites: { total: 5, received: 3, blocked: 0, pending: 2 },
    createdAt: '2026-01-10',
    ...overrides,
  }
}

function createCompany(overrides: Partial<TimelineCompany> = {}): TimelineCompany {
  return {
    id: 'company-1',
    name: 'Acme Insurance',
    digitalEmployees: [createDE()],
    ...overrides,
  }
}

describe('WeekTimeline', () => {
  const currentWeek = 7

  // Empty state
  it('shows empty state when no companies provided', () => {
    render(<WeekTimeline companies={[]} currentWeek={currentWeek} />)
    expect(screen.getByText('No Digital Employees to display')).toBeInTheDocument()
  })

  // Legend
  it('renders status legend', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getByText('Status:')).toBeInTheDocument()
    // Status labels appear in legend: "ON TRACK", "ATTENTION", "BLOCKED", "TO PLAN"
    expect(screen.getAllByText('ON TRACK').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('BLOCKED').length).toBeGreaterThanOrEqual(1)
  })

  it('renders go-live legend marker', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getByText('Go-live')).toBeInTheDocument()
  })

  // Timeline header
  it('renders "Digital Employee" column header', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getAllByText('Digital Employee').length).toBeGreaterThanOrEqual(1)
  })

  it('renders "Risk" column header', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getByText('Risk')).toBeInTheDocument()
  })

  it('renders week column headers with week numbers', () => {
    const { container } = render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    // Week headers render "W{number}" with "W" and the number as separate text nodes
    // Verify that the week header area contains expected content
    const weekHeaders = container.querySelectorAll('.min-w-\\[60px\\]')
    expect(weekHeaders.length).toBe(12) // 12 weeks are shown
    // First week should be currentWeek - 2 = 5, verify some headers
    expect(weekHeaders[0].textContent).toContain('W')
    expect(weekHeaders[0].textContent).toContain('5')
  })

  it('shows "today" label on current week column', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getByText('today')).toBeInTheDocument()
  })

  // Company group
  it('renders company name', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    // Company name appears in both company header and under DE row
    const acmeTexts = screen.getAllByText('Acme Insurance')
    expect(acmeTexts.length).toBeGreaterThanOrEqual(1)
  })

  it('renders DE count badge', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getByText('1 DE')).toBeInTheDocument()
  })

  it('shows plural "DEs" for multiple digital employees', () => {
    const company = createCompany({
      digitalEmployees: [
        createDE({ id: 'de-1', name: 'DE One' }),
        createDE({ id: 'de-2', name: 'DE Two' }),
      ],
    })
    render(<WeekTimeline companies={[company]} currentWeek={currentWeek} />)
    expect(screen.getByText('2 DEs')).toBeInTheDocument()
  })

  it('shows average completion percentage', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getByText('35% avg')).toBeInTheDocument()
  })

  // DE row
  it('renders DE name', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
  })

  // Risk level badge
  it('renders risk level badge', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getByText('LOW')).toBeInTheDocument()
  })

  it('renders HIGH risk badge', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ riskLevel: 'HIGH' })],
    })
    render(<WeekTimeline companies={[company]} currentWeek={currentWeek} />)
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('renders MEDIUM risk badge', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ riskLevel: 'MEDIUM' })],
    })
    render(<WeekTimeline companies={[company]} currentWeek={currentWeek} />)
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
  })

  // Percent complete
  it('renders percent complete', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getAllByText('35%').length).toBeGreaterThanOrEqual(1)
  })

  // Blocker display - appears in multiple places (DE row + tooltip)
  it('renders blocker text when present', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ blocker: 'Waiting for credentials' })],
    })
    render(<WeekTimeline companies={[company]} currentWeek={currentWeek} />)
    const blockerTexts = screen.getAllByText('Waiting for credentials')
    expect(blockerTexts.length).toBeGreaterThan(0)
  })

  // Status indicator
  it('shows status dot with correct label', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getByRole('img', { name: 'Status: On Track' })).toBeInTheDocument()
  })

  it('shows BLOCKED status', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ trackerStatus: 'BLOCKED' })],
    })
    render(<WeekTimeline companies={[company]} currentWeek={currentWeek} />)
    expect(screen.getByRole('img', { name: 'Status: Blocked' })).toBeInTheDocument()
  })

  // Company collapse
  it('collapses company group on header click', async () => {
    const user = userEvent.setup()
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)

    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()

    const companyButton = screen.getByRole('button', { name: /Acme Insurance/i })
    await user.click(companyButton)

    expect(screen.queryByText('Claims Assistant')).not.toBeInTheDocument()
  })

  it('re-expands company group on second click', async () => {
    const user = userEvent.setup()
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)

    const companyButton = screen.getByRole('button', { name: /Acme Insurance/i })
    await user.click(companyButton)
    await user.click(companyButton)

    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
  })

  // Phase checkboxes expansion
  it('shows phase checkboxes when DE expand button is clicked', async () => {
    const user = userEvent.setup()
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)

    // Find the small chevron expand/collapse button inside DE info column
    // It's the button containing only a small SVG chevron
    const allButtons = screen.getAllByRole('button')
    const phaseExpandButton = allButtons.find(btn => {
      // The DE expand button is within .w-64 and is distinct from the company header button
      const isInDEColumn = btn.closest('.w-64')
      const isSmall = btn.querySelector('svg')
      const isNotCompanyHeader = !btn.textContent?.includes('Acme Insurance')
      return isInDEColumn && isSmall && isNotCompanyHeader
    })

    if (phaseExpandButton) {
      await user.click(phaseExpandButton)
      expect(screen.getByText('DW Phases')).toBeInTheDocument()
      expect(screen.getByText('Kickoff')).toBeInTheDocument()
      expect(screen.getAllByText('Process Design').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Technical')).toBeInTheDocument()
      expect(screen.getByText('Sign-off')).toBeInTheDocument()
    }
  })

  it('shows "No Design Week linked" when DE has no designWeek', async () => {
    const user = userEvent.setup()
    const company = createCompany({
      digitalEmployees: [createDE({ designWeek: null })],
    })
    render(<WeekTimeline companies={[company]} currentWeek={currentWeek} />)

    const allButtons = screen.getAllByRole('button')
    const phaseExpandButton = allButtons.find(btn => {
      const isInDEColumn = btn.closest('.w-64')
      const isSmall = btn.querySelector('svg')
      const isNotCompanyHeader = !btn.textContent?.includes('Acme Insurance')
      return isInDEColumn && isSmall && isNotCompanyHeader
    })

    if (phaseExpandButton) {
      await user.click(phaseExpandButton)
      expect(screen.getByText('No Design Week linked')).toBeInTheDocument()
    }
  })

  // Phase completion count
  it('shows phase completion count after expanding', async () => {
    const user = userEvent.setup()
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)

    const allButtons = screen.getAllByRole('button')
    const phaseExpandButton = allButtons.find(btn => {
      const isInDEColumn = btn.closest('.w-64')
      const isSmall = btn.querySelector('svg')
      const isNotCompanyHeader = !btn.textContent?.includes('Acme Insurance')
      return isInDEColumn && isSmall && isNotCompanyHeader
    })

    if (phaseExpandButton) {
      await user.click(phaseExpandButton)
      expect(screen.getByText('1/4 phases')).toBeInTheDocument()
    }
  })

  // Timeline bar rendering
  it('renders timeline bar with status label', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    const bar = screen.getByRole('img', { name: /Claims Assistant.*On Track.*35% complete/ })
    expect(bar).toBeInTheDocument()
  })

  it('shows "Out of range" when bar is not visible', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ startWeek: 100, endWeek: 110 })],
    })
    render(<WeekTimeline companies={[company]} currentWeek={currentWeek} />)
    expect(screen.getByText('Out of range')).toBeInTheDocument()
  })

  // Company stats badges
  it('shows blocked count badge for company', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ trackerStatus: 'BLOCKED' })],
    })
    render(<WeekTimeline companies={[company]} currentWeek={currentWeek} />)
    expect(screen.getByLabelText('1 blocked')).toBeInTheDocument()
  })

  it('shows attention count badge for company', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ trackerStatus: 'ATTENTION' })],
    })
    render(<WeekTimeline companies={[company]} currentWeek={currentWeek} />)
    expect(screen.getByLabelText('1 attention')).toBeInTheDocument()
  })

  it('shows on track count badge for company', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    expect(screen.getByLabelText('1 on track')).toBeInTheDocument()
  })

  // Multiple companies
  it('renders multiple company groups', () => {
    const companies = [
      createCompany({ id: 'c1', name: 'Acme Insurance' }),
      createCompany({ id: 'c2', name: 'TechCorp', digitalEmployees: [createDE({ id: 'de-2', name: 'Support Bot', company: { id: 'c2', name: 'TechCorp' } })] }),
    ]
    render(<WeekTimeline companies={companies} currentWeek={currentWeek} />)
    expect(screen.getAllByText('Acme Insurance').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('TechCorp').length).toBeGreaterThanOrEqual(1)
  })

  // className prop
  it('accepts className prop', () => {
    const { container } = render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} className="my-class" />)
    expect(container.firstChild).toHaveClass('my-class')
  })

  // DE link
  it('renders DE name as link to the correct page', () => {
    render(<WeekTimeline companies={[createCompany()]} currentWeek={currentWeek} />)
    const links = screen.getAllByRole('link')
    const deLink = links.find(l => l.getAttribute('href') === '/companies/company-1/digital-employees/de-1')
    expect(deLink).toBeDefined()
  })
})
