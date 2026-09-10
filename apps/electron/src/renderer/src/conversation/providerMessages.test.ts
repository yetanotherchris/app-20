import { describe, expect, it } from 'vitest'
import type { Message } from 'app-20-llmchat'
import { toProviderMessages, toProviderRequestMessages } from './providerMessages'

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

describe('toProviderMessages', () => {
  it('maps roles and joins text parts', () => {
    const result = toProviderMessages([
      message({
        id: 'u1',
        role: 'user',
        contentParts: [{ kind: 'text', format: 'plain', text: 'hi' }],
      }),
      message({
        id: 'a1',
        role: 'assistant',
        contentParts: [{ kind: 'text', format: 'markdown', text: 'there' }],
      }),
    ])
    expect(result).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'there' },
    ])
  })

  it('drops the excluded id and empty content', () => {
    const result = toProviderMessages(
      [
        message({ id: 'u1', contentParts: [{ kind: 'text', format: 'plain', text: 'hi' }] }),
        message({
          id: 'a1',
          role: 'assistant',
          contentParts: [{ kind: 'text', format: 'markdown', text: '' }],
        }),
      ],
      'a1',
    )
    expect(result).toEqual([{ role: 'user', content: 'hi' }])
  })
})

describe('toProviderRequestMessages', () => {
  it('appends the submit prompt to the prior history', () => {
    const history = [
      message({ id: 'u0', contentParts: [{ kind: 'text', format: 'plain', text: 'first' }] }),
    ]
    const result = toProviderRequestMessages(history, {
      kind: 'submit',
      prompt: 'second',
      messageId: 'a1',
    })
    expect(result).toEqual([
      { role: 'user', content: 'first' },
      { role: 'user', content: 'second' },
    ])
  })

  it('excludes the regenerated assistant and does not append on retry', () => {
    const history = [
      message({ id: 'u1', contentParts: [{ kind: 'text', format: 'plain', text: 'question' }] }),
      message({
        id: 'a1',
        role: 'assistant',
        contentParts: [{ kind: 'text', format: 'markdown', text: 'partial answer' }],
        status: 'error',
      }),
    ]
    const result = toProviderRequestMessages(history, {
      kind: 'retry',
      prompt: 'question',
      messageId: 'a1',
    })
    expect(result).toEqual([{ role: 'user', content: 'question' }])
  })
})
