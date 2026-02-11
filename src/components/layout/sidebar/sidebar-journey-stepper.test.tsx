import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SidebarJourneyStepper } from './sidebar-journey-stepper'

// Mock next/navigation
let mockPathname = '/companies/c-1/digital-employees/de-1'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock sidebar provider
let mockIsCollapsed = false
vi.mock('@/providers/sidebar-provider', () => ({
  useSidebar: () => ({
    isCollapsed: mockIsCollapsed,
    toggleCollapse: vi.fn(),
    setCollapsed: vi.fn(),
    isMobileOpen: false,
    setMobileOpen: vi.fn(),
  }),
}))

// Mock Tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div style={{ display: 'none' }}>{children}</div>,
}))

// Mock Collapsible components
vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, defaultOpen }: { children: React.ReactNode; defaultOpen?: boolean }) => (
    <div data-testid="collapsible" data-default-open={defaultOpen}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock lucide-react icons to avoid dynamic import issues
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('lucide-react')
  // Create a simple icon component factory
  const createIcon = (name: string) => {
    const Icon = ({ className }: { className?: string }) => (
      <svg data-testid={`icon-${name}`} className={className} />
    )
    Icon.displayName = name
    return Icon
  }

  return {
    ...actual,
    Check: createIcon('Check'),
    Circle: createIcon('Circle'),
    ArrowLeft: createIcon('ArrowLeft'),
    FileSignature: createIcon('FileSignature'),
    Rocket: createIcon('Rocket'),
    Palette: createIcon('Palette'),
    Wrench: createIcon('Wrench'),
    ClipboardCheck: createIcon('ClipboardCheck'),
    Zap: createIcon('Zap'),
    HeartPulse: createIcon('HeartPulse'),
    Headphones: createIcon('Headphones'),
  }
})

const baseProps = {
  companyId: 'c-1',
  digitalEmployeeId: 'de-1',
  currentPhase: 'DESIGN_WEEK',
  designWeekPhase: 2,
}

const mockPhases = [
  { id: 'jp-1', phaseType: 'SALES_HANDOVER', status: 'COMPLETE', order: 1 },
  { id: 'jp-2', phaseType: 'KICKOFF', status: 'COMPLETE', order: 2 },
  { id: 'jp-3', phaseType: 'DESIGN_WEEK', status: 'IN_PROGRESS', order: 3 },
  { id: 'jp-4', phaseType: 'ONBOARDING', status: 'NOT_STARTED', order: 4 },
  { id: 'jp-5', phaseType: 'UAT', status: 'NOT_STARTED', order: 5 },
  { id: 'jp-6', phaseType: 'GO_LIVE', status: 'NOT_STARTED', order: 6 },
  { id: 'jp-7', phaseType: 'HYPERCARE', status: 'NOT_STARTED', order: 7 },
  { id: 'jp-8', phaseType: 'HANDOVER_TO_SUPPORT', status: 'NOT_STARTED', order: 8 },
]

describe('SidebarJourneyStepper', () => {
  beforeEach(() => {
    mockIsCollapsed = false
    mockPathname = '/companies/c-1/digital-employees/de-1'
  })

  describe('expanded state', () => {
    it('renders "Back to Companies" link', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      expect(screen.getByText('Back to Companies')).toBeInTheDocument()
    })

    it('links "Back to Companies" to /companies', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      const backLink = screen.getByText('Back to Companies').closest('a')
      expect(backLink).toHaveAttribute('href', '/companies')
    })

    it('renders "Journey Phases" section label', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      expect(screen.getByText('Journey Phases')).toBeInTheDocument()
    })

    it('renders all phase labels', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      expect(screen.getByText('Sales Handover')).toBeInTheDocument()
      // "Kickoff" appears twice: as a journey phase and as a Design Week sub-phase
      const kickoffElements = screen.getAllByText('Kickoff')
      expect(kickoffElements.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('Design Week')).toBeInTheDocument()
      expect(screen.getByText('Onboarding')).toBeInTheDocument()
      expect(screen.getByText('UAT')).toBeInTheDocument()
      expect(screen.getByText('Go Live')).toBeInTheDocument()
      expect(screen.getByText('Hypercare')).toBeInTheDocument()
      expect(screen.getByText('Handover to Support')).toBeInTheDocument()
    })

    it('renders correct links for each phase', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      const baseUrl = '/companies/c-1/digital-employees/de-1'

      expect(screen.getByText('Sales Handover').closest('a')).toHaveAttribute('href', `${baseUrl}/sales-handover`)
      // "Kickoff" appears twice; find the one that is a journey phase link (with class font-medium)
      const kickoffElements = screen.getAllByText('Kickoff')
      const journeyKickoff = kickoffElements.find(el => el.classList.contains('font-medium'))
      expect(journeyKickoff?.closest('a')).toHaveAttribute('href', `${baseUrl}/kickoff`)
      expect(screen.getByText('Design Week').closest('a')).toHaveAttribute('href', `${baseUrl}/design-week`)
      expect(screen.getByText('Onboarding').closest('a')).toHaveAttribute('href', `${baseUrl}/onboarding`)
      expect(screen.getByText('UAT').closest('a')).toHaveAttribute('href', `${baseUrl}/uat`)
      expect(screen.getByText('Go Live').closest('a')).toHaveAttribute('href', `${baseUrl}/go-live`)
      expect(screen.getByText('Hypercare').closest('a')).toHaveAttribute('href', `${baseUrl}/hypercare`)
      expect(screen.getByText('Handover to Support').closest('a')).toHaveAttribute('href', `${baseUrl}/handover`)
    })

    it('applies completed styles to completed phases', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      // Sales Handover has COMPLETE status, its label should have emerald color
      const salesHandoverLabel = screen.getByText('Sales Handover')
      expect(salesHandoverLabel).toHaveClass('text-emerald-600')
    })

    it('applies active styles to current phase', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      // Design Week is the current phase and not complete
      const designWeekLabel = screen.getByText('Design Week')
      expect(designWeekLabel).toHaveClass('text-[#C2703E]')
    })

    it('applies not-started styles to future phases', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      const onboardingLabel = screen.getByText('Onboarding')
      expect(onboardingLabel).toHaveClass('text-gray-500')
    })

    it('renders journey progress bar', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      expect(screen.getByText('Journey Progress')).toBeInTheDocument()
    })

    it('displays correct progress percentage', () => {
      // 2 out of 8 phases complete = 25%
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      expect(screen.getByText('25%')).toBeInTheDocument()
    })

    it('displays 0% when no phases are complete', () => {
      const noCompletedPhases = mockPhases.map(p => ({
        ...p,
        status: 'NOT_STARTED',
      }))
      render(<SidebarJourneyStepper {...baseProps} phases={noCompletedPhases} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('displays 100% when all phases are complete', () => {
      const allCompletedPhases = mockPhases.map(p => ({
        ...p,
        status: 'COMPLETE',
      }))
      render(<SidebarJourneyStepper {...baseProps} phases={allCompletedPhases} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('renders Design Week sub-phases', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      // Design Week has sub-phases: Kickoff, Process Design, Technical Deep-dive, Sign-off
      expect(screen.getByText('Process Design')).toBeInTheDocument()
      expect(screen.getByText('Technical Deep-dive')).toBeInTheDocument()
      expect(screen.getByText('Sign-off')).toBeInTheDocument()
    })
  })

  describe('collapsed state', () => {
    beforeEach(() => {
      mockIsCollapsed = true
    })

    it('renders "Back to Companies" link with aria-label', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      expect(screen.getByLabelText('Back to Companies')).toBeInTheDocument()
    })

    it('does not render phase labels text', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      // In collapsed mode, labels are in tooltips, not in the main content
      expect(screen.queryByText('Journey Phases')).not.toBeInTheDocument()
    })

    it('renders phase links with aria-labels including status', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      expect(screen.getByLabelText('Sales Handover - COMPLETE')).toBeInTheDocument()
      expect(screen.getByLabelText('Kickoff - COMPLETE')).toBeInTheDocument()
      expect(screen.getByLabelText('Design Week - IN PROGRESS')).toBeInTheDocument()
      expect(screen.getByLabelText('Onboarding - NOT STARTED')).toBeInTheDocument()
    })

    it('does not render progress bar when collapsed', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={mockPhases} />)
      expect(screen.queryByText('Journey Progress')).not.toBeInTheDocument()
    })
  })

  describe('empty phases', () => {
    it('renders all phase labels even without phase data (defaults to NOT_STARTED)', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={[]} />)
      expect(screen.getByText('Sales Handover')).toBeInTheDocument()
      expect(screen.getByText('Design Week')).toBeInTheDocument()
      expect(screen.getByText('Handover to Support')).toBeInTheDocument()
    })

    it('displays 0% progress when no phases are provided', () => {
      render(<SidebarJourneyStepper {...baseProps} phases={[]} />)
      expect(screen.getByText('0%')).toBeInTheDocument()
    })
  })
})
