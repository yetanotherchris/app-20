import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useChatSession,
  type ChatOperation,
  type ChatSessionControls,
  type ChatStatus,
  type Message,
  type MessageAction,
} from 'app-20-llmchat'
import { AUTOMATIC_MODEL } from '@app-20/ai-provider'
import type { Conversation } from '@app-20/conversation-storage'
import type { AppErrorCode } from '../../../shared/error-codes'
import { fromConversation, toConversation } from '../conversation/conversationAdapter'
import { createId } from '../conversation/chatMessages'
import { toProviderRequestMessages } from '../conversation/providerMessages'
import { messageForCode } from '../errorMessages'

export interface ShellSession {
  messages: readonly Message[]
  draft: string
  status: ChatStatus
  dirty: boolean
  saving: boolean
  messageActions: readonly MessageAction[]
  setDraft: (value: string) => void
  submit: () => void
  stop: () => void
  newConversation: () => void
  onMessageAction: (action: MessageAction, message: Message) => void
  /** Returns null on success, or the error code that blocked the save. */
  save: () => Promise<AppErrorCode | null>
}

/**
 * The shell session wires the OpenRouter provider into the shared chat
 * component's `useChatSession` transport and persists through the spec 101
 * conversation store. The provider runs in main and streams over `chat:*`; the
 * renderer sends history and applies deltas, and the requested model is recorded.
 */
export function useShellSession(
  folderKey: string | null,
  reportError: (message: string) => void,
): ShellSession {
  const [draft, setDraftState] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const conversationIdRef = useRef(createId('conversation'))
  const conversationCreatedAtRef = useRef(new Date().toISOString())
  const baseConversationRef = useRef<Conversation | null>(null)
  const activeRequestRef = useRef<string | null>(null)
  const controlsRef = useRef<ChatSessionControls | null>(null)
  const messagesRef = useRef<readonly Message[]>([])
  const draftRef = useRef(draft)
  draftRef.current = draft

  const request = useCallback(
    (operation: ChatOperation, controls: ChatSessionControls) => {
      const requestId = createId('chat')
      activeRequestRef.current = requestId
      controlsRef.current = controls
      setDirty(true)

      const messages = toProviderRequestMessages(messagesRef.current, operation)
      void window.appBridge
        .startChat({ requestId, messages, model: AUTOMATIC_MODEL })
        .then((result) => {
          if (result.ok) return
          activeRequestRef.current = null
          controlsRef.current = null
          controls.fail()
          reportError(messageForCode(result.code))
        })
        .catch(() => {
          activeRequestRef.current = null
          controlsRef.current = null
          controls.fail()
          reportError(messageForCode('unknown'))
        })
    },
    [reportError],
  )

  const chat = useChatSession({ request })
  const {
    messages: chatMessages,
    status: chatStatus,
    submit: submitChat,
    stop: stopChatOperation,
    replaceMessages,
    messageActions,
    onMessageAction,
  } = chat
  messagesRef.current = chatMessages

  const abortActiveRequest = useCallback(() => {
    const requestId = activeRequestRef.current
    activeRequestRef.current = null
    controlsRef.current = null
    if (requestId) void window.appBridge.stopChat(requestId)
  }, [])

  const hasUserActivity = useCallback(
    () => messagesRef.current.length > 0 || draftRef.current.length > 0,
    [],
  )

  useEffect(() => {
    const unsubscribeChunk = window.appBridge.onChatChunk(({ requestId, text }) => {
      if (requestId !== activeRequestRef.current) return
      controlsRef.current?.appendChunk(text)
      setDirty(true)
    })
    const unsubscribeComplete = window.appBridge.onChatComplete(({ requestId, result }) => {
      if (requestId !== activeRequestRef.current) return
      activeRequestRef.current = null
      const controls = controlsRef.current
      controlsRef.current = null
      if (result.kind === 'complete') {
        controls?.complete()
      } else if (result.kind === 'error') {
        controls?.fail()
        reportError(messageForCode(result.code))
      }
      setDirty(true)
    })
    return () => {
      unsubscribeChunk()
      unsubscribeComplete()
    }
  }, [reportError])

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
          model: AUTOMATIC_MODEL,
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
    const prompt = draftRef.current.trim()
    if (!prompt || !folderKey) return
    submitChat(prompt)
    setDraftState('')
  }, [submitChat, folderKey])

  const stop = useCallback(() => {
    stopChatOperation()
    abortActiveRequest()
  }, [stopChatOperation, abortActiveRequest])

  const newConversation = useCallback(() => {
    stopChatOperation()
    abortActiveRequest()
    conversationIdRef.current = createId('conversation')
    conversationCreatedAtRef.current = new Date().toISOString()
    baseConversationRef.current = null
    replaceMessages([])
    setDraftState('')
    setDirty(true)
  }, [stopChatOperation, abortActiveRequest, replaceMessages])

  useEffect(() => {
    stopChatOperation()
    abortActiveRequest()
    conversationIdRef.current = createId('conversation')
    conversationCreatedAtRef.current = new Date().toISOString()
    baseConversationRef.current = null
    if (!folderKey) {
      replaceMessages([])
      setDraftState('')
      setDirty(false)
      return
    }

    let cancelled = false
    void (async () => {
      const listed = await window.appBridge.listConversations()
      if (cancelled) return
      if (!listed.ok) {
        reportError(messageForCode(listed.code))
        return
      }

      // A user can start a turn while the list loads. Their session wins over
      // the restore, so a prompt or draft is never clobbered (constitution III).
      if (hasUserActivity()) return

      let reportedCorrupt = false
      if (listed.value.report.corrupt > 0) {
        reportedCorrupt = true
        reportError(messageForCode('conversation-corrupt'))
      }

      for (const entry of listed.value.entries) {
        const read = await window.appBridge.readConversation(entry.id)
        if (cancelled) return
        if (hasUserActivity()) return
        if (read.ok) {
          const conversation = read.value.conversation
          baseConversationRef.current = conversation
          replaceMessages(fromConversation(conversation))
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
  }, [
    folderKey,
    stopChatOperation,
    abortActiveRequest,
    replaceMessages,
    reportError,
    hasUserActivity,
  ])

  return {
    messages: chatMessages,
    draft,
    status: chatStatus,
    dirty,
    saving,
    messageActions,
    setDraft,
    submit,
    stop,
    newConversation,
    onMessageAction,
    save,
  }
}
