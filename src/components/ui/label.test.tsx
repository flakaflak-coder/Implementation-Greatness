import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from './label'

describe('Label', () => {
  it('renders label text', () => {
    render(<Label>Email</Label>)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders with htmlFor attribute', () => {
    render(<Label htmlFor="email-input">Email</Label>)
    expect(screen.getByText('Email')).toHaveAttribute('for', 'email-input')
  })

  it('accepts custom className', () => {
    render(<Label className="custom-label">Name</Label>)
    expect(screen.getByText('Name')).toHaveClass('custom-label')
  })

  it('has default styling classes', () => {
    render(<Label>Field</Label>)
    const label = screen.getByText('Field')
    expect(label).toHaveClass('text-sm')
    expect(label).toHaveClass('font-medium')
  })

  it('forwards ref correctly', () => {
    const ref = { current: null as HTMLLabelElement | null }
    render(<Label ref={ref}>Ref Label</Label>)
    expect(ref.current).toBeInstanceOf(HTMLLabelElement)
  })
})
