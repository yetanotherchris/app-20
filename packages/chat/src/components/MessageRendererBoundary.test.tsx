import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageRendererBoundary } from './MessageRendererBoundary'
import type { Message } from '../types'

function message(id: string): Message {
  return {
    id,
    role: 'assistant',
    contentParts: [{ kind: 'text', format: 'plain', text: `content ${id}` }],
    status: 'complete',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('MessageRendererBoundary', () => {
  it('renders through the custom renderer when it does not throw', () => {
    render(
      <MessageRendererBoundary
        message={message('a')}
        renderMessage={(m) => <div data-testid={`custom.${m.id}`}>{m.contentParts[0]?.text}</div>}
        renderFallback={(m) => <div data-testid={`fallback.${m.id}`} />}
      />,
    )
    expect(screen.getByTestId('custom.a')).toBeInTheDocument()
    expect(screen.queryByTestId('fallback.a')).not.toBeInTheDocument()
  })

  it('falls back to the default renderer for that message when the custom renderer throws (FR-011)', () => {
    render(
      <MessageRendererBoundary
        message={message('a')}
        renderMessage={() => {
          throw new Error('custom renderer exploded')
        }}
        renderFallback={(m) => (
          <div data-testid={`fallback.${m.id}`}>{m.contentParts[0]?.text}</div>
        )}
      />,
    )
    expect(screen.getByTestId('fallback.a')).toBeInTheDocument()
  })

  it('resets the failure state when a new message arrives', () => {
    const { rerender } = render(
      <MessageRendererBoundary
        message={message('a')}
        renderMessage={() => {
          throw new Error('boom')
        }}
        renderFallback={(m) => <div data-testid={`fallback.${m.id}`} />}
      />,
    )
    expect(screen.getByTestId('fallback.a')).toBeInTheDocument()
    rerender(
      <MessageRendererBoundary
        message={message('b')}
        renderMessage={(m) => <div data-testid={`custom.${m.id}`} />}
        renderFallback={(m) => <div data-testid={`fallback.${m.id}`} />}
      />,
    )
    expect(screen.getByTestId('custom.b')).toBeInTheDocument()
  })
})
