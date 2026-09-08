import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MessageActions } from './MessageActions'
import type { MessageAction } from '../theme/types'
import type { Message } from '../types'

function message(role: Message['role'] = 'assistant'): Message {
  return {
    id: 'm1',
    role,
    contentParts: [{ kind: 'text', format: 'markdown', text: 'content' }],
    status: 'complete',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

const copyAction: MessageAction = { id: 'copy', label: 'Copy', group: 'A', onAction: () => {} }
const retryAction: MessageAction = { id: 'retry', label: 'Retry', group: 'A', onAction: () => {} }

describe('MessageActions', () => {
  it('renders available actions as a left-aligned row with per-action test ids (US3-A1)', () => {
    render(<MessageActions actions={[copyAction, retryAction]} message={message()} onAction={() => {}} />)
    expect(screen.getByTestId('chat.message-actions')).toBeInTheDocument()
    expect(screen.getByTestId('chat.action.copy')).toBeInTheDocument()
    expect(screen.getByTestId('chat.action.retry')).toBeInTheDocument()
  })

  it('filters actions by availability against the message (FR-007)', () => {
    const conditional: MessageAction = {
      id: 'regenerate',
      label: 'Regenerate',
      group: 'A',
      available: (m: Message) => m.status === 'complete',
      onAction: () => {},
    }
    render(<MessageActions actions={[conditional]} message={message()} onAction={() => {}} />)
    expect(screen.getByTestId('chat.action.regenerate')).toBeInTheDocument()
  })

  it('renders nothing when no action is available (US3-A1)', () => {
    const hidden: MessageAction = {
      id: 'retry',
      label: 'Retry',
      group: 'A',
      available: false,
      onAction: () => {},
    }
    render(<MessageActions actions={[hidden]} message={message()} onAction={() => {}} />)
    expect(screen.queryByTestId('chat.message-actions')).not.toBeInTheDocument()
  })

  it('fires onAction with the action and the message as context', () => {
    const onAction = vi.fn()
    const msg = message()
    render(<MessageActions actions={[copyAction]} message={msg} onAction={onAction} />)
    fireEvent.click(screen.getByTestId('chat.action.copy'))
    expect(onAction).toHaveBeenCalledWith(copyAction, msg)
  })
})