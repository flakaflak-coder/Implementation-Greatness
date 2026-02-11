import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Popover, PopoverTrigger, PopoverContent } from './popover'

describe('Popover', () => {
  it('renders the trigger', () => {
    render(
      <Popover>
        <PopoverTrigger>Open Popover</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>
    )
    expect(screen.getByText('Open Popover')).toBeInTheDocument()
  })

  it('opens popover when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>Open Popover</PopoverTrigger>
        <PopoverContent>Popover body content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByText('Open Popover'))
    expect(screen.getByText('Popover body content')).toBeInTheDocument()
  })

  it('renders popover content when defaultOpen', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Trigger</PopoverTrigger>
        <PopoverContent>Default open content</PopoverContent>
      </Popover>
    )
    expect(screen.getByText('Default open content')).toBeInTheDocument()
  })

  it('applies custom className to content', async () => {
    const user = userEvent.setup()
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent className="custom-popover">Content</PopoverContent>
      </Popover>
    )

    await user.click(screen.getByText('Open'))
    expect(screen.getByText('Content')).toHaveClass('custom-popover')
  })
})
