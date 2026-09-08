import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageStatusBadge } from './MessageStatusBadge'

describe('MessageStatusBadge', () => {
  it('renders nothing for a complete message', () => {
    render(<MessageStatusBadge status="complete" />)
    expect(screen.queryByTestId(/chat.message-status/)).not.toBeInTheDocument()
  })

  it('labels a streaming message without relying on color', () => {
    render(<MessageStatusBadge status="streaming" />)
    expect(screen.getByTestId('chat.message-status.streaming')).toBeInTheDocument()
    expect(screen.getByText('Streaming')).toBeInTheDocument()
    expect(screen.getByText('∿')).toBeInTheDocument()
  })

  it('labels a stopped message', () => {
    render(<MessageStatusBadge status="stopped" />)
    expect(screen.getByTestId('chat.message-status.stopped')).toBeInTheDocument()
    expect(screen.getByText('Stopped')).toBeInTheDocument()
    expect(screen.getByText('■')).toBeInTheDocument()
  })

  it('labels an error message', () => {
    render(<MessageStatusBadge status="error" />)
    expect(screen.getByTestId('chat.message-status.error')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('labels queued and sending messages', () => {
    render(
      <>
        <MessageStatusBadge status="queued" />
        <MessageStatusBadge status="sending" />
      </>,
    )
    expect(screen.getByText('Queued')).toBeInTheDocument()
    expect(screen.getByText('Sending')).toBeInTheDocument()
    expect(screen.getByText('◷')).toBeInTheDocument()
    expect(screen.getByText('↑')).toBeInTheDocument()
  })
})
