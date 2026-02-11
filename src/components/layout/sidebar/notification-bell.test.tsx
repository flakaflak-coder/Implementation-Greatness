import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationBell } from './notification-bell'

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

// Mock Popover components - render trigger and conditionally render content
vi.mock('@/components/ui/popover', () => {
  let openChangeHandler: ((open: boolean) => void) | null = null
  let isCurrentlyOpen = false

  return {
    Popover: ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => {
      openChangeHandler = onOpenChange
      isCurrentlyOpen = open
      return <div data-testid="popover">{children}</div>
    },
    PopoverTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
      <div data-testid="popover-trigger" onClick={() => {
        if (openChangeHandler) openChangeHandler(!isCurrentlyOpen)
      }}>{children}</div>
    ),
    PopoverContent: ({ children }: { children: React.ReactNode }) => (
      isCurrentlyOpen ? <div data-testid="popover-content">{children}</div> : null
    ),
  }
})

// Mock Tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div style={{ display: 'none' }}>{children}</div>,
}))

// Mock global fetch
const mockFetch = vi.fn()

const mockNotifications = [
  {
    id: 'n-1',
    type: 'EXTRACTION_COMPLETE',
    title: 'Extraction Complete',
    message: 'Session 2 has been processed',
    link: '/companies/c-1/digital-employees/de-1',
    read: false,
    metadata: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n-2',
    type: 'PHASE_COMPLETE',
    title: 'Kickoff Complete',
    message: 'Kickoff phase is now complete',
    link: null,
    read: true,
    metadata: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
]

describe('NotificationBell', () => {
  beforeEach(() => {
    mockIsCollapsed = false
    mockFetch.mockClear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    global.fetch = mockFetch

    // Default fetch mock returns notifications with unread count
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          notifications: mockNotifications,
          unreadCount: 1,
        },
      }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the bell button with "Notifications" label when expanded', async () => {
    await act(async () => {
      render(<NotificationBell />)
    })
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('fetches notifications on mount', async () => {
    await act(async () => {
      render(<NotificationBell />)
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/notifications')
  })

  it('displays unread count badge when there are unread notifications', async () => {
    await act(async () => {
      render(<NotificationBell />)
    })
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('does not display unread count badge when count is 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          notifications: mockNotifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        },
      }),
    })

    await act(async () => {
      render(<NotificationBell />)
    })
    await waitFor(() => {
      // The badge should not be rendered when unreadCount is 0
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })
  })

  it('caps unread count display at 99+', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          notifications: mockNotifications,
          unreadCount: 150,
        },
      }),
    })

    await act(async () => {
      render(<NotificationBell />)
    })
    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  it('hides "Notifications" label when collapsed', async () => {
    mockIsCollapsed = true
    await act(async () => {
      render(<NotificationBell />)
    })
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
  })

  it('shows empty state when no notifications exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          notifications: [],
          unreadCount: 0,
        },
      }),
    })

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await act(async () => {
      render(<NotificationBell />)
    })

    // Open the popover
    const trigger = screen.getByTestId('popover-trigger')
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument()
      expect(screen.getByText('System events will appear here')).toBeInTheDocument()
    })
  })

  it('shows notification titles in popover when opened', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await act(async () => {
      render(<NotificationBell />)
    })

    // Open the popover
    const trigger = screen.getByTestId('popover-trigger')
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Extraction Complete')).toBeInTheDocument()
      expect(screen.getByText('Kickoff Complete')).toBeInTheDocument()
    })
  })

  it('shows notification messages in popover', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await act(async () => {
      render(<NotificationBell />)
    })

    const trigger = screen.getByTestId('popover-trigger')
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Session 2 has been processed')).toBeInTheDocument()
      expect(screen.getByText('Kickoff phase is now complete')).toBeInTheDocument()
    })
  })

  it('shows "Mark all as read" button when there are unread notifications', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await act(async () => {
      render(<NotificationBell />)
    })

    const trigger = screen.getByTestId('popover-trigger')
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument()
    })
  })

  it('calls mark-read API when "Mark all as read" is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await act(async () => {
      render(<NotificationBell />)
    })

    // Open popover
    const trigger = screen.getByTestId('popover-trigger')
    await user.click(trigger)

    // Reset mock to track mark-read call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Mark all as read'))

    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  })

  it('handles fetch failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      render(<NotificationBell />)
    })

    // Should still render without crashing
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('polls for notifications every 30 seconds', async () => {
    await act(async () => {
      render(<NotificationBell />)
    })

    // Initial fetch
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Advance 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Advance another 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000)
    })

    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('hides "Mark all as read" when no unread notifications exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          notifications: mockNotifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        },
      }),
    })

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await act(async () => {
      render(<NotificationBell />)
    })

    const trigger = screen.getByTestId('popover-trigger')
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument()
    })
  })
})
