import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedbackWidget } from './feedback-widget'

describe('FeedbackWidget', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Closed state (button)
  it('renders the feedback trigger button when closed', () => {
    render(<FeedbackWidget />)
    expect(screen.getByTitle('Give Feedback')).toBeInTheDocument()
  })

  it('shows "Feedback" text in the trigger button', () => {
    render(<FeedbackWidget />)
    expect(screen.getByText('Feedback')).toBeInTheDocument()
  })

  // Opening the widget
  it('opens the feedback panel when trigger button is clicked', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))

    expect(screen.getByText('Send Feedback')).toBeInTheDocument()
  })

  // Feedback type selection
  it('shows feedback type options when opened', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))

    expect(screen.getByText('Report Bug')).toBeInTheDocument()
    expect(screen.getByText('Feature Request')).toBeInTheDocument()
    expect(screen.getByText('Share Praise')).toBeInTheDocument()
    expect(screen.getByText('Report Issue')).toBeInTheDocument()
  })

  it('shows feedback form after selecting a type', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Bug'))

    expect(screen.getByPlaceholderText('Describe the bug you encountered...')).toBeInTheDocument()
    // "Send Feedback" appears in both the header (h3) and submit button
    const sendFeedbackElements = screen.getAllByText('Send Feedback')
    expect(sendFeedbackElements.length).toBeGreaterThanOrEqual(1)
  })

  it('shows correct placeholder for Feature Request', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Feature Request'))

    expect(screen.getByPlaceholderText('What feature would you like to see?')).toBeInTheDocument()
  })

  it('shows correct placeholder for Share Praise', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Share Praise'))

    expect(screen.getByPlaceholderText('What did you like about the app?')).toBeInTheDocument()
  })

  it('shows correct placeholder for Report Issue', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Issue'))

    expect(screen.getByPlaceholderText('What issue are you experiencing?')).toBeInTheDocument()
  })

  // Back button
  it('goes back to type selection when back button is clicked', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Bug'))

    // Should show the form
    expect(screen.getByPlaceholderText('Describe the bug you encountered...')).toBeInTheDocument()

    // Click back
    await user.click(screen.getByText(/Back/))

    // Should show type selection again
    expect(screen.getByText('Report Bug')).toBeInTheDocument()
    expect(screen.getByText('Feature Request')).toBeInTheDocument()
  })

  // NPS score
  it('shows NPS score selector for Praise type', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Share Praise'))

    expect(screen.getByText('How likely are you to recommend this app? (optional)')).toBeInTheDocument()
    // Should show scores 0-10
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Not likely')).toBeInTheDocument()
    expect(screen.getByText('Very likely')).toBeInTheDocument()
  })

  it('does not show NPS score selector for Bug type', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Bug'))

    expect(screen.queryByText('How likely are you to recommend this app? (optional)')).not.toBeInTheDocument()
  })

  it('does not show NPS score selector for Complaint type', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Issue'))

    expect(screen.queryByText('How likely are you to recommend this app? (optional)')).not.toBeInTheDocument()
  })

  // Submit button disabled state
  it('disables Send Feedback button when content is empty', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Bug'))

    const submitButton = screen.getByRole('button', { name: /Send Feedback/ })
    expect(submitButton).toBeDisabled()
  })

  it('enables Send Feedback button when content is entered', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Bug'))

    await user.type(screen.getByPlaceholderText('Describe the bug you encountered...'), 'The page crashes')

    const submitButton = screen.getByRole('button', { name: /Send Feedback/ })
    expect(submitButton).not.toBeDisabled()
  })

  // Submitting feedback
  it('submits feedback and shows thank you message', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true })

    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Bug'))
    await user.type(screen.getByPlaceholderText('Describe the bug you encountered...'), 'Page crashes on load')
    await user.click(screen.getByRole('button', { name: /Send Feedback/ }))

    await waitFor(() => {
      expect(screen.getByText('Thank you!')).toBeInTheDocument()
      expect(screen.getByText('Your feedback has been submitted')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/observatory/feedback', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
  })

  it('sends correct body with BUG type', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true })

    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Bug'))
    await user.type(screen.getByPlaceholderText('Describe the bug you encountered...'), 'The page crashes')
    await user.click(screen.getByRole('button', { name: /Send Feedback/ }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    expect(body.type).toBe('BUG')
    expect(body.content).toBe('The page crashes')
  })

  // Close button
  it('closes the widget when X button is clicked', async () => {
    const user = userEvent.setup()
    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    expect(screen.getByText('Send Feedback')).toBeInTheDocument()

    // Click the close button (X)
    const closeButtons = screen.getAllByRole('button')
    const closeButton = closeButtons.find(btn => btn.querySelector('svg') && btn.closest('.flex.items-center.justify-between'))
    if (closeButton) {
      await user.click(closeButton)
    }

    // Should be back to the trigger button
    await waitFor(() => {
      expect(screen.getByTitle('Give Feedback')).toBeInTheDocument()
    })
  })

  // NPS score selection
  it('allows selecting an NPS score', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true })

    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Share Praise'))

    // Type content
    await user.type(screen.getByPlaceholderText('What did you like about the app?'), 'Great app!')

    // Select NPS score 9
    await user.click(screen.getByText('9'))

    // Submit
    await user.click(screen.getByRole('button', { name: /Send Feedback/ }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    expect(body.npsScore).toBe(9)
    expect(body.type).toBe('PRAISE')
  })

  it('allows deselecting an NPS score by clicking again', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true })

    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Share Praise'))

    // Select then deselect score 7
    await user.click(screen.getByText('7'))
    await user.click(screen.getByText('7'))

    // Type content and submit
    await user.type(screen.getByPlaceholderText('What did you like about the app?'), 'Nice!')
    await user.click(screen.getByRole('button', { name: /Send Feedback/ }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(fetchCall[1].body)
    expect(body.npsScore).toBeNull()
  })

  // Error handling
  it('handles fetch error gracefully without crashing', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Bug'))
    await user.type(screen.getByPlaceholderText('Describe the bug you encountered...'), 'Error test')
    await user.click(screen.getByRole('button', { name: /Send Feedback/ }))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to submit feedback:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  // Shows "Sending..." during submission
  it('shows "Sending..." text while submitting', async () => {
    const user = userEvent.setup()

    let resolvePromise: (value: { ok: boolean }) => void
    const pendingPromise = new Promise<{ ok: boolean }>((resolve) => {
      resolvePromise = resolve
    })

    global.fetch = vi.fn().mockReturnValueOnce(pendingPromise)

    render(<FeedbackWidget />)

    await user.click(screen.getByTitle('Give Feedback'))
    await user.click(screen.getByText('Report Bug'))
    await user.type(screen.getByPlaceholderText('Describe the bug you encountered...'), 'Loading test')
    await user.click(screen.getByRole('button', { name: /Send Feedback/ }))

    expect(screen.getByText('Sending...')).toBeInTheDocument()

    // Resolve to clean up
    resolvePromise!({ ok: true })
    await waitFor(() => {
      expect(screen.getByText('Thank you!')).toBeInTheDocument()
    })
  })
})
