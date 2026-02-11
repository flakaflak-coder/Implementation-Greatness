import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SidebarFooter } from './sidebar-footer'

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

// Mock Tooltip components - TooltipContent does not render children to avoid text duplication
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: () => null,
}))

describe('SidebarFooter', () => {
  beforeEach(() => {
    mockIsCollapsed = false
  })

  it('renders Settings link', () => {
    render(<SidebarFooter />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders Help Center link', () => {
    render(<SidebarFooter />)
    expect(screen.getByText('Help Center')).toBeInTheDocument()
  })

  it('links Settings to /settings', () => {
    render(<SidebarFooter />)
    const settingsLink = screen.getByText('Settings').closest('a')
    expect(settingsLink).toHaveAttribute('href', '/settings')
  })

  it('links Help Center to /help', () => {
    render(<SidebarFooter />)
    const helpLink = screen.getByText('Help Center').closest('a')
    expect(helpLink).toHaveAttribute('href', '/help')
  })

  it('hides text labels when collapsed', () => {
    mockIsCollapsed = true
    render(<SidebarFooter />)
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    expect(screen.queryByText('Help Center')).not.toBeInTheDocument()
  })

  it('provides aria-labels on links when collapsed', () => {
    mockIsCollapsed = true
    render(<SidebarFooter />)
    expect(screen.getByLabelText('Settings')).toBeInTheDocument()
    expect(screen.getByLabelText('Help Center')).toBeInTheDocument()
  })

  it('does not set aria-label when expanded (text is visible)', () => {
    mockIsCollapsed = false
    render(<SidebarFooter />)
    // When not collapsed, aria-label is undefined so text itself is visible
    const settingsLink = screen.getByText('Settings').closest('a')
    expect(settingsLink).not.toHaveAttribute('aria-label')
  })

  it('renders both items in a row when expanded', () => {
    mockIsCollapsed = false
    const { container } = render(<SidebarFooter />)
    const flexContainer = container.querySelector('.flex.gap-1')
    expect(flexContainer).toHaveClass('flex-row')
  })

  it('renders items in a column when collapsed', () => {
    mockIsCollapsed = true
    const { container } = render(<SidebarFooter />)
    const flexContainer = container.querySelector('.flex.gap-1')
    expect(flexContainer).toHaveClass('flex-col')
  })
})
