import { useMemo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
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

export function SendButton({ label, disabled, onPress, icons, styleOverrides }: SendButtonProps) {
  const { theme } = useTheme()
  const { onFocus, onBlur, focusRingStyle } = useFocusRing()
  const target = minTouchTarget()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          minHeight: target,
          minWidth: target,
          backgroundColor: disabled ? theme.colors.sendDisabled : theme.colors.primary,
          borderRadius: theme.radii.controlRadius,
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        label: {
          color: theme.colors.onPrimary,
          fontSize: theme.typography.controlTextSize,
          fontWeight: '600',
        },
        labelDisabled: {
          color: theme.colors.textSecondary,
        },
      }),
    [theme, disabled, target],
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
      {renderIcon('send', icons, { size: 16, color: theme.colors.onPrimary })}
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  )
}
