import type { Result } from './error-codes'

export interface AppVersion {
  version: string
}

export interface ConversationFolderInfo {
  displayName: string
  /** Stable, non-path identifier for the folder (sha256 prefix of the real path). */
  id: string
}

export type SecretKind = 'provider-key' | 's3'

export interface SecretsStatus {
  providerKey: boolean
  s3: boolean
}

export type MenuCommand =
  | 'reveal-workspace'
  | 'import-provider-key'
  | 'import-s3-credentials'
  | 'new-conversation'
  | 'save-document'

export type CloseReason = 'close' | 'quit'
export type CloseDecision = 'close' | 'cancel'

export interface CloseRequestedEvent {
  reason: CloseReason
}

export interface MenuCommandEvent {
  command: MenuCommand
}

type Empty = Record<string, never>

export interface IpcContract {
  'app:get-version': { request: void; response: Result<AppVersion> }
  'folder:get': { request: void; response: Result<ConversationFolderInfo> }
  'folder:list': { request: void; response: Result<{ names: string[] }> }
  'folder:reveal': { request: void; response: Result<Empty> }
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
}

export type IpcChannel = keyof IpcContract
export type IpcEventChannel = keyof IpcEvents

export type IpcRequest<C extends IpcChannel> = IpcContract[C]['request']
export type IpcResponse<C extends IpcChannel> = IpcContract[C]['response']
export type IpcEventPayload<C extends IpcEventChannel> = IpcEvents[C]

/** Runtime list of invoke channels. Kept in sync with IpcContract at compile time. */
export const IPC_CHANNELS = [
  'app:get-version',
  'folder:get',
  'folder:list',
  'folder:reveal',
  'file:read',
  'file:write',
  'secrets:import-provider-key',
  'secrets:import-s3',
  'secrets:status',
  'shell:open-external',
  'app:close-decision',
] as const satisfies readonly IpcChannel[]

/** Runtime list of main-to-renderer event channels. */
export const IPC_EVENT_CHANNELS = [
  'app:close-requested',
  'menu:command',
] as const satisfies readonly IpcEventChannel[]

type ChannelIsListed<C extends IpcChannel> = C extends (typeof IPC_CHANNELS)[number] ? true : never
type EventChannelIsListed<C extends IpcEventChannel> = C extends (typeof IPC_EVENT_CHANNELS)[number]
  ? true
  : never

/** Resolves to `true` only while every declared channel appears in IPC_CHANNELS. */
export type AllChannelsListed = { [C in IpcChannel]: ChannelIsListed<C> }[IpcChannel]
/** Resolves to `true` only while every declared event channel appears in IPC_EVENT_CHANNELS. */
export type AllEventChannelsListed = {
  [C in IpcEventChannel]: EventChannelIsListed<C>
}[IpcEventChannel]

/** The fixed surface exposed on `window.appBridge`. */
export interface AppBridge {
  getAppVersion: () => Promise<Result<AppVersion>>
  getConversationFolder: () => Promise<Result<ConversationFolderInfo>>
  listConversationFiles: () => Promise<Result<{ names: string[] }>>
  revealConversationFolder: () => Promise<Result<Empty>>
  readConversationFile: (name: string) => Promise<Result<{ content: string }>>
  writeConversationFile: (name: string, content: string) => Promise<Result<{ savedAt: string }>>
  importProviderKey: () => Promise<Result<{ kind: SecretKind }>>
  importS3Credentials: () => Promise<Result<{ kind: SecretKind }>>
  getSecretsStatus: () => Promise<Result<SecretsStatus>>
  openExternal: (url: string) => Promise<Result<Empty>>
  reportCloseDecision: (decision: CloseDecision) => Promise<void>
  onCloseRequested: (handler: (event: CloseRequestedEvent) => void) => () => void
  onMenuCommand: (handler: (event: MenuCommandEvent) => void) => () => void
}
