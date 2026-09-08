import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { focusRingStyleFor, useFocusRing } from './useFocusRing'
import { lightTheme } from '../theme/themes'

describe('useFocusRing', () => {
  it('starts unfocused with no ring', () => {
    const { result } = renderHook(() => useFocusRing())
    expect(result.current.focused).toBe(false)
    expect(result.current.focusRingStyle).toBeUndefined()
  })

  it('renders the ring while focused and clears it on blur', () => {
    const { result } = renderHook(() => useFocusRing())
    act(() => result.current.onFocus())
    expect(result.current.focused).toBe(true)
    expect(result.current.focusRingStyle).toEqual({
      outlineWidth: 2,
      outlineStyle: 'solid',
      outlineColor: lightTheme.colors.focus,
      outlineOffset: 2,
    })
    act(() => result.current.onBlur())
    expect(result.current.focused).toBe(false)
    expect(result.current.focusRingStyle).toBeUndefined()
  })

  it('renders no ring on native (no keyboard focus)', () => {
    expect(focusRingStyleFor(lightTheme, true, false)).toBeUndefined()
    expect(focusRingStyleFor(lightTheme, false, false)).toBeUndefined()
  })
})
