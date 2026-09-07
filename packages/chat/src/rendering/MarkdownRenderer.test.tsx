import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MarkdownRenderer } from './MarkdownRenderer'

vi.mock('react-native-marked', () => ({
  Renderer: class MockRenderer {
    getKey(): string {
      return 'mock-key'
    }
  },
}))

describe('MarkdownRenderer', () => {
  it('renders fenced code through a CodeBlock with a copy control', () => {
    const onCopyCode = vi.fn()
    const renderer = new MarkdownRenderer({ messageId: 'm1', onCopyCode })
    render(<div>{renderer.code('const a = 1', 'js')}</div>)
    expect(screen.getByText('const a = 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /copy code/i }))
    expect(onCopyCode).toHaveBeenCalledWith('const a = 1', 'js')
  })

  it('renders nothing for images (remote images not loaded)', () => {
    const renderer = new MarkdownRenderer({ messageId: 'm1' })
    expect(renderer.image('https://example.com/x.png', 'alt')).toBeNull()
    expect(renderer.linkImage('https://example.com/x.png', 'https://example.com/y.png')).toBeNull()
  })

  it('delegates safe links to onLinkPress and renders children', () => {
    const onLinkPress = vi.fn()
    const renderer = new MarkdownRenderer({ messageId: 'm1', onLinkPress })
    render(<div>{renderer.link(['example'], 'https://example.com')}</div>)
    fireEvent.click(screen.getByRole('link', { name: 'example' }))
    expect(onLinkPress).toHaveBeenCalledWith('https://example.com')
  })

  it('renders javascript: links inert without invoking onLinkPress', () => {
    const onLinkPress = vi.fn()
    const renderer = new MarkdownRenderer({ messageId: 'm1', onLinkPress })
    const { container } = render(<div>{renderer.link(['bad'], 'javascript:alert(1)')}</div>)
    fireEvent.click(container.firstChild as HTMLElement)
    expect(onLinkPress).not.toHaveBeenCalled()
  })

  it('renders children as text when onLinkPress is absent', () => {
    const renderer = new MarkdownRenderer({ messageId: 'm1' })
    render(<div>{renderer.link(['plain'], 'https://example.com')}</div>)
    expect(screen.getByText('plain')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('keeps code block indexes stable across reset()', () => {
    const renderer = new MarkdownRenderer({ messageId: 'm1' })
    renderer.code('a', 'js')
    renderer.code('b', 'js')
    renderer.reset()
    render(<div>{renderer.code('c', 'js')}</div>)
    expect(screen.getByTestId('chat.code.m1.0')).toBeInTheDocument()
  })
})
