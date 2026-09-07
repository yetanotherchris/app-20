import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContentRenderer } from './ContentRenderer'
import type { ContentPart } from '../types'

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
  mockUseMarkdown.mockClear()
})

describe('ContentRenderer', () => {
  it('renders a markdown part through MarkdownText', () => {
    const parts: readonly ContentPart[] = [{ kind: 'text', format: 'markdown', text: '**bold**' }]
    render(<ContentRenderer parts={parts} messageId="m1" />)
    expect(mockUseMarkdown).toHaveBeenCalledTimes(1)
    expect(mockUseMarkdown.mock.calls[0]?.[0]).toBe('**bold**')
  })

  it('renders a plain part without parsing', () => {
    const parts: readonly ContentPart[] = [{ kind: 'text', format: 'plain', text: '**not bold**' }]
    render(<ContentRenderer parts={parts} messageId="m1" />)
    expect(mockUseMarkdown).not.toHaveBeenCalled()
    expect(screen.getByText('**not bold**')).toBeInTheDocument()
  })

  it('renders an unknown content kind through the fallback as inert text', () => {
    const parts = [{ kind: 'image', text: 'image bytes' }] as unknown as readonly ContentPart[]
    render(<ContentRenderer parts={parts} messageId="m1" />)
    expect(mockUseMarkdown).not.toHaveBeenCalled()
    // Fallback renders inert plain text of the part; no crash, no parsed markup.
    expect(screen.getByText('image bytes')).toBeInTheDocument()
  })
})
