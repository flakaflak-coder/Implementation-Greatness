import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DigitalEmployeeCard } from './digital-employee-card'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock the DesignWeekProgress component
vi.mock('./design-week-progress', () => ({
  DesignWeekProgress: ({ currentPhase, status }: { currentPhase: number; status: string }) => (
    <div data-testid="design-week-progress" data-phase={currentPhase} data-status={status}>
      Progress Component
    </div>
  ),
}))

describe('DigitalEmployeeCard', () => {
  const defaultProps = {
    id: 'de-1',
    name: 'Claims Assistant',
    description: 'Handles insurance claims intake',
    status: 'DESIGN' as const,
    channels: ['EMAIL', 'WEBCHAT'],
    companyId: 'company-1',
  }

  it('renders the digital employee name', () => {
    render(<DigitalEmployeeCard {...defaultProps} />)
    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<DigitalEmployeeCard {...defaultProps} />)
    expect(screen.getByText('Handles insurance claims intake')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    render(<DigitalEmployeeCard {...defaultProps} description={null} />)
    expect(screen.queryByText('Handles insurance claims intake')).not.toBeInTheDocument()
  })

  it('displays status badge for DESIGN status', () => {
    render(<DigitalEmployeeCard {...defaultProps} status="DESIGN" />)
    expect(screen.getByText('In Design')).toBeInTheDocument()
  })

  it('displays status badge for ONBOARDING status', () => {
    render(<DigitalEmployeeCard {...defaultProps} status="ONBOARDING" />)
    expect(screen.getByText('Onboarding')).toBeInTheDocument()
  })

  it('displays status badge for LIVE status', () => {
    render(<DigitalEmployeeCard {...defaultProps} status="LIVE" />)
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('displays status badge for PAUSED status', () => {
    render(<DigitalEmployeeCard {...defaultProps} status="PAUSED" />)
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('renders channel icons', () => {
    render(<DigitalEmployeeCard {...defaultProps} channels={['EMAIL', 'WEBCHAT', 'VOICE']} />)
    // Channels are rendered as icons with titles
    expect(screen.getByTitle('EMAIL')).toBeInTheDocument()
    expect(screen.getByTitle('WEBCHAT')).toBeInTheDocument()
    expect(screen.getByTitle('VOICE')).toBeInTheDocument()
  })

  it('shows design week progress when in DESIGN status with design week', () => {
    const propsWithDesignWeek = {
      ...defaultProps,
      status: 'DESIGN' as const,
      designWeek: {
        id: 'dw-1',
        status: 'IN_PROGRESS',
        currentPhase: 2,
        completenessScore: 65,
        ambiguousCount: 3,
      },
    }
    render(<DigitalEmployeeCard {...propsWithDesignWeek} />)

    expect(screen.getByText('Design Week Progress')).toBeInTheDocument()
    expect(screen.getByTestId('design-week-progress')).toBeInTheDocument()
  })

  it('shows ambiguous count alert when items need resolution', () => {
    const propsWithAmbiguous = {
      ...defaultProps,
      status: 'DESIGN' as const,
      designWeek: {
        id: 'dw-1',
        status: 'IN_PROGRESS',
        currentPhase: 2,
        ambiguousCount: 5,
      },
    }
    render(<DigitalEmployeeCard {...propsWithAmbiguous} />)
    expect(screen.getByText('5 items need resolution')).toBeInTheDocument()
  })

  it('does not show ambiguous alert when count is 0', () => {
    const propsNoAmbiguous = {
      ...defaultProps,
      status: 'DESIGN' as const,
      designWeek: {
        id: 'dw-1',
        status: 'IN_PROGRESS',
        currentPhase: 2,
        ambiguousCount: 0,
      },
    }
    render(<DigitalEmployeeCard {...propsNoAmbiguous} />)
    expect(screen.queryByText(/items need resolution/)).not.toBeInTheDocument()
  })

  it('shows go-live date for LIVE status', () => {
    const propsLive = {
      ...defaultProps,
      status: 'LIVE' as const,
      goLiveDate: new Date('2024-06-15'),
    }
    render(<DigitalEmployeeCard {...propsLive} />)
    expect(screen.getByText(/Go-live:/)).toBeInTheDocument()
  })

  it('shows "Continue Design Week" button when in design', () => {
    const propsWithDesignWeek = {
      ...defaultProps,
      status: 'DESIGN' as const,
      designWeek: {
        id: 'dw-1',
        status: 'IN_PROGRESS',
        currentPhase: 2,
      },
    }
    render(<DigitalEmployeeCard {...propsWithDesignWeek} />)

    const continueButton = screen.getByRole('link', { name: 'Continue Design Week' })
    expect(continueButton).toHaveAttribute(
      'href',
      '/companies/company-1/digital-employees/de-1/design-week'
    )
  })

  it('shows "View Scope" button when in design', () => {
    const propsWithDesignWeek = {
      ...defaultProps,
      status: 'DESIGN' as const,
      designWeek: {
        id: 'dw-1',
        status: 'IN_PROGRESS',
        currentPhase: 2,
      },
    }
    render(<DigitalEmployeeCard {...propsWithDesignWeek} />)

    const scopeButton = screen.getByRole('link', { name: 'View Scope' })
    expect(scopeButton).toHaveAttribute(
      'href',
      '/companies/company-1/digital-employees/de-1/scope'
    )
  })

  it('shows "View Design Week Docs" and "Support Runbook" for LIVE status', () => {
    render(<DigitalEmployeeCard {...defaultProps} status="LIVE" />)

    expect(screen.getByRole('link', { name: 'View Design Week Docs' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Support Runbook' })).toBeInTheDocument()
  })

  it('shows "Start Design Week" for PAUSED or ONBOARDING without design week', () => {
    render(<DigitalEmployeeCard {...defaultProps} status="PAUSED" />)
    expect(screen.getByRole('link', { name: 'Start Design Week' })).toBeInTheDocument()
  })

  it('displays current phase label', () => {
    const propsWithDesignWeek = {
      ...defaultProps,
      status: 'DESIGN' as const,
      designWeek: {
        id: 'dw-1',
        status: 'IN_PROGRESS',
        currentPhase: 2,
      },
    }
    render(<DigitalEmployeeCard {...propsWithDesignWeek} />)
    // Phase 2 should show "Process Design" label based on getPhaseLabel
    expect(screen.getByText(/Phase 2:/)).toBeInTheDocument()
  })
})
