import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from './sheet'

describe('Sheet', () => {
  it('renders trigger button', () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet description</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByText('Open Sheet')).toBeInTheDocument()
  })

  it('opens sheet when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Adjust your preferences</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )

    await user.click(screen.getByText('Open Sheet'))

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Adjust your preferences')).toBeInTheDocument()
  })

  it('displays content when defaultOpen', () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Default Open Sheet</SheetTitle>
            <SheetDescription>This is open by default</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByText('Default Open Sheet')).toBeInTheDocument()
  })

  it('has close button', () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet</SheetTitle>
            <SheetDescription>Description</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Close Test</SheetTitle>
            <SheetDescription>Should close</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )

    expect(screen.getByText('Close Test')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('Close Test')).not.toBeInTheDocument()
  })

  it('applies custom className to header', () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader className="custom-header">
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Desc</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    const header = screen.getByText('Title').parentElement
    expect(header).toHaveClass('custom-header')
  })

  it('applies custom className to footer', () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Desc</SheetDescription>
          </SheetHeader>
          <SheetFooter className="custom-footer">
            <button>Save</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
    const footer = screen.getByText('Save').parentElement
    expect(footer).toHaveClass('custom-footer')
  })
})
