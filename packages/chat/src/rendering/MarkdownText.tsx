import { useMemo } from 'react'
import { View, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { useMarkdown, type RendererInterface } from 'react-native-marked'
import type { ContentPart } from '../types'
import { useTheme } from '../theme/ThemeContext'
import { MarkdownRenderer, type MarkdownElementRenderers } from './MarkdownRenderer'

export interface MarkdownTextProps {
  part: ContentPart
  messageId: string
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  linkColor?: string
  markdownElementRenderers?: MarkdownElementRenderers
  markdownRenderer?: RendererInterface
  icons?: Partial<Record<'copy', React.ReactNode>>
}

export function MarkdownText({
  part,
  messageId,
  onLinkPress,
  onCopyCode,
  style,
  textStyle,
  linkColor,
  markdownElementRenderers,
  markdownRenderer,
  icons,
}: MarkdownTextProps) {
  const text = part.text
  const { theme } = useTheme()

  // The link color comes from the theme token by default so no surface
  // hardcodes a color (SC-001); a host-supplied linkColor wins over it.
  const resolvedLinkColor = linkColor ?? theme.colors.primary

  // One renderer instance per message keeps the callback wiring stable; reset()
  // re-bases the per-parse block counter so streaming updates keep stable
  // code-block test ids instead of drifting. A host-supplied full renderer
  // replaces the default entirely (FR-006) and must re-apply the safety
  // invariants itself: no remote images, no raw HTML execution, and link
  // activation restricted to safe schemes (FR-007/008/012).
  const renderer = useMemo(() => {
    if (markdownRenderer) return markdownRenderer
    return new MarkdownRenderer({
      messageId,
      onLinkPress,
      onCopyCode,
      linkColor: resolvedLinkColor,
      elementRenderers: markdownElementRenderers,
      icons,
    })
  }, [
    messageId,
    onLinkPress,
    onCopyCode,
    resolvedLinkColor,
    markdownElementRenderers,
    markdownRenderer,
    icons,
  ])
  if (renderer instanceof MarkdownRenderer) {
    renderer.reset()
  }

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
