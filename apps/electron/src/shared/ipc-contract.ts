import type { Result } from './error-codes'

export interface AppVersion {
  version: string
}

export interface WorkspaceInfo {
  displayName: string
}

export type SecretKind = 'provider-key' | 's3'

export interface SecretsStatus {
  providerKey: boolean
  s3: boolean
}

export type MenuCommand =
  | 'open-workspace'
  | 'create-workspace'
  | 'import-provider-key'
  | 'import-s3-credentials'
  | 'new-conversation'
  | 'save-document'
  | 'quit'

export type CloseReason = 'close' | 'quit'
export type CloseDecision = 'close' | 'cancel'

export interface CloseRequestedEvent {
  reason: CloseReason
}

export interface MenuCommandEvent {
  command: MenuCommand
}

export interface NotificationEvent {
  level: 'info' | 'error'
  message: string
}

type Empty = Record<string, never>

export interface IpcContract {
  'app:get-version': { request: void; response: Result<AppVersion> }
  'workspace:get': { request: void; response: Result<WorkspaceInfo | null> }
  'workspace:choose': { request: void; response: Result<WorkspaceInfo> }
  'workspace:create': { request: void; response: Result<WorkspaceInfo> }
  'workspace:list': { request: void; response: Result<{ names: string[] }> }
  'file:read': { request: { name: string }; response: Result<{ content: string }> }
  'file:write': {
    request: { name: string; content: string }
    response: Result<{ savedAt: string }>
  }
  'secrets:import-provider-key': { request: void; response: Result<{ kind: SecretKind }> }
  'secrets:import-s3': { request: void; response: Result<{ kind: SecretKind }> }
  'secrets:status': { request: void; response: Result<SecretsStatus> }
  'shell:open-external': { request: { url: string }; response: Result<Empty> }
  'app:close-decision': { request: { decision: CloseDecision }; response: void }
}

export interface IpcEvents {
  'app:close-requested': CloseRequestedEvent
  'menu:command': MenuCommandEvent
  'app:notification': NotificationEvent
}

export type IpcChannel = keyof IpcContract
export type IpcEventChannel = keyof IpcEvents

export type IpcRequest<C extends IpcChannel> = IpcContract[C]['request']
export type IpcResponse<C extends IpcChannel> = IpcContract[C]['response']
export type IpcEventPayload<C extends IpcEventChannel> = IpcEvents[C]

/** The fixed surface exposed on `window.appBridge`. */
export interface AppBridge {
  getAppVersion: () => Promise<Result<AppVersion>>
  getWorkspace: () => Promise<Result<WorkspaceInfo | null>>
  chooseWorkspace: () => Promise<Result<WorkspaceInfo>>
  createWorkspace: () => Promise<Result<WorkspaceInfo>>
  listWorkspaceFiles: () => Promise<Result<{ names: string[] }>>
  readWorkspaceFile: (name: string) => Promise<Result<{ content: string }>>
  writeWorkspaceFile: (name: string, content: string) => Promise<Result<{ savedAt: string }>>
  importProviderKey: () => Promise<Result<{ kind: SecretKind }>>
  importS3Credentials: () => Promise<Result<{ kind: SecretKind }>>
  getSecretsStatus: () => Promise<Result<SecretsStatus>>
  openExternal: (url: string) => Promise<Result<Empty>>
  reportCloseDecision: (decision: CloseDecision) => Promise<void>
  onCloseRequested: (handler: (event: CloseRequestedEvent) => void) => () => void
  onMenuCommand: (handler: (event: MenuCommandEvent) => void) => () => void
  onNotification: (handler: (event: NotificationEvent) => void) => () => void
}
