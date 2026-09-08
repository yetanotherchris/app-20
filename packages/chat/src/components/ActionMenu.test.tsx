import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ActionMenu } from './ActionMenu'
import { ThemeProvider } from '../theme/ThemeContext'
import type { Message } from '../types'
import type { MessageAction } from '../theme/types'

function message(id: string): Message {
  return {
    id,
    role: 'assistant',
    contentParts: [{ kind: 'text', format: 'plain', text: `content ${id}` }],
    status: 'complete',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

const actions: readonly MessageAction[] = [
  { id: 'copy', label: 'Copy', group: 'Actions', onAction: vi.fn() },
  { id: 'retry', label: 'Retry', group: 'Response', onAction: vi.fn() },
]

describe('ActionMenu', () => {
  it('renders no affordance when no actions are available (edge case)', () => {
    render(<ActionMenu actions={[]} message={message('a')} onAction={vi.fn()} />)
    expect(screen.queryByTestId('chat.action-menu')).not.toBeInTheDocument()
  })

  it('groups available actions and fires with the message as context (FR-009)', () => {
    const onAction = vi.fn()
    const msg = message('a')
    render(<ActionMenu actions={actions} message={msg} onAction={onAction} />)
    fireEvent.click(screen.getByTestId('chat.action-menu'))
    // Both group labels and both action items render.
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Response')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('chat.action.copy'))
    expect(onAction).toHaveBeenCalledWith(actions[0], msg)
  })

  it('hides actions whose availability predicate returns false for the message', () => {
    const withUnavailable: readonly MessageAction[] = [
      { id: 'copy', label: 'Copy', group: 'Actions', available: () => true, onAction: vi.fn() },
      {
        id: 'delete',
        label: 'Delete',
        group: 'Actions',
        available: () => false,
        onAction: vi.fn(),
      },
    ]
    render(<ActionMenu actions={withUnavailable} message={message('a')} onAction={vi.fn()} />)
    fireEvent.click(screen.getByTestId('chat.action-menu'))
    expect(screen.getByTestId('chat.action.copy')).toBeInTheDocument()
    expect(screen.queryByTestId('chat.action.delete')).not.toBeInTheDocument()
  })

  it('moves keyboard focus into the menu when it opens (FR-003)', async () => {
    render(<ActionMenu actions={actions} message={message('a')} onAction={vi.fn()} />)
    fireEvent.click(screen.getByTestId('chat.action-menu'))
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('chat.action.copy'))
    })
  })

  it('opens and fires actions under reduced motion', async () => {
    const onAction = vi.fn()
    render(
      <ThemeProvider reducedMotion>
        <ActionMenu actions={actions} message={message('a')} onAction={onAction} />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByTestId('chat.action-menu'))
    await waitFor(() => {
      expect(screen.getByTestId('chat.action.copy')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('chat.action.copy'))
    expect(onAction).toHaveBeenCalledWith(actions[0], message('a'))
  })
})
