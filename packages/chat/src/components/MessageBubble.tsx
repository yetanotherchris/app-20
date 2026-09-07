import { View } from 'react-native'
import type { Message } from '../types'
import { ContentRenderer } from '../rendering/ContentRenderer'
import { bubbleBaseStyle, roleTreatments } from '../rendering/roleStyles'

export interface MessageBubbleProps {
  message: Message
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
}

export function MessageBubble({ message, onLinkPress, onCopyCode }: MessageBubbleProps) {
  const treatment = roleTreatments[message.role]
  return (
    <View
      style={[bubbleBaseStyle, treatment.bubble, { alignSelf: treatment.alignSelf }]}
      testID={`chat.message.${message.id}`}
    >
      <ContentRenderer
        parts={message.contentParts}
        messageId={message.id}
        onLinkPress={onLinkPress}
        onCopyCode={onCopyCode}
        textStyle={treatment.text}
      />
    </View>
  )
}