import { useMemo } from 'react'
import { View, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { useMarkdown } from 'react-native-marked'
import type { ContentPart } from '../types'
import { MarkdownRenderer } from './MarkdownRenderer'

export interface MarkdownTextProps {
  part: ContentPart
  messageId: string
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
}

export function MarkdownText({
  part,
  messageId,
  onLinkPress,
  onCopyCode,
  style,
  textStyle,
}: MarkdownTextProps) {
  const text = part.text

  // One renderer instance per message keeps the callback wiring stable; reset()
  // re-bases the per-parse block counter so streaming updates keep stable
  // code-block test ids instead of drifting.
  const renderer = useMemo(
    () => new MarkdownRenderer({ messageId, onLinkPress, onCopyCode }),
    [messageId, onLinkPress, onCopyCode],
  )
  renderer.reset()

  const flatTextStyle = textStyle ? StyleSheet.flatten(textStyle) : undefined

  const elements = useMarkdown(text, {
    renderer,
    styles: {
      text: flatTextStyle,
      link: flatTextStyle,
      codespan: flatTextStyle,
      strong: flatTextStyle,
      em: flatTextStyle,
      li: flatTextStyle,
      h1: flatTextStyle,
      h2: flatTextStyle,
      h3: flatTextStyle,
      h4: flatTextStyle,
      h5: flatTextStyle,
      h6: flatTextStyle,
    },
  })

  return <View style={style}>{elements}</View>
}
