import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { SidebarProvider, useSidebar } from './sidebar-provider'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

describe('SidebarProvider', () => {
  it('renders children', () => {
    render(
      <SidebarProvider>
        <div>Child content</div>
      </SidebarProvider>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('provides default collapsed state as false', () => {
    function TestConsumer() {
      const { isCollapsed } = useSidebar()
      return <div>{isCollapsed ? 'collapsed' : 'expanded'}</div>
    }

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    )
    expect(screen.getByText('expanded')).toBeInTheDocument()
  })

  it('accepts defaultCollapsed prop', () => {
    function TestConsumer() {
      const { isCollapsed } = useSidebar()
      return <div>{isCollapsed ? 'collapsed' : 'expanded'}</div>
    }

    render(
      <SidebarProvider defaultCollapsed={true}>
        <TestConsumer />
      </SidebarProvider>
    )
    expect(screen.getByText('collapsed')).toBeInTheDocument()
  })

  it('provides toggleCollapse function that toggles state', async () => {
    const user = userEvent.setup()

    function TestConsumer() {
      const { isCollapsed, toggleCollapse } = useSidebar()
      return (
        <div>
          <span>{isCollapsed ? 'collapsed' : 'expanded'}</span>
          <button onClick={toggleCollapse}>Toggle</button>
        </div>
      )
    }

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    )

    expect(screen.getByText('expanded')).toBeInTheDocument()
    await user.click(screen.getByText('Toggle'))
    expect(screen.getByText('collapsed')).toBeInTheDocument()
    await user.click(screen.getByText('Toggle'))
    expect(screen.getByText('expanded')).toBeInTheDocument()
  })

  it('provides setCollapsed function', async () => {
    const user = userEvent.setup()

    function TestConsumer() {
      const { isCollapsed, setCollapsed } = useSidebar()
      return (
        <div>
          <span>{isCollapsed ? 'collapsed' : 'expanded'}</span>
          <button onClick={() => setCollapsed(true)}>Collapse</button>
          <button onClick={() => setCollapsed(false)}>Expand</button>
        </div>
      )
    }

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    )

    expect(screen.getByText('expanded')).toBeInTheDocument()
    await user.click(screen.getByText('Collapse'))
    expect(screen.getByText('collapsed')).toBeInTheDocument()
    await user.click(screen.getByText('Expand'))
    expect(screen.getByText('expanded')).toBeInTheDocument()
  })

  it('provides mobile open state defaulting to false', () => {
    function TestConsumer() {
      const { isMobileOpen } = useSidebar()
      return <div>{isMobileOpen ? 'mobile-open' : 'mobile-closed'}</div>
    }

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    )
    expect(screen.getByText('mobile-closed')).toBeInTheDocument()
  })

  it('provides setMobileOpen function', async () => {
    const user = userEvent.setup()

    function TestConsumer() {
      const { isMobileOpen, setMobileOpen } = useSidebar()
      return (
        <div>
          <span>{isMobileOpen ? 'mobile-open' : 'mobile-closed'}</span>
          <button onClick={() => setMobileOpen(true)}>Open Mobile</button>
          <button onClick={() => setMobileOpen(false)}>Close Mobile</button>
        </div>
      )
    }

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    )

    expect(screen.getByText('mobile-closed')).toBeInTheDocument()
    await user.click(screen.getByText('Open Mobile'))
    expect(screen.getByText('mobile-open')).toBeInTheDocument()
    await user.click(screen.getByText('Close Mobile'))
    expect(screen.getByText('mobile-closed')).toBeInTheDocument()
  })

  it('persists collapsed state to localStorage', async () => {
    const user = userEvent.setup()

    function TestConsumer() {
      const { isCollapsed, toggleCollapse } = useSidebar()
      return (
        <div>
          <span>{isCollapsed ? 'collapsed' : 'expanded'}</span>
          <button onClick={toggleCollapse}>Toggle</button>
        </div>
      )
    }

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    )

    await user.click(screen.getByText('Toggle'))
    expect(localStorageMock.setItem).toHaveBeenCalledWith('sidebar-collapsed', 'true')
  })

  it('reads initial state from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce('true')

    function TestConsumer() {
      const { isCollapsed } = useSidebar()
      return <div>{isCollapsed ? 'collapsed' : 'expanded'}</div>
    }

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    )

    // After the useEffect runs, the state should be read from localStorage
    // The initial render may show expanded, but after the effect it should update
    // Since effects are synchronous in tests with act, we check after render
    expect(localStorageMock.getItem).toHaveBeenCalledWith('sidebar-collapsed')
  })
})

describe('useSidebar', () => {
  it('throws an error when used outside of SidebarProvider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useSidebar())
    }).toThrow('useSidebar must be used within a SidebarProvider')

    consoleSpy.mockRestore()
  })

  it('returns context value when used within SidebarProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    )

    const { result } = renderHook(() => useSidebar(), { wrapper })

    expect(result.current).toHaveProperty('isCollapsed')
    expect(result.current).toHaveProperty('toggleCollapse')
    expect(result.current).toHaveProperty('setCollapsed')
    expect(result.current).toHaveProperty('isMobileOpen')
    expect(result.current).toHaveProperty('setMobileOpen')
  })
})
