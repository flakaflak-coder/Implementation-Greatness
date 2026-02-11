import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionCard } from './session-card'
import type { SessionCardProps } from './session-card'

const baseProps: SessionCardProps = {
  id: 'session-1',
  sessionNumber: 2,
  phaseName: 'Process Design',
  date: '2025-01-15',
  status: 'pending',
}

describe('SessionCard', () => {
  // --- Basic rendering ---

  it('renders the phase name and session number', () => {
    render(<SessionCard {...baseProps} />)
    expect(screen.getByText('Process Design #2')).toBeInTheDocument()
  })

  it('renders the date', () => {
    render(<SessionCard {...baseProps} />)
    expect(screen.getByText('2025-01-15')).toBeInTheDocument()
  })

  it('renders duration when provided', () => {
    render(<SessionCard {...baseProps} duration="45 min" />)
    expect(screen.getByText('45 min')).toBeInTheDocument()
  })

  it('does not render duration when not provided', () => {
    render(<SessionCard {...baseProps} />)
    expect(screen.queryByText('45 min')).not.toBeInTheDocument()
  })

  // --- Status indicators ---

  it('displays "Pending" status badge for pending sessions', () => {
    render(<SessionCard {...baseProps} status="pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('displays "Processing" status badge for processing sessions', () => {
    render(<SessionCard {...baseProps} status="processing" />)
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('displays "Extracted" status badge for complete sessions', () => {
    render(<SessionCard {...baseProps} status="complete" />)
    expect(screen.getByText('Extracted')).toBeInTheDocument()
  })

  it('displays "Failed" status badge for failed sessions', () => {
    render(<SessionCard {...baseProps} status="failed" />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  // --- Extraction stats for completed sessions ---

  it('shows extracted item count when status is complete', () => {
    render(<SessionCard {...baseProps} status="complete" extractedCount={12} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('items')).toBeInTheDocument()
  })

  it('shows default extractedCount of 0 items when status is complete and extractedCount is not provided', () => {
    render(<SessionCard {...baseProps} status="complete" />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('items')).toBeInTheDocument()
  })

  it('does not show extraction stats when status is not complete', () => {
    render(<SessionCard {...baseProps} status="pending" extractedCount={5} />)
    expect(screen.queryByText('items')).not.toBeInTheDocument()
  })

  it('shows unresolved count when status is complete and unresolvedCount > 0', () => {
    render(<SessionCard {...baseProps} status="complete" unresolvedCount={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('to review')).toBeInTheDocument()
  })

  it('does not show unresolved count when unresolvedCount is 0', () => {
    render(<SessionCard {...baseProps} status="complete" unresolvedCount={0} />)
    expect(screen.queryByText('to review')).not.toBeInTheDocument()
  })

  // --- Topics covered ---

  it('renders topics when provided', () => {
    render(
      <SessionCard
        {...baseProps}
        topicsCovered={['Happy Path', 'Exceptions', 'Business Rules']}
      />
    )
    expect(screen.getByText('Happy Path')).toBeInTheDocument()
    expect(screen.getByText('Exceptions')).toBeInTheDocument()
    expect(screen.getByText('Business Rules')).toBeInTheDocument()
  })

  it('limits displayed topics to 3 and shows overflow count', () => {
    render(
      <SessionCard
        {...baseProps}
        topicsCovered={['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4', 'Topic 5']}
      />
    )
    expect(screen.getByText('Topic 1')).toBeInTheDocument()
    expect(screen.getByText('Topic 2')).toBeInTheDocument()
    expect(screen.getByText('Topic 3')).toBeInTheDocument()
    expect(screen.queryByText('Topic 4')).not.toBeInTheDocument()
    expect(screen.queryByText('Topic 5')).not.toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('does not render topics section when topicsCovered is empty', () => {
    render(<SessionCard {...baseProps} topicsCovered={[]} />)
    expect(screen.queryByText('more')).not.toBeInTheDocument()
  })

  // --- Selected state ---

  it('applies selected styles when isSelected is true', () => {
    const { container } = render(<SessionCard {...baseProps} isSelected={true} />)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('border-[#C2703E]')
  })

  it('applies default border when isSelected is false', () => {
    const { container } = render(<SessionCard {...baseProps} isSelected={false} />)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('border-gray-200')
  })

  // --- Click handlers ---

  it('calls onSelect when card is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const { container } = render(<SessionCard {...baseProps} onSelect={onSelect} />)

    await user.click(container.firstChild as HTMLElement)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('renders Play button when onPlay is provided', () => {
    const onPlay = vi.fn()
    render(<SessionCard {...baseProps} onPlay={onPlay} />)
    expect(screen.getByRole('button', { name: /Play/ })).toBeInTheDocument()
  })

  it('does not render Play button when onPlay is not provided', () => {
    render(<SessionCard {...baseProps} />)
    expect(screen.queryByRole('button', { name: /Play/ })).not.toBeInTheDocument()
  })

  it('calls onPlay when Play button is clicked', async () => {
    const user = userEvent.setup()
    const onPlay = vi.fn()
    const onSelect = vi.fn()
    render(<SessionCard {...baseProps} onPlay={onPlay} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: /Play/ }))
    expect(onPlay).toHaveBeenCalledTimes(1)
    // Should not propagate to onSelect
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('renders Extract button when onExtract is provided and status is not processing', () => {
    const onExtract = vi.fn()
    render(<SessionCard {...baseProps} status="pending" onExtract={onExtract} />)
    expect(screen.getByRole('button', { name: /Extract/ })).toBeInTheDocument()
  })

  it('does not render Extract button when status is processing', () => {
    const onExtract = vi.fn()
    render(<SessionCard {...baseProps} status="processing" onExtract={onExtract} />)
    expect(screen.queryByRole('button', { name: /Extract/ })).not.toBeInTheDocument()
  })

  it('renders "Re-extract" label when status is complete', () => {
    const onExtract = vi.fn()
    render(<SessionCard {...baseProps} status="complete" onExtract={onExtract} />)
    expect(screen.getByRole('button', { name: /Re-extract/ })).toBeInTheDocument()
  })

  it('renders "Extract" label when status is pending', () => {
    const onExtract = vi.fn()
    render(<SessionCard {...baseProps} status="pending" onExtract={onExtract} />)
    expect(screen.getByRole('button', { name: /Extract/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Re-extract/ })).not.toBeInTheDocument()
  })

  it('calls onExtract when Extract button is clicked without propagating', async () => {
    const user = userEvent.setup()
    const onExtract = vi.fn()
    const onSelect = vi.fn()
    render(<SessionCard {...baseProps} onExtract={onExtract} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: /Extract/ }))
    expect(onExtract).toHaveBeenCalledTimes(1)
    // Should not propagate to onSelect
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not render Extract button when onExtract is not provided', () => {
    render(<SessionCard {...baseProps} />)
    expect(screen.queryByRole('button', { name: /Extract/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Re-extract/ })).not.toBeInTheDocument()
  })
})
