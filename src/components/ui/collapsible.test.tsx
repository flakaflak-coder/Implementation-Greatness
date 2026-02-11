import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible'

describe('Collapsible', () => {
  it('renders trigger', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden content</CollapsibleContent>
      </Collapsible>
    )
    expect(screen.getByText('Toggle')).toBeInTheDocument()
  })

  it('content is not visible by default', () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden content</CollapsibleContent>
      </Collapsible>
    )
    // Radix Collapsible uses data-state="closed" and hidden attribute
    const content = container.querySelector('[data-state="closed"]')
    expect(content).toBeInTheDocument()
  })

  it('shows content when open', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Visible content</CollapsibleContent>
      </Collapsible>
    )
    expect(screen.getByText('Visible content')).toBeVisible()
  })

  it('toggles content when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Collapsible content</CollapsibleContent>
      </Collapsible>
    )

    // Click to open
    await user.click(screen.getByText('Toggle'))
    expect(screen.getByText('Collapsible content')).toBeVisible()

    // Click to close
    await user.click(screen.getByText('Toggle'))
    // After closing, Radix sets data-state="closed"
    const trigger = screen.getByText('Toggle')
    expect(trigger).toHaveAttribute('data-state', 'closed')
  })
})
