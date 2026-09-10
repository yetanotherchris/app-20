interface Window {
  appBridge: {
    openExternal: (url: string) => Promise<{ ok: boolean; code?: string }>
    getWorkspace: () => Promise<{ ok: boolean; value: { displayName: string } | null }>
    getSecretsStatus: () => Promise<{ ok: boolean; value: { providerKey: boolean; s3: boolean } }>
  }
}
