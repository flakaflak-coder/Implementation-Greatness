import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { RocketProgress } from './rocket-progress'

// Mock timers for animation testing
vi.useFakeTimers()

describe('RocketProgress', () => {
  afterEach(() => {
    vi.clearAllTimers()
  })

  // --- Basic rendering ---

  it('renders without crashing', () => {
    render(<RocketProgress progress={50} />)
    // Should render the start and end labels
    expect(screen.getByText('Start')).toBeInTheDocument()
    expect(screen.getByText('Launch Ready')).toBeInTheDocument()
  })

  it('renders the label when provided', () => {
    render(<RocketProgress progress={50} label="Design Week Progress" />)
    expect(screen.getByText('Design Week Progress')).toBeInTheDocument()
  })

  it('does not render the label when not provided', () => {
    render(<RocketProgress progress={50} />)
    expect(screen.queryByText('Design Week Progress')).not.toBeInTheDocument()
  })

  // --- Percentage display ---

  it('shows percentage when showPercentage is true (default) and label is provided', () => {
    render(<RocketProgress progress={75} label="Progress" animate={false} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('does not show percentage when showPercentage is false', () => {
    render(<RocketProgress progress={75} label="Progress" showPercentage={false} animate={false} />)
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })

  it('does not show percentage when label is not provided even if showPercentage is true', () => {
    render(<RocketProgress progress={75} animate={false} />)
    // The percentage is rendered inside the label container, which is conditionally rendered
    // When no label is provided, the entire label+percentage section is not rendered
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })

  // --- Progress clamping ---

  it('clamps progress to 0 when negative value is provided', () => {
    render(<RocketProgress progress={-10} label="Progress" animate={false} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('clamps progress to 100 when value exceeds 100', () => {
    render(<RocketProgress progress={150} label="Progress" animate={false} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('displays 0% at the start', () => {
    render(<RocketProgress progress={0} label="Progress" animate={false} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('displays 100% at completion', () => {
    render(<RocketProgress progress={100} label="Progress" animate={false} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  // --- Launch indicator ---

  it('shows "Launch!" text when progress is 100%', () => {
    render(<RocketProgress progress={100} animate={false} />)
    expect(screen.getByText('Launch!')).toBeInTheDocument()
  })

  it('does not show "Launch!" text when progress is below 100%', () => {
    render(<RocketProgress progress={99} animate={false} />)
    expect(screen.queryByText('Launch!')).not.toBeInTheDocument()
  })

  // --- Animation behavior ---

  it('starts at 0 and animates to target progress when animate is true', () => {
    render(<RocketProgress progress={80} label="Progress" animate={true} />)

    // Initially should show 0%
    expect(screen.getByText('0%')).toBeInTheDocument()

    // After the animation timer fires, should show the target progress
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('shows progress immediately when animate is false', () => {
    render(<RocketProgress progress={80} label="Progress" animate={false} />)
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  // --- Milestone markers ---

  it('renders milestone markers at 25%, 50%, and 75%', () => {
    const { container } = render(<RocketProgress progress={50} animate={false} />)

    // There should be 3 milestone marker divs
    // They are positioned at specific percentages
    const milestoneMarkers = container.querySelectorAll('.h-5.w-0\\.5')
    expect(milestoneMarkers.length).toBe(3)
  })

  // --- Custom className ---

  it('applies custom className', () => {
    const { container } = render(
      <RocketProgress progress={50} className="my-custom-class" />
    )
    expect(container.firstChild).toHaveClass('my-custom-class')
  })

  // --- Variants ---

  it('renders with dark variant styling', () => {
    render(<RocketProgress progress={50} label="Progress" variant="dark" animate={false} />)
    const label = screen.getByText('Progress')
    expect(label).toHaveClass('text-space-200')
  })

  it('renders with light variant styling (default)', () => {
    render(<RocketProgress progress={50} label="Progress" variant="light" animate={false} />)
    const label = screen.getByText('Progress')
    expect(label).toHaveClass('text-gray-600')
  })

  // --- Rounding ---

  it('rounds the displayed progress percentage', () => {
    render(<RocketProgress progress={33.7} label="Progress" animate={false} />)
    expect(screen.getByText('34%')).toBeInTheDocument()
  })
})
