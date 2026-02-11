import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from './header'

// Mock next/navigation with a mutable pathname
let mockPathname = '/'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('Header', () => {
  beforeEach(() => {
    mockPathname = '/'
  })

  it('renders the logo with "Onboarding" text', () => {
    render(<Header />)
    expect(screen.getByText('Onboarding')).toBeInTheDocument()
  })

  it('renders all navigation links', () => {
    render(<Header />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Companies')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('Observatory')).toBeInTheDocument()
  })

  it('renders the "New Company" button', () => {
    render(<Header />)
    expect(screen.getByText('New Company')).toBeInTheDocument()
  })

  it('links logo to home page', () => {
    render(<Header />)
    const logoLink = screen.getByText('Onboarding').closest('a')
    expect(logoLink).toHaveAttribute('href', '/')
  })

  it('links "New Company" button to /companies/new', () => {
    render(<Header />)
    const newCompanyLink = screen.getByText('New Company').closest('a')
    expect(newCompanyLink).toHaveAttribute('href', '/companies/new')
  })

  it('renders correct navigation hrefs', () => {
    render(<Header />)
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/')
    expect(screen.getByText('Companies').closest('a')).toHaveAttribute('href', '/companies')
    expect(screen.getByText('Support').closest('a')).toHaveAttribute('href', '/support')
    expect(screen.getByText('Observatory').closest('a')).toHaveAttribute('href', '/observatory')
  })

  it('applies active styles to current route', () => {
    render(<Header />)
    // Dashboard should be active since pathname is '/'
    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveClass('bg-gray-100')
    expect(dashboardLink).toHaveClass('text-gray-900')
  })

  it('does not apply active styles to non-current routes', () => {
    render(<Header />)
    const companiesLink = screen.getByText('Companies').closest('a')
    expect(companiesLink).toHaveClass('text-gray-600')
    expect(companiesLink).not.toHaveClass('bg-gray-100')
  })

  it('applies active styles to /companies when on companies route', () => {
    mockPathname = '/companies/some-id'
    render(<Header />)
    const companiesLink = screen.getByText('Companies').closest('a')
    expect(companiesLink).toHaveClass('bg-gray-100')
    expect(companiesLink).toHaveClass('text-gray-900')
  })
})
