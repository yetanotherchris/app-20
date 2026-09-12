import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
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
import { createSecretService, type SecretErrorCode } from '../secrets/secretService'
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
  const [draft, setDraftState] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [entries, setEntries] = useState<readonly ManifestEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [gatePending, setGatePending] = useState(false)
  const [syncState, setSyncState] = useState('disabled')

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
          autosave.trigger()
        }
      })()
    },
  })
  messagesRef.current = chat.messages

  useEffect(() => {
    void storeRef.current.list().then((result) => setEntries(result.entries))
  }, [])

  useEffect(() => {
    const subscription = appState.addEventListener('change', (state) => {
      if (state !== 'active') void autosave.flush()
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

  async function submit(): Promise<void> {
    if (gatePending || draftRef.current.trim().length === 0) return
    setGatePending(true)
    try {
      if (!(await secretsRef.current.hasProviderKey())) {
        const imported = await secretsRef.current.import('provider-key')
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
    setDraft(result.conversation.draft ?? '')
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
    const result = await secretsRef.current.import('s3')
    if (!result.ok) {
      if (result.code !== 'chooser-cancelled') setNotice(errorMessage(result.code))
      return
    }
    setNotice('S3 credentials imported.')
    void sync.run()
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refreshHistory().then(() => setHistoryOpen(true))}
        >
          <Text style={styles.topBarButton}>History</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void newConversation()}>
          <Text style={styles.topBarButton}>New</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void importS3Credentials()}>
          <Text style={styles.topBarButton}>Sync: {syncState}</Text>
        </Pressable>
      </View>
      <View style={styles.chat}>
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
          onMessageAction={chat.onMessageAction}
          onLinkPress={() => undefined}
          placeholder="Send a message"
        />
      </View>
      {notice ? (
        <Text accessibilityRole="alert" style={styles.notice}>
          {notice}
        </Text>
      ) : null}
      {historyOpen ? (
        <View style={styles.drawer}>
          <Pressable accessibilityRole="button" onPress={() => setHistoryOpen(false)}>
            <Text style={styles.topBarButton}>Close</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void newConversation()}>
            <Text style={styles.topBarButton}>New conversation</Text>
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
  screen: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topBarButton: { color: '#0f766e', fontSize: 16, fontWeight: '600' },
  chat: { flex: 1 },
  notice: { backgroundColor: '#fee2e2', color: '#b91c1c', margin: 12, padding: 10 },
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
