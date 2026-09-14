import { useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  LLMChat,
  useChatSession,
  type ChatOperation,
  type ChatSessionControls,
  type Message,
} from 'app-20-llmchat'
import { AUTOMATIC_MODEL, createOpenRouterProvider } from '@app-20/ai-provider'
import {
  createConversationStore,
  type Conversation,
  type ManifestEntry,
} from '@app-20/conversation-storage'
import type { AppStateStatus } from 'react-native'
import { createConversationFilePort } from '../storage/conversationFilePort'
import {
  createSecretService,
  type SecretErrorCode,
  type SecretResult,
} from '../secrets/secretService'
import { AutosaveQueue } from './autosaveQueue'
import { fromConversation, toConversation, toProviderMessages } from './conversation'
import { createSyncService } from '../sync/syncService'

interface AppStateSource {
  addEventListener(type: 'change', listener: (state: AppStateStatus) => void): { remove(): void }
}

interface IosChatScreenProps {
  appState: AppStateSource
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function errorMessage(code: SecretErrorCode): string {
  if (code === 'chooser-cancelled') return 'Import cancelled.'
  if (code === 'invalid-secret') return 'The selected file is not a valid credential.'
  if (code === 'multiple-secrets')
    return 'The selected file contains more than one credential kind.'
  return 'The credential could not be imported.'
}

export function IosChatScreen({ appState }: IosChatScreenProps): React.JSX.Element {
  const secretsRef = useRef(createSecretService())
  const storeRef = useRef(createConversationStore(createConversationFilePort()))
  const conversationIdRef = useRef(createId('conversation'))
  const createdAtRef = useRef(new Date().toISOString())
  const baseRef = useRef<Conversation | null>(null)
  const messagesRef = useRef<readonly Message[]>([])
  const draftRef = useRef('')
  const controllerRef = useRef<AbortController | null>(null)
  const controlsRef = useRef<ChatSessionControls | null>(null)
  const sessionGenerationRef = useRef(0)
  const secretPickerOpenRef = useRef(false)
  const [draft, setDraftState] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [entries, setEntries] = useState<readonly ManifestEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [clearPending, setClearPending] = useState(false)
  const [gatePending, setGatePending] = useState(false)
  const [syncState, setSyncState] = useState('disabled')
  const [isKeyboardVisible, setKeyboardVisible] = useState(false)
  const [keyboardInset, setKeyboardInset] = useState(0)
  const chatRegionRef = useRef<View>(null)

  const syncRef = useRef<ReturnType<typeof createSyncService> | null>(null)
  if (!syncRef.current) {
    syncRef.current = createSyncService(
      createConversationFilePort(),
      secretsRef.current,
      setSyncState,
    )
  }
  const sync = syncRef.current

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
        await storeRef.current.save(conversation)
        baseRef.current = conversation
        sync.schedule()
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
    draftRef.current = conversation.draft ?? ''
    setDraftState(conversation.draft ?? '')
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
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true)
      requestAnimationFrame(() => {
        chatRegionRef.current?.measureInWindow((_x, top, _width, height) => {
          setKeyboardInset(Math.max(0, top + height - event.endCoordinates.screenY))
        })
      })
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false)
      setKeyboardInset(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  useEffect(() => {
    const subscription = appState.addEventListener('change', (state) => {
      if (state !== 'active' && !secretPickerOpenRef.current) void autosave.flush()
      if (state === 'active') void sync.run()
    })
    return () => {
      subscription.remove()
      autosave.cancelDraftTimer()
      void autosave.flush()
    }
  }, [appState, autosave, sync])

  function setDraft(value: string): void {
    draftRef.current = value
    setDraftState(value)
    autosave.scheduleDraftSave()
  }

  async function importSecret(kind: 'provider-key' | 's3'): Promise<SecretResult> {
    secretPickerOpenRef.current = true
    try {
      return await secretsRef.current.import(kind)
    } finally {
      secretPickerOpenRef.current = false
    }
  }

  async function submit(): Promise<void> {
    if (gatePending || draftRef.current.trim().length === 0) return
    setGatePending(true)
    try {
      if (!(await secretsRef.current.hasProviderKey())) {
        const imported = await importSecret('provider-key')
        if (!imported.ok) {
          setNotice(errorMessage(imported.code))
          return
        }
      }
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
    const result = await storeRef.current.list()
    setEntries(result.entries.slice(0, 10))
  }

  async function openConversation(id: string): Promise<void> {
    if (!(await autosave.flush())) return
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
    draftRef.current = result.conversation.draft ?? ''
    setDraftState(result.conversation.draft ?? '')
    setHistoryOpen(false)
  }

  async function newConversation(): Promise<void> {
    if (!(await autosave.flush())) return
    controllerRef.current?.abort()
    conversationIdRef.current = createId('conversation')
    createdAtRef.current = new Date().toISOString()
    baseRef.current = null
    chat.replaceMessages([])
    setDraft('')
    setHistoryOpen(false)
  }

  async function importS3Credentials(): Promise<void> {
    const result = await importSecret('s3')
    if (!result.ok) {
      if (result.code !== 'chooser-cancelled') setNotice(errorMessage(result.code))
      return
    }
    setNotice('S3 credentials imported.')
    void sync.run()
  }

  function confirmClearConversations(): void {
    Alert.alert(
      'Clear all conversations?',
      'This permanently removes all local and synced beta conversations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear conversations',
          style: 'destructive',
          onPress: () => void clearConversations(),
        },
      ],
    )
  }

  async function clearConversations(): Promise<void> {
    if (clearPending || !(await autosave.flush())) return
    setClearPending(true)
    const priorGeneration = sessionGenerationRef.current
    sessionGenerationRef.current += 1
    try {
      await sync.clear()
      await storeRef.current.clear()
      controllerRef.current?.abort()
      conversationIdRef.current = createId('conversation')
      createdAtRef.current = new Date().toISOString()
      baseRef.current = null
      chat.replaceMessages([])
      draftRef.current = ''
      setDraftState('')
      setEntries([])
      setHistoryOpen(false)
      setNotice('Conversations cleared.')
    } catch {
      // A failed clear keeps the active request eligible to save its session.
      sessionGenerationRef.current = priorGeneration
      setNotice('Could not clear conversations. The current conversation remains available.')
    } finally {
      setClearPending(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open conversations"
          style={styles.headerButton}
          onPress={() => void refreshHistory().then(() => setHistoryOpen(true))}
        >
          <Text style={styles.headerIcon}>☰</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose model, Openrouter Auto"
          style={styles.modelPicker}
          onPress={() => {
            Keyboard.dismiss()
            Alert.alert('Model', 'Openrouter Auto', [{ text: 'Openrouter Auto' }])
          }}
        >
          <Text numberOfLines={1} style={styles.modelLabel}>
            Openrouter Auto
          </Text>
          <View style={styles.modelChevron}>
            <Text style={styles.modelChevronGlyph}>⌄</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={styles.headerButton}
          onPress={() => {
            Keyboard.dismiss()
            setNotice('Settings are not implemented yet.')
          }}
        >
          <Text style={styles.headerIcon}>⚙</Text>
        </Pressable>
      </View>
      <View ref={chatRegionRef} style={[styles.chat, { marginBottom: keyboardInset }]}>
        <LLMChat.Root
          messages={chat.messages}
          draft={draft}
          status={chat.status}
          hasEarlierMessages={false}
          isLoadingEarlier={false}
          disabled={gatePending || clearPending}
          onChangeDraft={setDraft}
          onSubmit={() => void submit()}
          onStop={stop}
          onLoadEarlier={() => undefined}
          messageActions={chat.messageActions}
          onMessageAction={chat.onMessageAction}
          onLinkPress={() => undefined}
          composerVariant="ios"
          minHeight={36}
          maxHeight={132}
          capabilities={{ stop: false }}
          placeholder="Ask anything"
          renderAboveComposer={() =>
            notice ? (
              <View style={styles.notice}>
                <Text accessibilityRole="alert" style={styles.noticeText}>
                  {notice}
                </Text>
              </View>
            ) : null
          }
        />
      </View>
      {historyOpen ? (
        <View style={styles.drawer}>
          <Pressable accessibilityRole="button" onPress={() => setHistoryOpen(false)}>
            <Text style={styles.headerIcon}>Close</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void newConversation()}>
            <Text style={styles.headerIcon}>New conversation</Text>
          </Pressable>
          {entries.map((entry) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              onPress={() => void openConversation(entry.id)}
            >
              <Text numberOfLines={1} style={styles.entry}>
                {entry.title || 'Untitled conversation'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
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
  },
  modelLabel: { color: '#111111', flexShrink: 1, fontSize: 17, lineHeight: 22 },
  modelChevron: { alignItems: 'center', height: 22, justifyContent: 'center', width: 16 },
  modelChevronGlyph: { color: '#007aff', fontSize: 16, lineHeight: 16 },
  chat: { flex: 1 },
  notice: {
    backgroundColor: '#fff1f0',
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
  },
  noticeText: { color: '#c62828', fontSize: 13, lineHeight: 18 },
  drawer: {
    backgroundColor: '#ffffff',
    bottom: 0,
    left: 0,
    padding: 16,
    position: 'absolute',
    top: 0,
    width: '85%',
  },
  entry: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    color: '#0f172a',
    paddingVertical: 12,
  },
})
