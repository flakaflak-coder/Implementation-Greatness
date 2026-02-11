import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DesignWeekProgress } from './design-week-progress'

describe('DesignWeekProgress', () => {
  it('renders all four phase labels', () => {
    render(<DesignWeekProgress currentPhase={1} status="IN_PROGRESS" />)

    expect(screen.getByText('Kickoff')).toBeInTheDocument()
    expect(screen.getByText('Process Design')).toBeInTheDocument()
    expect(screen.getByText('Technical Deep-dive')).toBeInTheDocument()
    expect(screen.getByText('Sign-off')).toBeInTheDocument()
  })

  it('marks phases before the current phase as complete', () => {
    render(<DesignWeekProgress currentPhase={3} status="IN_PROGRESS" />)

    // Phase 1 and 2 should be complete (green)
    const kickoffLabel = screen.getByText('Kickoff')
    expect(kickoffLabel).toHaveClass('text-green-600')

    const processLabel = screen.getByText('Process Design')
    expect(processLabel).toHaveClass('text-green-600')
  })

  it('marks the current phase as active', () => {
    render(<DesignWeekProgress currentPhase={2} status="IN_PROGRESS" />)

    const processLabel = screen.getByText('Process Design')
    expect(processLabel).toHaveClass('text-blue-600')
  })

  it('marks phases after the current phase as pending', () => {
    render(<DesignWeekProgress currentPhase={2} status="IN_PROGRESS" />)

    const technicalLabel = screen.getByText('Technical Deep-dive')
    expect(technicalLabel).toHaveClass('text-gray-400')

    const signoffLabel = screen.getByText('Sign-off')
    expect(signoffLabel).toHaveClass('text-gray-400')
  })

  it('marks all phases as complete when status is COMPLETE', () => {
    render(<DesignWeekProgress currentPhase={4} status="COMPLETE" />)

    expect(screen.getByText('Kickoff')).toHaveClass('text-green-600')
    expect(screen.getByText('Process Design')).toHaveClass('text-green-600')
    expect(screen.getByText('Technical Deep-dive')).toHaveClass('text-green-600')
    expect(screen.getByText('Sign-off')).toHaveClass('text-green-600')
  })

  it('shows first phase as current when at phase 1', () => {
    render(<DesignWeekProgress currentPhase={1} status="IN_PROGRESS" />)

    const kickoffLabel = screen.getByText('Kickoff')
    expect(kickoffLabel).toHaveClass('text-blue-600')

    // All others should be pending
    expect(screen.getByText('Process Design')).toHaveClass('text-gray-400')
    expect(screen.getByText('Technical Deep-dive')).toHaveClass('text-gray-400')
    expect(screen.getByText('Sign-off')).toHaveClass('text-gray-400')
  })

  it('applies custom className', () => {
    const { container } = render(
      <DesignWeekProgress currentPhase={1} status="IN_PROGRESS" className="my-custom-class" />
    )

    expect(container.firstChild).toHaveClass('my-custom-class')
  })

  it('renders connector lines between phases', () => {
    const { container } = render(
      <DesignWeekProgress currentPhase={2} status="IN_PROGRESS" />
    )

    // There should be 3 connector lines (between 4 phases)
    const connectors = container.querySelectorAll('.h-0\\.5')
    expect(connectors).toHaveLength(3)
  })

  it('colors completed connector lines green', () => {
    const { container } = render(
      <DesignWeekProgress currentPhase={3} status="IN_PROGRESS" />
    )

    const connectors = container.querySelectorAll('.h-0\\.5')
    // First two connectors (phase 1->2, 2->3) should be green
    expect(connectors[0]).toHaveClass('bg-green-600')
    expect(connectors[1]).toHaveClass('bg-green-600')
    // Third connector (phase 3->4) should be gray
    expect(connectors[2]).toHaveClass('bg-gray-200')
  })
})
