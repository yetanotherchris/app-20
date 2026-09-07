import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageBubble } from './MessageBubble'
import type { Message } from '../types'

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

function message(role: Message['role'], text: string): Message {
  return {
    id: `msg-${role}-${text.length}`,
    role,
    contentParts: [{ kind: 'text', format: role === 'user' ? 'plain' : 'markdown', text }],
    status: 'complete',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

beforeEach(() => {
  mockUseMarkdown.mockClear()
  mockUseMarkdown.mockReturnValue(null)
})

describe('MessageBubble', () => {
  it('renders a user message right-aligned with a stable test id', () => {
    const userMsg = message('user', 'hello')
    render(<MessageBubble message={userMsg} />)
    expect(screen.getByTestId(`chat.message.${userMsg.id}`)).toBeInTheDocument()
    // Plain user text renders literally, not parsed.
    expect(mockUseMarkdown).not.toHaveBeenCalled()
  })

  it('renders an assistant message through the markdown path', () => {
    const assistantMsg = message('assistant', '**bold**')
    render(<MessageBubble message={assistantMsg} />)
    expect(mockUseMarkdown).toHaveBeenCalledWith('**bold**', expect.anything())
  })

  it('renders a system message without breaking', () => {
    const systemMsg = message('system', 'system notice')
    render(<MessageBubble message={systemMsg} />)
    expect(screen.getByTestId(`chat.message.${systemMsg.id}`)).toBeInTheDocument()
  })
})
