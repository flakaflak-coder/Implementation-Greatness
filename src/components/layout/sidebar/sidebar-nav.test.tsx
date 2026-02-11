import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarNav, SidebarBottomNav } from './sidebar-nav'

// Mock pathname
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

// Mock command palette provider
const mockSetOpen = vi.fn()
vi.mock('@/providers/command-palette-provider', () => ({
  useCommandPalette: () => ({
    isOpen: false,
    setOpen: mockSetOpen,
    toggle: vi.fn(),
  }),
}))

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { name: 'Sophie', email: 'sophie@freeday.ai' },
    },
  }),
  signOut: vi.fn(),
}))

// Mock the NotificationBell component
vi.mock('@/components/layout/sidebar/notification-bell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">NotificationBell</div>,
}))

// Mock Tooltip components - TooltipContent does not render children to avoid text duplication
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: () => null,
}))

describe('SidebarNav', () => {
  beforeEach(() => {
    mockPathname = '/'
    mockIsCollapsed = false
    mockSetOpen.mockClear()
  })

  it('renders with navigation role and label', () => {
    render(<SidebarNav />)
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
  })

  it('renders all main navigation links', () => {
    render(<SidebarNav />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Portfolio')).toBeInTheDocument()
    expect(screen.getByText('Companies')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('Observatory')).toBeInTheDocument()
  })

  it('renders search button', () => {
    render(<SidebarNav />)
    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('renders notification bell', () => {
    render(<SidebarNav />)
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
  })

  it('renders correct hrefs for navigation links', () => {
    render(<SidebarNav />)
    expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/')
    expect(screen.getByText('Portfolio').closest('a')).toHaveAttribute('href', '/portfolio')
    expect(screen.getByText('Companies').closest('a')).toHaveAttribute('href', '/companies')
    expect(screen.getByText('Support').closest('a')).toHaveAttribute('href', '/support')
    expect(screen.getByText('Observatory').closest('a')).toHaveAttribute('href', '/observatory')
  })

  it('applies active styles to Dashboard when on /', () => {
    mockPathname = '/'
    render(<SidebarNav />)
    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveClass('bg-gray-900')
    expect(dashboardLink).toHaveClass('text-white')
  })

  it('does not mark Dashboard as active on /companies', () => {
    mockPathname = '/companies'
    render(<SidebarNav />)
    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).not.toHaveClass('bg-gray-900')
  })

  it('applies active styles to Companies when on /companies route', () => {
    mockPathname = '/companies/some-id'
    render(<SidebarNav />)
    const companiesLink = screen.getByText('Companies').closest('a')
    expect(companiesLink).toHaveClass('bg-gray-900')
    expect(companiesLink).toHaveClass('text-white')
  })

  it('applies active styles to Portfolio when on /portfolio route', () => {
    mockPathname = '/portfolio'
    render(<SidebarNav />)
    const portfolioLink = screen.getByText('Portfolio').closest('a')
    expect(portfolioLink).toHaveClass('bg-gray-900')
    expect(portfolioLink).toHaveClass('text-white')
  })

  it('applies active styles to Support when on /support route', () => {
    mockPathname = '/support'
    render(<SidebarNav />)
    const supportLink = screen.getByText('Support').closest('a')
    expect(supportLink).toHaveClass('bg-gray-900')
  })

  it('applies active styles to Observatory when on /observatory route', () => {
    mockPathname = '/observatory'
    render(<SidebarNav />)
    const observatoryLink = screen.getByText('Observatory').closest('a')
    expect(observatoryLink).toHaveClass('bg-gray-900')
  })

  it('hides nav text labels when collapsed', () => {
    mockIsCollapsed = true
    render(<SidebarNav />)
    // When collapsed, span elements with text are not rendered
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Portfolio')).not.toBeInTheDocument()
    expect(screen.queryByText('Companies')).not.toBeInTheDocument()
    expect(screen.queryByText('Support')).not.toBeInTheDocument()
    expect(screen.queryByText('Observatory')).not.toBeInTheDocument()
  })

  it('hides search label when collapsed', () => {
    mockIsCollapsed = true
    render(<SidebarNav />)
    expect(screen.queryByText('Search')).not.toBeInTheDocument()
  })

  it('provides aria-labels on links when collapsed', () => {
    mockIsCollapsed = true
    render(<SidebarNav />)
    expect(screen.getByLabelText('Dashboard')).toBeInTheDocument()
    expect(screen.getByLabelText('Portfolio')).toBeInTheDocument()
    expect(screen.getByLabelText('Companies')).toBeInTheDocument()
    expect(screen.getByLabelText('Support')).toBeInTheDocument()
    expect(screen.getByLabelText('Observatory')).toBeInTheDocument()
  })

  it('opens command palette when search button is clicked', async () => {
    const user = userEvent.setup()
    render(<SidebarNav />)

    const searchButton = screen.getByText('Search').closest('button')!
    await user.click(searchButton)

    expect(mockSetOpen).toHaveBeenCalledWith(true)
  })
})

describe('SidebarBottomNav', () => {
  beforeEach(() => {
    mockPathname = '/'
    mockIsCollapsed = false
  })

  it('renders with navigation role and settings label', () => {
    render(<SidebarBottomNav />)
    expect(screen.getByRole('navigation', { name: 'Settings navigation' })).toBeInTheDocument()
  })

  it('renders Settings link', () => {
    render(<SidebarBottomNav />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders Settings link with correct href', () => {
    render(<SidebarBottomNav />)
    const settingsLink = screen.getByText('Settings').closest('a')
    expect(settingsLink).toHaveAttribute('href', '/settings')
  })

  it('renders user profile with name', () => {
    render(<SidebarBottomNav />)
    expect(screen.getByText('Sophie')).toBeInTheDocument()
  })

  it('renders user profile with email', () => {
    render(<SidebarBottomNav />)
    expect(screen.getByText('sophie@freeday.ai')).toBeInTheDocument()
  })

  it('renders sign out button', () => {
    render(<SidebarBottomNav />)
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('calls signOut when sign out button is clicked', async () => {
    const user = userEvent.setup()
    const { signOut } = await import('next-auth/react')
    render(<SidebarBottomNav />)

    await user.click(screen.getByText('Sign Out'))

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
  })

  it('applies active styles to Settings when on /settings route', () => {
    mockPathname = '/settings'
    render(<SidebarBottomNav />)
    const settingsLink = screen.getByText('Settings').closest('a')
    expect(settingsLink).toHaveClass('bg-gray-900')
    expect(settingsLink).toHaveClass('text-white')
  })

  it('hides text labels when collapsed', () => {
    mockIsCollapsed = true
    render(<SidebarBottomNav />)
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()
  })
})
