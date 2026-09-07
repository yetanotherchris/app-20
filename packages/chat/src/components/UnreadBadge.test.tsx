import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UnreadBadge } from './UnreadBadge'

describe('UnreadBadge', () => {
  it('renders the count with a stable test id', () => {
    render(<UnreadBadge count={3} />)
    expect(screen.getByTestId('chat.unread-badge')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
