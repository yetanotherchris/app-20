import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { ActionSheetIOS, Alert, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native'
import Constants from 'expo-constants'
import Svg, { Path } from 'react-native-svg'
import {
  LLMChat,
  ContentRenderer,
  useChatSession,
  type ChatOperation,
  type ChatSessionControls,
  type Message,
  type ThemeInput,
} from 'app-20-llmchat'
import { AUTOMATIC_MODEL, createOpenRouterProvider } from '@app-20/ai-provider'
import {
  createConversationStore,
  MANIFEST_FILE_NAME,
  type Conversation,
  type ManifestEntry,
} from '@app-20/conversation-storage'
import type { AppStateStatus } from 'react-native'
import { createConversationFilePort } from '../storage/conversationFilePort'
import { createSecretService } from '../secrets/secretService'
import { SettingsSheet } from '../settings/SettingsSheet'
import { AutosaveQueue } from './autosaveQueue'
import { fromConversation, toConversation, toProviderMessages } from './conversation'
import { createSyncService } from '../sync/syncService'

interface AppStateSource {
  addEventListener(type: 'change', listener: (state: AppStateStatus) => void): { remove(): void }
}

interface IosChatScreenProps {
  appState: AppStateSource
}

interface ConversationUiState {
  draft: string
  editSourceId: string | null
  parkedDraft: string | null
}

const IOS_CHAT_THEME = {
  colors: {
    assistantBubble: '#ffffff',
    background: '#ffffff',
    border: '#d1d1d6',
    composerBorder: '#d1d1d6',
    composerSurface: '#fafafa',
    danger: '#c62828',
    primary: '#007aff',
    sendBackground: '#007aff',
    sendDisabled: '#e5e5ea',
    sendForeground: '#ffffff',
    text: '#111111',
    textSecondary: '#6b6b70',
    userBubble: '#e9e9ed',
    userBubbleText: '#111111',
  },
  layout: { composerWidth: 1000, readingColumnWidth: 1000, sidePadding: 12 },
  radii: { bubbleRadius: 22, composerRadius: 28, controlRadius: 22 },
  spacing: { bubbleMarginH: 0, bubbleMarginV: 8, composerBottomGap: 12 },
  typography: {
    composerLineHeight: 22,
    composerTextSize: 17,
    messageLineHeight: 22,
    messageTextSize: 17,
  },
} satisfies ThemeInput

const BUILD_NUMBER = Constants.platform?.ios?.buildNumber ?? 'dev'

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function IosChatScreen({ appState }: IosChatScreenProps): React.JSX.Element {
  const secretsRef = useRef(createSecretService())
  const filePortRef = useRef(createConversationFilePort())
  const storeRef = useRef(createConversationStore(filePortRef.current))
  const conversationIdRef = useRef(createId('conversation'))
  const createdAtRef = useRef(new Date().toISOString())
  const baseRef = useRef<Conversation | null>(null)
  const messagesRef = useRef<readonly Message[]>([])
  const draftRef = useRef('')
  const parkedDraftRef = useRef<string | null>(null)
  const editSourceRef = useRef<string | null>(null)
  const conversationUiStateRef = useRef(new Map<string, ConversationUiState>())
  const controllerRef = useRef<AbortController | null>(null)
  const controlsRef = useRef<ChatSessionControls | null>(null)
  const sessionGenerationRef = useRef(0)
  const mirrorRevisionRef = useRef(0)
  const resendPendingRef = useRef(false)
  const [draft, setDraftState] = useState('')
  const [editSourceId, setEditSourceId] = useState<string | null>(null)
  const [modelName, setModelName] = useState('Openrouter Auto')
  const [notice, setNotice] = useState<string | null>(null)
  const [entries, setEntries] = useState<readonly ManifestEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [mutationPending, setMutationPending] = useState(false)
  const [s3SaveFailed, setS3SaveFailed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hasProviderKey, setHasProviderKey] = useState(false)
  const [gatePending, setGatePending] = useState(false)
  const [keyboardInset, setKeyboardInset] = useState(0)
  const chatRegionRef = useRef<View>(null)

  const syncRef = useRef<ReturnType<typeof createSyncService> | null>(null)
  if (!syncRef.current) {
    syncRef.current = createSyncService(filePortRef.current, secretsRef.current, (state) => {
      if (state === 'error') setS3SaveFailed(true)
      if (state === 'idle' || state === 'disabled') setS3SaveFailed(false)
    })
  }
  const sync = syncRef.current

  function rememberConversationUiState(): void {
    conversationUiStateRef.current.set(conversationIdRef.current, {
      draft: draftRef.current,
      editSourceId: editSourceRef.current,
      parkedDraft: parkedDraftRef.current,
    })
  }

  function setEditSource(id: string | null): void {
    editSourceRef.current = id
    setEditSourceId(id)
  }

  function restoreConversationUiState(id: string, fallbackDraft: string): void {
    const saved = conversationUiStateRef.current.get(id)
    const state = saved ?? { draft: fallbackDraft, editSourceId: null, parkedDraft: null }
    draftRef.current = state.draft
    parkedDraftRef.current = state.parkedDraft
    setDraftState(state.draft)
    setEditSource(state.editSourceId)
  }

  async function mirrorLocalFile(name: string, content: string | null): Promise<void> {
    if (!(await secretsRef.current.getS3Config())) return
    mirrorRevisionRef.current += 1
    await sync.schedule({ content, name, revision: mirrorRevisionRef.current })
  }

  async function mirrorManifest(): Promise<void> {
    await mirrorLocalFile(
      MANIFEST_FILE_NAME,
      await filePortRef.current.readText(MANIFEST_FILE_NAME),
    )
  }

  const autosaveRef = useRef<AutosaveQueue<Conversation> | null>(null)
  if (!autosaveRef.current) {
    autosaveRef.current = new AutosaveQueue({
      createSnapshot: () =>
        toConversation(
          {
            id: conversationIdRef.current,
            createdAt: createdAtRef.current,
            model: AUTOMATIC_MODEL,
            messages: messagesRef.current,
            draft: draftRef.current,
          },
          baseRef.current,
        ),
      saveSnapshot: async (conversation) => {
        if (!conversation.messages.some((message) => message.role === 'user')) return
        const result = await storeRef.current.save(conversation)
        baseRef.current = conversation
        await mirrorLocalFile(result.fileName, await filePortRef.current.readText(result.fileName))
        await mirrorManifest()
      },
      onFailure: () => setNotice('Conversation save failed. Your current text is still available.'),
    })
  }
  const autosave = autosaveRef.current

  const chat = useChatSession({
    request: (operation: ChatOperation, controls: ChatSessionControls) => {
      const controller = new AbortController()
      const requestGeneration = sessionGenerationRef.current
      controllerRef.current = controller
      controlsRef.current = controls
      const messages = toProviderMessages(messagesRef.current, operation.messageId)
      if (operation.kind === 'submit') messages.push({ role: 'user', content: operation.prompt })
      const provider = createOpenRouterProvider({
        apiKey: () => secretsRef.current.getProviderKey(),
      })
      void (async () => {
        try {
          for await (const chunk of provider.streamChat(
            { model: AUTOMATIC_MODEL, messages },
            controller.signal,
          )) {
            controls.appendChunk(chunk)
          }
          if (!controller.signal.aborted) controls.complete()
        } catch {
          if (!controller.signal.aborted) {
            controls.fail()
            setNotice('The response could not be completed.')
          }
        } finally {
          controllerRef.current = null
          controlsRef.current = null
          if (requestGeneration === sessionGenerationRef.current) autosave.trigger()
        }
      })()
    },
  })
  messagesRef.current = chat.messages

  const applyRestoredConversation = useEffectEvent((conversation: Conversation) => {
    baseRef.current = conversation
    conversationIdRef.current = conversation.id
    createdAtRef.current = conversation.createdAt
    chat.replaceMessages(fromConversation(conversation))
    // Loading a draft must not schedule a write merely because state changed.
    restoreConversationUiState(conversation.id, conversation.draft ?? '')
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const listed = await storeRef.current.list()
      if (cancelled) return
      setEntries(listed.entries)

      for (const entry of listed.entries) {
        if (cancelled || messagesRef.current.length > 0 || draftRef.current.length > 0) return
        const result = await storeRef.current.read(entry.id)
        if (result.kind === 'ok') {
          if (!cancelled && messagesRef.current.length === 0 && draftRef.current.length === 0) {
            applyRestoredConversation(result.conversation)
          }
          return
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applyRestoredConversation])

  useEffect(() => {
    void secretsRef.current.hasProviderKey().then(setHasProviderKey)
  }, [])

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      requestAnimationFrame(() => {
        chatRegionRef.current?.measureInWindow((_x, top, _width, height) => {
          setKeyboardInset(Math.max(0, top + height - event.endCoordinates.screenY))
        })
      })
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardInset(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  useEffect(() => {
    const subscription = appState.addEventListener('change', (state) => {
      if (state !== 'active') void autosave.flush()
      if (state === 'active') {
        void sync.run()
        void secretsRef.current.hasProviderKey().then(setHasProviderKey)
      }
    })
    return () => {
      subscription.remove()
      autosave.cancelDraftTimer()
      void autosave.flush()
    }
  }, [appState, autosave, sync])

  const setDraft = useCallback(
    (value: string): void => {
      draftRef.current = value
      setDraftState(value)
      rememberConversationUiState()
      autosave.scheduleDraftSave()
    },
    [autosave],
  )

  useEffect(() => {
    if (chat.status !== 'idle' || !resendPendingRef.current) return
    resendPendingRef.current = false
    const restoredDraft = parkedDraftRef.current ?? ''
    parkedDraftRef.current = null
    setEditSource(null)
    setDraft(restoredDraft)
  }, [chat.status, setDraft])

  const startEdit = useCallback(
    (message: Message): void => {
      if (chat.status !== 'idle') return
      if (editSourceRef.current === null) parkedDraftRef.current = draftRef.current
      setEditSource(message.id)
      setDraft(message.contentParts.map((part) => part.text).join(''))
    },
    [chat.status, setDraft],
  )

  const cancelEdit = useCallback((): void => {
    const restoredDraft = parkedDraftRef.current ?? ''
    parkedDraftRef.current = null
    setEditSource(null)
    setDraft(restoredDraft)
  }, [setDraft])

  async function submit(): Promise<void> {
    if (gatePending || draftRef.current.trim().length === 0) return
    setGatePending(true)
    try {
      if (!(await secretsRef.current.hasProviderKey())) {
        setHasProviderKey(false)
        setSettingsOpen(true)
        return
      }
      resendPendingRef.current = editSourceRef.current !== null
      chat.submit(draftRef.current.trim())
      autosave.cancelDraftTimer()
      setDraft('')
    } finally {
      setGatePending(false)
    }
  }

  function stop(): void {
    chat.stop()
    controllerRef.current?.abort()
    void autosave.flush()
  }

  async function refreshHistory(): Promise<void> {
    try {
      const result = await storeRef.current.list()
      setEntries(result.entries.slice(0, 5))
      setHistoryError(null)
    } catch {
      setHistoryError('Conversations could not be loaded.')
    }
  }

  function conversationActions(entry: ManifestEntry): void {
    if (mutationPending) return
    ActionSheetIOS.showActionSheetWithOptions(
      {
        cancelButtonIndex: 2,
        destructiveButtonIndex: 1,
        options: ['Rename', 'Delete', 'Cancel'],
        title: entry.title || 'Untitled conversation',
      },
      (index) => {
        if (index === 0) renameConversation(entry)
        if (index === 1) confirmDeleteConversation(entry)
      },
    )
  }

  function renameConversation(entry: ManifestEntry): void {
    Alert.prompt(
      'Rename conversation',
      undefined,
      [
        { style: 'cancel', text: 'Cancel' },
        {
          text: 'Save',
          onPress: (title?: string) => {
            if (!title || title.trim().length === 0 || title.trim().length > 80) {
              setHistoryError(
                title?.trim().length === 0 ? 'Enter a name.' : 'Use 80 characters or fewer.',
              )
              return
            }
            setMutationPending(true)
            void storeRef.current
              .rename(entry.id, title)
              .then(async () => {
                await mirrorLocalFile(
                  entry.fileName,
                  await filePortRef.current.readText(entry.fileName),
                )
                await mirrorManifest()
                await refreshHistory()
              })
              .catch(() => setHistoryError('The conversation was not renamed.'))
              .finally(() => setMutationPending(false))
          },
        },
      ],
      'plain-text',
      entry.title,
    )
  }

  function confirmDeleteConversation(entry: ManifestEntry): void {
    Alert.alert('Delete conversation?', entry.title || 'Untitled conversation', [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: () => {
          setMutationPending(true)
          void (async () => {
            try {
              const isActiveConversation = entry.id === conversationIdRef.current
              // Finish the active save before deleting it. A later flush would recreate the deleted file.
              if (isActiveConversation && !(await autosave.flush())) {
                setHistoryError('The conversation could not be saved before deletion.')
                return
              }
              await storeRef.current.delete(entry.id)
              await mirrorLocalFile(entry.fileName, null)
              await mirrorManifest()
              if (isActiveConversation) await newConversation(false)
              await refreshHistory()
            } catch {
              setHistoryError('The conversation was not deleted.')
            } finally {
              setMutationPending(false)
            }
          })()
        },
      },
    ])
  }

  async function openConversation(id: string): Promise<void> {
    if (!(await autosave.flush())) return
    rememberConversationUiState()
    const result = await storeRef.current.read(id)
    if (result.kind !== 'ok') {
      setNotice('The selected conversation is unavailable.')
      return
    }
    controllerRef.current?.abort()
    baseRef.current = result.conversation
    conversationIdRef.current = result.conversation.id
    createdAtRef.current = result.conversation.createdAt
    chat.replaceMessages(fromConversation(result.conversation))
    restoreConversationUiState(result.conversation.id, result.conversation.draft ?? '')
    setHistoryOpen(false)
  }

  async function newConversation(saveCurrent = true): Promise<void> {
    if (saveCurrent && !(await autosave.flush())) return
    rememberConversationUiState()
    controllerRef.current?.abort()
    conversationIdRef.current = createId('conversation')
    createdAtRef.current = new Date().toISOString()
    baseRef.current = null
    chat.replaceMessages([])
    setEditSource(null)
    parkedDraftRef.current = null
    setDraft('')
    setHistoryOpen(false)
  }

  const renderMessage = useCallback(
    (message: Message) => {
      const isUser = message.role === 'user'
      const isBusy = chat.status !== 'idle'
      return (
        <View style={isUser ? styles.userMessage : styles.assistantMessage}>
          <View style={isUser ? styles.userBubble : undefined}>
            <ContentRenderer
              messageId={message.id}
              parts={message.contentParts}
              textStyle={styles.messageText}
            />
          </View>
          {isUser ? (
            <Pressable
              accessibilityLabel="Edit and resend message"
              accessibilityRole="button"
              accessibilityState={{ disabled: isBusy, selected: editSourceId === message.id }}
              disabled={isBusy}
              onPress={() => startEdit(message)}
              style={[
                styles.editMessage,
                editSourceId === message.id && styles.editMessageSelected,
              ]}
            >
              <Svg height={20} viewBox="0 0 24 24" width={20}>
                <Path
                  d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"
                  fill="none"
                  stroke={editSourceId === message.id ? '#007aff' : '#6b6b70'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </Svg>
            </Pressable>
          ) : null}
        </View>
      )
    },
    [chat.status, editSourceId, startEdit],
  )

  const renderSend = useCallback(
    ({ disabled, onPress }: { disabled: boolean; onPress: () => void }) => {
      const sendDisabled = disabled || !hasProviderKey
      return (
        <Pressable
          accessibilityLabel="Send message"
          accessibilityRole="button"
          accessibilityState={{ disabled: sendDisabled }}
          disabled={sendDisabled}
          onPress={onPress}
          style={[styles.sendButton, sendDisabled ? styles.sendDisabled : styles.sendEnabled]}
        >
          <Svg height={22} viewBox="0 0 24 24" width={22}>
            <Path
              d="M12 19V5M6 11l6-6 6 6"
              fill="none"
              stroke={sendDisabled ? '#8e8e93' : '#ffffff'}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </Svg>
        </Pressable>
      )
    },
    [hasProviderKey],
  )

  const renderScrollToLatest = useCallback(
    ({ label, onPress }: { label: string; onPress: () => void }) => (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.scrollToLatest}
        testID="chat.scroll-to-latest"
      >
        <Svg height={20} viewBox="0 0 24 24" width={20}>
          <Path
            d="M12 5v14m-6-6 6 6 6-6"
            fill="none"
            stroke="#111111"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </Svg>
        <Text style={styles.scrollToLatestLabel}>{label}</Text>
      </Pressable>
    ),
    [],
  )

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open conversations"
          style={styles.headerButton}
          onPress={() => {
            Keyboard.dismiss()
            void refreshHistory().then(() => setHistoryOpen(true))
          }}
        >
          <Text style={styles.headerIcon}>☰</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Choose model, ${modelName}`}
          accessibilityRole="button"
          onPress={() => {
            Keyboard.dismiss()
            ActionSheetIOS.showActionSheetWithOptions(
              {
                cancelButtonIndex: 1,
                options: ['Openrouter Auto', 'Cancel'],
                title: 'Choose model',
              },
              (index) => {
                if (index === 0) setModelName('Openrouter Auto')
              },
            )
          }}
          style={styles.modelPicker}
        >
          <Text numberOfLines={1} style={styles.modelLabel}>
            {modelName}
          </Text>
          <Svg height={16} viewBox="0 0 24 24" width={16}>
            <Path
              d="m6 9 6 6 6-6"
              fill="none"
              stroke="#111111"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New chat"
          style={styles.headerButton}
          onPress={() => {
            Keyboard.dismiss()
            void newConversation()
          }}
        >
          <Svg height={24} viewBox="0 0 24 24" width={24}>
            <Path
              d="M13 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 3l5 5M10 14l-1 4 4-1L22 8l-5-5z"
              fill="none"
              stroke="#111111"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </Svg>
        </Pressable>
      </View>
      <View ref={chatRegionRef} style={[styles.chat, { marginBottom: keyboardInset }]}>
        <LLMChat.Root
          messages={chat.messages}
          draft={draft}
          status={chat.status}
          hasEarlierMessages={false}
          isLoadingEarlier={false}
          disabled={gatePending}
          onChangeDraft={setDraft}
          onSubmit={() => void submit()}
          onStop={stop}
          onLoadEarlier={() => undefined}
          messageActions={chat.messageActions}
          onLinkPress={() => undefined}
          composerVariant="ios"
          themeOverride={IOS_CHAT_THEME}
          minHeight={36}
          maxHeight={242}
          capabilities={{ stop: false }}
          placeholder="Ask anything"
          renderAboveComposer={() =>
            notice || editSourceId || s3SaveFailed || (!hasProviderKey && draft.trim() !== '') ? (
              <View>
                {!hasProviderKey && draft.trim() !== '' ? (
                  <Pressable
                    accessibilityLabel="Add API key in Settings"
                    accessibilityRole="button"
                    onPress={() => {
                      Keyboard.dismiss()
                      setSettingsOpen(true)
                    }}
                    style={styles.setupNotice}
                  >
                    <Text style={styles.setupNoticeGlyph}>⚙</Text>
                    <Text style={styles.setupNoticeText}>
                      Add your API key in Settings to send messages.
                    </Text>
                  </Pressable>
                ) : null}
                {s3SaveFailed ? (
                  <View style={styles.s3Notice}>
                    <Text accessibilityRole="alert" style={styles.s3NoticeText}>
                      Saved on this device. Couldn’t save to S3.
                    </Text>
                    <Pressable
                      accessibilityLabel="Retry saving to S3"
                      accessibilityRole="button"
                      onPress={() => void sync.run()}
                      style={styles.s3Retry}
                    >
                      <Text style={styles.s3RetryText}>↻</Text>
                    </Pressable>
                  </View>
                ) : null}
                {notice ? (
                  <View style={styles.notice}>
                    <Text accessibilityRole="alert" style={styles.noticeText}>
                      {notice}
                    </Text>
                  </View>
                ) : null}
                {editSourceId ? (
                  <View style={styles.editRow}>
                    <Text style={styles.editRowLabel}>Edit and resend</Text>
                    <Pressable
                      accessibilityLabel="Cancel edit and resend"
                      accessibilityRole="button"
                      onPress={cancelEdit}
                      style={styles.editCancel}
                    >
                      <Text style={styles.editCancelText}>×</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null
          }
          renderEmptyState={() => (
            <Pressable onPress={Keyboard.dismiss} style={styles.emptyState} testID="chat.empty-state">
              <Text style={styles.emptyTitle}>Start a conversation</Text>
              <Text style={styles.emptySubtitle}>Your messages will appear here.</Text>
            </Pressable>
          )}
          renderMessage={renderMessage}
          renderSend={renderSend}
          renderScrollToLatest={renderScrollToLatest}
        />
      </View>
      {historyOpen ? (
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Chats</Text>
            <Pressable
              accessibilityLabel="Close conversations"
              accessibilityRole="button"
              onPress={() => setHistoryOpen(false)}
              style={styles.drawerClose}
            >
              <Text style={styles.drawerCloseGlyph}>×</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityLabel="New chat"
            accessibilityRole="button"
            onPress={() => void newConversation()}
            style={styles.newChatRow}
          >
            <Svg height={24} viewBox="0 0 24 24" width={24}>
              <Path
                d="M13 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 3l5 5M10 14l-1 4 4-1L22 8l-5-5z"
                fill="none"
                stroke="#111111"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </Svg>
            <Text style={styles.newChatLabel}>New chat</Text>
          </Pressable>
          <Text style={styles.recentHeading}>Recent</Text>
          <View style={styles.drawerList}>
            {historyError ? (
              <Pressable
                accessibilityLabel="Retry loading conversations"
                accessibilityRole="button"
                onPress={() => void refreshHistory()}
                style={styles.historyError}
              >
                <Text style={styles.noticeText}>{historyError}</Text>
              </Pressable>
            ) : null}
            {!historyError && entries.length === 0 ? (
              <Text style={styles.emptyHistory}>No conversations yet</Text>
            ) : null}
            {entries.map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.entry,
                  entry.id === conversationIdRef.current && styles.entrySelected,
                ]}
              >
                <Pressable
                  accessibilityLabel={entry.title || 'Untitled conversation'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: entry.id === conversationIdRef.current }}
                  onPress={() => void openConversation(entry.id)}
                  style={styles.entryOpen}
                >
                  <Text numberOfLines={1} style={styles.entryText}>
                    {entry.title || 'Untitled conversation'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Conversation actions, ${entry.title || 'Untitled conversation'}`}
                  accessibilityRole="button"
                  disabled={mutationPending}
                  onPress={() => conversationActions(entry)}
                  style={styles.entryActions}
                >
                  <Svg height={24} viewBox="0 0 24 24" width={24}>
                    <Path d="M5 12h.01M12 12h.01M19 12h.01" stroke="#6b6b70" strokeWidth={4} />
                  </Svg>
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityLabel={`Settings, build ${BUILD_NUMBER}`}
            accessibilityRole="button"
            onPress={() => {
              Keyboard.dismiss()
              setHistoryOpen(false)
              setSettingsOpen(true)
            }}
            style={styles.drawerSettings}
          >
            <Text style={styles.drawerSettingsGlyph}>⚙</Text>
            <Text style={styles.drawerSettingsLabel}>
              Settings <Text style={styles.drawerBuildNumber}>b{BUILD_NUMBER}</Text>
            </Text>
          </Pressable>
        </View>
      ) : null}
      <SettingsSheet
        service={secretsRef.current}
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          void (async () => {
            setHasProviderKey(await secretsRef.current.hasProviderKey())
            if (!(await secretsRef.current.getS3Config())) await sync.clear()
            else await sync.run()
          })()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#ffffff', flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d1d1d6',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerIcon: { color: '#111111', fontSize: 24, lineHeight: 28 },
  modelPicker: {
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 8,
    height: 44,
    maxWidth: 208,
    paddingHorizontal: 16,
    width: 208,
  },
  modelLabel: { color: '#111111', flexShrink: 1, fontSize: 17, lineHeight: 22 },
  chat: { flex: 1 },
  notice: {
    backgroundColor: '#fff1f0',
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
  },
  noticeText: { color: '#c62828', fontSize: 13, lineHeight: 18 },
  setupNotice: {
    alignItems: 'center',
    backgroundColor: '#eef6ff',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 12,
    marginTop: 8,
    minHeight: 68,
    paddingHorizontal: 12,
  },
  setupNoticeGlyph: { color: '#174080', fontSize: 24 },
  setupNoticeText: { color: '#174080', flex: 1, fontSize: 17, lineHeight: 22 },
  s3Notice: {
    alignItems: 'center',
    backgroundColor: '#fff1f0',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
    minHeight: 68,
    paddingLeft: 12,
  },
  s3NoticeText: { color: '#b42318', flex: 1, fontSize: 17, lineHeight: 22 },
  s3Retry: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  s3RetryText: { color: '#b42318', fontSize: 30 },
  emptyState: {
    alignItems: 'flex-start',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: { color: '#111111', fontSize: 22, fontWeight: '500', lineHeight: 28 },
  emptySubtitle: { color: '#6b6b70', fontSize: 17, lineHeight: 22, marginTop: 4 },
  userMessage: { alignSelf: 'flex-end', marginTop: 12, maxWidth: '72%' },
  assistantMessage: { alignSelf: 'stretch', marginTop: 12 },
  userBubble: {
    backgroundColor: '#e9e9ed',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageText: { color: '#111111', fontSize: 17, lineHeight: 22 },
  editMessage: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    height: 44,
    justifyContent: 'center',
    marginTop: 4,
    width: 44,
  },
  editMessageSelected: { backgroundColor: '#eaf3ff', borderRadius: 22 },
  editRow: {
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderColor: '#d1d1d6',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    height: 44,
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 8,
    paddingLeft: 16,
    paddingRight: 4,
  },
  editRowLabel: { color: '#6b6b70', fontSize: 15, fontWeight: '600', lineHeight: 20 },
  editCancel: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  editCancelText: { color: '#111111', fontSize: 32, fontWeight: '300', lineHeight: 32 },
  sendButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sendEnabled: { backgroundColor: '#007aff' },
  sendDisabled: { backgroundColor: '#e5e5ea' },
  scrollToLatest: {
    alignItems: 'center',
    backgroundColor: '#e5e5ea',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  scrollToLatestLabel: { color: '#111111', fontSize: 15, fontWeight: '600', lineHeight: 20 },
  drawer: {
    backgroundColor: '#ffffff',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  drawerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 16,
  },
  drawerTitle: { color: '#111111', fontSize: 28, fontWeight: '700', lineHeight: 34 },
  drawerClose: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  drawerCloseGlyph: { color: '#111111', fontSize: 32, fontWeight: '300', lineHeight: 32 },
  newChatRow: {
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    borderRadius: 28,
    flexDirection: 'row',
    gap: 12,
    height: 56,
    marginHorizontal: 16,
    paddingHorizontal: 16,
  },
  newChatLabel: { color: '#111111', fontSize: 17, lineHeight: 22 },
  recentHeading: {
    color: '#6b6b70',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginLeft: 16,
    marginTop: 24,
  },
  drawerList: { paddingHorizontal: 16, paddingTop: 8 },
  entry: {
    borderRadius: 14,
    flexDirection: 'row',
    minHeight: 52,
    paddingLeft: 12,
  },
  entrySelected: { backgroundColor: '#e9e9ed' },
  entryOpen: { flex: 1, justifyContent: 'center', minHeight: 52, paddingVertical: 14 },
  entryActions: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  entryText: { color: '#111111', fontSize: 17, lineHeight: 22 },
  emptyHistory: { color: '#6b6b70', fontSize: 17, marginTop: 12, textAlign: 'center' },
  historyError: { minHeight: 44, padding: 12 },
  drawerSettings: {
    alignItems: 'center',
    borderTopColor: '#d1d1d6',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    height: 56,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  drawerSettingsGlyph: { color: '#111111', fontSize: 24, lineHeight: 28 },
  drawerSettingsLabel: { color: '#111111', fontSize: 17, lineHeight: 22 },
  drawerBuildNumber: { color: '#6b6b70', fontSize: 13, fontVariant: ['tabular-nums'], lineHeight: 18 },
})
