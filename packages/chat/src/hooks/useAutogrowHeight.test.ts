import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAutogrowHeight } from './useAutogrowHeight'

describe('useAutogrowHeight', () => {
  it('starts at minHeight', () => {
    const { result } = renderHook(() => useAutogrowHeight({ minHeight: 44, maxHeight: 160 }))
    expect(result.current.height).toBe(44)
  })

  it('grows with content up to maxHeight', () => {
    const { result } = renderHook(() => useAutogrowHeight({ minHeight: 44, maxHeight: 160 }))
    act(() => {
      result.current.handleContentSizeChange(100)
    })
    expect(result.current.height).toBe(100)
    act(() => {
      result.current.handleContentSizeChange(160)
    })
    expect(result.current.height).toBe(160)
  })

  it('clamps at maxHeight so the input scrolls internally', () => {
    const { result } = renderHook(() => useAutogrowHeight({ minHeight: 44, maxHeight: 160 }))
    act(() => {
      result.current.handleContentSizeChange(500)
    })
    expect(result.current.height).toBe(160)
  })

  it('does not go below minHeight', () => {
    const { result } = renderHook(() => useAutogrowHeight({ minHeight: 44, maxHeight: 160 }))
    act(() => {
      result.current.handleContentSizeChange(10)
    })
    expect(result.current.height).toBe(44)
  })

  it('corrects height on text change (web shrink fallback)', () => {
    const { result } = renderHook(() => useAutogrowHeight({ minHeight: 44, maxHeight: 160 }))
    act(() => {
      result.current.handleContentSizeChange(120)
    })
    expect(result.current.height).toBe(120)
    // Simulate web shrink: content height fell but onContentSizeChange did not
    // fire; handleTextChange re-applies the clamp from the tracked content.
    act(() => {
      result.current.handleLayout({ nativeEvent: { layout: { height: 60 } } })
    })
    act(() => {
      result.current.handleTextChange()
    })
    expect(result.current.height).toBe(60)
  })
})
