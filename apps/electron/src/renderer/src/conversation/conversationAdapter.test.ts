import { describe, expect, it } from 'vitest'
import type { Message } from 'app-20-llmchat'
import type { Conversation } from '@app-20/conversation-storage'
import { fromConversation, toConversation, type ConversationDraft } from './conversationAdapter'

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    role: 'user',
    contentParts: [{ kind: 'text', format: 'plain', text: 'hello' }],
    status: 'complete',
    createdAt: '2026-09-10T12:00:00.000Z',
    ...overrides,
  }
}

function draft(messages: Message[], overrides: Partial<ConversationDraft> = {}): ConversationDraft {
  return {
    id: 'c1',
    createdAt: '2026-09-10T12:00:00.000Z',
    model: '',
    messages,
    draft: '',
    ...overrides,
  }
}

function storedMessage(overrides: Partial<Conversation['messages'][number]> = {}) {
  return {
    id: 'm1',
    role: 'user' as const,
    content: 'stored',
    createdAt: '2026-09-10T12:00:00.000Z',
    status: 'complete' as const,
    ...overrides,
  }
}

function conversation(messages: Conversation['messages']): Conversation {
  return {
    id: 'c1',
    title: 'title',
    model: '',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:05:00.000Z',
    messages,
  }
}

describe('toConversation', () => {
  it('derives the title from the first user prompt and truncates it to 80 characters', () => {
    const text = 'x'.repeat(120)
    const result = toConversation(
      draft([message({ contentParts: [{ kind: 'text', format: 'plain', text }] })]),
    )
    expect(result.title).toBe('x'.repeat(80))
  })

  it('normalises a transient status', () => {
    const result = toConversation(draft([message({ status: 'streaming' })]))
    expect(result.messages[0]?.status).toBe('complete')
  })

  it('carries base-only messages and optional fields through a save', () => {
    const base = conversation([
      storedMessage({ metadata: { pinned: true }, parentId: 'p0', error: 'old' }),
      storedMessage({ id: 't1', role: 'tool', content: 'tool output' }),
    ])
    const result = toConversation(
      draft([
        message({ id: 'm1', contentParts: [{ kind: 'text', format: 'plain', text: 'new' }] }),
      ]),
      base,
    )

    const carried = result.messages.find((entry) => entry.id === 'm1')
    expect(carried?.content).toBe('new')
    expect(carried?.metadata).toEqual({ pinned: true })
    expect(carried?.parentId).toBe('p0')
    expect(carried?.error).toBe('old')
    expect(result.messages.some((entry) => entry.id === 't1')).toBe(true)
    expect(result.createdAt).toBe(base.createdAt)
  })

  it('appends new messages after the base order', () => {
    const base = conversation([storedMessage({ id: 'old' })])
    const result = toConversation(
      draft([
        message({ id: 'old' }),
        message({ id: 'new', createdAt: '2026-09-10T12:10:00.000Z' }),
      ]),
      base,
    )
    expect(result.messages.map((entry) => entry.id)).toEqual(['old', 'new'])
  })
})

describe('fromConversation', () => {
  it('maps stored messages and skips the reserved tool role', () => {
    const result = fromConversation(
      conversation([
        storedMessage({ id: 't1', role: 'tool', content: 'tool output' }),
        storedMessage({ id: 'm2', role: 'assistant', content: 'hi' }),
      ]),
    )
    expect(result.map((entry) => entry.id)).toEqual(['m2'])
    expect(result[0]?.contentParts[0]?.text).toBe('hi')
  })
})
