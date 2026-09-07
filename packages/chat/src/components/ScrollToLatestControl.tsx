import { useMemo } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import { renderIcon } from '../icons'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface ScrollToLatestControlProps {
  label: string
  onPress: () => void
  icons?: Partial<Record<'scrollToLatest', React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
}

export function ScrollToLatestControl({
  label,
  onPress,
  icons,
  styleOverrides,
}: ScrollToLatestControlProps) {
  const { theme } = useTheme()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        control: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: theme.colors.controlSurface,
          borderRadius: theme.radii.controlRadius,
          paddingVertical: 8,
          paddingHorizontal: 16,
          elevation: 2,
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
      style={[styles.control, styleOverrides?.scrollToLatest]}
      testID="chat.scroll-to-latest"
    >
      {renderIcon('scrollToLatest', icons, { size: 16, color: theme.colors.onPrimary })}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}