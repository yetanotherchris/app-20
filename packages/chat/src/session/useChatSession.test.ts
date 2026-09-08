import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useChatSession } from './useChatSession'
import type { ChatOperation, ChatSession, ChatSessionControls } from './types'

interface CapturedTransport {
  op: ChatOperation
  controls: ChatSessionControls
}

function renderSession(options: Partial<Parameters<typeof useChatSession>[0]> = {}) {
  let captured: CapturedTransport | null = null
  const request = vi.fn((op: ChatOperation, controls: ChatSessionControls) => {
    captured = { op, controls }
  })
  const copyMessageText = vi.fn()
  const rendered = renderHook(() => useChatSession({ request, copyMessageText, ...options }))
  const session = () => rendered.result.current
  return { ...rendered, session, request, copyMessageText, captured: () => captured }
}

function last(session: ChatSession) {
  return session.messages[session.messages.length - 1]
}

describe('useChatSession: streaming (US1)', () => {
  it('submit appends the user message and a sending assistant placeholder', () => {
    const { session, request } = renderSession()
    act(() => session().submit('hello'))
    expect(session().messages).toHaveLength(2)
    expect(session().messages[0]?.role).toBe('user')
    expect(session().messages[0]?.status).toBe('complete')
    expect(session().messages[1]?.role).toBe('assistant')
    expect(session().messages[1]?.status).toBe('sending')
    expect(session().status).toBe('submitting')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('chunks appear incrementally and flip the response to streaming', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hello'))
    act(() => captured()?.controls.appendChunk('Hello'))
    expect(last(session()).status).toBe('streaming')
    expect(last(session()).contentParts[0]?.text).toBe('Hello')
    expect(session().status).toBe('streaming')
    act(() => captured()?.controls.appendChunk(' world'))
    expect(last(session()).contentParts[0]?.text).toBe('Hello world')
  })

  it('partial Markdown is preserved verbatim for the renderer', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    act(() => captured()?.controls.appendChunk('```js\nconst x ='))
    expect(last(session()).contentParts[0]?.text).toBe('```js\nconst x =')
  })

  it('complete marks the response complete and the chat idle', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    act(() => {
      captured()?.controls.appendChunk('done')
      captured()?.controls.complete()
    })
    expect(last(session()).status).toBe('complete')
    expect(session().status).toBe('idle')
  })

  it('does not submit while an operation is in flight (FR-008)', () => {
    const { session, request } = renderSession()
    act(() => session().submit('first'))
    act(() => session().submit('second'))
    expect(session().messages).toHaveLength(2)
    expect(request).toHaveBeenCalledTimes(1)
  })
})

describe('useChatSession: stop (US2)', () => {
  it('stop before the first chunk retains the empty response and marks stopped', () => {
    const { session } = renderSession()
    act(() => session().submit('hi'))
    act(() => session().stop())
    expect(last(session()).status).toBe('stopped')
    expect(last(session()).contentParts[0]?.text).toBe('')
    expect(session().status).toBe('idle')
    // Second stop is a no-op (FR-006).
    act(() => session().stop())
    expect(last(session()).status).toBe('stopped')
  })

  it('stop mid-stream retains the partial content', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    act(() => captured()?.controls.appendChunk('partial answer'))
    act(() => session().stop())
    expect(last(session()).status).toBe('stopped')
    expect(last(session()).contentParts[0]?.text).toBe('partial answer')
    // Chunks after stop are ignored.
    act(() => captured()?.controls.appendChunk(' more'))
    expect(last(session()).contentParts[0]?.text).toBe('partial answer')
  })

  it('stop after the final chunk before completion retains the streamed content', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    act(() => captured()?.controls.appendChunk('final'))
    act(() => session().stop())
    expect(last(session()).status).toBe('stopped')
    expect(last(session()).contentParts[0]?.text).toBe('final')
  })

  it('stop after complete is a no-op', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    act(() => captured()?.controls.complete())
    expect(last(session()).status).toBe('complete')
    act(() => session().stop())
    expect(last(session()).status).toBe('complete')
  })

  it('the complete-vs-stop race yields exactly one terminal status', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    act(() => {
      captured()?.controls.complete()
      session().stop()
    })
    expect(last(session()).status).toBe('complete')
  })

  it('stop-then-complete keeps the stopped status', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    act(() => {
      session().stop()
      captured()?.controls.complete()
    })
    expect(last(session()).status).toBe('stopped')
  })

  it('stopRequested reflects a stop to the transport', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    expect(captured()?.controls.stopRequested()).toBe(false)
    act(() => session().stop())
    expect(captured()?.controls.stopRequested()).toBe(true)
  })
})

describe('useChatSession: retry and regenerate (US3)', () => {
  it('retry replaces the errored response in place with a new stream', () => {
    const { session, captured, request } = renderSession()
    act(() => session().submit('hi'))
    act(() => {
      captured()?.controls.appendChunk('partial')
      captured()?.controls.fail()
    })
    expect(last(session()).status).toBe('error')
    const failedId = last(session()).id

    act(() => session().retry(failedId))
    expect(session().messages).toHaveLength(2)
    expect(last(session()).id).toBe(failedId)
    expect(last(session()).status).toBe('sending')
    expect(last(session()).contentParts[0]?.text).toBe('')
    expect(request).toHaveBeenCalledTimes(2)
    expect(captured()?.op.kind).toBe('retry')
    expect(captured()?.op.prompt).toBe('hi')

    act(() => captured()?.controls.appendChunk('new answer'))
    expect(last(session()).contentParts[0]?.text).toBe('new answer')
    expect(last(session()).status).toBe('streaming')
  })

  it('regenerate replaces the completed response in place', () => {
    const { session, captured, request } = renderSession()
    act(() => session().submit('hi'))
    act(() => {
      captured()?.controls.appendChunk('first answer')
      captured()?.controls.complete()
    })
    const completedId = last(session()).id

    act(() => session().regenerate(completedId))
    expect(session().messages).toHaveLength(2)
    expect(last(session()).id).toBe(completedId)
    expect(last(session()).status).toBe('sending')
    expect(last(session()).contentParts[0]?.text).toBe('')
    expect(request).toHaveBeenCalledTimes(2)
    expect(captured()?.op.kind).toBe('regenerate')

    act(() => captured()?.controls.appendChunk('second answer'))
    expect(last(session()).contentParts[0]?.text).toBe('second answer')
  })

  it('a late update from a superseded operation never changes the newer response (FR-005)', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('first'))
    const firstControls = captured()?.controls
    act(() => firstControls?.complete())

    act(() => session().submit('second'))
    const secondId = last(session()).id

    act(() => firstControls?.appendChunk('late chunk'))
    expect(last(session()).id).toBe(secondId)
    expect(last(session()).contentParts[0]?.text).toBe('')
    expect(last(session()).status).toBe('sending')

    act(() => firstControls?.complete())
    expect(last(session()).status).toBe('sending')
  })

  it('retry and regenerate are ignored while another operation is in flight', () => {
    const { session, request } = renderSession()
    act(() => session().submit('first'))
    const id = last(session()).id
    act(() => session().retry(id))
    act(() => session().regenerate(id))
    expect(request).toHaveBeenCalledTimes(1)
  })
})

describe('useChatSession: copy (US4)', () => {
  it('copy delegates the joined plain text to the host callback', () => {
    const { session, captured, copyMessageText } = renderSession()
    act(() => session().submit('hi'))
    act(() => {
      captured()?.controls.appendChunk('Hello')
      captured()?.controls.complete()
    })
    const response = last(session())
    act(() => session().copyMessage(response))
    expect(copyMessageText).toHaveBeenCalledWith(response, 'Hello')
  })

  it('the copy action delegates through onMessageAction', () => {
    const { session, captured, copyMessageText } = renderSession()
    act(() => session().submit('hi'))
    act(() => {
      captured()?.controls.appendChunk('Hello')
      captured()?.controls.complete()
    })
    const response = last(session())
    const copyAction = session().messageActions.find((action) => action.id === 'copy')
    act(() => session().onMessageAction(copyAction!, response))
    expect(copyMessageText).toHaveBeenCalledWith(response, 'Hello')
  })

  it('the copy action is unavailable without a host callback', () => {
    const { session, captured } = renderSession({ copyMessageText: undefined })
    act(() => session().submit('hi'))
    act(() => {
      captured()?.controls.appendChunk('Hello')
      captured()?.controls.complete()
    })
    const copyAction = session().messageActions.find((action) => action.id === 'copy')
    expect(copyAction?.available?.(last(session()))).toBe(false)
  })

  it('retry and regenerate actions are available only for their target statuses', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    act(() => {
      captured()?.controls.appendChunk('Hello')
      captured()?.controls.complete()
    })
    const completeMsg = last(session())
    const retryAction = session().messageActions.find((action) => action.id === 'retry')
    const regenerateAction = session().messageActions.find((action) => action.id === 'regenerate')
    expect(retryAction?.available?.(completeMsg)).toBe(false)
    expect(regenerateAction?.available?.(completeMsg)).toBe(true)

    act(() => session().regenerate(completeMsg.id))
    act(() => {
      captured()?.controls.appendChunk('partial')
      captured()?.controls.fail()
    })
    const errorMsg = last(session())
    expect(retryAction?.available?.(errorMsg)).toBe(true)
    expect(regenerateAction?.available?.(errorMsg)).toBe(false)
  })
})

describe('useChatSession: edge cases', () => {
  it('a message-level failure retains partial content and keeps the chat idle', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    act(() => {
      captured()?.controls.appendChunk('partial')
      captured()?.controls.fail()
    })
    expect(last(session()).status).toBe('error')
    expect(last(session()).contentParts[0]?.text).toBe('partial')
    expect(session().status).toBe('idle')
  })

  it('replacing the conversation invalidates the operation with no leak', () => {
    const { session, captured } = renderSession()
    act(() => session().submit('hi'))
    act(() => captured()?.controls.appendChunk('partial'))
    act(() => session().replaceMessages([]))
    expect(session().messages).toHaveLength(0)
    expect(session().status).toBe('idle')
    act(() => captured()?.controls.appendChunk('leak'))
    expect(session().messages).toHaveLength(0)
  })

  it('a rejecting transport marks the response error instead of leaving it sending', async () => {
    const request = vi.fn(() => Promise.reject(new Error('connection dropped')))
    const { result } = renderHook(() => useChatSession({ request }))
    await act(async () => {
      result.current.submit('hi')
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(last(result.current).status).toBe('error')
    expect(result.current.status).toBe('idle')
  })

  it('a synchronously throwing transport marks the response error', async () => {
    const request = vi.fn(() => {
      throw new Error('boom')
    })
    const { result } = renderHook(() => useChatSession({ request }))
    await act(async () => {
      result.current.submit('hi')
      await Promise.resolve()
    })
    expect(last(result.current).status).toBe('error')
  })
})
