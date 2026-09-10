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
    importProviderKey: () => Promise<E2eResult<{ kind: 'provider-key' | 's3' }>>
    importS3Credentials: () => Promise<E2eResult<{ kind: 'provider-key' | 's3' }>>
    getSecretsStatus: () => Promise<E2eResult<{ providerKey: boolean; s3: boolean }>>
    openExternal: (url: string) => Promise<E2eResult<Record<string, never>>>
    reportCloseDecision: (decision: 'close' | 'cancel') => Promise<void>
    onCloseRequested: (handler: (event: { reason: 'close' | 'quit' }) => void) => () => void
    onMenuCommand: (handler: (event: { command: string }) => void) => () => void
  }
}
