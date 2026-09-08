import { useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { renderIcon } from '../icons'
import { useFocusRing } from '../accessibility/useFocusRing'
import { minTouchTarget } from '../accessibility/minTouchTarget'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface SendButtonProps {
  label: string
  disabled: boolean
  onPress: () => void
  icons?: Partial<Record<'send', React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
}

/**
 * The reference Send is a circular up-arrow control at the composer's right
 * end (FR-006). The label stays as the accessible name; the arrow is the only
 * visual. The circle never drops below the platform touch-target minimum.
 */
export function SendButton({ label, disabled, onPress, icons, styleOverrides }: SendButtonProps) {
  const { theme } = useTheme()
  const { onFocus, onBlur, focusRingStyle } = useFocusRing()
  const size = Math.max(minTouchTarget(), 34)
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: disabled ? theme.colors.sendDisabled : theme.colors.sendBackground,
        },
      }),
    [theme, disabled, size],
  )
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.button, focusRingStyle, styleOverrides?.send]}
      testID="chat.composer.send"
    >
      {renderIcon('send', icons, {
        size: 16,
        color: theme.colors.onPrimary,
        style: { lineHeight: 18, textAlign: 'center' },
      })}
    </Pressable>
  )
}
