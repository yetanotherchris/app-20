import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UnreadBadge } from './UnreadBadge'

describe('UnreadBadge', () => {
  it('renders the count with a stable test id', () => {
    render(<UnreadBadge count={3} />)
    expect(screen.getByTestId('chat.unread-badge')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('uses a minimum height with padding instead of a fixed height (FR-005, T025)', () => {
    render(<UnreadBadge count={1234} />)
    const badge = screen.getByTestId('chat.unread-badge')
    const style = getComputedStyle(badge)
    // Grows with text: no fixed pixel height that would clip a large count.
    expect(style.height).not.toMatch(/px/)
    // Guaranteed floor target.
    expect(parseFloat(style.minHeight)).toBeGreaterThanOrEqual(24)
  })
})
