import { useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Chat, type Message, type ThemeName, type MessageAction } from '@app-20/chat'
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

export function ChatDemo({ initialMessages = [] }: ChatDemoProps) {
  const [messages, setMessages] = useState<readonly Message[]>(() =>
    initialMessages.length > 0
      ? initialMessages
      : [
          makeMessage('user', 'Hello, how do I export a CSV in Node?'),
          makeMessage(
            'assistant',
            'Use the `csv-stringify` package. Call `stringify` with your rows and a callback.',
          ),
          makeMessage('user', 'Can it stream to a file?'),
          makeMessage(
            'assistant',
            'Yes. `csv-stringify` accepts a writable stream as the destination.',
          ),
        ],
  )
  const [hasEarlier, setHasEarlier] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const [unread, setUnread] = useState(0)
  const [lastLinkPress, setLastLinkPress] = useState<string | null>(null)
  const [copyResult, setCopyResult] = useState<'idle' | 'ok' | 'denied'>('idle')
  const copyResultRef = useRef(copyResult)
  copyResultRef.current = copyResult
  const [draft, setDraft] = useState('')
  const [chatStatus, setChatStatus] = useState<'idle' | 'submitting' | 'streaming' | 'stopping'>(
    'idle',
  )
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [blurBehavior, setBlurBehavior] = useState<'send' | 'keep'>('keep')
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

  const handleSubmit = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    setSubmitCount((n) => n + 1)
    setMessages((current) => [...current, makeMessage('user', text)])
    setDraft('')
    setChatStatus('streaming')
    replyTimerRef.current = setTimeout(() => {
      setMessages((current) => [
        ...current,
        makeMessage('assistant', `Reply to: ${text.slice(0, 40)}`),
      ])
      setChatStatus('idle')
    }, 800)
  }, [draft])

  const handleStop = useCallback(() => {
    if (replyTimerRef.current) {
      clearTimeout(replyTimerRef.current)
      replyTimerRef.current = null
    }
    setMessages((current) => {
      const last = current[current.length - 1]
      if (!last || last.role !== 'assistant') return current
      const updated: Message = { ...last, status: 'stopped', updatedAt: new Date().toISOString() }
      return [...current.slice(0, -1), updated]
    })
    setChatStatus('idle')
  }, [])

  const appendMessage = useCallback(() => {
    setMessages((current) => [
      ...current,
      makeMessage('assistant', `Streamed response chunk ${current.length + 1}.`),
    ])
  }, [])

  const streamNextChunk = useCallback(() => {
    setMessages((current) => {
      const last = current[current.length - 1]
      if (!last || last.role !== 'assistant')
        return [...current, makeMessage('assistant', 'Streaming...', 'streaming')]
      const updated: Message = {
        ...last,
        status: 'streaming',
        updatedAt: new Date().toISOString(),
        contentParts: [
          {
            kind: 'text',
            format: 'markdown',
            text: `${plainText(last)} chunk-${Date.now()} `,
          },
        ],
      }
      return [...current.slice(0, -1), updated]
    })
  }, [])

  const simulateStreaming = useCallback(() => {
    setMessages((current) => [
      ...current,
      makeMessage('assistant', 'Streaming a response...', 'streaming'),
    ])
    setChatStatus('streaming')
  }, [])

  const markLastError = useCallback(() => {
    // Keep the chat status idle so the message list stays visible and the
    // message-level error badge renders (an error chat status replaces the
    // list with the error state view).
    setMessages((current) => {
      const last = current[current.length - 1]
      if (!last) return current
      const updated: Message = { ...last, status: 'error', updatedAt: new Date().toISOString() }
      return [...current.slice(0, -1), updated]
    })
    setChatStatus('idle')
  }, [])

  const removeLastMessage = useCallback(() => {
    setMessages((current) => current.slice(0, -1))
  }, [])

  const loadEarlier = useCallback(() => {
    setLoadingEarlier(true)
    setHasEarlier(true)
    setTimeout(() => {
      setMessages((current) => {
        const earlier = Array.from({ length: 20 }, (_, i) =>
          makeMessage(i % 2 === 0 ? 'user' : 'assistant', `Earlier message ${i + 1}`),
        )
        return [...earlier, ...current]
      })
      setLoadingEarlier(false)
    }, 50)
  }, [])

  const exhaustEarlier = useCallback(() => {
    setLoadingEarlier(true)
    setTimeout(() => {
      setMessages((current) => {
        const earlier = Array.from({ length: 20 }, (_, i) =>
          makeMessage(i % 2 === 0 ? 'user' : 'assistant', `Final earlier message ${i + 1}`),
        )
        return [...earlier, ...current]
      })
      setHasEarlier(false)
      setLoadingEarlier(false)
    }, 50)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setHasEarlier(false)
    setChatStatus('idle')
  }, [])

  const simulateSubmitting = useCallback(() => {
    setMessages([])
    setHasEarlier(false)
    setChatStatus('submitting')
  }, [])

  const simulateError = useCallback(() => {
    setMessages([])
    setHasEarlier(false)
    setChatStatus('error')
  }, [])

  const loadThousand = useCallback(() => {
    const bulk: Message[] = Array.from({ length: 1000 }, (_, i) =>
      makeMessage(i % 2 === 0 ? 'user' : 'assistant', `Bulk message ${i + 1}`),
    )
    setMessages(bulk)
    setHasEarlier(false)
  }, [])

  const loadThousandLarge = useCallback(() => {
    const bulk: Message[] = Array.from({ length: 1000 }, (_, i) =>
      makeMessage(i % 2 === 0 ? 'user' : 'assistant', largeMessageText),
    )
    setMessages(bulk)
    setHasEarlier(false)
  }, [])

  const loadMarkdownSuite = useCallback(() => {
    setMessages([
      makeMessage('system', 'Conversation started with a markdown suite'),
      makeMessage('user', 'Please show me the full markdown suite.'),
      makeMessage('assistant', markdownSuite),
      makeMessage('assistant', unsafeMarkdown),
    ])
    setHasEarlier(false)
  }, [])

  const loadLargeMarkdown = useCallback(() => {
    setMessages([
      makeMessage('user', 'Give me a very long answer, please.'),
      makeMessage('assistant', `# Long response\n\n${largeMessageText}`),
    ])
    setHasEarlier(false)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  const messageActions = useMemo<readonly MessageAction[]>(
    () =>
      actionsEnabled
        ? [
            {
              id: 'copy',
              label: 'Copy message',
              group: 'Actions',
              onAction: () => {},
            },
            {
              id: 'retry',
              label: 'Retry',
              group: 'Response',
              onAction: () => {},
            },
          ]
        : [],
    [actionsEnabled],
  )

  const handleMessageAction = useCallback((_action: MessageAction, message: Message) => {
    setSubmitCount((n) => n + 1)
    setLastLinkPress(`action on ${message.id}`)
  }, [])

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
        <DemoButton
          label="Simulate streaming"
          onPress={simulateStreaming}
          testID="demo.simulate-streaming"
        />
        <DemoButton label="Mark last error" onPress={markLastError} testID="demo.mark-error" />
        <DemoButton
          label="Remove last message"
          onPress={removeLastMessage}
          testID="demo.remove-last-message"
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
      simulateStreaming,
      markLastError,
      removeLastMessage,
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
      </View>
      <Chat
        messages={messages}
        draft={draft}
        status={chatStatus}
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
          customTheme ? { colors: { primary: '#9333ea', userBubble: '#9333ea' } } : undefined
        }
        renderMessage={renderMessage}
        contentRenderers={contentRenderers}
        markdownElementRenderers={markdownElementRenderers}
        renderSend={customControls ? customSend : undefined}
        renderStop={customControls ? customStop : undefined}
        renderScrollToLatest={customControls ? customScrollToLatest : undefined}
        renderComposerControls={customControls ? customComposerControl : undefined}
        messageActions={messageActions}
        onMessageAction={handleMessageAction}
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
