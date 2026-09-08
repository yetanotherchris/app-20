import { useEffect, useState } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'

export interface SystemAccessibility {
  reducedMotion: boolean
  highContrast: boolean
}

export interface AccessibilityOverrides {
  reducedMotion?: boolean
  highContrast?: boolean
}

function reducedMotionMedia(): MediaQueryList | null {
  if (Platform.OS !== 'web') return null
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia('(prefers-reduced-motion: reduce)')
}

function forcedColorsMedia(): MediaQueryList | null {
  if (Platform.OS !== 'web') return null
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia('(forced-colors: active)')
}

function prefersContrastMedia(): MediaQueryList | null {
  if (Platform.OS !== 'web') return null
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia('(prefers-contrast: more)')
}

function readSystemState(): SystemAccessibility {
  const reduce = reducedMotionMedia()
  const forced = forcedColorsMedia()
  const prefersContrast = prefersContrastMedia()
  return {
    reducedMotion: reduce ? reduce.matches : false,
    highContrast:
      (forced ? forced.matches : false) || (prefersContrast ? prefersContrast.matches : false),
  }
}

/**
 * Resolve the system reduced-motion and high-contrast states. On web the
 * states come from media queries; on native from AccessibilityInfo. Explicit
 * overrides win over detection so hosts and tests can force a state.
 */
export function useSystemAccessibility(overrides?: AccessibilityOverrides): SystemAccessibility {
  const [system, setSystem] = useState<SystemAccessibility>(() => readSystemState())

  useEffect(() => {
    let mounted = true
    const reduce = reducedMotionMedia()
    const forced = forcedColorsMedia()
    const prefersContrast = prefersContrastMedia()

    const apply = () => {
      if (mounted) setSystem(readSystemState())
    }

    reduce?.addEventListener?.('change', apply)
    forced?.addEventListener?.('change', apply)
    prefersContrast?.addEventListener?.('change', apply)

    if (Platform.OS !== 'web') {
      void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
        if (mounted) setSystem((current) => ({ ...current, reducedMotion: enabled }))
      })
      if (typeof AccessibilityInfo.isHighTextContrastEnabled === 'function') {
        void AccessibilityInfo.isHighTextContrastEnabled().then((enabled) => {
          if (mounted) setSystem((current) => ({ ...current, highContrast: enabled }))
        })
      }
      const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        if (mounted) setSystem((current) => ({ ...current, reducedMotion: enabled }))
      })
      return () => {
        mounted = false
        subscription?.remove?.()
      }
    }

    return () => {
      mounted = false
      reduce?.removeEventListener?.('change', apply)
      forced?.removeEventListener?.('change', apply)
      prefersContrast?.removeEventListener?.('change', apply)
    }
  }, [])

  return {
    reducedMotion: overrides?.reducedMotion ?? system.reducedMotion,
    highContrast: overrides?.highContrast ?? system.highContrast,
  }
}
