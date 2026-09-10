import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatStatus, Message } from 'app-20-llmchat'
import type { AppErrorCode } from '../../../shared/error-codes'
import {
  createId,
  createMessage,
  fromStored,
  parseStoredConversationSafe,
  toStored,
  withStatus,
} from '../conversation/storedConversation'
import { messageForCode } from '../errorMessages'

const ECHO_DELAY_MS = 120

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
 * flow (spec 105) are not implemented yet, so submit appends a local echo. The
 * saved envelope and its validation live in `conversation/storedConversation.ts`
 * and are owned by spec 101 to finalise (see research R10).
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
      const id = conversationIdRef.current
      const content = JSON.stringify(toStored(id, messagesRef.current, draftRef.current), null, 2)
      const result = await window.appBridge.writeConversationFile(`${id}.json`, content)
      if (result.ok) {
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
    if (!folderKey) return

    let cancelled = false
    void (async () => {
      const listed = await window.appBridge.listConversationFiles()
      if (cancelled) return
      if (!listed.ok) {
        reportError(messageForCode(listed.code))
        return
      }

      const names = listed.value.names
        .filter((name) => name.startsWith('conversation-') && name.endsWith('.json'))
        .sort()
      const latest = names[names.length - 1]
      if (!latest) return

      const read = await window.appBridge.readConversationFile(latest)
      if (cancelled) return
      if (!read.ok) {
        reportError(messageForCode(read.code))
        return
      }

      const conversation = parseStoredConversationSafe(read.value.content)
      if (!conversation) {
        reportError('A saved conversation could not be read and was skipped.')
        return
      }

      setMessages(fromStored(conversation))
      setDraftState(conversation.draft)
      conversationIdRef.current = conversation.id
      setDirty(false)
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
