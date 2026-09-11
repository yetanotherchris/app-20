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
import { AutosaveQueue } from '../conversation/autosaveQueue'
import { fromConversation, toConversation } from '../conversation/conversationAdapter'
import { createId } from '../conversation/chatMessages'
import { toProviderRequestMessages } from '../conversation/providerMessages'
import { messageForCode } from '../errorMessages'

export interface ShellSession {
  messages: readonly Message[]
  draft: string
  status: ChatStatus
  messageActions: readonly MessageAction[]
  setDraft: (value: string) => void
  submit: () => void
  stop: () => void
  newConversation: () => Promise<AppErrorCode | null>
  /**
   * Switch the active conversation to `id`. Selecting the active conversation
   * returns null without a reload or draft change. Otherwise the current
   * conversation is saved first and the switch aborts with the blocking code.
   */
  openConversation: (id: string) => Promise<AppErrorCode | null>
  onMessageAction: (action: MessageAction, message: Message) => void
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

  const conversationIdRef = useRef(createId('conversation'))
  const conversationCreatedAtRef = useRef(new Date().toISOString())
  const baseConversationRef = useRef<Conversation | null>(null)
  const activeRequestRef = useRef<string | null>(null)
  const controlsRef = useRef<ChatSessionControls | null>(null)
  const messagesRef = useRef<readonly Message[]>([])
  const draftRef = useRef(draft)
  draftRef.current = draft
  const folderKeyRef = useRef(folderKey)
  folderKeyRef.current = folderKey
  const terminalSavePendingRef = useRef(false)
  const autosaveRef = useRef<AutosaveQueue<Conversation> | null>(null)

  if (autosaveRef.current === null) {
    autosaveRef.current = new AutosaveQueue({
      createSnapshot: () =>
        toConversation(
          {
            id: conversationIdRef.current,
            createdAt: conversationCreatedAtRef.current,
            model: AUTOMATIC_MODEL,
            messages: messagesRef.current,
            draft: draftRef.current,
          },
          baseConversationRef.current,
        ),
      saveSnapshot: async (conversation) => {
        if (!folderKeyRef.current) throw new Error('no-folder')
        const result = await window.appBridge.saveConversation(conversation)
        if (!result.ok) throw new Error(result.code)
        baseConversationRef.current = conversation
      },
      onFailure: () => reportError(messageForCode('unknown')),
    })
  }

  const autosave = autosaveRef.current

  const request = useCallback(
    (operation: ChatOperation, controls: ChatSessionControls) => {
      const requestId = createId('chat')
      activeRequestRef.current = requestId
      controlsRef.current = controls

      const messages = toProviderRequestMessages(messagesRef.current, operation)
      void window.appBridge
        .startChat({ requestId, messages, model: AUTOMATIC_MODEL })
        .then((result) => {
          if (result.ok) return
          activeRequestRef.current = null
          controlsRef.current = null
          controls.fail()
          terminalSavePendingRef.current = true
          reportError(messageForCode(result.code))
        })
        .catch(() => {
          activeRequestRef.current = null
          controlsRef.current = null
          controls.fail()
          terminalSavePendingRef.current = true
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
      terminalSavePendingRef.current = true
    })
    return () => {
      unsubscribeChunk()
      unsubscribeComplete()
    }
  }, [reportError])

  const setDraft = useCallback((value: string) => {
    draftRef.current = value
    setDraftState(value)
    autosave.scheduleDraftSave()
  }, [autosave])

  const submit = useCallback(() => {
    const prompt = draftRef.current.trim()
    if (!prompt || !folderKey) return
    submitChat(prompt)
    autosave.cancelDraftTimer()
    draftRef.current = ''
    setDraftState('')
  }, [submitChat, folderKey, autosave])

  const stop = useCallback(() => {
    stopChatOperation()
    abortActiveRequest()
    terminalSavePendingRef.current = true
    void new Promise<void>((resolve) => globalThis.setTimeout(resolve)).then(() => autosave.flush())
  }, [stopChatOperation, abortActiveRequest, autosave])

  const flush = useCallback(async (): Promise<boolean> => {
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve))
    return autosave.flush()
  }, [autosave])

  useEffect(() => {
    if (!terminalSavePendingRef.current) return
    terminalSavePendingRef.current = false
    void autosave.trigger()
  }, [autosave, chatMessages, chatStatus])

  const applyConversation = useCallback(
    (conversation: Conversation) => {
      baseConversationRef.current = conversation
      replaceMessages(fromConversation(conversation))
      draftRef.current = conversation.draft ?? ''
      setDraftState(conversation.draft ?? '')
      conversationIdRef.current = conversation.id
      conversationCreatedAtRef.current = conversation.createdAt
    },
    [replaceMessages],
  )

  const newConversation = useCallback(async (): Promise<AppErrorCode | null> => {
    if (!(await flush())) return 'unknown'
    stopChatOperation()
    abortActiveRequest()
    conversationIdRef.current = createId('conversation')
    conversationCreatedAtRef.current = new Date().toISOString()
    baseConversationRef.current = null
    replaceMessages([])
    draftRef.current = ''
    setDraftState('')
    return null
  }, [flush, stopChatOperation, abortActiveRequest, replaceMessages])

  const openConversation = useCallback(
    async (id: string): Promise<AppErrorCode | null> => {
      if (id === conversationIdRef.current) return null

      if (hasUserActivity() && !(await flush())) return 'unknown'

      // Read before stopping, so a failed read leaves an in-flight response
      // running on the conversation that stays active.
      const read = await window.appBridge.readConversation(id)
      if (!read.ok) return read.code

      stopChatOperation()
      abortActiveRequest()
      applyConversation(read.value.conversation)
      return null
    },
    [flush, stopChatOperation, abortActiveRequest, hasUserActivity, applyConversation],
  )

  useEffect(() => {
    stopChatOperation()
    abortActiveRequest()
    conversationIdRef.current = createId('conversation')
    conversationCreatedAtRef.current = new Date().toISOString()
    baseConversationRef.current = null
    if (!folderKey) {
      replaceMessages([])
      draftRef.current = ''
      setDraftState('')
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
          applyConversation(read.value.conversation)
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
    applyConversation,
    reportError,
    hasUserActivity,
  ])

  useEffect(() => {
    const unsubscribeBackgrounded = window.appBridge.onAppBackgrounded(() => {
      void flush()
    })
    const unsubscribeClose = window.appBridge.onCloseRequested(() => {
      stop()
      void flush().finally(() => window.appBridge.reportCloseDecision('close'))
    })
    return () => {
      unsubscribeBackgrounded()
      unsubscribeClose()
      autosave.cancelDraftTimer()
    }
  }, [autosave, flush, stop])

  return {
    messages: chatMessages,
    draft,
    status: chatStatus,
    messageActions,
    setDraft,
    submit,
    stop,
    newConversation,
    openConversation,
    onMessageAction,
  }
}
