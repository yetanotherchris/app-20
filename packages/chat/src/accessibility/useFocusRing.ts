import { useCallback, useState } from 'react'
import { Platform, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import type { ChatTheme } from '../theme/types'

export interface FocusRingState {
  /** Exposed for hosts that need to restyle beyond the ring while focused. */
  focused: boolean
  onFocus: () => void
  onBlur: () => void
  focusRingStyle: StyleProp<ViewStyle>
}

/**
 * The ring style for a focused control on web; nothing on native (iOS has no
 * keyboard focus). Pure so the native branch is unit-testable without mocking
 * Platform.
 */
export function focusRingStyleFor(
  theme: ChatTheme,
  focused: boolean,
  isWeb: boolean,
): StyleProp<ViewStyle> {
  if (!focused || !isWeb) return undefined
  return {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineColor: theme.colors.focus,
    outlineOffset: 2,
  }
}

/**
 * Visible focus state for a control. The ring renders whenever the control is
 * focused (WCAG 2.2 Focus Appearance, FR-003); react-native-web 0.21.2 does
 * not compile :focus-visible pseudo-classes, so the state is tracked directly.
 */
export function useFocusRing(): FocusRingState {
  const { theme } = useTheme()
  const [focused, setFocused] = useState(false)

  const onFocus = useCallback(() => setFocused(true), [])
  const onBlur = useCallback(() => setFocused(false), [])

  const focusRingStyle = focusRingStyleFor(theme, focused, Platform.OS === 'web')

  return { focused, onFocus, onBlur, focusRingStyle }
}
