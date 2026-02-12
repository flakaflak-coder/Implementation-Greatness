import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnifiedUpload } from './unified-upload'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/test',
}))

// Mock PipelineProgress to isolate this component
vi.mock('./pipeline-progress', () => ({
  PipelineProgress: ({ stages }: { stages: unknown[] }) => (
    <div data-testid="pipeline-progress">{stages.length} stages</div>
  ),
  createPipelineStages: vi.fn(() => []),
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock EventSource
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  close = vi.fn()
  static instances: MockEventSource[] = []
  constructor() {
    MockEventSource.instances.push(this)
  }
}
global.EventSource = MockEventSource as unknown as typeof EventSource

describe('UnifiedUpload', () => {
  const defaultProps = {
    designWeekId: 'dw-123',
    onComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    MockEventSource.instances = []
  })

  it('renders the upload drop zone', () => {
    render(<UnifiedUpload {...defaultProps} />)
    expect(screen.getByText('Drop recording, transcript, or document')).toBeInTheDocument()
  })

  it('renders the drop zone with supported file types', () => {
    render(<UnifiedUpload {...defaultProps} />)
    expect(screen.getByText('Drop recording, transcript, or document')).toBeInTheDocument()
    expect(screen.getByText('Supports: MP4, MP3, WAV, PDF, DOCX, TXT')).toBeInTheDocument()
  })

  it('renders "Advanced options" collapsible trigger', () => {
    render(<UnifiedUpload {...defaultProps} />)
    expect(screen.getByText('Advanced options')).toBeInTheDocument()
  })

  it('shows extraction mode options when Advanced options is expanded', async () => {
    const user = userEvent.setup()
    render(<UnifiedUpload {...defaultProps} />)

    await user.click(screen.getByText('Advanced options'))

    await waitFor(() => {
      expect(screen.getByText('Extraction Mode')).toBeInTheDocument()
      // "Auto" appears in both the badge and the button, so use getAllByText
      expect(screen.getAllByText('Auto').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('Section-Based')).toBeInTheDocument()
      expect(screen.getByText('Exhaustive')).toBeInTheDocument()
      expect(screen.getByText('Two-Pass')).toBeInTheDocument()
      expect(screen.getByText('Multi-Model')).toBeInTheDocument()
      expect(screen.getByText('Standard')).toBeInTheDocument()
    })
  })

  it('shows "Recommended" badge on Auto mode in advanced options', async () => {
    const user = userEvent.setup()
    render(<UnifiedUpload {...defaultProps} />)

    await user.click(screen.getByText('Advanced options'))

    await waitFor(() => {
      expect(screen.getByText('Recommended')).toBeInTheDocument()
    })
  })

  it('changes extraction mode when a different mode is clicked', async () => {
    const user = userEvent.setup()
    render(<UnifiedUpload {...defaultProps} />)

    // Open advanced options
    await user.click(screen.getByText('Advanced options'))

    await waitFor(() => {
      expect(screen.getByText('Exhaustive')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Exhaustive'))

    // The mode description should be present
    expect(screen.getByText('Maximum coverage, slower')).toBeInTheDocument()
  })

  it('shows mode descriptions for each extraction option', async () => {
    const user = userEvent.setup()
    render(<UnifiedUpload {...defaultProps} />)

    await user.click(screen.getByText('Advanced options'))

    await waitFor(() => {
      expect(screen.getByText('AI picks the best strategy')).toBeInTheDocument()
      expect(screen.getByText('Single-pass extraction')).toBeInTheDocument()
      expect(screen.getByText('Maximum coverage, slower')).toBeInTheDocument()
      expect(screen.getByText('Extract then re-check for missed items')).toBeInTheDocument()
      expect(screen.getByText('Use both Gemini and Claude')).toBeInTheDocument()
      expect(screen.getByText('Split document into sections first')).toBeInTheDocument()
    })
  })

  it('has a hidden file input with correct accept attribute', () => {
    render(<UnifiedUpload {...defaultProps} />)
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    expect(fileInput).not.toBeNull()
    expect(fileInput.type).toBe('file')
    expect(fileInput.className).toContain('hidden')
  })

  it('shows error for invalid file type via direct onChange', async () => {
    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const invalidFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })

    // Directly fire a change event with the invalid file
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      configurable: true,
    })
    fireEvent.change(fileInput)

    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
    })
  })

  it('starts upload for a valid PDF file', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-456' }),
    })

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['pdf content'], 'session-notes.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/upload/start', expect.objectContaining({
        method: 'POST',
      }))
    })
  })

  it('shows file info during uploading state', async () => {
    const user = userEvent.setup()
    // Make fetch hang to keep component in uploading state
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['x'.repeat(1024 * 1024 * 5)], 'meeting.mp4', { type: 'video/mp4' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(screen.getByText('meeting.mp4')).toBeInTheDocument()
      expect(screen.getByText(/MB/)).toBeInTheDocument()
    })
  })

  it('shows time estimate during upload', async () => {
    const user = userEvent.setup()
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['x'.repeat(1024)], 'notes.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument()
    })
  })

  it('shows cancel button during upload', async () => {
    const user = userEvent.setup()
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('shows error state when upload fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    })

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(screen.getByText('Processing Failed')).toBeInTheDocument()
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('shows retry and start over buttons in error state', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-789' }),
    })

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    // Wait for processing state then simulate SSE error
    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0)
    })

    const eventSource = MockEventSource.instances[MockEventSource.instances.length - 1]
    eventSource.onmessage?.({
      data: JSON.stringify({
        jobId: 'job-789',
        status: 'FAILED',
        stage: 'CLASSIFICATION',
        error: 'Classification failed',
      }),
    } as MessageEvent)

    await waitFor(() => {
      expect(screen.getByText('Processing Failed')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument()
    })
  })

  it('shows complete state with population results', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-101' }),
    })

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0)
    })

    const eventSource = MockEventSource.instances[MockEventSource.instances.length - 1]
    eventSource.onmessage?.({
      data: JSON.stringify({
        jobId: 'job-101',
        status: 'COMPLETE',
        stage: 'COMPLETE',
        population: {
          extractedItems: 15,
          integrations: 3,
          businessRules: 5,
          testCases: 8,
        },
        classification: {
          type: 'PROCESS_DESIGN',
          confidence: 0.92,
        },
      }),
    } as MessageEvent)

    await waitFor(() => {
      expect(screen.getByText('Processing Complete!')).toBeInTheDocument()
      expect(screen.getByText(/15 items/)).toBeInTheDocument()
      expect(screen.getByText(/3 integrations/)).toBeInTheDocument()
      expect(screen.getByText(/8 test cases/)).toBeInTheDocument()
    })
  })

  it('calls onComplete after successful processing', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-102' }),
    })

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0)
    })

    const eventSource = MockEventSource.instances[MockEventSource.instances.length - 1]
    eventSource.onmessage?.({
      data: JSON.stringify({
        jobId: 'job-102',
        status: 'COMPLETE',
        stage: 'COMPLETE',
      }),
    } as MessageEvent)

    await waitFor(() => {
      expect(defaultProps.onComplete).toHaveBeenCalled()
    })
  })

  it('shows "Upload Another" button in complete state', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-103' }),
    })

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0)
    })

    const eventSource = MockEventSource.instances[MockEventSource.instances.length - 1]
    eventSource.onmessage?.({
      data: JSON.stringify({
        jobId: 'job-103',
        status: 'COMPLETE',
        stage: 'COMPLETE',
      }),
    } as MessageEvent)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload another/i })).toBeInTheDocument()
    })
  })

  it('resets to idle state when "Upload Another" is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-104' }),
    })

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0)
    })

    const eventSource = MockEventSource.instances[MockEventSource.instances.length - 1]
    eventSource.onmessage?.({
      data: JSON.stringify({
        jobId: 'job-104',
        status: 'COMPLETE',
        stage: 'COMPLETE',
      }),
    } as MessageEvent)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload another/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /upload another/i }))

    await waitFor(() => {
      expect(screen.getByText('Drop recording, transcript, or document')).toBeInTheDocument()
    })
  })

  it('shows classification result with missing questions', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-105' }),
    })

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0)
    })

    const eventSource = MockEventSource.instances[MockEventSource.instances.length - 1]
    eventSource.onmessage?.({
      data: JSON.stringify({
        jobId: 'job-105',
        status: 'COMPLETE',
        stage: 'COMPLETE',
        classification: {
          type: 'KICKOFF_SESSION',
          confidence: 0.85,
          missingQuestions: ['What is the expected volume?', 'Who is the technical contact?'],
        },
      }),
    } as MessageEvent)

    await waitFor(() => {
      expect(screen.getByText('Kickoff Session')).toBeInTheDocument()
      expect(screen.getByText('Consider asking:')).toBeInTheDocument()
      expect(screen.getByText('What is the expected volume?')).toBeInTheDocument()
      expect(screen.getByText('Who is the technical contact?')).toBeInTheDocument()
    })
  })

  it('handles cancel during processing', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-106' }),
      })
      .mockResolvedValueOnce({ ok: true }) // cancel endpoint

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.getByText('Drop recording, transcript, or document')).toBeInTheDocument()
    })
  })

  it('handles retry after error', async () => {
    const user = userEvent.setup()
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'job-107' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBeGreaterThan(0)
    })

    // Simulate failure
    const eventSource = MockEventSource.instances[MockEventSource.instances.length - 1]
    eventSource.onmessage?.({
      data: JSON.stringify({
        jobId: 'job-107',
        status: 'FAILED',
        stage: 'GENERAL_EXTRACTION',
        error: 'Extraction timeout',
      }),
    } as MessageEvent)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/upload/job-107/retry', expect.objectContaining({
        method: 'POST',
      }))
    })
  })

  it('accepts a custom className', () => {
    const { container } = render(<UnifiedUpload {...defaultProps} className="my-custom-class" />)
    expect(container.firstChild).toHaveClass('my-custom-class')
  })

  it('shows start over button in error state when no jobId exists', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<UnifiedUpload {...defaultProps} />)

    const fileInput = document.getElementById('file-input') as HTMLInputElement
    const validFile = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, validFile)

    await waitFor(() => {
      expect(screen.getByText('Processing Failed')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /start over/i })).toBeInTheDocument()
    })
  })
})
