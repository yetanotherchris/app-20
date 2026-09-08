import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CHAT_STATUS_PRESENTATION } from '../accessibility/status'
import { renderIcon } from '../icons'
import { useTheme } from '../theme/ThemeContext'
import type { ChatStatus, IconName, SurfaceStyleOverrides } from '../theme/types'

export interface ChatStatusTextProps {
  status: ChatStatus
  icons?: Partial<Record<IconName, React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
}

/**
 * Non-color chat-status indicator (FR-008): the overall state of the
 * conversation, shown above the composer whenever it is not idle. The Send and
 * Stop affordances already reflect the state; the text makes it perceivable
 * without color.
 */
export function ChatStatusText({ status, icons, styleOverrides }: ChatStatusTextProps) {
  const { theme } = useTheme()
  const presentation = CHAT_STATUS_PRESENTATION[status]
  const color = status === 'error' ? theme.colors.danger : theme.colors.textSecondary

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          paddingVertical: 4,
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
    <View style={[styles.badge, styleOverrides?.chatStatus]} testID={`chat.status.${status}`}>
      {renderIcon(presentation.icon, icons, { size: 12, color })}
      <Text style={[styles.label, { color }]}>{presentation.label}</Text>
    </View>
  )
}
