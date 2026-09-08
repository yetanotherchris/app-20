import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSystemAccessibility } from './useSystemAccessibility'

interface MockMediaQueryList {
  matches: boolean
  addEventListener: (type: string, cb: () => void) => void
  removeEventListener: () => void
}

function installMatchMedia() {
  const matchesByQuery = new Map<string, boolean>()
  const changeListeners = new Map<string, Array<() => void>>()

  const matchMedia = vi.fn((query: string): MockMediaQueryList => ({
    matches: matchesByQuery.get(query) ?? false,
    addEventListener: (type, cb) => {
      if (type !== 'change') return
      const listeners = changeListeners.get(query) ?? []
      listeners.push(cb)
      changeListeners.set(query, listeners)
    },
    removeEventListener: () => undefined,
  }))

  ;(window as unknown as { matchMedia: unknown }).matchMedia = matchMedia

  return {
    setMatches(query: string, matches: boolean): void {
      matchesByQuery.set(query, matches)
      for (const cb of changeListeners.get(query) ?? []) cb()
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

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

  it('reads reduced motion and high contrast from media queries', () => {
    installMatchMedia()
    ;(window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })
    const { result } = renderHook(() => useSystemAccessibility())
    expect(result.current.reducedMotion).toBe(true)
    expect(result.current.highContrast).toBe(true)
  })

  it('updates when a media query reports a change', () => {
    const media = installMatchMedia()
    const { result } = renderHook(() => useSystemAccessibility())
    expect(result.current.reducedMotion).toBe(false)
    act(() => media.setMatches('(prefers-reduced-motion: reduce)', true))
    expect(result.current.reducedMotion).toBe(true)
    act(() => media.setMatches('(forced-colors: active)', true))
    expect(result.current.highContrast).toBe(true)
  })
})
