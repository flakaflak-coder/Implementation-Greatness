import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompanyCard } from './company-card'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('CompanyCard', () => {
  const defaultProps = {
    id: 'company-1',
    name: 'Acme Insurance',
    industry: 'Insurance',
    digitalEmployees: [
      { id: 'de-1', name: 'Claims Assistant', status: 'DESIGN' as const },
      { id: 'de-2', name: 'Support Bot', status: 'LIVE' as const },
    ],
  }

  it('renders company name', () => {
    render(<CompanyCard {...defaultProps} />)
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument()
  })

  it('renders industry when provided', () => {
    render(<CompanyCard {...defaultProps} />)
    expect(screen.getByText('Insurance')).toBeInTheDocument()
  })

  it('does not render industry when not provided', () => {
    render(<CompanyCard {...defaultProps} industry={null} />)
    expect(screen.queryByText('Insurance')).not.toBeInTheDocument()
  })

  it('displays digital employee count', () => {
    render(<CompanyCard {...defaultProps} />)
    expect(screen.getByText('2 Digital Employees')).toBeInTheDocument()
  })

  it('displays active count for DESIGN and ONBOARDING status', () => {
    const props = {
      ...defaultProps,
      digitalEmployees: [
        { id: 'de-1', name: 'DE 1', status: 'DESIGN' as const },
        { id: 'de-2', name: 'DE 2', status: 'ONBOARDING' as const },
        { id: 'de-3', name: 'DE 3', status: 'LIVE' as const },
      ],
    }
    render(<CompanyCard {...props} />)
    expect(screen.getByText('2 Active')).toBeInTheDocument()
  })

  it('displays live count', () => {
    render(<CompanyCard {...defaultProps} />)
    expect(screen.getByText('1 Live')).toBeInTheDocument()
  })

  it('renders digital employees preview', () => {
    render(<CompanyCard {...defaultProps} />)
    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
    expect(screen.getByText('Support Bot')).toBeInTheDocument()
  })

  it('shows correct status badges', () => {
    render(<CompanyCard {...defaultProps} />)
    expect(screen.getByText('In Design')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('limits preview to 3 digital employees and shows overflow', () => {
    const props = {
      ...defaultProps,
      digitalEmployees: [
        { id: 'de-1', name: 'DE 1', status: 'DESIGN' as const },
        { id: 'de-2', name: 'DE 2', status: 'LIVE' as const },
        { id: 'de-3', name: 'DE 3', status: 'LIVE' as const },
        { id: 'de-4', name: 'DE 4', status: 'PAUSED' as const },
        { id: 'de-5', name: 'DE 5', status: 'ONBOARDING' as const },
      ],
    }
    render(<CompanyCard {...props} />)

    expect(screen.getByText('DE 1')).toBeInTheDocument()
    expect(screen.getByText('DE 2')).toBeInTheDocument()
    expect(screen.getByText('DE 3')).toBeInTheDocument()
    expect(screen.queryByText('DE 4')).not.toBeInTheDocument()
    expect(screen.queryByText('DE 5')).not.toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('links to company detail page', () => {
    render(<CompanyCard {...defaultProps} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/companies/company-1')
  })

  it('handles all status types correctly', () => {
    const props = {
      ...defaultProps,
      digitalEmployees: [
        { id: 'de-1', name: 'Design DE', status: 'DESIGN' as const },
        { id: 'de-2', name: 'Onboarding DE', status: 'ONBOARDING' as const },
        { id: 'de-3', name: 'Live DE', status: 'LIVE' as const },
      ],
    }
    const { rerender } = render(<CompanyCard {...props} />)

    expect(screen.getByText('In Design')).toBeInTheDocument()
    expect(screen.getByText('Onboarding')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()

    // Test PAUSED status
    rerender(
      <CompanyCard
        {...defaultProps}
        digitalEmployees={[{ id: 'de-1', name: 'Paused DE', status: 'PAUSED' }]}
      />
    )
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('renders with no digital employees', () => {
    render(<CompanyCard {...defaultProps} digitalEmployees={[]} />)
    expect(screen.getByText('0 Digital Employees')).toBeInTheDocument()
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
    expect(screen.queryByText('Live')).not.toBeInTheDocument()
  })
})
