import type { ReactNode } from 'react'
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native'
import { Text } from 'react-native'
import { Renderer, type RendererInterface } from 'react-native-marked'
import { CodeBlock } from './CodeBlock'

export type MarkdownElementName =
  | 'paragraph'
  | 'blockquote'
  | 'heading'
  | 'code'
  | 'hr'
  | 'listItem'
  | 'list'
  | 'escape'
  | 'link'
  | 'image'
  | 'strong'
  | 'em'
  | 'codespan'
  | 'br'
  | 'del'
  | 'text'
  | 'html'
  | 'linkImage'
  | 'table'

/**
 * A per-element override map. Each entry replaces the default handling for
 * that Markdown element; elements without an entry keep the default behavior
 * (FR-006). The signatures match react-native-marked's RendererInterface.
 */
export interface MarkdownElementRenderers {
  paragraph?: (children: ReactNode[], styles?: ViewStyle) => ReactNode
  blockquote?: (children: ReactNode[], styles?: ViewStyle) => ReactNode
  heading?: (text: string | ReactNode[], styles?: TextStyle, depth?: number) => ReactNode
  code?: (
    text: string,
    language?: string,
    containerStyle?: ViewStyle,
    textStyle?: TextStyle,
  ) => ReactNode
  hr?: (styles?: ViewStyle) => ReactNode
  listItem?: (children: ReactNode[], styles?: ViewStyle) => ReactNode
  list?: (
    ordered: boolean,
    li: ReactNode[],
    listStyle?: ViewStyle,
    textStyle?: TextStyle,
    startIndex?: number,
  ) => ReactNode
  escape?: (text: string, styles?: TextStyle) => ReactNode
  link?: (
    children: string | ReactNode[],
    href: string,
    styles?: TextStyle,
    title?: string,
  ) => ReactNode
  image?: (uri: string, alt?: string, style?: ImageStyle, title?: string) => ReactNode
  strong?: (children: string | ReactNode[], styles?: TextStyle) => ReactNode
  em?: (children: string | ReactNode[], styles?: TextStyle) => ReactNode
  codespan?: (text: string, styles?: TextStyle) => ReactNode
  br?: () => ReactNode
  del?: (children: string | ReactNode[], styles?: TextStyle) => ReactNode
  text?: (text: string | ReactNode[], styles?: TextStyle) => ReactNode
  html?: (text: string | ReactNode[], styles?: TextStyle) => ReactNode
  linkImage?: (
    href: string,
    imageUrl: string,
    alt?: string,
    style?: ImageStyle,
    title?: string | null,
  ) => ReactNode
  table?: (
    header: ReactNode[][],
    rows: ReactNode[][][],
    tableStyle?: ViewStyle,
    rowStyle?: ViewStyle,
    cellStyle?: ViewStyle,
  ) => ReactNode
}

export interface MarkdownRendererOptions {
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  messageId: string
  linkColor?: string
  elementRenderers?: MarkdownElementRenderers
  icons?: Partial<Record<'copy', React.ReactNode>>
}

function isSafeLink(href: string): boolean {
  const scheme = href.trim().toLowerCase()
  return scheme.startsWith('http:') || scheme.startsWith('https:') || scheme.startsWith('#')
}

/**
 * react-native-marked's Renderer subclass for this component's invariants:
 * - fenced code renders through CodeBlock (selectable, h-scroll, copy control)
 * - images render nothing (remote images are not loaded, FR-007)
 * - links invoke onLinkPress only for safe schemes and never navigate
 *   internally; `javascript:` and other non-http links are inert (FR-008,
 *   FR-012)
 * - raw HTML stays the base class's plain-text rendering (FR-006)
 * - each element method consults a host-supplied override map first, so a
 *   host can replace one element while defaults apply elsewhere (FR-006)
 */
export class MarkdownRenderer extends Renderer implements RendererInterface {
  private readonly options: MarkdownRendererOptions
  private codeIndex = 0

  constructor(options: MarkdownRendererOptions) {
    super()
    this.options = options
  }

  get messageId(): string {
    return this.options.messageId
  }

  /** Resets the per-parse block counter so streaming re-parses keep stable test ids. */
  reset(): void {
    this.codeIndex = 0
  }

  override code(
    text: string,
    language?: string,
    containerStyle?: ViewStyle,
    textStyle?: TextStyle,
  ): ReactNode {
    const { elementRenderers, onCopyCode, icons, messageId } = this.options
    if (elementRenderers?.code) {
      return elementRenderers.code(text, language, containerStyle, textStyle)
    }
    const blockIndex = this.codeIndex++
    return (
      <CodeBlock
        code={text}
        language={language}
        onCopyCode={onCopyCode}
        icons={icons}
        testID={`chat.code.${messageId}.${blockIndex}`}
      />
    )
  }

  override image(_uri: string, _alt?: string, style?: ImageStyle, title?: string): ReactNode {
    return this.options.elementRenderers?.image?.(_uri, _alt, style, title) ?? null
  }

  override linkImage(
    _href: string,
    _imageUrl: string,
    _alt?: string,
    style?: ImageStyle,
    title?: string | null,
  ): ReactNode {
    return this.options.elementRenderers?.linkImage?.(_href, _imageUrl, _alt, style, title) ?? null
  }

  override link(
    children: string | ReactNode[],
    href: string,
    styles?: TextStyle,
    title?: string,
  ): ReactNode {
    const { elementRenderers, onLinkPress, linkColor } = this.options
    if (elementRenderers?.link) {
      return elementRenderers.link(children, href, styles, title)
    }
    if (!onLinkPress || !isSafeLink(href)) {
      return <>{children}</>
    }
    return (
      <Text
        accessibilityRole="link"
        onPress={() => onLinkPress(href)}
        style={{ textDecorationLine: 'underline', color: linkColor ?? '#2563eb', ...styles }}
      >
        {children}
      </Text>
    )
  }

  override paragraph(children: ReactNode[], styles?: ViewStyle): ReactNode {
    return (
      this.options.elementRenderers?.paragraph?.(children, styles) ??
      super.paragraph(children, styles)
    )
  }

  override blockquote(children: ReactNode[], styles?: ViewStyle): ReactNode {
    return (
      this.options.elementRenderers?.blockquote?.(children, styles) ??
      super.blockquote(children, styles)
    )
  }

  override heading(text: string | ReactNode[], styles?: TextStyle, depth?: number): ReactNode {
    return (
      this.options.elementRenderers?.heading?.(text, styles, depth) ?? super.heading(text, styles)
    )
  }

  override hr(styles?: ViewStyle): ReactNode {
    return this.options.elementRenderers?.hr?.(styles) ?? super.hr(styles)
  }

  override listItem(children: ReactNode[], styles?: ViewStyle): ReactNode {
    return (
      this.options.elementRenderers?.listItem?.(children, styles) ??
      super.listItem(children, styles)
    )
  }

  override list(
    ordered: boolean,
    li: ReactNode[],
    listStyle?: ViewStyle,
    textStyle?: TextStyle,
    startIndex?: number,
  ): ReactNode {
    return (
      this.options.elementRenderers?.list?.(ordered, li, listStyle, textStyle, startIndex) ??
      super.list(ordered, li, listStyle, textStyle, startIndex)
    )
  }

  override escape(text: string, styles?: TextStyle): ReactNode {
    return this.options.elementRenderers?.escape?.(text, styles) ?? super.escape(text, styles)
  }

  override strong(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    return (
      this.options.elementRenderers?.strong?.(children, styles) ?? super.strong(children, styles)
    )
  }

  override em(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.options.elementRenderers?.em?.(children, styles) ?? super.em(children, styles)
  }

  override codespan(text: string, styles?: TextStyle): ReactNode {
    return this.options.elementRenderers?.codespan?.(text, styles) ?? super.codespan(text, styles)
  }

  override br(): ReactNode {
    return this.options.elementRenderers?.br?.() ?? super.br()
  }

  override del(children: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.options.elementRenderers?.del?.(children, styles) ?? super.del(children, styles)
  }

  override text(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.options.elementRenderers?.text?.(text, styles) ?? super.text(text, styles)
  }

  override html(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    return this.options.elementRenderers?.html?.(text, styles) ?? super.html(text, styles)
  }

  override table(
    header: ReactNode[][],
    rows: ReactNode[][][],
    tableStyle?: ViewStyle,
    rowStyle?: ViewStyle,
    cellStyle?: ViewStyle,
  ): React.ReactNode {
    return (
      this.options.elementRenderers?.table?.(header, rows, tableStyle, rowStyle, cellStyle) ??
      super.table(header, rows, tableStyle, rowStyle, cellStyle)
    )
  }
}
