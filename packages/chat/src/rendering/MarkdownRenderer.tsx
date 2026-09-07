import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { Renderer } from 'react-native-marked'
import { CodeBlock } from './CodeBlock'

export interface MarkdownRendererOptions {
  onLinkPress?: (href: string) => void
  onCopyCode?: (code: string, language: string | undefined) => void
  messageId: string
}

/**
 * react-native-marked's Renderer subclass for this component's invariants:
 * - fenced code renders through CodeBlock (selectable, h-scroll, copy control)
 * - images render nothing (remote images are not loaded, FR-007)
 * - links invoke onLinkPress and never navigate internally (FR-012)
 * - raw HTML stays the base class's plain-text rendering (FR-006)
 */
export class MarkdownRenderer extends Renderer {
  private readonly options: MarkdownRendererOptions
  private codeIndex = 0

  constructor(options: MarkdownRendererOptions) {
    super()
    this.options = options
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

  override image(): ReactNode {
    return null
  }

  override linkImage(): ReactNode {
    return null
  }

  override link(children: string | ReactNode[], href: string): ReactNode {
    const { onLinkPress } = this.options
    if (!onLinkPress) {
      return <>{children}</>
    }
    return (
      <Text
        onPress={() => onLinkPress(href)}
        style={{ textDecorationLine: 'underline', color: '#2563eb' }}
      >
        {children}
      </Text>
    )
  }
}