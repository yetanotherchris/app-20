import { useMemo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
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

export function StopButton({ label, onPress, icons, styleOverrides }: StopButtonProps) {
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
          backgroundColor: theme.colors.danger,
          borderRadius: theme.radii.controlRadius,
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        label: {
          color: theme.colors.onPrimary,
          fontSize: theme.typography.controlTextSize,
          fontWeight: '600',
        },
      }),
    [theme, target],
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
      {renderIcon('stop', icons, { size: 16, color: theme.colors.onPrimary })}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}
