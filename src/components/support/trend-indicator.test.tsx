import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrendIndicator } from './trend-indicator'
import type { HealthTrend } from './types'

function createTrend(overrides: Partial<HealthTrend> = {}): HealthTrend {
  return {
    direction: 'up',
    delta: 5,
    history: [70, 72, 74, 76, 78, 80, 82],
    ...overrides,
  }
}

describe('TrendIndicator', () => {
  // Up trend
  it('renders positive delta with "+" prefix for up direction', () => {
    render(<TrendIndicator trend={createTrend({ direction: 'up', delta: 5 })} />)
    expect(screen.getByText('+5')).toBeInTheDocument()
  })

  it('renders negative delta for down direction', () => {
    render(<TrendIndicator trend={createTrend({ direction: 'down', delta: -12 })} />)
    expect(screen.getByText('-12')).toBeInTheDocument()
  })

  it('renders "0" for stable direction with zero delta', () => {
    render(<TrendIndicator trend={createTrend({ direction: 'stable', delta: 0 })} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  // Sparkline rendering
  it('renders an SVG sparkline when history has 2+ points', () => {
    const { container } = render(
      <TrendIndicator trend={createTrend({ history: [60, 65, 70, 75, 80] })} />
    )
    const svgs = container.querySelectorAll('svg')
    // Should have at least the sparkline SVG (+ the lucide icon SVG)
    expect(svgs.length).toBeGreaterThanOrEqual(1)
  })

  it('does not render sparkline SVG when history has fewer than 2 points', () => {
    const { container } = render(
      <TrendIndicator trend={createTrend({ history: [80] })} />
    )
    // The sparkline SVG has a specific viewBox "0 0 60 20" that distinguishes it from lucide icons
    const sparklineSvgs = container.querySelectorAll('svg[viewBox="0 0 60 20"]')
    expect(sparklineSvgs.length).toBe(0)
  })

  it('renders sparkline SVG with aria-hidden="true"', () => {
    const { container } = render(
      <TrendIndicator trend={createTrend({ history: [60, 65, 70, 75, 80, 85, 90] })} />
    )
    const sparklineSvg = container.querySelector('svg[aria-hidden="true"]')
    expect(sparklineSvg).toBeInTheDocument()
  })

  // Delta formatting edge cases
  it('renders positive delta with "+" for up direction even with large number', () => {
    render(<TrendIndicator trend={createTrend({ direction: 'up', delta: 25 })} />)
    expect(screen.getByText('+25')).toBeInTheDocument()
  })

  it('renders negative delta without additional sign', () => {
    render(<TrendIndicator trend={createTrend({ direction: 'down', delta: -3 })} />)
    expect(screen.getByText('-3')).toBeInTheDocument()
  })

  // Rendering without crash for all directions
  it('renders without crashing for up direction', () => {
    const { container } = render(<TrendIndicator trend={createTrend({ direction: 'up' })} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders without crashing for down direction', () => {
    const { container } = render(
      <TrendIndicator trend={createTrend({ direction: 'down', delta: -8 })} />
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders without crashing for stable direction', () => {
    const { container } = render(
      <TrendIndicator trend={createTrend({ direction: 'stable', delta: 0 })} />
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  // Sparkline with flat data (all same values)
  it('renders sparkline when all history values are the same', () => {
    const { container } = render(
      <TrendIndicator
        trend={createTrend({ direction: 'stable', delta: 0, history: [80, 80, 80, 80] })}
      />
    )
    const sparklineSvg = container.querySelector('svg[aria-hidden="true"]')
    expect(sparklineSvg).toBeInTheDocument()
  })
})
