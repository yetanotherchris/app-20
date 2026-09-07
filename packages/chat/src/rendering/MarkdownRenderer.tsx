import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { Renderer } from 'react-native-marked'
import { CodeBlock } from './CodeBlock'

export interface MarkdownRendererOptions {
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  messageId: string
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
 */
export class MarkdownRenderer extends Renderer {
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

  override code(text: string, language?: string): ReactNode {
    const blockIndex = this.codeIndex++
    return (
      <CodeBlock
        code={text}
        language={language}
        onCopyCode={this.options.onCopyCode}
        testID={`chat.code.${this.options.messageId}.${blockIndex}`}
      />
    )
  }

  override image(_uri: string, _alt?: string): ReactNode {
    return null
  }

  override linkImage(_href: string, _imageUrl: string): ReactNode {
    return null
  }

  override link(children: string | ReactNode[], href: string): ReactNode {
    const { onLinkPress } = this.options
    if (!onLinkPress || !isSafeLink(href)) {
      return <>{children}</>
    }
    return (
      <Text
        accessibilityRole="link"
        onPress={() => onLinkPress(href)}
        style={{ textDecorationLine: 'underline', color: '#2563eb' }}
      >
        {children}
      </Text>
    )
  }
}
