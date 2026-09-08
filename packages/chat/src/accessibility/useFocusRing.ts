import { useCallback, useState } from 'react'
import { Platform, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/ThemeContext'

export interface FocusRingState {
  focused: boolean
  onFocus: () => void
  onBlur: () => void
  focusRingStyle: StyleProp<ViewStyle>
}

/**
 * Visible focus state for a control. The ring renders whenever the control is
 * focused (WCAG 2.2 Focus Appearance, FR-003); react-native-web 0.21.2 does
 * not compile :focus-visible pseudo-classes, so the state is tracked directly.
 * iOS has no keyboard focus, so native controls render no ring.
 */
export function useFocusRing(): FocusRingState {
  const { theme } = useTheme()
  const [focused, setFocused] = useState(false)

  const onFocus = useCallback(() => setFocused(true), [])
  const onBlur = useCallback(() => setFocused(false), [])

  const focusRingStyle: StyleProp<ViewStyle> =
    focused && Platform.OS === 'web'
      ? {
          outlineWidth: 2,
          outlineStyle: 'solid',
          outlineColor: theme.colors.focus,
          outlineOffset: 2,
        }
      : undefined

  return { focused, onFocus, onBlur, focusRingStyle }
}
