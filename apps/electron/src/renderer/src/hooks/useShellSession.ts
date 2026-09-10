import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatStatus, Message } from 'app-20-llmchat'
import { messageForCode } from '../errorMessages'

const ECHO_DELAY_MS = 120

type StoredStatus = 'complete' | 'stopped' | 'error'

interface StoredMessage {
  id: string
  role: Message['role']
  content: string
  createdAt: string
  status: StoredStatus
}

interface StoredConversation {
  id: string
  title: string
  updatedAt: string
  messages: StoredMessage[]
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function createMessage(role: Message['role'], text: string, status: Message['status']): Message {
  return {
    id: createId(role),
    role,
    contentParts: [{ kind: 'text', format: role === 'user' ? 'plain' : 'markdown', text }],
    status,
    createdAt: new Date().toISOString(),
  }
}

function messageText(message: Message): string {
  return message.contentParts.map((part) => part.text).join('')
}

function toStoredStatus(status: Message['status']): StoredStatus {
  if (status === 'stopped' || status === 'error') return status
  return 'complete'
}

function toStored(id: string, messages: readonly Message[]): StoredConversation {
  const firstUser = messages.find((message) => message.role === 'user')
  return {
    id,
    title: firstUser ? messageText(firstUser).slice(0, 80) : '',
    updatedAt: new Date().toISOString(),
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: messageText(message),
      createdAt: message.createdAt,
      status: toStoredStatus(message.status),
    })),
  }
}

function fromStored(conversation: StoredConversation): Message[] {
  return conversation.messages.map((stored) => ({
    id: stored.id,
    role: stored.role,
    contentParts: [
      {
        kind: 'text',
        format: stored.role === 'user' ? 'plain' : 'markdown',
        text: stored.content,
      },
    ],
    status: stored.status,
    createdAt: stored.createdAt,
  }))
}

export interface ShellSession {
  messages: readonly Message[]
  draft: string
  status: ChatStatus
  dirty: boolean
  saving: boolean
  saveError: string | null
  setDraft: (value: string) => void
  submit: () => void
  stop: () => void
  newConversation: () => void
  save: () => Promise<boolean>
}

/**
 * Provisional shell session: the AI provider (spec 102) and the full session
 * flow (spec 105) are not implemented yet, so submit appends a local echo. The
 * saved envelope is owned by spec 101 to finalise (see research R10).
 */
export function useShellSession(
  workspaceKey: string | null,
  reportError: (message: string) => void,
): ShellSession {
  const [messages, setMessages] = useState<readonly Message[]>([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const conversationIdRef = useRef(createId('conversation'))
  const messagesRef = useRef<readonly Message[]>(messages)
  messagesRef.current = messages
  const replyTimerRef = useRef<number | null>(null)

  const clearReplyTimer = useCallback(() => {
    if (replyTimerRef.current !== null) {
      window.clearTimeout(replyTimerRef.current)
      replyTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    clearReplyTimer()
    setMessages([])
    setDraft('')
    setStatus('idle')
    setDirty(false)
    setSaveError(null)
    conversationIdRef.current = createId('conversation')
    if (!workspaceKey) return

    let cancelled = false
    void (async () => {
      const listed = await window.appBridge.listWorkspaceFiles()
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

      const read = await window.appBridge.readWorkspaceFile(latest)
      if (cancelled) return
      if (!read.ok) {
        reportError(messageForCode(read.code))
        return
      }

      try {
        const parsed = JSON.parse(read.value.content) as StoredConversation
        setMessages(fromStored(parsed))
        conversationIdRef.current = parsed.id
        setDirty(false)
      } catch {
        reportError('A saved conversation could not be read and was skipped.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [workspaceKey, clearReplyTimer, reportError])

  const save = useCallback(async (): Promise<boolean> => {
    if (!workspaceKey) {
      setSaveError(messageForCode('no-workspace'))
      return false
    }

    setSaving(true)
    try {
      const id = conversationIdRef.current
      const content = JSON.stringify(toStored(id, messagesRef.current), null, 2)
      const result = await window.appBridge.writeWorkspaceFile(`${id}.json`, content)
      if (result.ok) {
        setDirty(false)
        setSaveError(null)
        return true
      }
      setSaveError(messageForCode(result.code))
      return false
    } catch {
      setSaveError(messageForCode('unknown'))
      return false
    } finally {
      setSaving(false)
    }
  }, [workspaceKey])

  const submit = useCallback(() => {
    const prompt = draft.trim()
    if (!prompt || !workspaceKey) return

    const user = createMessage('user', prompt, 'complete')
    const assistant = createMessage('assistant', '', 'streaming')
    const assistantId = assistant.id
    setMessages((previous) => [...previous, user, assistant])
    setDraft('')
    setDirty(true)
    setStatus('streaming')

    clearReplyTimer()
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
      setStatus('idle')
    }, ECHO_DELAY_MS)
  }, [draft, workspaceKey, clearReplyTimer])

  const stop = useCallback(() => {
    clearReplyTimer()
    setMessages((previous) =>
      previous.map((message) =>
        message.status === 'streaming' ? { ...message, status: 'stopped' } : message,
      ),
    )
    setStatus('idle')
  }, [clearReplyTimer])

  const newConversation = useCallback(() => {
    clearReplyTimer()
    conversationIdRef.current = createId('conversation')
    setMessages([])
    setDraft('')
    setStatus('idle')
    setDirty(true)
    setSaveError(null)
  }, [clearReplyTimer])

  return {
    messages,
    draft,
    status,
    dirty,
    saving,
    saveError,
    setDraft,
    submit,
    stop,
    newConversation,
    save,
  }
}
