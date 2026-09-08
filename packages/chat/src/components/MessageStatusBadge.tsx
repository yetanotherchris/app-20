import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MESSAGE_STATUS_PRESENTATION } from '../accessibility/status'
import { renderIcon } from '../icons'
import { useTheme } from '../theme/ThemeContext'
import type { IconName, SurfaceStyleOverrides } from '../theme/types'
import type { MessageStatus } from '../types'

export interface MessageStatusBadgeProps {
  status: MessageStatus
  icons?: Partial<Record<IconName, React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
}

/**
 * Non-color status indicator for a message (FR-008). Renders nothing for
 * complete messages; a complete message has no status to announce.
 */
export function MessageStatusBadge({ status, icons, styleOverrides }: MessageStatusBadgeProps) {
  const { theme } = useTheme()
  const presentation = MESSAGE_STATUS_PRESENTATION[status]
  const color = status === 'error' ? theme.colors.danger : theme.colors.textSecondary

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginTop: 4,
        },
        label: {
          fontSize: theme.typography.captionTextSize,
          fontWeight: '600',
        },
      }),
    [theme],
  )

  if (!presentation) return null

  return (
    <View
      style={[styles.badge, styleOverrides?.messageStatus]}
      testID={`chat.message-status.${status}`}
    >
      {renderIcon(presentation.icon, icons, { size: 12, color })}
      <Text style={[styles.label, { color }]}>{presentation.label}</Text>
    </View>
  )
}
