import { MESSAGE_STATUS_PRESENTATION } from '../accessibility/status'
import { useTheme } from '../theme/ThemeContext'
import type { IconName, SurfaceStyleOverrides } from '../theme/types'
import type { MessageStatus } from '../types'
import { StatusIndicator } from './StatusIndicator'

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
  if (!presentation) return null
  return (
    <StatusIndicator
      label={presentation.label}
      icon={presentation.icon}
      color={status === 'error' ? theme.colors.danger : theme.colors.textSecondary}
      testID={`chat.message-status.${status}`}
      icons={icons}
      containerStyle={styleOverrides?.messageStatus}
    />
  )
}
