import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MeshGradient, AnimatedMeshGradient, GradientHeaderCard } from './mesh-gradient'

describe('MeshGradient', () => {
  it('renders children', () => {
    render(<MeshGradient>Gradient content</MeshGradient>)
    expect(screen.getByText('Gradient content')).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    const { container } = render(<MeshGradient className="custom-gradient">Content</MeshGradient>)
    const wrapper = container.firstElementChild
    expect(wrapper).toHaveClass('custom-gradient')
  })

  it('applies default pink-blue gradient', () => {
    const { container } = render(<MeshGradient>Content</MeshGradient>)
    const wrapper = container.firstElementChild
    expect(wrapper).toHaveClass('bg-gradient-to-br')
    expect(wrapper).toHaveClass('rounded-2xl')
  })

  it('applies warm variant gradient', () => {
    const { container } = render(<MeshGradient variant="warm">Content</MeshGradient>)
    const wrapper = container.firstElementChild
    expect(wrapper).toHaveClass('bg-gradient-to-br')
  })

  it('renders noise overlay', () => {
    const { container } = render(<MeshGradient>Content</MeshGradient>)
    // The noise overlay is an absolute-positioned div
    const overlayDiv = container.querySelector('.absolute.inset-0')
    expect(overlayDiv).toBeInTheDocument()
  })

  it('applies vibrant intensity styling', () => {
    const { container } = render(<MeshGradient intensity="vibrant">Content</MeshGradient>)
    const overlayDiv = container.querySelector('.absolute.inset-0')
    expect(overlayDiv).toHaveClass('opacity-40')
    expect(overlayDiv).toHaveClass('mix-blend-overlay')
  })
})

describe('AnimatedMeshGradient', () => {
  it('renders children', () => {
    render(<AnimatedMeshGradient>Animated content</AnimatedMeshGradient>)
    expect(screen.getByText('Animated content')).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    const { container } = render(
      <AnimatedMeshGradient className="custom-animated">Content</AnimatedMeshGradient>
    )
    const wrapper = container.firstElementChild
    expect(wrapper).toHaveClass('custom-animated')
  })

  it('renders with rounded-2xl styling', () => {
    const { container } = render(<AnimatedMeshGradient>Content</AnimatedMeshGradient>)
    const wrapper = container.firstElementChild
    expect(wrapper).toHaveClass('rounded-2xl')
    expect(wrapper).toHaveClass('overflow-hidden')
  })
})

describe('GradientHeaderCard', () => {
  it('renders children', () => {
    render(<GradientHeaderCard gradient="bg-red-500">Card content</GradientHeaderCard>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    const { container } = render(
      <GradientHeaderCard gradient="bg-blue-500" className="custom-card">
        Content
      </GradientHeaderCard>
    )
    const wrapper = container.firstElementChild
    expect(wrapper).toHaveClass('custom-card')
  })

  it('has card styling', () => {
    const { container } = render(
      <GradientHeaderCard gradient="bg-green-500">Content</GradientHeaderCard>
    )
    const wrapper = container.firstElementChild
    expect(wrapper).toHaveClass('rounded-2xl')
    expect(wrapper).toHaveClass('bg-white')
    expect(wrapper).toHaveClass('shadow-sm')
  })
})
