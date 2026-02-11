import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton, SkeletonText, SkeletonCard, SkeletonSection, SkeletonStatCard } from './skeleton'

describe('Skeleton', () => {
  it('renders a skeleton element', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstElementChild
    expect(skeleton).toBeInTheDocument()
  })

  it('has animation class', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstElementChild
    expect(skeleton).toHaveClass('animate-skeleton')
  })

  it('has rounded-md class', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstElementChild
    expect(skeleton).toHaveClass('rounded-md')
  })

  it('accepts custom className', () => {
    const { container } = render(<Skeleton className="h-8 w-32" />)
    const skeleton = container.firstElementChild
    expect(skeleton).toHaveClass('h-8')
    expect(skeleton).toHaveClass('w-32')
  })
})

describe('SkeletonText', () => {
  it('renders 3 lines by default', () => {
    const { container } = render(<SkeletonText />)
    const skeletons = container.querySelectorAll('.animate-skeleton')
    expect(skeletons).toHaveLength(3)
  })

  it('renders specified number of lines', () => {
    const { container } = render(<SkeletonText lines={5} />)
    const skeletons = container.querySelectorAll('.animate-skeleton')
    expect(skeletons).toHaveLength(5)
  })

  it('last line is shorter (w-3/4)', () => {
    const { container } = render(<SkeletonText lines={3} />)
    const skeletons = container.querySelectorAll('.animate-skeleton')
    const lastSkeleton = skeletons[skeletons.length - 1]
    expect(lastSkeleton).toHaveClass('w-3/4')
  })

  it('accepts custom className', () => {
    const { container } = render(<SkeletonText className="custom-text" />)
    const wrapper = container.firstElementChild
    expect(wrapper).toHaveClass('custom-text')
  })
})

describe('SkeletonCard', () => {
  it('renders card structure', () => {
    const { container } = render(<SkeletonCard />)
    const card = container.firstElementChild
    expect(card).toHaveClass('rounded-xl')
    expect(card).toHaveClass('border')
    expect(card).toHaveClass('bg-white')
  })

  it('accepts custom className', () => {
    const { container } = render(<SkeletonCard className="custom-card" />)
    const card = container.firstElementChild
    expect(card).toHaveClass('custom-card')
  })
})

describe('SkeletonSection', () => {
  it('renders section structure', () => {
    const { container } = render(<SkeletonSection />)
    const section = container.firstElementChild
    expect(section).toHaveClass('rounded-lg')
    expect(section).toHaveClass('border')
    expect(section).toHaveClass('bg-white')
  })

  it('accepts custom className', () => {
    const { container } = render(<SkeletonSection className="custom-section" />)
    const section = container.firstElementChild
    expect(section).toHaveClass('custom-section')
  })
})

describe('SkeletonStatCard', () => {
  it('renders stat card structure', () => {
    const { container } = render(<SkeletonStatCard />)
    const card = container.firstElementChild
    expect(card).toHaveClass('rounded-xl')
    expect(card).toHaveClass('border')
    expect(card).toHaveClass('bg-white')
  })

  it('accepts custom className', () => {
    const { container } = render(<SkeletonStatCard className="custom-stat" />)
    const card = container.firstElementChild
    expect(card).toHaveClass('custom-stat')
  })
})
