import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { computeUnreadCount, useUnreadCount } from './useUnreadCount'

describe('computeUnreadCount', () => {
  it('clears the count at the bottom', () => {
    expect(computeUnreadCount(true, true, 5)).toBe(0)
  })

  it('counts a new tail message while scrolled up', () => {
    expect(computeUnreadCount(false, true, 0)).toBe(1)
  })

  it('accumulates across multiple appends', () => {
    expect(computeUnreadCount(false, true, 2)).toBe(3)
  })

  it('does not count when the tail is unchanged', () => {
    expect(computeUnreadCount(false, false, 3)).toBe(3)
  })
})

describe('useUnreadCount', () => {
  it('starts at zero at the bottom', () => {
    const { result } = renderHook(
      ({ isAtBottom, tailKey }) => useUnreadCount(isAtBottom, tailKey),
      {
        initialProps: { isAtBottom: true, tailKey: 'a' },
      },
    )
    expect(result.current.unreadCount).toBe(0)
  })

  it('counts appends that arrive while scrolled up', () => {
    const { result, rerender } = renderHook(
      ({ isAtBottom, tailKey }) => useUnreadCount(isAtBottom, tailKey),
      {
        initialProps: { isAtBottom: true, tailKey: 'a' },
      },
    )
    rerender({ isAtBottom: false, tailKey: 'a' })
    expect(result.current.unreadCount).toBe(0)
    rerender({ isAtBottom: false, tailKey: 'b' })
    expect(result.current.unreadCount).toBe(1)
    rerender({ isAtBottom: false, tailKey: 'c' })
    expect(result.current.unreadCount).toBe(2)
  })

  it('does not count prepends (load earlier) while scrolled up', () => {
    const { result, rerender } = renderHook(
      ({ isAtBottom, tailKey }) => useUnreadCount(isAtBottom, tailKey),
      {
        initialProps: { isAtBottom: true, tailKey: 'c' },
      },
    )
    rerender({ isAtBottom: false, tailKey: 'c' })
    rerender({ isAtBottom: false, tailKey: 'c' })
    expect(result.current.unreadCount).toBe(0)
  })

  it('clears when the user returns to the bottom', () => {
    const { result, rerender } = renderHook(
      ({ isAtBottom, tailKey }) => useUnreadCount(isAtBottom, tailKey),
      {
        initialProps: { isAtBottom: true, tailKey: 'a' },
      },
    )
    rerender({ isAtBottom: false, tailKey: 'b' })
    expect(result.current.unreadCount).toBe(1)
    rerender({ isAtBottom: true, tailKey: 'b' })
    expect(result.current.unreadCount).toBe(0)
  })

  it('clearUnread resets the count explicitly', () => {
    const { result, rerender } = renderHook(
      ({ isAtBottom, tailKey }) => useUnreadCount(isAtBottom, tailKey),
      {
        initialProps: { isAtBottom: true, tailKey: 'a' },
      },
    )
    rerender({ isAtBottom: false, tailKey: 'b' })
    act(() => {
      result.current.clearUnread()
    })
    expect(result.current.unreadCount).toBe(0)
  })
})
