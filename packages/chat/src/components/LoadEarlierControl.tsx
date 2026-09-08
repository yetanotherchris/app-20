import { useMemo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { useFocusRing } from '../accessibility/useFocusRing'
import { minTouchTarget } from '../accessibility/minTouchTarget'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface LoadEarlierControlProps {
  label: string
  isLoading: boolean
  onPress: () => void
  styleOverrides?: SurfaceStyleOverrides
}

export function LoadEarlierControl({
  label,
  isLoading,
  onPress,
  styleOverrides,
}: LoadEarlierControlProps) {
  const { theme } = useTheme()
  const { onFocus, onBlur, focusRingStyle } = useFocusRing()
  const target = minTouchTarget()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        control: {
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: target,
          paddingVertical: 8,
          paddingHorizontal: 16,
        },
        label: {
          color: theme.colors.primary,
          fontSize: theme.typography.controlTextSize,
        },
      }),
    [theme, target],
  )
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isLoading }}
      disabled={isLoading}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.control, focusRingStyle, styleOverrides?.loadEarlier]}
      testID="chat.load-earlier"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  )
}
