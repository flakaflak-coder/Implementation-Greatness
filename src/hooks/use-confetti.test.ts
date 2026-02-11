import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock canvas-confetti
const mockConfetti = vi.fn()
vi.mock('canvas-confetti', () => ({
  default: (...args: unknown[]) => mockConfetti(...args),
}))

// Must import after mock
import { useConfetti } from './use-confetti'

beforeEach(() => {
  mockConfetti.mockClear()
  vi.useFakeTimers()
})

describe('useConfetti', () => {
  it('returns fireConfetti function', () => {
    const { result } = renderHook(() => useConfetti())
    expect(typeof result.current.fireConfetti).toBe('function')
  })

  it('returns fireStars function', () => {
    const { result } = renderHook(() => useConfetti())
    expect(typeof result.current.fireStars).toBe('function')
  })

  it('returns fireFromSides function', () => {
    const { result } = renderHook(() => useConfetti())
    expect(typeof result.current.fireFromSides).toBe('function')
  })

  it('fireConfetti calls confetti multiple times', () => {
    const { result } = renderHook(() => useConfetti())

    act(() => {
      result.current.fireConfetti()
    })

    // fireConfetti calls fire() 5 times with different particle ratios
    expect(mockConfetti).toHaveBeenCalledTimes(5)
  })

  it('fireConfetti passes origin and zIndex defaults', () => {
    const { result } = renderHook(() => useConfetti())

    act(() => {
      result.current.fireConfetti()
    })

    // Each call should include origin.y and zIndex
    const firstCall = mockConfetti.mock.calls[0][0]
    expect(firstCall.origin).toEqual({ y: 0.7 })
    expect(firstCall.zIndex).toBe(9999)
  })

  it('fireConfetti passes spread and startVelocity options', () => {
    const { result } = renderHook(() => useConfetti())

    act(() => {
      result.current.fireConfetti()
    })

    // First call has spread: 26, startVelocity: 55
    const firstCall = mockConfetti.mock.calls[0][0]
    expect(firstCall.spread).toBe(26)
    expect(firstCall.startVelocity).toBe(55)
  })

  it('fireConfetti uses correct particle counts based on ratios', () => {
    const { result } = renderHook(() => useConfetti())

    act(() => {
      result.current.fireConfetti()
    })

    // Total count is 200; ratios are 0.25, 0.2, 0.35, 0.1, 0.1
    const counts = mockConfetti.mock.calls.map(
      (call: unknown[]) => (call[0] as { particleCount: number }).particleCount
    )
    expect(counts).toEqual([50, 40, 70, 20, 20])
  })

  it('fireStars calls confetti via setTimeout', () => {
    const { result } = renderHook(() => useConfetti())

    act(() => {
      result.current.fireStars()
    })

    // Three setTimeout calls at 0, 100, 200 ms
    // First fires at 0ms
    act(() => {
      vi.advanceTimersByTime(0)
    })
    // Each shoot() calls confetti twice (star + circle)
    expect(mockConfetti.mock.calls.length).toBeGreaterThanOrEqual(2)

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(mockConfetti.mock.calls.length).toBeGreaterThanOrEqual(4)

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(mockConfetti.mock.calls.length).toBeGreaterThanOrEqual(6)
  })

  it('fireStars uses star and circle shapes', () => {
    const { result } = renderHook(() => useConfetti())

    act(() => {
      result.current.fireStars()
      vi.advanceTimersByTime(0)
    })

    const shapes = mockConfetti.mock.calls.map(
      (call: unknown[]) => (call[0] as { shapes: string[] }).shapes
    )
    expect(shapes).toContainEqual(['star'])
    expect(shapes).toContainEqual(['circle'])
  })

  it('fireStars uses gold color palette', () => {
    const { result } = renderHook(() => useConfetti())

    act(() => {
      result.current.fireStars()
      vi.advanceTimersByTime(0)
    })

    const firstCall = mockConfetti.mock.calls[0][0]
    expect(firstCall.colors).toEqual(['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'])
  })

  it('fireFromSides calls confetti with angle 60 and origin.x=0', () => {
    // Mock requestAnimationFrame to call callback immediately
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      // Don't call back to prevent infinite loop; just verify initial call
      return 0
    })

    const { result } = renderHook(() => useConfetti())

    act(() => {
      result.current.fireFromSides()
    })

    // The frame function fires two confetti calls immediately
    expect(mockConfetti).toHaveBeenCalledTimes(2)

    const leftCall = mockConfetti.mock.calls[0][0]
    expect(leftCall.angle).toBe(60)
    expect(leftCall.origin).toEqual({ x: 0 })

    const rightCall = mockConfetti.mock.calls[1][0]
    expect(rightCall.angle).toBe(120)
    expect(rightCall.origin).toEqual({ x: 1 })

    rafSpy.mockRestore()
  })

  it('fireFromSides uses purple/pink color palette', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)

    const { result } = renderHook(() => useConfetti())

    act(() => {
      result.current.fireFromSides()
    })

    const firstCall = mockConfetti.mock.calls[0][0]
    expect(firstCall.colors).toEqual(['#6366f1', '#8b5cf6', '#a855f7', '#ec4899'])

    rafSpy.mockRestore()
  })

  it('returns stable function references across re-renders', () => {
    const { result, rerender } = renderHook(() => useConfetti())

    const firstFireConfetti = result.current.fireConfetti
    const firstFireStars = result.current.fireStars
    const firstFireFromSides = result.current.fireFromSides

    rerender()

    expect(result.current.fireConfetti).toBe(firstFireConfetti)
    expect(result.current.fireStars).toBe(firstFireStars)
    expect(result.current.fireFromSides).toBe(firstFireFromSides)
  })
})
