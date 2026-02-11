import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompletenessChart } from './completeness-chart'

describe('CompletenessChart', () => {
  const defaultCategories = [
    { name: 'Identity', score: 90, total: 10, confirmed: 9, ambiguous: 0 },
    { name: 'Process', score: 65, total: 20, confirmed: 13, ambiguous: 3 },
    { name: 'Technical', score: 40, total: 15, confirmed: 6, ambiguous: 2 },
  ]

  it('renders the overall score', () => {
    render(<CompletenessChart categories={defaultCategories} overallScore={75} />)
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('Overall')).toBeInTheDocument()
  })

  it('renders all category names', () => {
    render(<CompletenessChart categories={defaultCategories} overallScore={75} />)

    expect(screen.getByText('Identity')).toBeInTheDocument()
    expect(screen.getByText('Process')).toBeInTheDocument()
    expect(screen.getByText('Technical')).toBeInTheDocument()
  })

  it('renders category scores', () => {
    render(<CompletenessChart categories={defaultCategories} overallScore={75} />)

    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('shows ambiguous count when greater than zero', () => {
    render(<CompletenessChart categories={defaultCategories} overallScore={75} />)

    expect(screen.getByText('3 ambiguous')).toBeInTheDocument()
    expect(screen.getByText('2 ambiguous')).toBeInTheDocument()
  })

  it('does not show ambiguous count when zero', () => {
    render(<CompletenessChart categories={defaultCategories} overallScore={75} />)

    // Identity has 0 ambiguous - should not show "0 ambiguous"
    const ambiguousElements = screen.getAllByText(/ambiguous/)
    expect(ambiguousElements).toHaveLength(2)
  })

  it('applies green color for scores 80 and above', () => {
    render(
      <CompletenessChart
        categories={[{ name: 'High Score', score: 85, total: 10, confirmed: 9, ambiguous: 0 }]}
        overallScore={85}
      />
    )

    // Both the overall score and the category score should be green
    const scoreElements = screen.getAllByText('85%')
    scoreElements.forEach((el) => {
      expect(el).toHaveClass('text-green-600')
    })
  })

  it('applies amber color for scores between 60 and 79', () => {
    render(
      <CompletenessChart
        categories={[{ name: 'Medium Score', score: 70, total: 10, confirmed: 7, ambiguous: 1 }]}
        overallScore={70}
      />
    )

    const scoreElements = screen.getAllByText('70%')
    scoreElements.forEach((el) => {
      expect(el).toHaveClass('text-amber-600')
    })
  })

  it('applies red color for scores below 60', () => {
    render(
      <CompletenessChart
        categories={[{ name: 'Low Score', score: 30, total: 10, confirmed: 3, ambiguous: 0 }]}
        overallScore={30}
      />
    )

    const scoreElements = screen.getAllByText('30%')
    scoreElements.forEach((el) => {
      expect(el).toHaveClass('text-red-600')
    })
  })

  it('renders with empty categories', () => {
    render(<CompletenessChart categories={[]} overallScore={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('Overall')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <CompletenessChart categories={defaultCategories} overallScore={75} className="test-class" />
    )
    expect(container.firstChild).toHaveClass('test-class')
  })

  it('renders progress bars for each category', () => {
    const { container } = render(
      <CompletenessChart categories={defaultCategories} overallScore={75} />
    )

    // Each category should have a progress bar (role="progressbar")
    const progressBars = container.querySelectorAll('[role="progressbar"]')
    expect(progressBars).toHaveLength(3)
  })

  it('renders 100% overall score with green color', () => {
    render(
      <CompletenessChart
        categories={[{ name: 'Perfect', score: 100, total: 10, confirmed: 10, ambiguous: 0 }]}
        overallScore={100}
      />
    )

    const scoreElements = screen.getAllByText('100%')
    scoreElements.forEach((el) => {
      expect(el).toHaveClass('text-green-600')
    })
  })
})
