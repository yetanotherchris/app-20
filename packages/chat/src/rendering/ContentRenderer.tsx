import { Text, View } from 'react-native'
import type { ContentPart } from '../types'
import { MarkdownText } from './MarkdownText'
import { PlainText } from './PlainText'

export interface ContentRendererProps {
  parts: readonly ContentPart[]
  messageId: string
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  textStyle?: object
}

function renderPart(
  part: ContentPart,
  messageId: string,
  onLinkPress?: (href: string) => void,
  onCopyCode?: (code: string, language: string | undefined) => void,
  textStyle?: object,
) {
  if (part.kind === 'text' && part.format === 'markdown') {
    return (
      <MarkdownText
        key={`${messageId}:${part.text.slice(0, 24)}`}
        part={part}
        messageId={messageId}
        onLinkPress={onLinkPress}
        onCopyCode={onCopyCode}
      />
    )
  }
  if (part.kind === 'text' && part.format === 'plain') {
    return <PlainText key={`${messageId}:plain`} part={part} style={textStyle} />
  }
  // Unsupported content types render as inert plain text (FR-009).
  return (
    <Text key={`${messageId}:fallback`} selectable style={textStyle}>
      {'text' in part ? part.text : ''}
    </Text>
  )
}

export function ContentRenderer({
  parts,
  messageId,
  onLinkPress,
  onCopyCode,
  textStyle,
}: ContentRendererProps) {
  return (
    <View>
      {parts.map((part) => renderPart(part, messageId, onLinkPress, onCopyCode, textStyle))}
    </View>
  )
}
