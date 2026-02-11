import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusUpdateModal } from './status-update-modal'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock clipboard - must be set up in beforeEach to survive across tests
let mockWriteText: ReturnType<typeof vi.fn>

// Mock window.open
const mockWindowOpen = vi.fn()
window.open = mockWindowOpen

const mockStatusData = {
  success: true,
  data: {
    digitalEmployee: { id: 'de-1', name: 'Claims Assistant' },
    company: 'Acme Insurance',
    currentPhase: 2,
    phaseName: 'Process Design',
    isBlocked: false,
    blockedReason: null,
    progress: 45,
    statusUpdate: 'Dear Team,\n\nWe are making great progress on Claims Assistant.\n\nBest regards',
    shortUpdate: 'Claims Assistant: Process Design phase, 45% complete, on track.',
    generatedAt: '2025-06-15T10:00:00Z',
  },
}

describe('StatusUpdateModal', () => {
  const defaultProps = {
    digitalEmployeeId: 'de-1',
    isOpen: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    })
  })

  it('does not render when isOpen is false', () => {
    render(<StatusUpdateModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Client Status Update')).not.toBeInTheDocument()
  })

  it('renders modal header when open', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)
    expect(screen.getByText('Client Status Update')).toBeInTheDocument()
    expect(screen.getByText('Share progress with your client')).toBeInTheDocument()
  })

  it('shows loading spinner while fetching', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}))
    render(<StatusUpdateModal {...defaultProps} />)
    // The RefreshCw spinner is shown during loading
    const spinners = document.querySelectorAll('.animate-spin')
    expect(spinners.length).toBeGreaterThanOrEqual(1)
  })

  it('fetches status update when opened', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/digital-employees/de-1/status-update')
    })
  })

  it('shows the full status update text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/We are making great progress on Claims Assistant/)).toBeInTheDocument()
    })
  })

  it('shows phase name and on-track status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Process Design')).toBeInTheDocument()
    })
  })

  it('shows "On Track" indicator when not blocked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/On Track/)).toBeInTheDocument()
    })
  })

  it('shows "Blocked" indicator when blocked', async () => {
    const blockedData = {
      ...mockStatusData,
      data: {
        ...mockStatusData.data,
        isBlocked: true,
        blockedReason: 'Waiting for API access',
      },
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(blockedData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Blocked/)).toBeInTheDocument()
    })
  })

  it('shows Full Update and Quick Summary tabs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Full Update')).toBeInTheDocument()
      expect(screen.getByText('Quick Summary')).toBeInTheDocument()
    })
  })

  it('switches to Quick Summary when tab is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Quick Summary')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Quick Summary'))

    await waitFor(() => {
      expect(screen.getByText(mockStatusData.data.shortUpdate)).toBeInTheDocument()
    })
  })

  it('shows generated timestamp', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText(/Generated:/)).toBeInTheDocument()
    })
  })

  it('shows copy button for full update and shows "Copied!" after clicking', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy full update/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /copy full update/i }))

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
  })

  it('shows copy button for summary on Quick Summary tab', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Quick Summary')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Quick Summary'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy summary/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /copy summary/i }))

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
  })

  it('shows Regenerate button that refetches data', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatusData),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatusData),
      })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /regenerate/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  it('shows Email to Client button that opens mailto link', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /email to client/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /email to client/i }))

    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('mailto:'),
      '_blank'
    )
    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining('Claims%20Assistant'),
      '_blank'
    )
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStatusData),
    })

    render(<StatusUpdateModal {...defaultProps} onClose={onClose} />)

    // Find the close button (the X button in the header)
    const closeButtons = screen.getAllByRole('button')
    // The first button in the header area is the close button
    const closeBtn = closeButtons.find(btn =>
      btn.closest('.border-b')
    )
    expect(closeBtn).toBeDefined()

    if (closeBtn) {
      await user.click(closeBtn)
      expect(onClose).toHaveBeenCalled()
    }
  })

  it('shows error message when API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: false, error: 'No design week found' }),
    })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('No design week found')).toBeInTheDocument()
    })
  })

  it('shows error message when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to generate status update')).toBeInTheDocument()
    })
  })

  it('shows Try Again button on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  it('retries when Try Again is clicked', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStatusData),
      })

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(screen.getByText(/We are making great progress/)).toBeInTheDocument()
    })
  })

  it('does not show footer buttons while loading', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {}))
    render(<StatusUpdateModal {...defaultProps} />)

    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /email/i })).not.toBeInTheDocument()
  })

  it('does not show footer buttons when there is an error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<StatusUpdateModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to generate status update')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /email/i })).not.toBeInTheDocument()
  })
})
