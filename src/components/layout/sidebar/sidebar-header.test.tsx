import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarHeader } from './sidebar-header'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock sidebar provider
let mockIsCollapsed = false
const mockToggleCollapse = vi.fn()
vi.mock('@/providers/sidebar-provider', () => ({
  useSidebar: () => ({
    isCollapsed: mockIsCollapsed,
    toggleCollapse: mockToggleCollapse,
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

describe('SidebarHeader', () => {
  beforeEach(() => {
    mockIsCollapsed = false
    mockToggleCollapse.mockClear()
  })

  it('renders the Freeday logo text', () => {
    render(<SidebarHeader />)
    expect(screen.getByText('Freeday')).toBeInTheDocument()
  })

  it('renders the "F" logo mark', () => {
    render(<SidebarHeader />)
    expect(screen.getByText('F')).toBeInTheDocument()
  })

  it('links the logo to the home page', () => {
    render(<SidebarHeader />)
    const logoLink = screen.getByText('Freeday').closest('a')
    expect(logoLink).toHaveAttribute('href', '/')
  })

  it('renders collapse button with "Collapse sidebar" label when expanded', () => {
    mockIsCollapsed = false
    render(<SidebarHeader />)
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument()
  })

  it('renders expand button with "Expand sidebar" label when collapsed', () => {
    mockIsCollapsed = true
    render(<SidebarHeader />)
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
  })

  it('calls toggleCollapse when collapse button is clicked', async () => {
    const user = userEvent.setup()
    render(<SidebarHeader />)

    await user.click(screen.getByLabelText('Collapse sidebar'))
    expect(mockToggleCollapse).toHaveBeenCalledOnce()
  })

  it('calls toggleCollapse when expand button is clicked', async () => {
    mockIsCollapsed = true
    const user = userEvent.setup()
    render(<SidebarHeader />)

    await user.click(screen.getByLabelText('Expand sidebar'))
    expect(mockToggleCollapse).toHaveBeenCalledOnce()
  })

  it('hides Freeday text when collapsed', () => {
    mockIsCollapsed = true
    render(<SidebarHeader />)
    const freedayText = screen.getByText('Freeday')
    // When collapsed, the parent div has opacity-0 and w-0
    const textContainer = freedayText.parentElement
    expect(textContainer).toHaveClass('opacity-0')
    expect(textContainer).toHaveClass('w-0')
  })

  it('shows Freeday text when expanded', () => {
    mockIsCollapsed = false
    render(<SidebarHeader />)
    const freedayText = screen.getByText('Freeday')
    const textContainer = freedayText.parentElement
    expect(textContainer).toHaveClass('opacity-100')
    expect(textContainer).toHaveClass('w-auto')
  })
})
