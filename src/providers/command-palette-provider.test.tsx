import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook, act } from '@testing-library/react'
import { CommandPaletteProvider, useCommandPalette } from './command-palette-provider'

describe('CommandPaletteProvider', () => {
  it('renders children', () => {
    render(
      <CommandPaletteProvider>
        <div>Child content</div>
      </CommandPaletteProvider>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('provides default isOpen state as false', () => {
    function TestConsumer() {
      const { isOpen } = useCommandPalette()
      return <div>{isOpen ? 'open' : 'closed'}</div>
    }

    render(
      <CommandPaletteProvider>
        <TestConsumer />
      </CommandPaletteProvider>
    )
    expect(screen.getByText('closed')).toBeInTheDocument()
  })

  it('provides setOpen function that opens the palette', async () => {
    const user = userEvent.setup()

    function TestConsumer() {
      const { isOpen, setOpen } = useCommandPalette()
      return (
        <div>
          <span>{isOpen ? 'open' : 'closed'}</span>
          <button onClick={() => setOpen(true)}>Open</button>
        </div>
      )
    }

    render(
      <CommandPaletteProvider>
        <TestConsumer />
      </CommandPaletteProvider>
    )

    expect(screen.getByText('closed')).toBeInTheDocument()
    await user.click(screen.getByText('Open'))
    expect(screen.getByText('open')).toBeInTheDocument()
  })

  it('provides setOpen function that closes the palette', async () => {
    const user = userEvent.setup()

    function TestConsumer() {
      const { isOpen, setOpen } = useCommandPalette()
      return (
        <div>
          <span>{isOpen ? 'open' : 'closed'}</span>
          <button onClick={() => setOpen(true)}>Open</button>
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      )
    }

    render(
      <CommandPaletteProvider>
        <TestConsumer />
      </CommandPaletteProvider>
    )

    await user.click(screen.getByText('Open'))
    expect(screen.getByText('open')).toBeInTheDocument()
    await user.click(screen.getByText('Close'))
    expect(screen.getByText('closed')).toBeInTheDocument()
  })

  it('provides toggle function that toggles between open and closed', async () => {
    const user = userEvent.setup()

    function TestConsumer() {
      const { isOpen, toggle } = useCommandPalette()
      return (
        <div>
          <span>{isOpen ? 'open' : 'closed'}</span>
          <button onClick={toggle}>Toggle</button>
        </div>
      )
    }

    render(
      <CommandPaletteProvider>
        <TestConsumer />
      </CommandPaletteProvider>
    )

    expect(screen.getByText('closed')).toBeInTheDocument()
    await user.click(screen.getByText('Toggle'))
    expect(screen.getByText('open')).toBeInTheDocument()
    await user.click(screen.getByText('Toggle'))
    expect(screen.getByText('closed')).toBeInTheDocument()
  })
})

describe('useCommandPalette', () => {
  it('throws an error when used outside of CommandPaletteProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useCommandPalette())
    }).toThrow('useCommandPalette must be used within a CommandPaletteProvider')

    consoleSpy.mockRestore()
  })

  it('returns context value with all expected properties', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CommandPaletteProvider>{children}</CommandPaletteProvider>
    )

    const { result } = renderHook(() => useCommandPalette(), { wrapper })

    expect(result.current).toHaveProperty('isOpen')
    expect(result.current).toHaveProperty('setOpen')
    expect(result.current).toHaveProperty('toggle')
    expect(typeof result.current.isOpen).toBe('boolean')
    expect(typeof result.current.setOpen).toBe('function')
    expect(typeof result.current.toggle).toBe('function')
  })

  it('toggle function works via renderHook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CommandPaletteProvider>{children}</CommandPaletteProvider>
    )

    const { result } = renderHook(() => useCommandPalette(), { wrapper })

    expect(result.current.isOpen).toBe(false)
    act(() => {
      result.current.toggle()
    })
    expect(result.current.isOpen).toBe(true)
    act(() => {
      result.current.toggle()
    })
    expect(result.current.isOpen).toBe(false)
  })

  it('setOpen function works via renderHook', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CommandPaletteProvider>{children}</CommandPaletteProvider>
    )

    const { result } = renderHook(() => useCommandPalette(), { wrapper })

    expect(result.current.isOpen).toBe(false)
    act(() => {
      result.current.setOpen(true)
    })
    expect(result.current.isOpen).toBe(true)
    act(() => {
      result.current.setOpen(false)
    })
    expect(result.current.isOpen).toBe(false)
  })
})
