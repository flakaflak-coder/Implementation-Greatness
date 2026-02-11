import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadHistory } from './upload-history'
import type { DEWorkspaceUploadJob } from '@/components/de-workspace/types'

describe('UploadHistory', () => {
  const makeUpload = (overrides: Partial<DEWorkspaceUploadJob> = {}): DEWorkspaceUploadJob => ({
    id: 'upload-1',
    filename: 'kickoff-meeting.mp4',
    mimeType: 'video/mp4',
    fileUrl: '/uploads/kickoff-meeting.mp4',
    fileSize: 52428800, // 50 MB
    status: 'COMPLETE',
    currentStage: 'done',
    createdAt: new Date('2025-06-15T10:30:00Z'),
    ...overrides,
  })

  const defaultProps = {
    uploads: [makeUpload()],
    onRetry: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders null when uploads array is empty', () => {
    const { container } = render(<UploadHistory uploads={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when uploads is undefined', () => {
    const { container } = render(<UploadHistory uploads={undefined as unknown as DEWorkspaceUploadJob[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the upload history title', () => {
    render(<UploadHistory {...defaultProps} />)
    expect(screen.getByText('Upload History')).toBeInTheDocument()
  })

  it('shows total upload count', () => {
    render(<UploadHistory {...defaultProps} />)
    expect(screen.getByText('1 uploads')).toBeInTheDocument()
  })

  it('renders filename for each upload', () => {
    render(<UploadHistory {...defaultProps} />)
    expect(screen.getByText('kickoff-meeting.mp4')).toBeInTheDocument()
  })

  it('renders file size in human-readable format', () => {
    render(<UploadHistory {...defaultProps} />)
    expect(screen.getByText(/50\.0 MB/)).toBeInTheDocument()
  })

  it('shows "Complete" badge for completed uploads', () => {
    render(<UploadHistory {...defaultProps} />)
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('shows "Failed" badge for failed uploads', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({ status: 'FAILED', error: 'Processing timeout' })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('shows "Queued" badge for queued uploads', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({ status: 'QUEUED' })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText('Queued')).toBeInTheDocument()
  })

  it('shows "Processing" badge for in-progress uploads', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({ status: 'EXTRACTING_GENERAL' })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('shows processing count badge in header when uploads are processing', () => {
    const props = {
      ...defaultProps,
      uploads: [
        makeUpload({ id: '1', status: 'EXTRACTING_GENERAL' }),
        makeUpload({ id: '2', status: 'CLASSIFYING' }),
        makeUpload({ id: '3', status: 'COMPLETE' }),
      ],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText('2 processing')).toBeInTheDocument()
  })

  it('shows error message for failed uploads', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({ status: 'FAILED', error: 'Model rate limit exceeded' })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText('Error: Model rate limit exceeded')).toBeInTheDocument()
  })

  it('shows retry button for failed uploads when onRetry is provided', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({ status: 'FAILED', error: 'Timeout' })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('does not show retry button when onRetry is not provided', () => {
    const props = {
      uploads: [makeUpload({ status: 'FAILED', error: 'Timeout' })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('calls onRetry with correct upload id when retry is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const props = {
      uploads: [makeUpload({ id: 'job-999', status: 'FAILED', error: 'Error' })],
      onRetry,
    }
    render(<UploadHistory {...props} />)

    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledWith('job-999')
  })

  it('shows classification result when available', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({
        classificationResult: {
          type: 'PROCESS_DESIGN',
          confidence: 0.88,
        },
      })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText(/Process Design/)).toBeInTheDocument()
    expect(screen.getByText(/88% confidence/)).toBeInTheDocument()
  })

  it('shows missing questions warning when present', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({
        classificationResult: {
          type: 'KICKOFF_SESSION',
          confidence: 0.9,
          missingQuestions: [
            'What is the expected monthly volume?',
            'Who are the key stakeholders?',
          ],
        },
      })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText('Questions not covered in this session:')).toBeInTheDocument()
    expect(screen.getByText('What is the expected monthly volume?')).toBeInTheDocument()
    expect(screen.getByText('Who are the key stakeholders?')).toBeInTheDocument()
  })

  it('truncates missing questions to 3 and shows count of remaining', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({
        classificationResult: {
          type: 'KICKOFF_SESSION',
          confidence: 0.9,
          missingQuestions: [
            'Question 1',
            'Question 2',
            'Question 3',
            'Question 4',
            'Question 5',
          ],
        },
      })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.getByText('Question 2')).toBeInTheDocument()
    expect(screen.getByText('Question 3')).toBeInTheDocument()
    expect(screen.queryByText('Question 4')).not.toBeInTheDocument()
    expect(screen.getByText('+2 more questions')).toBeInTheDocument()
  })

  it('shows population result for completed uploads', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({
        status: 'COMPLETE',
        populationResult: {
          extractedItems: 25,
          integrations: 4,
          businessRules: 10,
          testCases: 12,
        },
      })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText(/25 items/)).toBeInTheDocument()
    expect(screen.getByText(/4 integrations/)).toBeInTheDocument()
  })

  it('only shows first 3 uploads by default when more than 3 exist', () => {
    const props = {
      ...defaultProps,
      uploads: [
        makeUpload({ id: '1', filename: 'file-1.mp4' }),
        makeUpload({ id: '2', filename: 'file-2.mp4' }),
        makeUpload({ id: '3', filename: 'file-3.mp4' }),
        makeUpload({ id: '4', filename: 'file-4.mp4' }),
        makeUpload({ id: '5', filename: 'file-5.mp4' }),
      ],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText('file-1.mp4')).toBeInTheDocument()
    expect(screen.getByText('file-2.mp4')).toBeInTheDocument()
    expect(screen.getByText('file-3.mp4')).toBeInTheDocument()
    expect(screen.queryByText('file-4.mp4')).not.toBeInTheDocument()
    expect(screen.queryByText('file-5.mp4')).not.toBeInTheDocument()
  })

  it('shows "Show more" button when more than 3 uploads exist', () => {
    const props = {
      ...defaultProps,
      uploads: [
        makeUpload({ id: '1' }),
        makeUpload({ id: '2' }),
        makeUpload({ id: '3' }),
        makeUpload({ id: '4' }),
      ],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByRole('button', { name: /show 1 more/i })).toBeInTheDocument()
  })

  it('expands to show all uploads when "Show more" is clicked', async () => {
    const user = userEvent.setup()
    const props = {
      ...defaultProps,
      uploads: [
        makeUpload({ id: '1', filename: 'file-1.mp4' }),
        makeUpload({ id: '2', filename: 'file-2.mp4' }),
        makeUpload({ id: '3', filename: 'file-3.mp4' }),
        makeUpload({ id: '4', filename: 'file-4.mp4' }),
      ],
    }
    render(<UploadHistory {...props} />)

    await user.click(screen.getByRole('button', { name: /show 1 more/i }))

    expect(screen.getByText('file-4.mp4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
  })

  it('collapses back when "Show less" is clicked', async () => {
    const user = userEvent.setup()
    const props = {
      ...defaultProps,
      uploads: [
        makeUpload({ id: '1', filename: 'file-1.mp4' }),
        makeUpload({ id: '2', filename: 'file-2.mp4' }),
        makeUpload({ id: '3', filename: 'file-3.mp4' }),
        makeUpload({ id: '4', filename: 'file-4.mp4' }),
      ],
    }
    render(<UploadHistory {...props} />)

    await user.click(screen.getByRole('button', { name: /show 1 more/i }))
    expect(screen.getByText('file-4.mp4')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show less/i }))
    expect(screen.queryByText('file-4.mp4')).not.toBeInTheDocument()
  })

  it('does not show "Show more" button when 3 or fewer uploads', () => {
    const props = {
      ...defaultProps,
      uploads: [
        makeUpload({ id: '1' }),
        makeUpload({ id: '2' }),
        makeUpload({ id: '3' }),
      ],
    }
    render(<UploadHistory {...props} />)
    expect(screen.queryByRole('button', { name: /show.*more/i })).not.toBeInTheDocument()
  })

  it('renders audio file icon for audio uploads', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({ mimeType: 'audio/mpeg', filename: 'recording.mp3' })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText('recording.mp3')).toBeInTheDocument()
  })

  it('renders text file icon for document uploads', () => {
    const props = {
      ...defaultProps,
      uploads: [makeUpload({ mimeType: 'application/pdf', filename: 'notes.pdf' })],
    }
    render(<UploadHistory {...props} />)
    expect(screen.getByText('notes.pdf')).toBeInTheDocument()
  })

  it('accepts a custom className', () => {
    const { container } = render(
      <UploadHistory {...defaultProps} className="my-history-class" />
    )
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('my-history-class')
  })
})
