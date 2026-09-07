import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MessageList, MessageBubble, type Message } from '@app-20/chat'
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
        return [...current, makeMessage('assistant', 'Streaming...')]
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

  const renderMessage = useCallback(
    (message: Message) => (
      <MessageBubble
        key={message.id}
        message={message}
        onLinkPress={(href) => {
          console.log(`[demo] link press: ${href}`)
        }}
        onCopyCode={(code) => {
          console.log(`[demo] copy code: ${code.slice(0, 40)}...`)
        }}
      />
    ),
    [],
  )

  const loadMarkdownSuite = useCallback(() => {
    setMessages([
      makeMessage('system', 'Conversation started with a markdown suite'),
      makeMessage('user', 'Please show me the full markdown suite.'),
      makeMessage('assistant', markdownSuite),
      makeMessage('assistant', unsafeMarkdown),
    ])
    setHasEarlier(false)
  }, [])

  const controls = useMemo(
    () => (
      <View style={styles.controls}>
        <DemoButton label="Append" onPress={appendMessage} testID="demo.append" />
        <DemoButton label="Stream chunk" onPress={streamNextChunk} testID="demo.stream" />
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
      </View>
    ),
    [appendMessage, streamNextChunk, loadEarlier, exhaustEarlier, loadThousand, loadThousandLarge, loadMarkdownSuite],
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
      </View>
      <MessageList
        messages={messages}
        hasEarlierMessages={hasEarlier}
        isLoadingEarlier={loadingEarlier}
        renderMessage={renderMessage}
        onLoadEarlier={loadEarlier}
        onAtBottomChange={setAtBottom}
        onUnreadCountChange={setUnread}
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
})
