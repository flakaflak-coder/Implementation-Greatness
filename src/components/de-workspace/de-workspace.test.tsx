import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEWorkspace } from './de-workspace'
import type { DEWorkspaceProps } from './types'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock child tab components to keep tests focused
vi.mock('./tabs/progress-tab', () => ({
  ProgressTab: () => <div data-testid="progress-tab">Progress Tab Content</div>,
}))

vi.mock('./tabs/business-profile-tab-v2', () => ({
  BusinessProfileTabV2: () => <div data-testid="business-tab">Business Profile Tab Content</div>,
}))

vi.mock('./tabs/technical-profile-tab-v2', () => ({
  TechnicalProfileTabV2: () => <div data-testid="technical-tab">Technical Profile Tab Content</div>,
}))

vi.mock('./tabs/test-plan-tab-v2', () => ({
  TestPlanTabV2: () => <div data-testid="testplan-tab">Test Plan Tab Content</div>,
}))

vi.mock('./tabs/sales-handover-tab', () => ({
  SalesHandoverTab: () => <div data-testid="handover-tab">Sales Handover Tab Content</div>,
}))

vi.mock('@/components/scope-guardian/scope-guardian', () => ({
  ScopeGuardian: () => <div data-testid="scope-guardian">Scope Guardian Content</div>,
}))

vi.mock('@/components/upload', () => ({
  UnifiedUpload: () => <div data-testid="unified-upload">Upload Area</div>,
  UploadHistory: () => <div data-testid="upload-history">Upload History</div>,
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock fetch for profile loading
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DEWorkspace', () => {
  const defaultProps: DEWorkspaceProps = {
    digitalEmployee: {
      id: 'de-1',
      name: 'Claims Assistant',
      description: 'Handles insurance claims',
      status: 'DESIGN',
      company: {
        id: 'company-1',
        name: 'Acme Insurance',
      },
    },
    designWeek: {
      id: 'dw-1',
      status: 'IN_PROGRESS',
      currentPhase: 2,
      sessions: [],
      scopeItems: [],
    },
    onUploadSession: vi.fn(),
    onExtractSession: vi.fn(),
    onRefresh: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ profile: null }),
    })
  })

  it('renders the upload section', () => {
    render(<DEWorkspace {...defaultProps} />)
    expect(screen.getByText('Upload Sessions & Documents')).toBeInTheDocument()
    expect(screen.getByTestId('unified-upload')).toBeInTheDocument()
  })

  it('renders all six tab triggers', () => {
    render(<DEWorkspace {...defaultProps} />)

    expect(screen.getByRole('tab', { name: /handover/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /progress/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /scope/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /business profile/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /technical profile/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /test plan/i })).toBeInTheDocument()
  })

  it('defaults to progress tab', () => {
    render(<DEWorkspace {...defaultProps} />)

    const progressTab = screen.getByRole('tab', { name: /progress/i })
    expect(progressTab).toHaveAttribute('data-state', 'active')
  })

  it('switches to scope tab when clicked', async () => {
    const user = userEvent.setup()
    render(<DEWorkspace {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: /scope/i }))

    const scopeTab = screen.getByRole('tab', { name: /scope/i })
    expect(scopeTab).toHaveAttribute('data-state', 'active')
  })

  it('switches to business profile tab when clicked', async () => {
    const user = userEvent.setup()
    render(<DEWorkspace {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: /business profile/i }))

    const businessTab = screen.getByRole('tab', { name: /business profile/i })
    expect(businessTab).toHaveAttribute('data-state', 'active')
  })

  it('switches to technical profile tab when clicked', async () => {
    const user = userEvent.setup()
    render(<DEWorkspace {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: /technical profile/i }))

    const technicalTab = screen.getByRole('tab', { name: /technical profile/i })
    expect(technicalTab).toHaveAttribute('data-state', 'active')
  })

  it('switches to test plan tab when clicked', async () => {
    const user = userEvent.setup()
    render(<DEWorkspace {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: /test plan/i }))

    const testplanTab = screen.getByRole('tab', { name: /test plan/i })
    expect(testplanTab).toHaveAttribute('data-state', 'active')
  })

  it('switches to handover tab when clicked', async () => {
    const user = userEvent.setup()
    render(<DEWorkspace {...defaultProps} />)

    await user.click(screen.getByRole('tab', { name: /handover/i }))

    const handoverTab = screen.getByRole('tab', { name: /handover/i })
    expect(handoverTab).toHaveAttribute('data-state', 'active')
  })

  it('calls onTabChange when tab is switched', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(<DEWorkspace {...defaultProps} onTabChange={onTabChange} />)

    await user.click(screen.getByRole('tab', { name: /scope/i }))

    expect(onTabChange).toHaveBeenCalledWith('scope')
  })

  it('shows ambiguous scope item badge count', () => {
    const props = {
      ...defaultProps,
      designWeek: {
        ...defaultProps.designWeek,
        scopeItems: [
          {
            id: 'si-1',
            statement: 'Handle refunds',
            classification: 'AMBIGUOUS' as const,
            skill: null,
            conditions: null,
            notes: null,
            status: 'PENDING',
            excludeFromDocument: false,
          },
          {
            id: 'si-2',
            statement: 'Process claims',
            classification: 'AMBIGUOUS' as const,
            skill: null,
            conditions: null,
            notes: null,
            status: 'PENDING',
            excludeFromDocument: false,
          },
        ],
      },
    }

    render(<DEWorkspace {...props} />)

    // The badge with the count should appear on the scope tab
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('uses external activeTab when provided', () => {
    render(<DEWorkspace {...defaultProps} activeTab="scope" />)

    const scopeTab = screen.getByRole('tab', { name: /scope/i })
    expect(scopeTab).toHaveAttribute('data-state', 'active')
  })

  it('shows upload history when uploadJobs exist', () => {
    const props = {
      ...defaultProps,
      designWeek: {
        ...defaultProps.designWeek,
        uploadJobs: [
          {
            id: 'job-1',
            filename: 'meeting.mp4',
            mimeType: 'video/mp4',
            fileUrl: '/uploads/meeting.mp4',
            fileSize: 1024000,
            status: 'COMPLETE' as const,
            currentStage: 'done',
            createdAt: new Date(),
          },
        ],
      },
    }

    render(<DEWorkspace {...props} />)
    expect(screen.getByTestId('upload-history')).toBeInTheDocument()
  })

  it('does not show upload history when no uploadJobs exist', () => {
    render(<DEWorkspace {...defaultProps} />)
    expect(screen.queryByTestId('upload-history')).not.toBeInTheDocument()
  })

  it('fetches profiles on mount', async () => {
    render(<DEWorkspace {...defaultProps} />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/design-weeks/dw-1/profile')
      expect(mockFetch).toHaveBeenCalledWith('/api/design-weeks/dw-1/technical-profile')
    })
  })

  it('shows phase advance banner when phase changes', async () => {
    const { rerender } = render(<DEWorkspace {...defaultProps} />)

    // Simulate phase advancement
    rerender(
      <DEWorkspace
        {...defaultProps}
        designWeek={{
          ...defaultProps.designWeek,
          currentPhase: 3,
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/phase advanced to technical/i)).toBeInTheDocument()
    })
  })

  it('shows sign-off banner when status changes to PENDING_SIGNOFF', async () => {
    const { rerender } = render(<DEWorkspace {...defaultProps} />)

    rerender(
      <DEWorkspace
        {...defaultProps}
        designWeek={{
          ...defaultProps.designWeek,
          status: 'PENDING_SIGNOFF',
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/design week ready for sign-off/i)).toBeInTheDocument()
    })
  })

  it('dismisses the phase advance banner when close button is clicked', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<DEWorkspace {...defaultProps} />)

    // Trigger phase advancement
    rerender(
      <DEWorkspace
        {...defaultProps}
        designWeek={{
          ...defaultProps.designWeek,
          currentPhase: 3,
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/phase advanced to technical/i)).toBeInTheDocument()
    })

    // Find and click the dismiss button (the X button in the banner)
    const dismissButtons = screen.getAllByRole('button')
    const bannerDismiss = dismissButtons.find((btn) =>
      btn.closest('.bg-emerald-50')
    )
    expect(bannerDismiss).toBeDefined()

    if (bannerDismiss) {
      await user.click(bannerDismiss)
    }

    await waitFor(() => {
      expect(screen.queryByText(/phase advanced to technical/i)).not.toBeInTheDocument()
    })
  })
})
