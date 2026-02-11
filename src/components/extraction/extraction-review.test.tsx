import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExtractionReview } from './extraction-review'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { name: 'Sophie', email: 'sophie@freeday.ai' },
    },
  }),
}))

// Mock the ErrorBoundary to just render children
vi.mock('@/components/ui/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock Collapsible from Radix
vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleTrigger: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button data-testid="collapsible-trigger" onClick={onClick} className={className}>{children}</button>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
}))

const mockItems = [
  {
    id: 'item-1',
    type: 'STAKEHOLDER',
    category: 'Primary',
    content: 'John Smith - Product Owner',
    structuredData: null,
    confidence: 0.95,
    status: 'PENDING',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    sourceTimestamp: 120,
    sourceSpeaker: 'Sophie',
    sourceQuote: 'John Smith is the product owner for this implementation',
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'item-2',
    type: 'GOAL',
    category: null,
    content: 'Reduce claims processing time by 50%',
    structuredData: null,
    confidence: 0.87,
    status: 'PENDING',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    sourceTimestamp: 300,
    sourceSpeaker: 'Client',
    sourceQuote: 'We want to cut processing time in half',
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'item-3',
    type: 'STAKEHOLDER',
    category: 'Secondary',
    content: 'Jane Doe - IT Lead',
    structuredData: null,
    confidence: 0.72,
    status: 'APPROVED',
    reviewedBy: 'Sophie',
    reviewedAt: '2024-01-15T12:00:00.000Z',
    reviewNotes: 'Confirmed via email',
    sourceTimestamp: null,
    sourceSpeaker: null,
    sourceQuote: null,
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'item-4',
    type: 'RISK',
    category: null,
    content: 'Client API might not be ready in time',
    structuredData: null,
    confidence: 0.55,
    status: 'REJECTED',
    reviewedBy: 'Sophie',
    reviewedAt: '2024-01-15T13:00:00.000Z',
    reviewNotes: 'Not a real risk, already confirmed timeline',
    sourceTimestamp: null,
    sourceSpeaker: null,
    sourceQuote: null,
    createdAt: '2024-01-15T10:00:00.000Z',
  },
]

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  global.fetch = fetchMock
})

describe('ExtractionReview', () => {
  // Loading state
  it('shows loading state initially', () => {
    fetchMock.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ExtractionReview sessionId="session-1" />)
    expect(screen.getByText('Analyzing extracted items...')).toBeInTheDocument()
  })

  // Empty state
  it('shows empty state when no items are returned', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('No items extracted yet')).toBeInTheDocument()
    })
  })

  it('shows descriptive text in empty state', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(
        screen.getByText(/Once the session recording is processed/)
      ).toBeInTheDocument()
    })
  })

  // Error state
  it('shows error state when fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'))
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      const headings = screen.getAllByText('Failed to load extracted items')
      expect(headings.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows "Try Again" button in error state', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'))
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument()
    })
  })

  it('retries fetch when "Try Again" is clicked', async () => {
    const user = userEvent.setup()
    fetchMock.mockRejectedValueOnce(new Error('Network error'))
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      const headings = screen.getAllByText('Failed to load extracted items')
      expect(headings.length).toBeGreaterThanOrEqual(1)
    })

    // Verify fetch was called once (initial load)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Mock a second fetch call for the retry
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })

    await user.click(screen.getByRole('button', { name: /Try Again/ }))

    // Verify fetch was called again (retry)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenLastCalledWith('/api/sessions/session-1/extract')
    })
  })

  // Items display
  it('renders extracted items after successful fetch', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('John Smith - Product Owner')).toBeInTheDocument()
      expect(screen.getByText('Reduce claims processing time by 50%')).toBeInTheDocument()
    })
  })

  it('groups items by type with correct labels', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('Stakeholder')).toBeInTheDocument()
      expect(screen.getByText('Goal')).toBeInTheDocument()
      expect(screen.getByText('Risk')).toBeInTheDocument()
    })
  })

  // Summary bar counts
  it('shows total items extracted count', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('items extracted')).toBeInTheDocument()
    })
  })

  it('shows pending count in summary', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('2 pending')).toBeInTheDocument()
    })
  })

  it('shows approved count in summary', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('1 approved')).toBeInTheDocument()
    })
  })

  it('shows rejected count in summary when > 0', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('1 rejected')).toBeInTheDocument()
    })
  })

  // Status badges
  it('shows "Pending Review" badge for pending items', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      const pendingBadges = screen.getAllByText('Pending Review')
      expect(pendingBadges.length).toBe(2)
    })
  })

  it('shows "Approved" badge for approved items', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('Approved')).toBeInTheDocument()
    })
  })

  it('shows "Rejected" badge for rejected items', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeInTheDocument()
    })
  })

  // Confidence display
  it('displays confidence percentage', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockItems[0]] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('95% High')).toBeInTheDocument()
    })
  })

  it('shows "Med" label for confidence 60-79%', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockItems[2]] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('72% Med')).toBeInTheDocument()
    })
  })

  it('shows "Low" label for confidence < 60%', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockItems[3]] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('55% Low')).toBeInTheDocument()
    })
  })

  // Category badge
  it('displays category badge when category is present', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockItems[0]] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('Primary')).toBeInTheDocument()
    })
  })

  // Approve/Reject actions
  it('shows Approve All button when there are pending items', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Approve All \(2\)/ })).toBeInTheDocument()
    })
  })

  it('shows Reject All button when there are pending items', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reject All/ })).toBeInTheDocument()
    })
  })

  it('shows individual Approve button for pending items', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockItems[0]] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Approve$/ })).toBeInTheDocument()
    })
  })

  it('shows individual Reject button for pending items', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockItems[0]] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Reject$/ })).toBeInTheDocument()
    })
  })

  it('shows "Need Clarification" button for pending items', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockItems[0]] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Need Clarification/ })).toBeInTheDocument()
    })
  })

  it('calls PATCH API when approving an item', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockItems[0]] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('John Smith - Product Owner')).toBeInTheDocument()
    })

    // Mock the PATCH call
    fetchMock.mockResolvedValueOnce({ ok: true })

    await user.click(screen.getByRole('button', { name: /^Approve$/ }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/extracted-items/item-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"status":"APPROVED"'),
      })
    })
  })

  it('calls PATCH API when rejecting an item', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockItems[0]] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('John Smith - Product Owner')).toBeInTheDocument()
    })

    fetchMock.mockResolvedValueOnce({ ok: true })

    await user.click(screen.getByRole('button', { name: /^Reject$/ }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/extracted-items/item-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"status":"REJECTED"'),
      })
    })
  })

  // Filter tabs
  it('renders filter tabs', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText(/All \(4\)/)).toBeInTheDocument()
      expect(screen.getByText(/Pending \(2\)/)).toBeInTheDocument()
      expect(screen.getByText(/Approved \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/Rejected \(1\)/)).toBeInTheDocument()
    })
  })

  it('filters items when clicking a status filter tab', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('John Smith - Product Owner')).toBeInTheDocument()
    })

    // Click "Approved" filter
    await user.click(screen.getByText(/Approved \(1\)/))

    // Should only show approved item
    await waitFor(() => {
      expect(screen.getByText('Jane Doe - IT Lead')).toBeInTheDocument()
      expect(screen.queryByText('John Smith - Product Owner')).not.toBeInTheDocument()
    })
  })

  // All items reviewed celebration
  it('shows celebration message when all items are reviewed', async () => {
    const allReviewedItems = mockItems.map((item) => ({
      ...item,
      status: 'APPROVED',
    }))
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: allReviewedItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('All items reviewed')).toBeInTheDocument()
    })
  })

  it('does not show celebration when pending items remain', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockItems }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('John Smith - Product Owner')).toBeInTheDocument()
    })

    expect(screen.queryByText('All items reviewed')).not.toBeInTheDocument()
  })

  // Help text for first-time users
  it('shows help text when all items are pending', async () => {
    const allPending = mockItems.map((item) => ({ ...item, status: 'PENDING' }))
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: allPending }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(
        screen.getByText(/The AI extracted 4 items from this session/)
      ).toBeInTheDocument()
    })
  })

  // Source quote display
  it('displays source quote within expanded item', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockItems[0]] }),
    })
    render(<ExtractionReview sessionId="session-1" />)

    await waitFor(() => {
      expect(screen.getByText('Source Quote')).toBeInTheDocument()
      expect(
        screen.getByText(/John Smith is the product owner for this implementation/)
      ).toBeInTheDocument()
    })
  })

  // Fetch correct API endpoint
  it('fetches items from the correct API endpoint', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    })
    render(<ExtractionReview sessionId="session-42" />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/sessions/session-42/extract')
    })
  })
})
