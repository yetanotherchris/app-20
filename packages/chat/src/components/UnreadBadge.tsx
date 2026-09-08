import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'
import type { SurfaceStyleOverrides } from '../theme/types'

export interface UnreadBadgeProps {
  count: number
  styleOverrides?: SurfaceStyleOverrides
}

export function UnreadBadge({ count, styleOverrides }: UnreadBadgeProps) {
  const { theme } = useTheme()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.unreadBadge,
          borderRadius: 12,
          minWidth: 24,
          minHeight: 24,
          paddingHorizontal: 8,
          paddingVertical: 4,
        },
        count: {
          color: theme.colors.onPrimary,
          fontSize: theme.typography.captionTextSize,
          lineHeight: theme.typography.captionLineHeight,
          fontWeight: theme.typography.captionWeight,
        },
      }),
    [theme],
  )
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.badge, styleOverrides?.unreadBadge]}
      testID="chat.unread-badge"
    >
      <Text style={styles.count}>{count}</Text>
    </View>
  )
}
