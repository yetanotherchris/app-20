import { useMemo } from 'react'
import {
  Platform,
  View,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
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

  // Body type is token-driven (FR-014): the role text style (color) is merged
  // with the message size, line height, and weight. Heading sizes scale from
  // the body size; strong, em, links, and inline code stay visually distinct
  // (FR-004). The default paragraph padding is replaced by the token gap so
  // paragraph spacing is owned by the theme.
  const base: TextStyle = {
    ...(flatTextStyle ?? {}),
    fontSize: theme.typography.messageTextSize,
    lineHeight: theme.typography.messageLineHeight,
    fontWeight: theme.typography.messageWeight,
  }

  const headingStyle = (scale: number): TextStyle => ({
    ...base,
    fontSize: Math.round(theme.typography.messageTextSize * scale),
    lineHeight: Math.round(theme.typography.messageLineHeight * scale),
    fontWeight: theme.typography.headingWeight,
  })

  const inlineCode: TextStyle = {
    ...base,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    backgroundColor: theme.colors.systemBubble,
    borderRadius: 4,
    paddingHorizontal: 4,
  }

  const elements = useMarkdown(text, {
    renderer,
    styles: {
      text: base,
      paragraph: { paddingVertical: 0, marginBottom: theme.spacing.paragraphGap },
      link: { ...base, fontStyle: 'normal' },
      codespan: inlineCode,
      strong: { ...base, fontWeight: '700' },
      em: { ...base, fontStyle: 'italic' },
      li: base,
      h1: headingStyle(1.5),
      h2: headingStyle(1.3),
      h3: headingStyle(1.15),
      h4: headingStyle(1),
      h5: headingStyle(1),
      h6: headingStyle(1),
    },
  })

  return <View style={style}>{elements}</View>
}
