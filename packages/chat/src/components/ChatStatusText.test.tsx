import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatStatusText } from './ChatStatusText'

describe('ChatStatusText', () => {
  it('renders nothing when idle', () => {
    render(<ChatStatusText status="idle" />)
    expect(screen.queryByTestId(/chat.status/)).not.toBeInTheDocument()
  })

  it('labels a submitting chat', () => {
    render(<ChatStatusText status="submitting" />)
    expect(screen.getByTestId('chat.status.submitting')).toBeInTheDocument()
    expect(screen.getByText('Submitting…')).toBeInTheDocument()
    expect(screen.getByText('↑')).toBeInTheDocument()
  })

  it('labels a streaming chat', () => {
    render(<ChatStatusText status="streaming" />)
    expect(screen.getByTestId('chat.status.streaming')).toBeInTheDocument()
    expect(screen.getByText('Streaming…')).toBeInTheDocument()
    expect(screen.getByText('∿')).toBeInTheDocument()
  })

  it('labels a stopping chat', () => {
    render(<ChatStatusText status="stopping" />)
    expect(screen.getByTestId('chat.status.stopping')).toBeInTheDocument()
    expect(screen.getByText('Stopping…')).toBeInTheDocument()
    expect(screen.getByText('■')).toBeInTheDocument()
  })

  it('labels an error chat', () => {
    render(<ChatStatusText status="error" />)
    expect(screen.getByTestId('chat.status.error')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('⚠')).toBeInTheDocument()
  })
})
