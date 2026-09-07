import { useMemo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { renderIcon } from '../icons'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface StopButtonProps {
  label: string
  onPress: () => void
  icons?: Partial<Record<'stop', React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
}

export function StopButton({ label, onPress, icons, styleOverrides }: StopButtonProps) {
  const { theme } = useTheme()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
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
    [theme],
  )
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.button, styleOverrides?.stop]}
      testID="chat.composer.stop"
    >
      {renderIcon('stop', icons, { size: 16, color: theme.colors.onPrimary })}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}