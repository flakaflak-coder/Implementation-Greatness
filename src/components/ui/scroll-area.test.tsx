import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScrollArea } from './scroll-area'

describe('ScrollArea', () => {
  it('renders children', () => {
    render(
      <ScrollArea>
        <p>Scrollable content</p>
      </ScrollArea>
    )
    expect(screen.getByText('Scrollable content')).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    const { container } = render(
      <ScrollArea className="custom-scroll">
        <p>Content</p>
      </ScrollArea>
    )
    // The root element receives the className
    const root = container.firstElementChild
    expect(root).toHaveClass('custom-scroll')
  })

  it('has overflow-hidden base class', () => {
    const { container } = render(
      <ScrollArea>
        <p>Content</p>
      </ScrollArea>
    )
    const root = container.firstElementChild
    expect(root).toHaveClass('relative')
    expect(root).toHaveClass('overflow-hidden')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLDivElement | null }
    render(
      <ScrollArea ref={ref}>
        <p>Content</p>
      </ScrollArea>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })
})
