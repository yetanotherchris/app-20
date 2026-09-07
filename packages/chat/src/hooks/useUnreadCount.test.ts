import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { computeUnreadCount, useUnreadCount } from './useUnreadCount'

describe('computeUnreadCount', () => {
  it('clears the count at the bottom', () => {
    expect(computeUnreadCount(true, 10, 5, false, 9)).toBe(0)
  })

  it('counts new messages while scrolled up', () => {
    expect(computeUnreadCount(false, 12, 0, false, 10)).toBe(2)
  })

  it('accumulates across multiple appends', () => {
    expect(computeUnreadCount(false, 12, 2, false, 10)).toBe(4)
  })

  it('does not count when nothing was appended', () => {
    expect(computeUnreadCount(false, 10, 3, false, 10)).toBe(3)
  })
})

describe('useUnreadCount', () => {
  it('clears unread when at the bottom even after appends', () => {
    const { result } = renderHook(({ isAtBottom, count }) => useUnreadCount(isAtBottom, count), {
      initialProps: { isAtBottom: true, count: 4 },
    })
    expect(result.current.unreadCount).toBe(0)
    act(() => {
      result.current.clearUnread()
    })
    expect(result.current.unreadCount).toBe(0)
  })

  it('counts appends that arrive while scrolled up', () => {
    const { result, rerender } = renderHook(
      ({ isAtBottom, count }) => useUnreadCount(isAtBottom, count),
      {
        initialProps: { isAtBottom: true, count: 4 },
      },
    )
    rerender({ isAtBottom: false, count: 4 })
    expect(result.current.unreadCount).toBe(0)
    rerender({ isAtBottom: false, count: 5 })
    expect(result.current.unreadCount).toBe(1)
    rerender({ isAtBottom: false, count: 7 })
    expect(result.current.unreadCount).toBe(3)
  })

  it('clears when the user returns to the bottom', () => {
    const { result, rerender } = renderHook(
      ({ isAtBottom, count }) => useUnreadCount(isAtBottom, count),
      {
        initialProps: { isAtBottom: true, count: 4 },
      },
    )
    rerender({ isAtBottom: false, count: 6 })
    expect(result.current.unreadCount).toBe(2)
    rerender({ isAtBottom: true, count: 6 })
    expect(result.current.unreadCount).toBe(0)
  })

  it('clearUnread resets the count explicitly', () => {
    const { result, rerender } = renderHook(
      ({ isAtBottom, count }) => useUnreadCount(isAtBottom, count),
      {
        initialProps: { isAtBottom: true, count: 4 },
      },
    )
    rerender({ isAtBottom: false, count: 6 })
    act(() => {
      result.current.clearUnread()
    })
    expect(result.current.unreadCount).toBe(0)
  })
})
