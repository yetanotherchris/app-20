import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSystemAccessibility } from './useSystemAccessibility'

describe('useSystemAccessibility', () => {
  it('defaults to off when the platform cannot report the settings', () => {
    const { result } = renderHook(() => useSystemAccessibility())
    expect(result.current).toEqual({ reducedMotion: false, highContrast: false })
  })

  it('applies explicit overrides over detection', () => {
    const { result } = renderHook(() =>
      useSystemAccessibility({ reducedMotion: true, highContrast: true }),
    )
    expect(result.current).toEqual({ reducedMotion: true, highContrast: true })
  })

  it('passes through partial overrides', () => {
    const { result } = renderHook(() => useSystemAccessibility({ highContrast: true }))
    expect(result.current.highContrast).toBe(true)
    expect(result.current.reducedMotion).toBe(false)
  })
})
