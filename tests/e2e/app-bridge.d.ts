type E2eResult<T> = { ok: true; value: T } | { ok: false; code: string }

interface E2eManifestEntry {
  id: string
  fileName: string
  title: string
  model: string
  updatedAt: string
}

interface E2eReconcileReport {
  dropped: number
  repaired: number
  corrupt: number
}

interface E2eChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type E2eChatCompletionResult =
  { kind: 'complete' } | { kind: 'stopped' } | { kind: 'error'; code: string }

interface Window {
  appBridge: {
    getAppVersion: () => Promise<E2eResult<{ version: string }>>
    getConversationFolder: () => Promise<E2eResult<{ displayName: string; id: string }>>
    revealConversationFolder: () => Promise<E2eResult<Record<string, never>>>
    listConversations: () => Promise<
      E2eResult<{ entries: E2eManifestEntry[]; report: E2eReconcileReport }>
    >
    readConversation: (id: string) => Promise<E2eResult<{ conversation: unknown }>>
    saveConversation: (conversation: unknown) => Promise<E2eResult<{ savedAt: string }>>
    startChat: (request: {
      requestId: string
      messages: E2eChatMessage[]
      model?: string
    }) => Promise<E2eResult<{ model: string }>>
    stopChat: (requestId: string) => Promise<E2eResult<Record<string, never>>>
    importProviderKey: () => Promise<E2eResult<{ kind: 'provider-key' | 's3' }>>
    importS3Credentials: () => Promise<E2eResult<{ kind: 'provider-key' | 's3' }>>
    getSecretsStatus: () => Promise<E2eResult<{ providerKey: boolean; s3: boolean }>>
    getSyncStatus: () => Promise<
      E2eResult<{
        state: 'disabled' | 'idle' | 'pending' | 'syncing' | 'error'
        error: string | null
      }>
    >
    removeSecret: (
      kind: 'provider-key' | 's3',
    ) => Promise<E2eResult<{ kind: 'provider-key' | 's3' }>>
    openExternal: (url: string) => Promise<E2eResult<Record<string, never>>>
    reportCloseDecision: (decision: 'close' | 'cancel') => Promise<void>
    onCloseRequested: (handler: (event: { reason: 'close' | 'quit' }) => void) => () => void
    onMenuCommand: (handler: (event: { command: string }) => void) => () => void
    onChatChunk: (handler: (event: { requestId: string; text: string }) => void) => () => void
    onChatComplete: (
      handler: (event: { requestId: string; result: E2eChatCompletionResult }) => void,
    ) => () => void
    onSyncStatus: (
      handler: (status: {
        state: 'disabled' | 'idle' | 'pending' | 'syncing' | 'error'
        error: string | null
      }) => void,
    ) => () => void
  }
}
