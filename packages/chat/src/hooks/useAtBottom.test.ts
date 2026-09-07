import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { distanceFromBottom, isNearBottom, useAtBottom } from './useAtBottom'

describe('distanceFromBottom', () => {
  it('computes the remaining scroll distance to the bottom edge', () => {
    expect(distanceFromBottom({ contentHeight: 1000, offsetY: 200, viewportHeight: 600 })).toBe(200)
    expect(distanceFromBottom({ contentHeight: 800, offsetY: 200, viewportHeight: 600 })).toBe(0)
  })

  it('is negative when scrolled past the content edge', () => {
    expect(distanceFromBottom({ contentHeight: 700, offsetY: 200, viewportHeight: 600 })).toBe(-100)
  })
})

describe('isNearBottom', () => {
  it('returns true inside the follow threshold', () => {
    expect(isNearBottom({ contentHeight: 1000, offsetY: 304, viewportHeight: 600 }, 96)).toBe(true)
    expect(isNearBottom({ contentHeight: 1000, offsetY: 350, viewportHeight: 600 }, 96)).toBe(true)
  })

  it('returns false beyond the follow threshold', () => {
    expect(isNearBottom({ contentHeight: 1000, offsetY: 300, viewportHeight: 600 }, 96)).toBe(false)
    expect(isNearBottom({ contentHeight: 1000, offsetY: 200, viewportHeight: 600 }, 96)).toBe(false)
  })
})

describe('useAtBottom', () => {
  it('starts at the bottom', () => {
    const { result } = renderHook(() => useAtBottom(96))
    expect(result.current.isAtBottom).toBe(true)
  })

  it('flips off when scrolled up beyond the threshold', () => {
    const { result } = renderHook(() => useAtBottom(96))
    act(() => {
      result.current.update({ contentHeight: 1000, offsetY: 100, viewportHeight: 600 })
    })
    expect(result.current.isAtBottom).toBe(false)
  })

  it('flips back on when back within the threshold', () => {
    const { result } = renderHook(() => useAtBottom(96))
    act(() => {
      result.current.update({ contentHeight: 1000, offsetY: 100, viewportHeight: 600 })
    })
    act(() => {
      result.current.update({ contentHeight: 1000, offsetY: 304, viewportHeight: 600 })
    })
    expect(result.current.isAtBottom).toBe(true)
  })

  it('reports transitions exactly once per change', () => {
    const onAtBottomChange = vi.fn()
    const { result } = renderHook(() => useAtBottom(96, onAtBottomChange))
    act(() => {
      result.current.update({ contentHeight: 1000, offsetY: 100, viewportHeight: 600 })
      result.current.update({ contentHeight: 1000, offsetY: 50, viewportHeight: 600 })
    })
    act(() => {
      result.current.update({ contentHeight: 1000, offsetY: 304, viewportHeight: 600 })
      result.current.update({ contentHeight: 1000, offsetY: 320, viewportHeight: 600 })
    })
    expect(onAtBottomChange).toHaveBeenCalledTimes(2)
    expect(onAtBottomChange).toHaveBeenNthCalledWith(1, false)
    expect(onAtBottomChange).toHaveBeenNthCalledWith(2, true)
  })

  it('uses the live callback reference', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(
      ({ onAtBottomChange }) => useAtBottom(96, onAtBottomChange),
      {
        initialProps: { onAtBottomChange: first },
      },
    )
    rerender({ onAtBottomChange: second })
    act(() => {
      result.current.update({ contentHeight: 1000, offsetY: 100, viewportHeight: 600 })
    })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(false)
  })
})
