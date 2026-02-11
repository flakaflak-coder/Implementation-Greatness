import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PortfolioFeedbackWidget } from './feedback-widget'
import { type TimelineDE } from './gantt-timeline'

function createDE(overrides: Partial<TimelineDE> = {}): TimelineDE {
  return {
    id: 'de-1',
    name: 'Claims Assistant',
    company: { id: 'company-1', name: 'Acme Insurance' },
    status: 'DESIGN',
    currentStage: 'design_week',
    goLiveDate: '2026-06-15',
    assignedTo: 'Sophie',
    trafficLight: 'green',
    issues: [],
    startWeek: 5,
    endWeek: 12,
    goLiveWeek: 20,
    trackerStatus: 'ON_TRACK',
    riskLevel: 'LOW',
    blocker: null,
    ownerClient: null,
    ownerFreedayProject: null,
    ownerFreedayEngineering: null,
    thisWeekActions: null,
    percentComplete: 35,
    sortOrder: 1,
    designWeek: null,
    prerequisites: { total: 5, received: 3, blocked: 0, pending: 2 },
    createdAt: '2026-01-10',
    ...overrides,
  }
}

describe('PortfolioFeedbackWidget', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Basic rendering
  it('renders the AI Assistant header', () => {
    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)
    expect(screen.getByText('Update projects with natural language')).toBeInTheDocument()
  })

  it('renders the textarea with placeholder', () => {
    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)
    expect(screen.getByPlaceholderText(/Acme DE is blocked/)).toBeInTheDocument()
  })

  it('shows DE count in footer', () => {
    render(<PortfolioFeedbackWidget digitalEmployees={[createDE(), createDE({ id: 'de-2' })]} />)
    expect(screen.getByText('2 DEs available')).toBeInTheDocument()
  })

  it('shows singular "DE" for single digital employee', () => {
    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)
    expect(screen.getByText('1 DE available')).toBeInTheDocument()
  })

  it('renders the Analyze button', () => {
    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)
    expect(screen.getByText('Analyze')).toBeInTheDocument()
  })

  // Disabled state
  it('disables Analyze button when textarea is empty', () => {
    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)
    const button = screen.getByRole('button', { name: /Analyze/ })
    expect(button).toBeDisabled()
  })

  it('enables Analyze button when textarea has content', async () => {
    const user = userEvent.setup()
    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)

    await user.type(screen.getByRole('textbox'), 'Move Acme forward 2 weeks')
    const button = screen.getByRole('button', { name: /Analyze/ })
    expect(button).not.toBeDisabled()
  })

  // Submit feedback
  it('submits feedback on Analyze click and shows result', async () => {
    const user = userEvent.setup()
    const mockResult = {
      success: true,
      changes: [
        {
          deId: 'de-1',
          deName: 'Claims Assistant',
          companyName: 'Acme Insurance',
          field: 'trackerStatus',
          fieldLabel: 'Status',
          oldValue: 'ON_TRACK',
          newValue: 'BLOCKED',
        },
      ],
      explanation: 'I will mark Claims Assistant as blocked.',
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockResult),
    })

    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)

    await user.type(screen.getByRole('textbox'), 'Block Claims Assistant')
    await user.click(screen.getByRole('button', { name: /Analyze/ }))

    await waitFor(() => {
      expect(screen.getByText('I will mark Claims Assistant as blocked.')).toBeInTheDocument()
    })

    expect(screen.getByText('Proposed Changes')).toBeInTheDocument()
    expect(screen.getByText('Claims Assistant')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('shows error explanation when fetch fails', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)

    await user.type(screen.getByRole('textbox'), 'Some feedback')
    await user.click(screen.getByRole('button', { name: /Analyze/ }))

    await waitFor(() => {
      expect(screen.getByText('An error occurred while processing your feedback.')).toBeInTheDocument()
    })
  })

  // Warnings display
  it('shows warnings when result contains warnings', async () => {
    const user = userEvent.setup()
    const mockResult = {
      success: true,
      changes: [],
      explanation: 'No changes found.',
      warnings: ['Could not find the specified DE'],
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockResult),
    })

    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)

    await user.type(screen.getByRole('textbox'), 'Some feedback')
    await user.click(screen.getByRole('button', { name: /Analyze/ }))

    await waitFor(() => {
      expect(screen.getByText('Could not find the specified DE')).toBeInTheDocument()
    })
  })

  // Cancel button
  it('shows Cancel button after result and returns to input on click', async () => {
    const user = userEvent.setup()
    const mockResult = {
      success: true,
      changes: [],
      explanation: 'No changes needed.',
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockResult),
    })

    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)

    await user.type(screen.getByRole('textbox'), 'Some feedback')
    await user.click(screen.getByRole('button', { name: /Analyze/ }))

    await waitFor(() => {
      expect(screen.getByText('No changes needed.')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Cancel/ }))

    // Should be back to the input view
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  // Apply changes
  it('applies changes and calls onChangesApplied callback', async () => {
    const user = userEvent.setup()
    const onChangesApplied = vi.fn()
    const mockResult = {
      success: true,
      changes: [
        {
          deId: 'de-1',
          deName: 'Claims Assistant',
          companyName: 'Acme Insurance',
          field: 'trackerStatus',
          fieldLabel: 'Status',
          oldValue: 'ON_TRACK',
          newValue: 'BLOCKED',
        },
      ],
      explanation: 'Blocking Claims Assistant.',
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve(mockResult) })
      .mockResolvedValueOnce({ ok: true })

    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} onChangesApplied={onChangesApplied} />)

    await user.type(screen.getByRole('textbox'), 'Block Claims Assistant')
    await user.click(screen.getByRole('button', { name: /Analyze/ }))

    await waitFor(() => {
      expect(screen.getByText('Blocking Claims Assistant.')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Apply/ }))

    await waitFor(() => {
      expect(onChangesApplied).toHaveBeenCalled()
    })
  })

  // Apply button disabled when no changes
  it('disables Apply button when result has no changes', async () => {
    const user = userEvent.setup()
    const mockResult = {
      success: true,
      changes: [],
      explanation: 'No changes needed.',
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockResult),
    })

    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)

    await user.type(screen.getByRole('textbox'), 'Some query')
    await user.click(screen.getByRole('button', { name: /Analyze/ }))

    await waitFor(() => {
      expect(screen.getByText('No changes needed.')).toBeInTheDocument()
    })

    const applyButton = screen.getByRole('button', { name: /Apply/ })
    expect(applyButton).toBeDisabled()
  })

  // Change display formatting
  it('displays formatted old and new values with arrow', async () => {
    const user = userEvent.setup()
    const mockResult = {
      success: true,
      changes: [
        {
          deId: 'de-1',
          deName: 'Claims Assistant',
          companyName: 'Acme Insurance',
          field: 'trackerStatus',
          fieldLabel: 'Tracker Status',
          oldValue: 'ON_TRACK',
          newValue: 'BLOCKED',
        },
      ],
      explanation: 'Updating status.',
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockResult),
    })

    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)

    await user.type(screen.getByRole('textbox'), 'Block it')
    await user.click(screen.getByRole('button', { name: /Analyze/ }))

    await waitFor(() => {
      // Old value should be formatted: ON_TRACK -> On Track
      expect(screen.getByText('On Track')).toBeInTheDocument()
      // New value: BLOCKED -> Blocked
      expect(screen.getByText('Blocked')).toBeInTheDocument()
    })
  })

  it('displays "(empty)" for null values', async () => {
    const user = userEvent.setup()
    const mockResult = {
      success: true,
      changes: [
        {
          deId: 'de-1',
          deName: 'Claims Assistant',
          companyName: 'Acme Insurance',
          field: 'blocker',
          fieldLabel: 'Blocker',
          oldValue: null,
          newValue: 'API access needed',
        },
      ],
      explanation: 'Setting blocker.',
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      json: () => Promise.resolve(mockResult),
    })

    render(<PortfolioFeedbackWidget digitalEmployees={[createDE()]} />)

    await user.type(screen.getByRole('textbox'), 'Set blocker')
    await user.click(screen.getByRole('button', { name: /Analyze/ }))

    await waitFor(() => {
      expect(screen.getByText('(empty)')).toBeInTheDocument()
    })
  })

  // className prop
  it('accepts className prop', () => {
    const { container } = render(
      <PortfolioFeedbackWidget digitalEmployees={[createDE()]} className="my-custom-class" />
    )
    expect(container.firstChild).toHaveClass('my-custom-class')
  })
})
