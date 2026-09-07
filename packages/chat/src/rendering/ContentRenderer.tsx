import { Text, View, type StyleProp, type TextStyle } from 'react-native'
import type { ContentPart } from '../types'
import { MarkdownText } from './MarkdownText'
import { PlainText } from './PlainText'

export interface ContentRendererProps {
  parts: readonly ContentPart[]
  messageId: string
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  textStyle?: StyleProp<TextStyle>
}

interface ContentPartProps {
  part: ContentPart
  index: number
  messageId: string
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  textStyle?: StyleProp<TextStyle>
}

function ContentPartRenderer({
  part,
  index,
  messageId,
  onLinkPress,
  onCopyCode,
  textStyle,
}: ContentPartProps) {
  if (part.kind === 'text' && part.format === 'markdown') {
    return (
      <MarkdownText
        key={`${messageId}:${index}:markdown`}
        part={part}
        messageId={messageId}
        onLinkPress={onLinkPress}
        onCopyCode={onCopyCode}
        textStyle={textStyle}
      />
    )
  }
  if (part.kind === 'text' && part.format === 'plain') {
    return <PlainText key={`${messageId}:${index}:plain`} part={part} style={textStyle} />
  }
  // Unsupported content types render as inert plain text (FR-009).
  return (
    <Text key={`${messageId}:${index}:fallback`} selectable style={textStyle}>
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
      {parts.map((part, index) => (
        <ContentPartRenderer
          key={`${messageId}:${index}`}
          part={part}
          index={index}
          messageId={messageId}
          onLinkPress={onLinkPress}
          onCopyCode={onCopyCode}
          textStyle={textStyle}
        />
      ))}
    </View>
  )
}
