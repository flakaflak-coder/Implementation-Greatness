import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'

describe('Tooltip', () => {
  it('renders the trigger element', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText('Hover me')).toBeInTheDocument()
  })

  it('does not show tooltip content initially', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Hidden tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows tooltip content on hover', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    await user.hover(screen.getByText('Hover me'))
    expect(await screen.findByRole('tooltip')).toBeInTheDocument()
  })

  it('renders tooltip content when open prop is set', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Always visible</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('applies custom className to content', () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent className="custom-tooltip">Styled tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    // The content div wraps the role=tooltip span, query by the visible content container
    const tooltipContent = screen.getByRole('tooltip').closest('[class*="custom-tooltip"]')
      || screen.getByRole('tooltip').parentElement
    expect(tooltipContent).toHaveClass('custom-tooltip')
  })
})
