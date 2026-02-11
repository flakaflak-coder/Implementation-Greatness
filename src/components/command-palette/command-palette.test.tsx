import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandPalette } from './command-palette'
import { CommandPaletteProvider } from '@/providers/command-palette-provider'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Radix Dialog portal to render inline for testing
vi.mock('@radix-ui/react-dialog', async () => {
  const actual = await vi.importActual<typeof import('@radix-ui/react-dialog')>('@radix-ui/react-dialog')
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

// Mock fetch for search API
const mockFetch = vi.fn()
global.fetch = mockFetch

function renderWithProvider() {
  return render(
    <CommandPaletteProvider>
      <CommandPalette />
    </CommandPaletteProvider>
  )
}

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          companies: [],
          digitalEmployees: [],
        }),
    })
  })

  it('does not render dialog content when closed', () => {
    renderWithProvider()
    expect(screen.queryByPlaceholderText(/search companies/i)).not.toBeInTheDocument()
  })

  it('opens with Cmd+K keyboard shortcut', async () => {
    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search companies, digital employees, or pages/i)).toBeInTheDocument()
    })
  })

  it('opens with Ctrl+K keyboard shortcut', async () => {
    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search companies, digital employees, or pages/i)).toBeInTheDocument()
    })
  })

  it('opens with / keyboard shortcut', async () => {
    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: '/',
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search companies, digital employees, or pages/i)).toBeInTheDocument()
    })
  })

  it('shows static pages when opened with no search query', async () => {
    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Portfolio')).toBeInTheDocument()
      expect(screen.getByText('Companies')).toBeInTheDocument()
      expect(screen.getByText('Support')).toBeInTheDocument()
      expect(screen.getByText('Observatory')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  it('shows Pages group label', async () => {
    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByText('Pages')).toBeInTheDocument()
    })
  })

  it('filters static pages based on search query', async () => {
    const user = userEvent.setup()
    renderWithProvider()

    // Open the palette
    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search companies/i)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/search companies/i)
    await user.type(input, 'Dash')

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    // Non-matching pages should be filtered out
    await waitFor(() => {
      expect(screen.queryByText('Observatory')).not.toBeInTheDocument()
    })
  })

  it('shows dynamic search results from API', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          companies: [
            { id: 'c1', name: 'Acme Insurance', industry: 'Insurance' },
          ],
          digitalEmployees: [
            { id: 'de1', name: 'Claims Bot', companyId: 'c1', companyName: 'Acme Insurance' },
          ],
        }),
    })

    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search companies/i)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/search companies/i)
    await user.type(input, 'Acme')

    await waitFor(() => {
      // "Acme Insurance" appears as both the company name and as the subtitle of Claims Bot
      expect(screen.getAllByText('Acme Insurance').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Claims Bot')).toBeInTheDocument()
    })
  })

  it('shows group labels for different result types', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          companies: [
            { id: 'c1', name: 'Acme Insurance', industry: 'Insurance' },
          ],
          digitalEmployees: [
            { id: 'de1', name: 'Claims Bot', companyId: 'c1', companyName: 'Acme Insurance' },
          ],
        }),
    })

    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search companies/i)).toBeInTheDocument()
    })

    // Use a query that won't match static pages but will match API results
    const input = screen.getByPlaceholderText(/search companies/i)
    await user.type(input, 'Acme')

    await waitFor(() => {
      // Group labels for API result types
      expect(screen.getByText('Companies')).toBeInTheDocument()
      expect(screen.getByText('Digital Employees')).toBeInTheDocument()
    })
  })

  it('shows "No results found" when there are no matches', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          companies: [],
          digitalEmployees: [],
        }),
    })

    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search companies/i)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/search companies/i)
    await user.type(input, 'xyznonexistent')

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument()
      expect(screen.getByText('Try a different search term')).toBeInTheDocument()
    })
  })

  it('shows keyboard navigation hints', async () => {
    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByText('to navigate')).toBeInTheDocument()
      expect(screen.getByText('to select')).toBeInTheDocument()
      expect(screen.getByText('to close')).toBeInTheDocument()
    })
  })

  it('shows results in a listbox', async () => {
    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByRole('listbox', { name: /search results/i })).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully and still shows static pages', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('Network error'))

    renderWithProvider()

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search companies/i)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/search companies/i)
    await user.type(input, 'Dash')

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  it('toggles open/closed with repeated Cmd+K', async () => {
    renderWithProvider()

    // Open
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      )
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search companies/i)).toBeInTheDocument()
    })

    // Close
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
      )
    })

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search companies/i)).not.toBeInTheDocument()
    })
  })
})
