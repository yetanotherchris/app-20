import { describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import type { Message } from '../types'
import { useMessageFocusPreservation } from './useMessageFocusPreservation'

function message(id: string): Message {
  return {
    id,
    role: 'assistant',
    contentParts: [{ kind: 'text', format: 'plain', text: id }],
    status: 'complete',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function Host({
  messages,
  withComposer = false,
}: {
  messages: readonly Message[]
  withComposer?: boolean
}) {
  useMessageFocusPreservation(messages)
  return (
    <div>
      <div data-testid="chat.message-list">
        {messages.map((m) => (
          <div key={m.id} data-testid={`chat.message.${m.id}`} tabIndex={0}>
            {m.id}
          </div>
        ))}
      </div>
      {withComposer && <input data-testid="chat.composer.input" />}
    </div>
  )
}

function rowById(id: string): HTMLElement {
  const el = document.querySelector(`[data-testid="chat.message.${id}"]`)
  if (!(el instanceof HTMLElement)) throw new Error(`row ${id} not found`)
  return el
}

describe('useMessageFocusPreservation', () => {
  it('restores focus to the nearest row when the focused message is removed', () => {
    const { rerender } = render(<Host messages={[message('a'), message('b')]} />)
    act(() => rowById('a').focus())
    expect(document.activeElement).toBe(rowById('a'))

    rerender(<Host messages={[message('b')]} />)
    expect(document.activeElement).toBe(rowById('b'))
  })

  it('restores focus to the row after the removed message when it was last in the list', () => {
    const { rerender } = render(<Host messages={[message('a'), message('b')]} />)
    act(() => rowById('b').focus())
    expect(document.activeElement).toBe(rowById('b'))

    rerender(<Host messages={[message('a')]} />)
    expect(document.activeElement).toBe(rowById('a'))
  })

  it('moves focus to the composer when the list becomes empty', () => {
    const { rerender } = render(<Host messages={[message('a')]} withComposer />)
    act(() => rowById('a').focus())
    expect(document.activeElement).toBe(rowById('a'))

    rerender(<Host messages={[]} withComposer />)
    const input = document.querySelector('[data-testid="chat.composer.input"]')
    expect(document.activeElement).toBe(input)
  })

  it('does not steal focus when the focused message is still present', () => {
    const { rerender } = render(<Host messages={[message('a')]} />)
    act(() => rowById('a').focus())
    expect(document.activeElement).toBe(rowById('a'))

    rerender(<Host messages={[message('a'), message('c')]} />)
    expect(document.activeElement).toBe(rowById('a'))
  })

  it('does not move focus when focus is on a non-row control', () => {
    const { rerender } = render(<Host messages={[message('a'), message('b')]} withComposer />)
    const composer = document.querySelector<HTMLElement>('[data-testid="chat.composer.input"]')
    if (composer) composer.focus()
    rerender(<Host messages={[message('b')]} withComposer />)
    expect(document.activeElement).toBe(composer ?? document.body)
  })
})
