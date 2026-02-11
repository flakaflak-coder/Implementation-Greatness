import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EvidenceViewer } from './evidence-viewer'

const recordingEvidence = {
  id: 'ev-1',
  sourceType: 'RECORDING' as const,
  sourceId: 'recording-1',
  timestampStart: 120,
  timestampEnd: 240,
  page: null,
  paragraph: null,
  quote: 'The client confirmed that simple claims should be handled automatically',
}

const documentEvidence = {
  id: 'ev-2',
  sourceType: 'DOCUMENT' as const,
  sourceId: 'doc-1',
  timestampStart: null,
  timestampEnd: null,
  page: 3,
  paragraph: 7,
  quote: 'All claims under $1000 are eligible for automated processing',
}

describe('EvidenceViewer', () => {
  it('renders the "Evidence Source" title', () => {
    render(<EvidenceViewer evidence={recordingEvidence} />)
    expect(screen.getByText('Evidence Source')).toBeInTheDocument()
  })

  it('displays the evidence quote', () => {
    render(<EvidenceViewer evidence={recordingEvidence} />)
    expect(
      screen.getByText(/The client confirmed that simple claims should be handled automatically/)
    ).toBeInTheDocument()
  })

  it('renders session title when provided', () => {
    render(
      <EvidenceViewer
        evidence={recordingEvidence}
        sessionTitle="Kickoff Session - January 15"
      />
    )
    expect(screen.getByText('Kickoff Session - January 15')).toBeInTheDocument()
  })

  it('does not render session title when not provided', () => {
    render(<EvidenceViewer evidence={recordingEvidence} />)
    expect(screen.queryByText(/Kickoff Session/)).not.toBeInTheDocument()
  })

  it('shows close button when onClose is provided', () => {
    const onClose = vi.fn()
    render(<EvidenceViewer evidence={recordingEvidence} onClose={onClose} />)
    expect(screen.getByRole('button', { name: /Close/ })).toBeInTheDocument()
  })

  it('does not show close button when onClose is not provided', () => {
    render(<EvidenceViewer evidence={recordingEvidence} />)
    expect(screen.queryByRole('button', { name: /Close/ })).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<EvidenceViewer evidence={recordingEvidence} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /Close/ }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  // Recording evidence
  it('renders timestamps for recording evidence with a recording URL', () => {
    render(
      <EvidenceViewer
        evidence={recordingEvidence}
        recordingUrl="https://example.com/recording.mp4"
      />
    )
    // Should show formatted timestamps: 2:00 for 120 seconds and 4:00 for 240 seconds
    expect(screen.getByText('2:00')).toBeInTheDocument()
    expect(screen.getByText('4:00')).toBeInTheDocument()
  })

  it('renders playback controls for recording evidence with URL', () => {
    render(
      <EvidenceViewer
        evidence={recordingEvidence}
        recordingUrl="https://example.com/recording.mp4"
      />
    )
    // Should have play, skip-back, skip-forward buttons (icon buttons)
    const buttons = screen.getAllByRole('button')
    // Close button won't be present (no onClose), so we just check for media buttons
    expect(buttons.length).toBeGreaterThanOrEqual(3)
  })

  it('renders recording source link', () => {
    render(
      <EvidenceViewer
        evidence={recordingEvidence}
        recordingUrl="https://example.com/recording.mp4"
      />
    )
    const link = screen.getByRole('link', { name: /recording source/ })
    expect(link).toHaveAttribute('href', 'https://example.com/recording.mp4')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('does not render player when no recording URL is provided', () => {
    render(<EvidenceViewer evidence={recordingEvidence} />)
    expect(screen.queryByText(/recording source/)).not.toBeInTheDocument()
  })

  // Document evidence
  it('renders page number for document evidence', () => {
    render(<EvidenceViewer evidence={documentEvidence} />)
    expect(screen.getByText(/Page 3/)).toBeInTheDocument()
  })

  it('renders paragraph number for document evidence', () => {
    render(<EvidenceViewer evidence={documentEvidence} />)
    expect(screen.getByText(/Paragraph 7/)).toBeInTheDocument()
  })

  it('does not render page info for document without page number', () => {
    const noPageEvidence = { ...documentEvidence, page: null, paragraph: null }
    render(<EvidenceViewer evidence={noPageEvidence} />)
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <EvidenceViewer evidence={recordingEvidence} className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
