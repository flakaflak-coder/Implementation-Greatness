import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionUpload } from './session-upload'

// Mock Radix Dialog portal to render inline for testing
vi.mock('@radix-ui/react-dialog', async () => {
  const actual = await vi.importActual<typeof import('@radix-ui/react-dialog')>('@radix-ui/react-dialog')
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

describe('SessionUpload', () => {
  const defaultProps = {
    currentPhase: 1,
    onUploadComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the upload button', () => {
    render(<SessionUpload {...defaultProps} />)
    expect(screen.getByRole('button', { name: /upload session recording/i })).toBeInTheDocument()
  })

  it('opens the dialog when the upload button is clicked', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    expect(screen.getByText('Add Session Recording')).toBeInTheDocument()
  })

  it('displays the auto-detected phase label', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} currentPhase={2} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    expect(screen.getByText(/auto-detected phase: process design/i)).toBeInTheDocument()
  })

  it('shows correct phase labels for all phases', async () => {
    const user = userEvent.setup()
    const phaseLabels: Record<number, string> = {
      1: 'Kickoff',
      2: 'Process Design',
      3: 'Technical Deep-dive',
      4: 'Sign-off',
    }

    for (const [phase, label] of Object.entries(phaseLabels)) {
      const { unmount } = render(<SessionUpload {...defaultProps} currentPhase={Number(phase)} />)

      await user.click(screen.getByRole('button', { name: /upload session recording/i }))
      expect(screen.getByText(`Auto-detected phase: ${label}`)).toBeInTheDocument()
      unmount()
    }
  })

  it('shows the drop zone with accepted file types', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    expect(screen.getByText('Drop recording or materials here')).toBeInTheDocument()
    expect(screen.getByText('Accepts: MP4, MP3, WAV, PDF, PPTX, DOCX')).toBeInTheDocument()
  })

  it('shows the recording URL input field', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    expect(screen.getByPlaceholderText('https://loom.com/share/...')).toBeInTheDocument()
    expect(screen.getByText(/supports: loom, google drive, teams recordings, youtube/i)).toBeInTheDocument()
  })

  it('shows processing info message', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    expect(screen.getByText(/processing typically completes within 10-15 minutes/i)).toBeInTheDocument()
  })

  it('has a disabled Upload & Process button when no content is provided', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    const processButton = screen.getByRole('button', { name: /upload & process/i })
    expect(processButton).toBeDisabled()
  })

  it('enables Upload & Process button when a URL is entered', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    const urlInput = screen.getByPlaceholderText('https://loom.com/share/...')
    await user.type(urlInput, 'https://loom.com/share/abc123')

    const processButton = screen.getByRole('button', { name: /upload & process/i })
    expect(processButton).not.toBeDisabled()
  })

  it('shows Cancel and Upload & Process buttons in the dialog', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload & process/i })).toBeInTheDocument()
  })

  it('closes the dialog when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))
    expect(screen.getByText('Add Session Recording')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByText('Add Session Recording')).not.toBeInTheDocument()
    })
  })

  it('shows Processing... state when Upload & Process is clicked', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    // Enter a URL to enable the button
    const urlInput = screen.getByPlaceholderText('https://loom.com/share/...')
    await user.type(urlInput, 'https://loom.com/share/abc123')

    await user.click(screen.getByRole('button', { name: /upload & process/i }))

    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('calls onUploadComplete after processing finishes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onUploadComplete = vi.fn()

    render(<SessionUpload currentPhase={1} onUploadComplete={onUploadComplete} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    const urlInput = screen.getByPlaceholderText('https://loom.com/share/...')
    await user.type(urlInput, 'https://loom.com/share/abc123')

    await user.click(screen.getByRole('button', { name: /upload & process/i }))

    // Advance past the 2000ms processing simulation
    vi.advanceTimersByTime(2500)

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith('new-session-id')
    })

    vi.useRealTimers()
  })

  it('accepts a custom className', () => {
    render(<SessionUpload {...defaultProps} className="custom-class" />)
    const button = screen.getByRole('button', { name: /upload session recording/i })
    expect(button).toHaveClass('custom-class')
  })

  it('displays uploaded file information after file selection', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    // Create a mock file
    const file = new File(['test content'], 'meeting-recording.mp4', { type: 'video/mp4' })

    // Find the hidden file input and simulate file selection
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText('meeting-recording.mp4')).toBeInTheDocument()
    })
  })

  it('shows Browse Files button in the drop zone', async () => {
    const user = userEvent.setup()
    render(<SessionUpload {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /upload session recording/i }))

    expect(screen.getByText('Browse Files')).toBeInTheDocument()
  })
})
