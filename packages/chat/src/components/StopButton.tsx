import { useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { renderIcon } from '../icons'
import { useFocusRing } from '../accessibility/useFocusRing'
import { minTouchTarget } from '../accessibility/minTouchTarget'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface StopButtonProps {
  label: string
  onPress: () => void
  icons?: Partial<Record<'stop', React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
}

/**
 * Stop occupies the same circular control area as Send so the swap does not
 * change the composer's width or lose the draft. The square glyph keeps its
 * existing meaning and accessible name.
 */
export function StopButton({ label, onPress, icons, styleOverrides }: StopButtonProps) {
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
          backgroundColor: theme.colors.sendBackground,
        },
      }),
    [theme, size],
  )
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.button, focusRingStyle, styleOverrides?.stop]}
      testID="chat.composer.stop"
    >
      {renderIcon('stop', icons, {
        size: 16,
        color: theme.colors.sendForeground,
        style: { lineHeight: 18, textAlign: 'center' },
      })}
    </Pressable>
  )
}
