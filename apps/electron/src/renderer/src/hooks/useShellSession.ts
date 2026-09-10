import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatStatus, Message } from 'app-20-llmchat'
import type { Conversation } from '@app-20/conversation-storage'
import type { AppErrorCode } from '../../../shared/error-codes'
import { fromConversation, toConversation } from '../conversation/conversationAdapter'
import { createId, createMessage, withStatus } from '../conversation/chatMessages'
import { messageForCode } from '../errorMessages'

const ECHO_DELAY_MS = 120
// Spec 102 owns the requested model; until it supplies one the manifest records
// an empty string (spec 101 Clarifications).
const CONVERSATION_MODEL = ''

export interface ShellSession {
  messages: readonly Message[]
  draft: string
  status: ChatStatus
  dirty: boolean
  saving: boolean
  setDraft: (value: string) => void
  submit: () => void
  stop: () => void
  newConversation: () => void
  /** Returns null on success, or the error code that blocked the save. */
  save: () => Promise<AppErrorCode | null>
}

/**
 * Provisional shell session: the AI provider (spec 102) and the full session
 * flow (spec 105) are not implemented yet, so submit appends a local echo.
 * Persistence goes through the spec 101 conversation store, which owns the
 * schema and the manifest; this hook maps live messages onto it and keeps the
 * loaded conversation as the merge base so unrepresented data is not dropped.
 */
export function useShellSession(
  folderKey: string | null,
  reportError: (message: string) => void,
  streamDelayMs?: number,
): ShellSession {
  const [messages, setMessages] = useState<readonly Message[]>([])
  const [draft, setDraftState] = useState('')
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const echoDelayMs = streamDelayMs && streamDelayMs > 0 ? streamDelayMs : ECHO_DELAY_MS
  const conversationIdRef = useRef(createId('conversation'))
  const conversationCreatedAtRef = useRef(new Date().toISOString())
  const baseConversationRef = useRef<Conversation | null>(null)
  const messagesRef = useRef<readonly Message[]>(messages)
  messagesRef.current = messages
  const draftRef = useRef(draft)
  draftRef.current = draft
  const replyTimerRef = useRef<number | null>(null)

  const clearReplyTimer = useCallback(() => {
    if (replyTimerRef.current !== null) {
      window.clearTimeout(replyTimerRef.current)
      replyTimerRef.current = null
    }
  }, [])

  const setDraft = useCallback((value: string) => {
    setDraftState(value)
    setDirty(true)
  }, [])

  const save = useCallback(async (): Promise<AppErrorCode | null> => {
    if (!folderKey) return 'no-folder'

    setSaving(true)
    try {
      const conversation = toConversation(
        {
          id: conversationIdRef.current,
          createdAt: conversationCreatedAtRef.current,
          model: CONVERSATION_MODEL,
          messages: messagesRef.current,
          draft: draftRef.current,
        },
        baseConversationRef.current,
      )
      const result = await window.appBridge.saveConversation(conversation)
      if (result.ok) {
        baseConversationRef.current = conversation
        setDirty(false)
        return null
      }
      setDirty(true)
      return result.code
    } catch {
      setDirty(true)
      return 'unknown'
    } finally {
      setSaving(false)
    }
  }, [folderKey])

  const submit = useCallback(() => {
    const prompt = draft.trim()
    if (!prompt || !folderKey) return

    const user = createMessage('user', prompt, 'complete')
    const assistant = createMessage('assistant', '', 'streaming')
    const assistantId = assistant.id

    clearReplyTimer()
    setMessages((previous) => [
      ...previous.map((message) =>
        message.status === 'streaming' ? withStatus(message, 'stopped') : message,
      ),
      user,
      assistant,
    ])
    setDraftState('')
    setDirty(true)
    setStatus('streaming')

    replyTimerRef.current = window.setTimeout(() => {
      replyTimerRef.current = null
      setMessages((previous) =>
        previous.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                status: 'complete',
                contentParts: [{ kind: 'text', format: 'markdown', text: `Local echo: ${prompt}` }],
              }
            : message,
        ),
      )
      setDirty(true)
      setStatus('idle')
    }, echoDelayMs)
  }, [draft, folderKey, clearReplyTimer, echoDelayMs])

  const stop = useCallback(() => {
    clearReplyTimer()
    setMessages((previous) =>
      previous.map((message) =>
        message.status === 'streaming' ? withStatus(message, 'stopped') : message,
      ),
    )
    setStatus('idle')
  }, [clearReplyTimer])

  const newConversation = useCallback(() => {
    clearReplyTimer()
    conversationIdRef.current = createId('conversation')
    conversationCreatedAtRef.current = new Date().toISOString()
    baseConversationRef.current = null
    setMessages([])
    setDraftState('')
    setStatus('idle')
    setDirty(true)
  }, [clearReplyTimer])

  useEffect(() => {
    clearReplyTimer()
    setMessages([])
    setDraftState('')
    setStatus('idle')
    setDirty(false)
    conversationIdRef.current = createId('conversation')
    conversationCreatedAtRef.current = new Date().toISOString()
    baseConversationRef.current = null
    if (!folderKey) return

    let cancelled = false
    void (async () => {
      const listed = await window.appBridge.listConversations()
      if (cancelled) return
      if (!listed.ok) {
        reportError(messageForCode(listed.code))
        return
      }

      let reportedCorrupt = false
      if (listed.value.report.corrupt > 0) {
        reportedCorrupt = true
        reportError(messageForCode('conversation-corrupt'))
      }

      for (const entry of listed.value.entries) {
        const read = await window.appBridge.readConversation(entry.id)
        if (cancelled) return
        if (read.ok) {
          const conversation = read.value.conversation
          baseConversationRef.current = conversation
          setMessages(fromConversation(conversation))
          setDraftState(conversation.draft ?? '')
          conversationIdRef.current = conversation.id
          conversationCreatedAtRef.current = conversation.createdAt
          setDirty(false)
          return
        }
        if (read.code === 'conversation-corrupt' && !reportedCorrupt) {
          reportedCorrupt = true
          reportError(messageForCode('conversation-corrupt'))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [folderKey, clearReplyTimer, reportError])

  return {
    messages,
    draft,
    status,
    dirty,
    saving,
    setDraft,
    submit,
    stop,
    newConversation,
    save,
  }
}
