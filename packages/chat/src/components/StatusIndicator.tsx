import { useMemo } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { renderIcon } from '../icons'
import { useTheme } from '../theme/ThemeContext'
import type { IconName } from '../theme/types'

export interface StatusIndicatorProps {
  label: string
  icon: IconName
  color: string
  testID: string
  /** Chat-level statuses center across the composer width; message badges left-align. */
  centered?: boolean
  icons?: Partial<Record<IconName, React.ReactNode>>
  containerStyle?: StyleProp<ViewStyle>
}

/**
 * A non-color status indicator: icon glyph plus text label (FR-008). Shared by
 * the message-level and chat-level badges, which differ only in presentation,
 * the status map, and the testID prefix.
 */
export function StatusIndicator({
  label,
  icon,
  color,
  testID,
  centered = false,
  icons,
  containerStyle,
}: StatusIndicatorProps) {
  const { theme } = useTheme()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginTop: 4,
          ...(centered ? { justifyContent: 'center' } : null),
        },
        label: {
          fontSize: theme.typography.captionTextSize,
          fontWeight: '600',
        },
      }),
    [theme, centered],
  )

  return (
    <View style={[styles.badge, containerStyle]} testID={testID}>
      {renderIcon(icon, icons, { size: 12, color })}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  )
}
