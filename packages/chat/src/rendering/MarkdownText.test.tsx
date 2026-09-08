import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MarkdownText } from './MarkdownText'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { ContentPart } from '../types'

const markdownPart: ContentPart = { kind: 'text', format: 'markdown', text: '# hi\n\n**bold**' }

vi.mock('react-native-marked', () => ({
  Renderer: class MockRenderer {
    options: unknown
    constructor(options?: unknown) {
      this.options = options
    }
  },
  useMarkdown: vi.fn(() => null),
}))

import { useMarkdown } from 'react-native-marked'

const mockUseMarkdown = useMarkdown as ReturnType<typeof vi.fn>

beforeEach(() => {
  mockUseMarkdown.mockReset()
  mockUseMarkdown.mockReturnValue(null)
})

describe('MarkdownText', () => {
  it('parses the part text through useMarkdown', () => {
    render(<MarkdownText part={markdownPart} messageId="m1" />)
    expect(mockUseMarkdown).toHaveBeenCalledTimes(1)
    expect(mockUseMarkdown.mock.calls[0]?.[0]).toBe('# hi\n\n**bold**')
  })

  it('constructs a renderer with messageId and callbacks', () => {
    const onLinkPress = vi.fn()
    const onCopyCode = vi.fn()
    render(
      <MarkdownText
        part={markdownPart}
        messageId="m1"
        onLinkPress={onLinkPress}
        onCopyCode={onCopyCode}
      />,
    )
    const options = mockUseMarkdown.mock.calls[0]?.[1]
    expect(options.renderer).toBeInstanceOf(MarkdownRenderer)
    expect((options.renderer as MarkdownRenderer).messageId).toBe('m1')
  })

  it('returns a stable renderer across re-renders of the same message', () => {
    const { rerender } = render(<MarkdownText part={markdownPart} messageId="m1" />)
    rerender(<MarkdownText part={markdownPart} messageId="m1" />)
    const first = mockUseMarkdown.mock.calls[0]?.[1]?.renderer
    const second = mockUseMarkdown.mock.calls[1]?.[1]?.renderer
    expect(first).toBe(second)
  })

  it('uses a host-supplied full renderer instead of the default (FR-006)', () => {
    const customRenderer = { custom: true } as unknown as React.ComponentProps<
      typeof MarkdownText
    >['markdownRenderer']
    render(<MarkdownText part={markdownPart} messageId="m1" markdownRenderer={customRenderer} />)
    const options = mockUseMarkdown.mock.calls[0]?.[1]
    // The host renderer is passed straight through; the default MarkdownRenderer
    // is not constructed.
    expect(options.renderer).toBe(customRenderer)
    expect(options.renderer).not.toBeInstanceOf(MarkdownRenderer)
  })

  it('uses the theme primary as the default link color (SC-001)', () => {
    render(<MarkdownText part={markdownPart} messageId="m1" />)
    const options = mockUseMarkdown.mock.calls[0]?.[1]
    const renderer = options.renderer as MarkdownRenderer
    // The default renderer resolves its link color from the light theme primary
    // (no surface hardcodes a color, SC-001).
    expect(renderer.linkColor).toBe('#2563eb')
  })

  it('a host-supplied linkColor wins over the theme default', () => {
    render(<MarkdownText part={markdownPart} messageId="m1" linkColor="#ff0000" />)
    const options = mockUseMarkdown.mock.calls[0]?.[1]
    expect((options.renderer as MarkdownRenderer).linkColor).toBe('#ff0000')
  })

  it('drives paragraph, heading, and emphasis styles from theme tokens (FR-004/FR-014)', () => {
    render(<MarkdownText part={markdownPart} messageId="m1" />)
    const options = mockUseMarkdown.mock.calls[0]?.[1]
    const styles = options.styles as Record<string, Record<string, unknown>>
    // Body type comes from the message typography tokens.
    expect(styles.text).toMatchObject({ fontSize: 16, lineHeight: 24, fontWeight: '400' })
    // Paragraph spacing is the token gap, not the library default padding.
    expect(styles.paragraph).toEqual({ paddingVertical: 0, marginBottom: 8 })
    // Hierarchy and emphasis are visible: scaled bold headings, bold strong,
    // italic em.
    expect(styles.h1).toMatchObject({ fontSize: 24, fontWeight: '600' })
    expect(styles.strong).toMatchObject({ fontWeight: '700' })
    expect(styles.em).toMatchObject({ fontStyle: 'italic' })
  })
})
