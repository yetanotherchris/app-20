import { useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  LLMChat,
  useChatSession,
  type ChatOperation,
  type ChatSessionControls,
  type ChatStatus,
  type Message,
  type MessageAction,
  type ThemeName,
} from 'app-20-llmchat'
import { largeMessageText } from './fixtures/large-message'
import markdownSuite from './fixtures/markdown-suite.md?raw'
import unsafeMarkdown from './fixtures/unsafe-markdown.md?raw'

export interface ChatDemoProps {
  initialMessages?: readonly Message[]
}

let nextId = 1000

function makeMessage(
  role: 'user' | 'assistant' | 'system',
  text: string,
  status: Message['status'] = 'complete',
): Message {
  return {
    id: `demo-${nextId++}`,
    role,
    contentParts: [{ kind: 'text', format: role === 'user' ? 'plain' : 'markdown', text }],
    status,
    createdAt: new Date().toISOString(),
  }
}

function plainText(message: Message): string {
  return message.contentParts.map((part) => part.text).join(' ')
}

function DemoButton({
  label,
  onPress,
  testID,
}: {
  label: string
  onPress: () => void
  testID: string
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button} testID={testID}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  )
}

const DEFAULT_MESSAGES: readonly Message[] = [
  makeMessage('user', 'Hello, how do I export a CSV in Node?'),
  makeMessage(
    'assistant',
    'Use the `csv-stringify` package. Call `stringify` with your rows and a callback.',
  ),
  makeMessage('user', 'Can it stream to a file?'),
  makeMessage('assistant', 'Yes. `csv-stringify` accepts a writable stream as the destination.'),
]

type StateOverride = { messages: readonly Message[]; status: ChatStatus }

export function ChatDemo({ initialMessages = DEFAULT_MESSAGES }: ChatDemoProps) {
  const [override, setOverride] = useState<StateOverride | null>(null)
  const [hasEarlier, setHasEarlier] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const [unread, setUnread] = useState(0)
  const [lastLinkPress, setLastLinkPress] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState('')
  const [copyResult, setCopyResult] = useState<'idle' | 'ok' | 'denied'>('idle')
  const copyResultRef = useRef(copyResult)
  copyResultRef.current = copyResult
  const [draft, setDraft] = useState('')
  const [submitCount, setSubmitCount] = useState(0)
  const [theme, setTheme] = useState<ThemeName>('light')
  const [customTheme, setCustomTheme] = useState(false)
  const [customMessageRenderer, setCustomMessageRenderer] = useState(false)
  const [customContentRenderer, setCustomContentRenderer] = useState(false)
  const [customControls, setCustomControls] = useState(false)
  const [customIcons, setCustomIcons] = useState(false)
  const [actionsEnabled, setActionsEnabled] = useState(false)
  const [customStates, setCustomStates] = useState(false)
  const [customMarkdownElements, setCustomMarkdownElements] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [sendDisabled, setSendDisabled] = useState(false)
  const [copyDisabled, setCopyDisabled] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [blurBehavior, setBlurBehavior] = useState<'send' | 'keep'>('keep')

  const sessionControlsRef = useRef<ChatSessionControls | null>(null)
  const staleControlsRef = useRef<ChatSessionControls | null>(null)
  const session = useChatSession({
    request: useCallback((_op: ChatOperation, controls: ChatSessionControls) => {
      // The transport is driven manually by the demo buttons so e2e runs are
      // deterministic; it never auto-completes.
      staleControlsRef.current = sessionControlsRef.current
      sessionControlsRef.current = controls
    }, []),
    copyMessageText: useCallback((_message: Message, text: string) => {
      setCopiedText(text)
      return Promise.resolve()
    }, []),
    initialMessages,
  })

  const {
    messages: sessionMessages,
    status: sessionStatus,
    submit,
    stop,
    replaceMessages,
    onMessageAction: runSessionAction,
    messageActions: sessionActions,
  } = session

  const messages = override ? override.messages : sessionMessages
  const status = override ? override.status : sessionStatus
  const messageActions = actionsEnabled ? sessionActions : []

  const handleSubmit = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    setSubmitCount((n) => n + 1)
    setOverride(null)
    submit(text)
    setDraft('')
  }, [draft, submit])

  const handleStop = useCallback(() => {
    setOverride(null)
    stop()
  }, [stop])

  const appendMessage = useCallback(() => {
    setOverride(null)
    replaceMessages([
      ...sessionMessages,
      makeMessage('assistant', `Streamed response chunk ${sessionMessages.length + 1}.`),
    ])
  }, [replaceMessages, sessionMessages])

  const streamNextChunk = useCallback(() => {
    const controls = sessionControlsRef.current
    if (controls) {
      controls.appendChunk(` chunk-${Date.now()} `)
      return
    }
    // No active operation: update the last assistant message in place so the
    // legacy streaming-position tests keep a stable row identity. This
    // synthesizes a streaming state without an operation (demo-only).
    const current = sessionMessages
    replaceMessages(
      current.map((m, index) =>
        index === current.length - 1 && m.role === 'assistant'
          ? {
              ...m,
              status: 'streaming',
              updatedAt: new Date().toISOString(),
              contentParts: [{ kind: 'text', format: 'markdown', text: `${plainText(m)} chunk ` }],
            }
          : m,
      ),
    )
  }, [replaceMessages, sessionMessages])

  const streamChunk = useCallback(() => {
    setOverride(null)
    sessionControlsRef.current?.appendChunk('chunk ')
  }, [])

  const streamMarkdown = useCallback(() => {
    setOverride(null)
    sessionControlsRef.current?.appendChunk('```js\nconst answer = 42')
  }, [])

  const staleChunk = useCallback(() => {
    setOverride(null)
    staleControlsRef.current?.appendChunk(' STALE ')
  }, [])

  const completeStream = useCallback(() => {
    setOverride(null)
    sessionControlsRef.current?.complete()
  }, [])

  const failStream = useCallback(() => {
    setOverride(null)
    sessionControlsRef.current?.fail()
  }, [])

  const simulateStreaming = useCallback(() => {
    setOverride(null)
    // End any lingering operation so the new submit is not blocked.
    sessionControlsRef.current?.complete()
    submit('Streaming demo')
    sessionControlsRef.current?.appendChunk('Streaming response...')
  }, [submit])

  const removeLastMessage = useCallback(() => {
    replaceMessages(sessionMessages.slice(0, -1))
  }, [replaceMessages, sessionMessages])

  const loadEarlier = useCallback(() => {
    setLoadingEarlier(true)
    setHasEarlier(true)
    setTimeout(() => {
      const earlier = Array.from({ length: 20 }, (_, i) =>
        makeMessage(i % 2 === 0 ? 'user' : 'assistant', `Earlier message ${i + 1}`),
      )
      replaceMessages([...earlier, ...sessionMessages])
      setLoadingEarlier(false)
    }, 50)
  }, [replaceMessages, sessionMessages])

  const exhaustEarlier = useCallback(() => {
    setLoadingEarlier(true)
    setTimeout(() => {
      const earlier = Array.from({ length: 20 }, (_, i) =>
        makeMessage(i % 2 === 0 ? 'user' : 'assistant', `Final earlier message ${i + 1}`),
      )
      replaceMessages([...earlier, ...sessionMessages])
      setHasEarlier(false)
      setLoadingEarlier(false)
    }, 50)
  }, [replaceMessages, sessionMessages])

  const clearMessages = useCallback(() => {
    setOverride(null)
    replaceMessages([])
  }, [replaceMessages])

  const replaceConversation = useCallback(() => {
    setOverride(null)
    replaceMessages([makeMessage('system', 'New conversation')])
  }, [replaceMessages])

  const simulateSubmitting = useCallback(() => {
    setOverride({ messages: [], status: 'submitting' })
  }, [])

  const simulateError = useCallback(() => {
    setOverride({ messages: [], status: 'error' })
  }, [])

  const loadThousand = useCallback(() => {
    setOverride(null)
    const bulk: Message[] = Array.from({ length: 1000 }, (_, i) =>
      makeMessage(i % 2 === 0 ? 'user' : 'assistant', `Bulk message ${i + 1}`),
    )
    replaceMessages(bulk)
  }, [replaceMessages])

  const loadThousandLarge = useCallback(() => {
    setOverride(null)
    const bulk: Message[] = Array.from({ length: 1000 }, (_, i) =>
      makeMessage(i % 2 === 0 ? 'user' : 'assistant', largeMessageText),
    )
    replaceMessages(bulk)
  }, [replaceMessages])

  const loadMarkdownSuite = useCallback(() => {
    setOverride(null)
    replaceMessages([
      makeMessage('system', 'Conversation started with a markdown suite'),
      makeMessage('user', 'Please show me the full markdown suite.'),
      makeMessage('assistant', markdownSuite),
      makeMessage('assistant', unsafeMarkdown),
    ])
  }, [replaceMessages])

  const loadLargeMarkdown = useCallback(() => {
    setOverride(null)
    replaceMessages([
      makeMessage('user', 'Give me a very long answer, please.'),
      makeMessage('assistant', `# Long response\n\n${largeMessageText}`),
    ])
  }, [replaceMessages])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  const handleMessageAction = useCallback(
    (action: MessageAction, message: Message) => {
      setLastLinkPress(`action on ${message.id}`)
      runSessionAction(action, message)
    },
    [runSessionAction],
  )

  const renderMessage = useMemo(() => {
    if (!customMessageRenderer) return undefined
    return (message: Message) => (
      <View key={message.id} style={styles.customMessage} testID={`chat.message.${message.id}`}>
        <Text style={styles.customMessageText}>custom: {plainText(message)}</Text>
      </View>
    )
  }, [customMessageRenderer])

  const contentRenderers = useMemo(
    () =>
      customContentRenderer
        ? {
            'text.plain': ({ part }: { part: { text: string }; index: number }) => (
              <Text testID="demo.custom-plain-renderer">custom-plain: {part.text}</Text>
            ),
          }
        : undefined,
    [customContentRenderer],
  )

  const markdownElementRenderers = useMemo(
    () =>
      customMarkdownElements
        ? {
            link: (children: React.ReactNode, href: string) => (
              <Text testID="demo.custom-markdown-link" style={styles.customLink}>
                [link:{href}]{children}
              </Text>
            ),
          }
        : undefined,
    [customMarkdownElements],
  )

  const customSend = useCallback(
    () => (
      <View style={styles.customControl} testID="demo.custom-send">
        <Text style={styles.customControlText}>Send!</Text>
      </View>
    ),
    [],
  )

  const customStop = useCallback(
    () => (
      <View style={styles.customControl} testID="demo.custom-stop">
        <Text style={styles.customControlText}>Stop!</Text>
      </View>
    ),
    [],
  )

  const customScrollToLatest = useCallback(
    () => (
      <View style={styles.customControl} testID="demo.custom-scroll">
        <Text style={styles.customControlText}>Latest</Text>
      </View>
    ),
    [],
  )

  const customComposerControl = useCallback(
    () => (
      <View style={styles.customControl} testID="demo.custom-composer-control">
        <Text style={styles.customControlText}>📎</Text>
      </View>
    ),
    [],
  )

  const icons = useMemo(
    () =>
      customIcons
        ? {
            send: <Text testID="demo.custom-send-icon">✈</Text>,
            stop: <Text testID="demo.custom-stop-icon">■</Text>,
            scrollToLatest: <Text testID="demo.custom-scroll-icon">↓</Text>,
            more: <Text testID="demo.custom-more-icon">☰</Text>,
          }
        : undefined,
    [customIcons],
  )

  const customEmptyState = useCallback(
    () => (
      <View style={styles.customState} testID="demo.custom-empty-state">
        <Text>Custom empty</Text>
      </View>
    ),
    [],
  )
  const customLoadingState = useCallback(
    () => (
      <View style={styles.customState} testID="demo.custom-loading-state">
        <Text>Custom loading</Text>
      </View>
    ),
    [],
  )
  const customTypingState = useCallback(
    () => (
      <View style={styles.customState} testID="demo.custom-typing-state">
        <Text>Custom typing</Text>
      </View>
    ),
    [],
  )
  const customErrorState = useCallback(
    () => (
      <View style={styles.customState} testID="demo.custom-error-state">
        <Text>Custom error</Text>
      </View>
    ),
    [],
  )

  const controls = useMemo(
    () => (
      <View style={styles.controls}>
        <DemoButton label="Append" onPress={appendMessage} testID="demo.append" />
        <DemoButton label="Stream chunk" onPress={streamNextChunk} testID="demo.stream" />
        <DemoButton label="Push chunk" onPress={streamChunk} testID="demo.stream-chunk" />
        <DemoButton label="Push markdown" onPress={streamMarkdown} testID="demo.stream-markdown" />
        <DemoButton label="Stale chunk" onPress={staleChunk} testID="demo.stale-chunk" />
        <DemoButton
          label="Complete stream"
          onPress={completeStream}
          testID="demo.complete-stream"
        />
        <DemoButton label="Fail stream" onPress={failStream} testID="demo.fail-stream" />
        <DemoButton
          label="Simulate streaming"
          onPress={simulateStreaming}
          testID="demo.simulate-streaming"
        />
        <DemoButton label="Mark last error" onPress={failStream} testID="demo.mark-error" />
        <DemoButton
          label="Remove last message"
          onPress={removeLastMessage}
          testID="demo.remove-last-message"
        />
        <DemoButton
          label="Replace conversation"
          onPress={replaceConversation}
          testID="demo.replace-conversation"
        />
        <DemoButton label="Load earlier" onPress={loadEarlier} testID="demo.load-earlier" />
        <DemoButton label="Exhaust" onPress={exhaustEarlier} testID="demo.exhaust" />
        <DemoButton label="Load 1000" onPress={loadThousand} testID="demo.load-1000" />
        <DemoButton
          label="Load 1000 large"
          onPress={loadThousandLarge}
          testID="demo.load-1000-large"
        />
        <DemoButton
          label="Markdown suite"
          onPress={loadMarkdownSuite}
          testID="demo.markdown-suite"
        />
        <DemoButton
          label={copyResult === 'denied' ? 'Copy: denied' : 'Copy: allow'}
          onPress={() => setCopyResult((prev) => (prev === 'denied' ? 'idle' : 'denied'))}
          testID="demo.toggle-copy"
        />
        <DemoButton
          label="Single large markdown"
          onPress={loadLargeMarkdown}
          testID="demo.large-markdown"
        />
        <DemoButton
          label={blurBehavior === 'send' ? 'Blur: send' : 'Blur: keep'}
          onPress={() => setBlurBehavior((prev) => (prev === 'send' ? 'keep' : 'send'))}
          testID="demo.toggle-blur"
        />
        <DemoButton label={`Theme: ${theme}`} onPress={toggleTheme} testID="demo.toggle-theme" />
        <DemoButton
          label={customTheme ? 'Custom theme: on' : 'Custom theme: off'}
          onPress={() => setCustomTheme((v) => !v)}
          testID="demo.toggle-custom-theme"
        />
        <DemoButton
          label={customMessageRenderer ? 'Msg renderer: custom' : 'Msg renderer: default'}
          onPress={() => setCustomMessageRenderer((v) => !v)}
          testID="demo.toggle-message-renderer"
        />
        <DemoButton
          label={customContentRenderer ? 'Content renderer: custom' : 'Content renderer: default'}
          onPress={() => setCustomContentRenderer((v) => !v)}
          testID="demo.toggle-content-renderer"
        />
        <DemoButton
          label={customControls ? 'Controls: custom' : 'Controls: default'}
          onPress={() => setCustomControls((v) => !v)}
          testID="demo.toggle-controls"
        />
        <DemoButton
          label={customIcons ? 'Icons: custom' : 'Icons: default'}
          onPress={() => setCustomIcons((v) => !v)}
          testID="demo.toggle-icons"
        />
        <DemoButton
          label={actionsEnabled ? 'Actions: on' : 'Actions: off'}
          onPress={() => setActionsEnabled((v) => !v)}
          testID="demo.toggle-actions"
        />
        <DemoButton
          label={customStates ? 'States: custom' : 'States: default'}
          onPress={() => setCustomStates((v) => !v)}
          testID="demo.toggle-states"
        />
        <DemoButton
          label={customMarkdownElements ? 'MD elements: custom' : 'MD elements: default'}
          onPress={() => setCustomMarkdownElements((v) => !v)}
          testID="demo.toggle-markdown-elements"
        />
        <DemoButton label="Clear messages" onPress={clearMessages} testID="demo.clear-messages" />
        <DemoButton
          label="Simulate submitting"
          onPress={simulateSubmitting}
          testID="demo.simulate-submitting"
        />
        <DemoButton label="Simulate error" onPress={simulateError} testID="demo.simulate-error" />
        <DemoButton
          label={disabled ? 'Disabled: on' : 'Disabled: off'}
          onPress={() => setDisabled((v) => !v)}
          testID="demo.toggle-disabled"
        />
        <DemoButton
          label={readOnly ? 'Read-only: on' : 'Read-only: off'}
          onPress={() => setReadOnly((v) => !v)}
          testID="demo.toggle-read-only"
        />
        <DemoButton
          label={sendDisabled ? 'Cap send: off' : 'Cap send: on'}
          onPress={() => setSendDisabled((v) => !v)}
          testID="demo.toggle-cap-send"
        />
        <DemoButton
          label={copyDisabled ? 'Cap copy: off' : 'Cap copy: on'}
          onPress={() => setCopyDisabled((v) => !v)}
          testID="demo.toggle-cap-copy"
        />
        <DemoButton
          label={highContrast ? 'High contrast: on' : 'High contrast: off'}
          onPress={() => setHighContrast((v) => !v)}
          testID="demo.toggle-high-contrast"
        />
        <DemoButton
          label={reducedMotion ? 'Reduced motion: on' : 'Reduced motion: off'}
          onPress={() => setReducedMotion((v) => !v)}
          testID="demo.toggle-reduced-motion"
        />
      </View>
    ),
    [
      appendMessage,
      streamNextChunk,
      streamChunk,
      streamMarkdown,
      staleChunk,
      completeStream,
      failStream,
      simulateStreaming,
      removeLastMessage,
      replaceConversation,
      loadEarlier,
      exhaustEarlier,
      loadThousand,
      loadThousandLarge,
      loadMarkdownSuite,
      copyResult,
      loadLargeMarkdown,
      blurBehavior,
      theme,
      toggleTheme,
      customTheme,
      customMessageRenderer,
      customContentRenderer,
      customControls,
      customIcons,
      actionsEnabled,
      customStates,
      customMarkdownElements,
      clearMessages,
      simulateSubmitting,
      simulateError,
      disabled,
      readOnly,
      sendDisabled,
      copyDisabled,
      highContrast,
      reducedMotion,
    ],
  )

  return (
    <View style={styles.container}>
      {controls}
      <View style={styles.statusRow}>
        <Text testID="demo.at-bottom" style={styles.statusText}>
          {atBottom ? 'at-bottom' : 'scrolled-up'}
        </Text>
        <Text testID="demo.unread" style={styles.statusText}>
          unread: {unread}
        </Text>
        <Text testID="demo.last-link" style={styles.statusText}>
          link: {lastLinkPress ?? 'none'}
        </Text>
        <Text testID="demo.submit-count" style={styles.statusText}>
          submits: {submitCount}
        </Text>
        <Text testID="demo.copied-text" style={styles.statusText}>
          copied: {copiedText || 'none'}
        </Text>
      </View>
      <LLMChat.Root
        messages={messages}
        draft={draft}
        status={status}
        hasEarlierMessages={hasEarlier}
        isLoadingEarlier={loadingEarlier}
        onChangeDraft={setDraft}
        onSubmit={handleSubmit}
        onStop={handleStop}
        onLoadEarlier={loadEarlier}
        onAtBottomChange={setAtBottom}
        onUnreadCountChange={setUnread}
        onLinkPress={(href) => {
          setLastLinkPress(href)
        }}
        onCopyCode={(_code) => {
          if (copyResultRef.current === 'denied') {
            return Promise.reject(new Error('clipboard denied'))
          }
          return Promise.resolve()
        }}
        theme={theme}
        themeOverride={
          customTheme ? { colors: { primary: '#9333ea', userBubble: '#9333ea', userBubbleText: '#ffffff' } } : undefined
        }
        renderMessage={renderMessage}
        contentRenderers={contentRenderers}
        markdownElementRenderers={markdownElementRenderers}
        renderSend={customControls ? customSend : undefined}
        renderStop={customControls ? customStop : undefined}
        renderScrollToLatest={customControls ? customScrollToLatest : undefined}
        renderComposerControls={customControls ? customComposerControl : undefined}
        messageActions={messageActions}
        onMessageAction={actionsEnabled ? handleMessageAction : undefined}
        icons={customIcons ? icons : undefined}
        renderEmptyState={customStates ? customEmptyState : undefined}
        renderLoadingState={customStates ? customLoadingState : undefined}
        renderTypingState={customStates ? customTypingState : undefined}
        renderErrorState={customStates ? customErrorState : undefined}
        disabled={disabled}
        readOnly={readOnly}
        capabilities={
          sendDisabled || copyDisabled
            ? { send: sendDisabled ? false : undefined, copy: copyDisabled ? false : undefined }
            : undefined
        }
        // `|| undefined` keeps the system settings authoritative until the
        // host forces a state; passing `false` would override detection.
        highContrast={highContrast || undefined}
        reducedMotion={reducedMotion || undefined}
        blurBehavior={blurBehavior}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  button: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 12,
    color: '#475569',
  },
  customMessage: {
    padding: 8,
    marginVertical: 4,
    marginHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
  },
  customMessageText: {
    color: '#78350f',
  },
  customLink: {
    color: '#0d9488',
    textDecorationLine: 'underline',
  },
  customControl: {
    borderRadius: 20,
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customControlText: {
    color: '#ffffff',
    fontSize: 14,
  },
  customState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
  },
})
