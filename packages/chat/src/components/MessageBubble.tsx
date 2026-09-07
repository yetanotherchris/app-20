import { View } from 'react-native'
import type { Message } from '../types'
import { ContentRenderer } from '../rendering/ContentRenderer'
import { useRoleStyles } from '../rendering/roleStyles'
import type { MessageAction, SurfaceStyleOverrides } from '../theme/types'
import { ActionMenu } from './ActionMenu'
import type { ContentRendererProps } from '../rendering/ContentRenderer'

export interface MessageBubbleProps {
  message: Message
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  messageActions?: readonly MessageAction[]
  onMessageAction?: (action: MessageAction, message: Message) => void
  contentRenderers?: ContentRendererProps['contentRenderers']
  markdownElementRenderers?: ContentRendererProps['markdownElementRenderers']
  markdownRenderer?: ContentRendererProps['markdownRenderer']
  icons?: Partial<Record<'more' | 'copy', React.ReactNode>>
  styleOverrides?: SurfaceStyleOverrides
}

export function MessageBubble({
  message,
  onLinkPress,
  onCopyCode,
  messageActions,
  onMessageAction,
  contentRenderers,
  markdownElementRenderers,
  markdownRenderer,
  icons,
  styleOverrides,
}: MessageBubbleProps) {
  const roleStyles = useRoleStyles()
  const treatment = roleStyles[message.role]
  return (
    <View
      style={[
        roleStyles.base,
        treatment.bubble,
        { alignSelf: treatment.alignSelf },
        styleOverrides?.messageBubble,
      ]}
      testID={`chat.message.${message.id}`}
    >
      <ContentRenderer
        parts={message.contentParts}
        messageId={message.id}
        onLinkPress={onLinkPress}
        onCopyCode={onCopyCode}
        textStyle={treatment.text}
        contentRenderers={contentRenderers}
        markdownElementRenderers={markdownElementRenderers}
        markdownRenderer={markdownRenderer}
      />
      {messageActions && messageActions.length > 0 && onMessageAction && (
        <ActionMenu
          actions={messageActions}
          message={message}
          onAction={onMessageAction}
          icons={icons}
          styleOverrides={styleOverrides}
        />
      )}
    </View>
  )
}
