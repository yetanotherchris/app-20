import { useMemo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
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
  const styles = useMemo(
    () =>
      StyleSheet.create({
        control: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
          paddingHorizontal: 16,
        },
        label: {
          color: theme.colors.primary,
          fontSize: theme.typography.controlTextSize,
        },
      }),
    [theme],
  )
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isLoading }}
      disabled={isLoading}
      onPress={onPress}
      style={[styles.control, styleOverrides?.loadEarlier]}
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
