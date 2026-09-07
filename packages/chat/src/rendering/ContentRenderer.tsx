import { Text, View, type StyleProp, type TextStyle } from 'react-native'
import type { ContentPart } from '../types'
import type { ContentTypeKey } from '../theme/types'
import { MarkdownText, type MarkdownTextProps } from './MarkdownText'
import { PlainText } from './PlainText'

export interface ContentPartRendererProps {
  part: ContentPart
  index: number
  messageId: string
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  textStyle?: StyleProp<TextStyle>
}

export interface ContentRendererProps {
  parts: readonly ContentPart[]
  messageId: string
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  textStyle?: StyleProp<TextStyle>
  contentRenderers?: Partial<Record<ContentTypeKey, React.ComponentType<ContentPartRendererProps>>>
  markdownElementRenderers?: MarkdownTextProps['markdownElementRenderers']
  markdownRenderer?: MarkdownTextProps['markdownRenderer']
}

function partKey(part: ContentPart): ContentTypeKey | undefined {
  if (part.kind === 'text' && (part.format === 'plain' || part.format === 'markdown')) {
    return `text.${part.format}` as ContentTypeKey
  }
  return undefined
}

function ContentPartRenderer({
  part,
  index,
  messageId,
  onLinkPress,
  onCopyCode,
  textStyle,
  contentRenderers,
  markdownElementRenderers,
  markdownRenderer,
}: ContentPartRendererProps & {
  contentRenderers?: ContentRendererProps['contentRenderers']
  markdownElementRenderers?: MarkdownTextProps['markdownElementRenderers']
  markdownRenderer?: MarkdownTextProps['markdownRenderer']
}) {
  const key = partKey(part)
  const CustomRenderer = key ? contentRenderers?.[key] : undefined
  if (CustomRenderer) {
    return (
      <CustomRenderer
        key={`${messageId}:${index}`}
        part={part}
        index={index}
        messageId={messageId}
        onLinkPress={onLinkPress}
        onCopyCode={onCopyCode}
        textStyle={textStyle}
      />
    )
  }
  if (part.kind === 'text' && part.format === 'markdown') {
    return (
      <MarkdownText
        key={`${messageId}:${index}:markdown`}
        part={part}
        messageId={messageId}
        onLinkPress={onLinkPress}
        onCopyCode={onCopyCode}
        textStyle={textStyle}
        markdownElementRenderers={markdownElementRenderers}
        markdownRenderer={markdownRenderer}
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
  contentRenderers,
  markdownElementRenderers,
  markdownRenderer,
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
          contentRenderers={contentRenderers}
          markdownElementRenderers={markdownElementRenderers}
          markdownRenderer={markdownRenderer}
        />
      ))}
    </View>
  )
}
