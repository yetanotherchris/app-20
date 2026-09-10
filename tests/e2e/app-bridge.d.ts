type E2eResult<T> = { ok: true; value: T } | { ok: false; code: string }

interface Window {
  appBridge: {
    getAppVersion: () => Promise<E2eResult<{ version: string }>>
    getWorkspace: () => Promise<E2eResult<{ displayName: string; id: string } | null>>
    chooseWorkspace: () => Promise<E2eResult<{ displayName: string; id: string }>>
    createWorkspace: () => Promise<E2eResult<{ displayName: string; id: string }>>
    listWorkspaceFiles: () => Promise<E2eResult<{ names: string[] }>>
    readWorkspaceFile: (name: string) => Promise<E2eResult<{ content: string }>>
    writeWorkspaceFile: (name: string, content: string) => Promise<E2eResult<{ savedAt: string }>>
    importProviderKey: () => Promise<E2eResult<{ kind: 'provider-key' | 's3' }>>
    importS3Credentials: () => Promise<E2eResult<{ kind: 'provider-key' | 's3' }>>
    getSecretsStatus: () => Promise<E2eResult<{ providerKey: boolean; s3: boolean }>>
    openExternal: (url: string) => Promise<E2eResult<Record<string, never>>>
    reportCloseDecision: (decision: 'close' | 'cancel') => Promise<void>
    onCloseRequested: (handler: (event: { reason: 'close' | 'quit' }) => void) => () => void
    onMenuCommand: (handler: (event: { command: string }) => void) => () => void
  }
}
