import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  LLMChat,
  useChatSession,
  type ChatOperation,
  type ChatSessionControls,
  type Message,
} from 'app-20-llmchat'

export interface ChatDemoProps {
  initialMessages?: readonly Message[]
}

let nextId = 1000

function message(role: 'user' | 'assistant' | 'system', text: string): Message {
  return {
    id: `demo-${nextId++}`,
    role,
    contentParts: [{ kind: 'text', format: role === 'user' ? 'plain' : 'markdown', text }],
    status: 'complete',
    createdAt: new Date().toISOString(),
  }
}

const DEFAULT_MESSAGES: readonly Message[] = [
  message('user', 'Hello, how do I export a CSV in Node?'),
  message(
    'assistant',
    'Use the `csv-stringify` package. Call `stringify` with your rows and a callback.',
  ),
]

/**
 * A minimal live demo of the standalone chat component. There is no network
 * backend; the transport echoes locally so the composer and streaming states
 * can be exercised without a provider.
 */
export function ChatDemo({ initialMessages = DEFAULT_MESSAGES }: ChatDemoProps) {
  const [draft, setDraft] = useState('')

  const request = useCallback((operation: ChatOperation, controls: ChatSessionControls) => {
    setTimeout(() => {
      if (controls.stopRequested()) return
      controls.appendChunk(`Echo: ${operation.prompt}`)
      controls.complete()
    }, 120)
  }, [])

  const session = useChatSession({ request, initialMessages })

  const handleSubmit = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    session.submit(text)
    setDraft('')
  }, [draft, session])

  return (
    <View style={styles.container}>
      <LLMChat.Root
        messages={session.messages}
        draft={draft}
        status={session.status}
        hasEarlierMessages={false}
        isLoadingEarlier={false}
        onChangeDraft={setDraft}
        onSubmit={handleSubmit}
        onStop={session.stop}
        onLoadEarlier={() => undefined}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
})
