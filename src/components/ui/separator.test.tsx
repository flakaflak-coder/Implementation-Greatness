import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Separator } from './separator'

describe('Separator', () => {
  it('renders a separator element', () => {
    const { container } = render(<Separator />)
    const separator = container.querySelector('[role="none"]')
    expect(separator).toBeInTheDocument()
  })

  it('renders horizontal by default', () => {
    const { container } = render(<Separator />)
    const separator = container.firstElementChild
    expect(separator).toHaveClass('h-[1px]')
    expect(separator).toHaveClass('w-full')
  })

  it('renders vertical orientation', () => {
    const { container } = render(<Separator orientation="vertical" />)
    const separator = container.firstElementChild
    expect(separator).toHaveClass('h-full')
    expect(separator).toHaveClass('w-[1px]')
  })

  it('accepts custom className', () => {
    const { container } = render(<Separator className="custom-sep" />)
    const separator = container.firstElementChild
    expect(separator).toHaveClass('custom-sep')
  })

  it('has base styling classes', () => {
    const { container } = render(<Separator />)
    const separator = container.firstElementChild
    expect(separator).toHaveClass('shrink-0')
    expect(separator).toHaveClass('bg-gray-200')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLDivElement | null }
    render(<Separator ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })
})
