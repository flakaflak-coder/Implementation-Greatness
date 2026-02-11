import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HealthSummaryBar } from './health-summary-bar'
import type { HealthSummary } from './types'

function createSummary(overrides: Partial<HealthSummary> = {}): HealthSummary {
  return {
    total: 10,
    healthy: 6,
    attention: 3,
    critical: 1,
    averageScore: 78,
    ...overrides,
  }
}

describe('HealthSummaryBar', () => {
  it('renders the total count', () => {
    render(<HealthSummaryBar summary={createSummary()} />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders "Total Live DEs" label', () => {
    render(<HealthSummaryBar summary={createSummary()} />)
    expect(screen.getByText('Total Live DEs')).toBeInTheDocument()
  })

  it('renders the healthy count', () => {
    render(<HealthSummaryBar summary={createSummary({ healthy: 8 })} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('renders "Healthy" label', () => {
    render(<HealthSummaryBar summary={createSummary()} />)
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('renders the attention count', () => {
    render(<HealthSummaryBar summary={createSummary({ attention: 4 })} />)
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders "Attention" label', () => {
    render(<HealthSummaryBar summary={createSummary()} />)
    expect(screen.getByText('Attention')).toBeInTheDocument()
  })

  it('renders the critical count', () => {
    render(<HealthSummaryBar summary={createSummary({ critical: 2 })} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders "Critical" label', () => {
    render(<HealthSummaryBar summary={createSummary()} />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('renders the average score', () => {
    render(<HealthSummaryBar summary={createSummary({ averageScore: 85 })} />)
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('renders "Avg. Health Score" label', () => {
    render(<HealthSummaryBar summary={createSummary()} />)
    expect(screen.getByText('Avg. Health Score')).toBeInTheDocument()
  })

  it('shows "--" for average score when total is 0', () => {
    render(
      <HealthSummaryBar
        summary={createSummary({ total: 0, healthy: 0, attention: 0, critical: 0, averageScore: 0 })}
      />
    )
    expect(screen.getByText('--')).toBeInTheDocument()
  })

  it('renders all five summary cards', () => {
    render(<HealthSummaryBar summary={createSummary()} />)
    expect(screen.getByText('Total Live DEs')).toBeInTheDocument()
    expect(screen.getByText('Healthy')).toBeInTheDocument()
    expect(screen.getByText('Attention')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Avg. Health Score')).toBeInTheDocument()
  })

  it('renders with zero critical count', () => {
    render(<HealthSummaryBar summary={createSummary({ critical: 0 })} />)
    // The critical section should still be present
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('renders correct counts for all categories simultaneously', () => {
    const summary = createSummary({
      total: 20,
      healthy: 12,
      attention: 5,
      critical: 3,
      averageScore: 72,
    })
    render(<HealthSummaryBar summary={summary} />)

    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('72')).toBeInTheDocument()
  })
})
