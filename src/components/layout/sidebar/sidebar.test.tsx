import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from './sidebar'

// Mock the sidebar provider
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

// Mock sub-components to keep the test focused
vi.mock('./sidebar-header', () => ({
  SidebarHeader: () => <div data-testid="sidebar-header">SidebarHeader</div>,
}))

vi.mock('./sidebar-nav', () => ({
  SidebarNav: () => <div data-testid="sidebar-nav">SidebarNav</div>,
}))

vi.mock('./sidebar-journey-stepper', () => ({
  SidebarJourneyStepper: ({ phases, currentPhase, companyId, digitalEmployeeId }: {
    phases: unknown[]
    currentPhase: string
    companyId: string
    digitalEmployeeId: string
  }) => (
    <div data-testid="journey-stepper" data-current-phase={currentPhase}>
      JourneyStepper ({phases.length} phases)
    </div>
  ),
}))

vi.mock('./sidebar-footer', () => ({
  SidebarFooter: () => <div data-testid="sidebar-footer">SidebarFooter</div>,
}))

// Mock Radix ScrollArea
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}))

// Mock Radix Separator
vi.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: { className?: string }) => (
    <hr data-testid="separator" className={className} />
  ),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    mockIsCollapsed = false
  })

  it('renders the sidebar header', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-header')).toBeInTheDocument()
  })

  it('renders the sidebar footer', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument()
  })

  describe('global variant (default)', () => {
    it('renders SidebarNav in global variant', () => {
      render(<Sidebar />)
      expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
    })

    it('does not render journey stepper in global variant', () => {
      render(<Sidebar />)
      expect(screen.queryByTestId('journey-stepper')).not.toBeInTheDocument()
    })
  })

  describe('journey variant', () => {
    const company = { id: 'company-1', name: 'Acme Insurance' }
    const digitalEmployee = {
      id: 'de-1',
      name: 'Claims Assistant',
      currentJourneyPhase: 'DESIGN_WEEK',
    }
    const journeyPhases = [
      { id: 'jp-1', phaseType: 'SALES_HANDOVER', status: 'COMPLETE', order: 1 },
      { id: 'jp-2', phaseType: 'KICKOFF', status: 'COMPLETE', order: 2 },
      { id: 'jp-3', phaseType: 'DESIGN_WEEK', status: 'IN_PROGRESS', order: 3 },
    ]

    it('renders journey stepper when variant is journey with company and DE', () => {
      render(
        <Sidebar
          variant="journey"
          company={company}
          digitalEmployee={digitalEmployee}
          journeyPhases={journeyPhases}
        />
      )
      expect(screen.getByTestId('journey-stepper')).toBeInTheDocument()
    })

    it('does not render SidebarNav in journey variant', () => {
      render(
        <Sidebar
          variant="journey"
          company={company}
          digitalEmployee={digitalEmployee}
          journeyPhases={journeyPhases}
        />
      )
      expect(screen.queryByTestId('sidebar-nav')).not.toBeInTheDocument()
    })

    it('renders company name when not collapsed', () => {
      render(
        <Sidebar
          variant="journey"
          company={company}
          digitalEmployee={digitalEmployee}
          journeyPhases={journeyPhases}
        />
      )
      expect(screen.getByText('Acme Insurance')).toBeInTheDocument()
    })

    it('renders digital employee name when not collapsed', () => {
      render(
        <Sidebar
          variant="journey"
          company={company}
          digitalEmployee={digitalEmployee}
          journeyPhases={journeyPhases}
        />
      )
      expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
    })

    it('hides company and DE names when collapsed', () => {
      mockIsCollapsed = true
      render(
        <Sidebar
          variant="journey"
          company={company}
          digitalEmployee={digitalEmployee}
          journeyPhases={journeyPhases}
        />
      )
      expect(screen.queryByText('Acme Insurance')).not.toBeInTheDocument()
      expect(screen.queryByText('Claims Assistant')).not.toBeInTheDocument()
    })

    it('renders a separator between context info and stepper', () => {
      render(
        <Sidebar
          variant="journey"
          company={company}
          digitalEmployee={digitalEmployee}
          journeyPhases={journeyPhases}
        />
      )
      expect(screen.getByTestId('separator')).toBeInTheDocument()
    })

    it('falls back to SidebarNav when journey variant lacks company', () => {
      render(<Sidebar variant="journey" />)
      expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
      expect(screen.queryByTestId('journey-stepper')).not.toBeInTheDocument()
    })

    it('falls back to SidebarNav when journey variant lacks digitalEmployee', () => {
      render(<Sidebar variant="journey" company={company} />)
      expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
      expect(screen.queryByTestId('journey-stepper')).not.toBeInTheDocument()
    })
  })

  describe('collapsed state', () => {
    it('renders aside element with full width when not collapsed', () => {
      mockIsCollapsed = false
      const { container } = render(<Sidebar />)
      const aside = container.querySelector('aside')
      expect(aside).toHaveClass('w-[280px]')
    })

    it('renders aside element with narrow width when collapsed', () => {
      mockIsCollapsed = true
      const { container } = render(<Sidebar />)
      const aside = container.querySelector('aside')
      expect(aside).toHaveClass('w-[72px]')
    })
  })
})
