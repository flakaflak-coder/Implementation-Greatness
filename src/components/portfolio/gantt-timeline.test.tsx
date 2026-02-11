import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GanttTimeline, type TimelineCompany, type TimelineDE } from './gantt-timeline'

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

describe('GanttTimeline', () => {
  // Empty state
  it('shows empty state when no companies provided', () => {
    render(<GanttTimeline companies={[]} />)
    expect(screen.getByText('No Digital Employees to display')).toBeInTheDocument()
  })

  // Legend rendering
  it('renders the stage legend with all stages', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.getByText('Stages:')).toBeInTheDocument()
    // "Design Week" appears in both legend and StageProgressBar, use getAllByText
    expect(screen.getAllByText('Design Week').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Configuration').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('UAT').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Live').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the status legend', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.getByText('Status:')).toBeInTheDocument()
    expect(screen.getByText('On track')).toBeInTheDocument()
    // "Attention" and "Critical" appear in both legend and tooltip content
    expect(screen.getAllByText('Attention').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(1)
  })

  // Header columns - text may appear in both header and tooltip
  it('renders column headers', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.getAllByText('Digital Employee').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Prerequisites').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Go-Live')).toBeInTheDocument()
  })

  // Company group rendering
  it('renders company name', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument()
  })

  it('renders DE count badge', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.getByText('1 DE')).toBeInTheDocument()
  })

  it('shows plural "DEs" for multiple digital employees', () => {
    const company = createCompany({
      digitalEmployees: [
        createDE({ id: 'de-1', name: 'DE One' }),
        createDE({ id: 'de-2', name: 'DE Two' }),
      ],
    })
    render(<GanttTimeline companies={[company]} />)
    expect(screen.getByText('2 DEs')).toBeInTheDocument()
  })

  // DE row rendering
  it('renders DE name in the row', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
  })

  it('renders assigned to name', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.getByText('Sophie')).toBeInTheDocument()
  })

  it('does not render assigned to when null', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ assignedTo: null })],
    })
    render(<GanttTimeline companies={[company]} />)
    expect(screen.queryByText('Sophie')).not.toBeInTheDocument()
  })

  // Traffic light status
  it('shows status indicator with label for green traffic light', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.getByRole('img', { name: 'Status: Healthy' })).toBeInTheDocument()
  })

  it('shows status indicator for yellow traffic light', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ trafficLight: 'yellow' })],
    })
    render(<GanttTimeline companies={[company]} />)
    expect(screen.getByRole('img', { name: 'Status: Attention' })).toBeInTheDocument()
  })

  it('shows status indicator for red traffic light', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ trafficLight: 'red' })],
    })
    render(<GanttTimeline companies={[company]} />)
    expect(screen.getByRole('img', { name: 'Status: Critical' })).toBeInTheDocument()
  })

  // Prerequisites
  it('renders prerequisites count', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.getByText('3/5')).toBeInTheDocument()
  })

  // Blocker - text appears in both visible span and tooltip content
  it('renders blocker text when present', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ blocker: 'API access pending' })],
    })
    render(<GanttTimeline companies={[company]} />)
    const blockerTexts = screen.getAllByText('API access pending')
    expect(blockerTexts.length).toBeGreaterThanOrEqual(1)
  })

  it('does not render blocker when null', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.queryByText('API access pending')).not.toBeInTheDocument()
  })

  // Go-live date
  it('renders "No date set" when goLiveDate is null', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ goLiveDate: null })],
    })
    render(<GanttTimeline companies={[company]} />)
    expect(screen.getByText('No date set')).toBeInTheDocument()
  })

  // Issues badge
  it('renders issues badge with count when issues present', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ issues: ['Delayed scope review', 'Missing data'] })],
    })
    render(<GanttTimeline companies={[company]} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('does not render issues badge when no issues', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ issues: [] })],
    })
    render(<GanttTimeline companies={[company]} />)
    const badges = screen.queryAllByText(/^[0-9]+$/)
    badges.forEach(badge => {
      expect(badge.textContent).not.toBe('0')
    })
  })

  // Stage progress bars
  it('renders stage progress bars with aria labels', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    const designWeekLabels = screen.getAllByRole('img', { name: /Design Week/ })
    expect(designWeekLabels.length).toBeGreaterThan(0)
  })

  // Company group collapse
  it('collapses company group when header is clicked', async () => {
    const user = userEvent.setup()
    render(<GanttTimeline companies={[createCompany()]} />)

    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()

    const companyButton = screen.getByRole('button', { name: /Acme Insurance/i })
    await user.click(companyButton)

    expect(screen.queryByText('Claims Assistant')).not.toBeInTheDocument()
  })

  it('re-expands company group on second click', async () => {
    const user = userEvent.setup()
    render(<GanttTimeline companies={[createCompany()]} />)

    const companyButton = screen.getByRole('button', { name: /Acme Insurance/i })
    await user.click(companyButton)
    await user.click(companyButton)

    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
  })

  // onDEClick callback
  it('calls onDEClick when DE row is clicked', async () => {
    const user = userEvent.setup()
    const onDEClick = vi.fn()
    render(<GanttTimeline companies={[createCompany()]} onDEClick={onDEClick} />)

    const deName = screen.getByText('Claims Assistant')
    await user.click(deName)

    expect(onDEClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'de-1' }))
  })

  // Summary bar
  it('renders summary bar with total count', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    expect(screen.getByText(/1 DEs across 1 companies/)).toBeInTheDocument()
  })

  it('shows attention count in summary bar when yellow DEs exist', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ trafficLight: 'yellow' })],
    })
    render(<GanttTimeline companies={[company]} />)
    expect(screen.getByText('1 attention')).toBeInTheDocument()
  })

  it('shows critical count in summary bar when red DEs exist', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ trafficLight: 'red' })],
    })
    render(<GanttTimeline companies={[company]} />)
    expect(screen.getByText('1 critical')).toBeInTheDocument()
  })

  it('shows prereq blocked count in summary bar', () => {
    const company = createCompany({
      digitalEmployees: [createDE({ prerequisites: { total: 5, received: 2, blocked: 1, pending: 2 } })],
    })
    render(<GanttTimeline companies={[company]} />)
    expect(screen.getByText('1 prereq blocked')).toBeInTheDocument()
  })

  // Company-level traffic light stats
  it('renders company-level red stat count', () => {
    const company = createCompany({
      digitalEmployees: [
        createDE({ id: 'de-1', trafficLight: 'red' }),
        createDE({ id: 'de-2', trafficLight: 'green' }),
      ],
    })
    render(<GanttTimeline companies={[company]} />)
    expect(screen.getByLabelText('1 critical')).toBeInTheDocument()
    expect(screen.getByLabelText('1 healthy')).toBeInTheDocument()
  })

  // Multiple companies
  it('renders multiple company groups', () => {
    const companies = [
      createCompany({ id: 'c1', name: 'Acme Insurance' }),
      createCompany({ id: 'c2', name: 'TechCorp', digitalEmployees: [createDE({ id: 'de-2', name: 'Support Bot', company: { id: 'c2', name: 'TechCorp' } })] }),
    ]
    render(<GanttTimeline companies={companies} />)
    expect(screen.getAllByText('Acme Insurance').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('TechCorp').length).toBeGreaterThanOrEqual(1)
  })

  // className prop
  it('accepts className prop', () => {
    const { container } = render(<GanttTimeline companies={[createCompany()]} className="my-custom-class" />)
    expect(container.firstChild).toHaveClass('my-custom-class')
  })

  // DE link
  it('renders DE row as a link to the correct page', () => {
    render(<GanttTimeline companies={[createCompany()]} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/companies/company-1/digital-employees/de-1')
  })
})
