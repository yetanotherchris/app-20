import { CHAT_STATUS_PRESENTATION } from '../accessibility/status'
import { useTheme } from '../theme/ThemeContext'
import type { ChatStatus, IconName, SurfaceStyleOverrides } from '../theme/types'
import { StatusIndicator } from './StatusIndicator'

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
  if (!presentation) return null
  return (
    <StatusIndicator
      label={presentation.label}
      icon={presentation.icon}
      color={status === 'error' ? theme.colors.danger : theme.colors.textSecondary}
      testID={`chat.status.${status}`}
      centered
      icons={icons}
      containerStyle={styleOverrides?.chatStatus}
    />
  )
}
