import { useMemo } from 'react'
import { View } from 'react-native'
import { useMarkdown } from 'react-native-marked'
import type { ContentPart } from '../types'
import { MarkdownRenderer } from './MarkdownRenderer'

export interface MarkdownTextProps {
  part: ContentPart
  messageId: string
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  style?: object
}

export function MarkdownText({
  part,
  messageId,
  onLinkPress,
  onCopyCode,
  style,
}: MarkdownTextProps) {
  const text = 'text' in part ? part.text : ''

  // One renderer instance per message keeps code-block indexes stable across
  // streaming updates that change the text.
  const renderer = useMemo(
    () => new MarkdownRenderer({ messageId, onLinkPress, onCopyCode }),
    [messageId, onLinkPress, onCopyCode],
  )

  const elements = useMarkdown(text, { renderer })

  return <View style={style}>{elements}</View>
}
