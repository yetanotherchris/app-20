import type { Conversation, ConversationListResult } from '@app-20/conversation-storage'
import type { ProviderMessage } from '@app-20/ai-provider'
import type { AppErrorCode, Result } from './error-codes'

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

export type SyncStatus =
  { state: 'disabled' | 'idle' | 'pending' | 'syncing' } | { state: 'error'; error: AppErrorCode }

export type MenuCommand =
  | 'reveal-workspace'
  | 'import-provider-key'
  | 'import-s3-credentials'
  | 'remove-provider-key'
  | 'remove-s3-credentials'
  | 'new-conversation'

export type CloseReason = 'close' | 'quit'
export type CloseDecision = 'close' | 'cancel'

export interface CloseRequestedEvent {
  reason: CloseReason
}

export interface MenuCommandEvent {
  command: MenuCommand
}

export interface ChatStartRequest {
  requestId: string
  messages: ProviderMessage[]
  model?: string
}

export type ChatCompletionResult =
  { kind: 'complete' } | { kind: 'stopped' } | { kind: 'error'; code: AppErrorCode }

type Empty = Record<string, never>

export interface IpcContract {
  'app:get-version': { request: void; response: Result<AppVersion> }
  'folder:get': { request: void; response: Result<ConversationFolderInfo> }
  'folder:reveal': { request: void; response: Result<Empty> }
  'conversations:list': { request: void; response: Result<ConversationListResult> }
  'conversations:read': {
    request: { id: string }
    response: Result<{ conversation: Conversation }>
  }
  'conversations:save': {
    request: { conversation: Conversation }
    response: Result<{ savedAt: string }>
  }
  'chat:start': { request: ChatStartRequest; response: Result<{ model: string }> }
  'chat:stop': { request: { requestId: string }; response: Result<Empty> }
  'secrets:import-provider-key': { request: void; response: Result<{ kind: SecretKind }> }
  'secrets:import-s3': { request: void; response: Result<{ kind: SecretKind }> }
  'secrets:remove': { request: { kind: SecretKind }; response: Result<{ kind: SecretKind }> }
  'secrets:status': { request: void; response: Result<SecretsStatus> }
  'sync:get-status': { request: void; response: Result<SyncStatus> }
  'shell:open-external': { request: { url: string }; response: Result<Empty> }
  'app:close-decision': { request: { decision: CloseDecision }; response: void }
}

export interface IpcEvents {
  'app:backgrounded': Record<string, never>
  'app:close-requested': CloseRequestedEvent
  'menu:command': MenuCommandEvent
  'chat:chunk': { requestId: string; text: string }
  'chat:complete': { requestId: string; result: ChatCompletionResult }
  'sync:status': SyncStatus
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
  'folder:reveal',
  'conversations:list',
  'conversations:read',
  'conversations:save',
  'chat:start',
  'chat:stop',
  'secrets:import-provider-key',
  'secrets:import-s3',
  'secrets:remove',
  'secrets:status',
  'sync:get-status',
  'shell:open-external',
  'app:close-decision',
] as const satisfies readonly IpcChannel[]

/** Runtime list of main-to-renderer event channels. */
export const IPC_EVENT_CHANNELS = [
  'app:backgrounded',
  'app:close-requested',
  'menu:command',
  'chat:chunk',
  'chat:complete',
  'sync:status',
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
  revealConversationFolder: () => Promise<Result<Empty>>
  listConversations: () => Promise<Result<ConversationListResult>>
  readConversation: (id: string) => Promise<Result<{ conversation: Conversation }>>
  saveConversation: (conversation: Conversation) => Promise<Result<{ savedAt: string }>>
  startChat: (request: ChatStartRequest) => Promise<Result<{ model: string }>>
  stopChat: (requestId: string) => Promise<Result<Empty>>
  importProviderKey: () => Promise<Result<{ kind: SecretKind }>>
  importS3Credentials: () => Promise<Result<{ kind: SecretKind }>>
  removeSecret: (kind: SecretKind) => Promise<Result<{ kind: SecretKind }>>
  getSecretsStatus: () => Promise<Result<SecretsStatus>>
  getSyncStatus: () => Promise<Result<SyncStatus>>
  openExternal: (url: string) => Promise<Result<Empty>>
  reportCloseDecision: (decision: CloseDecision) => Promise<void>
  onAppBackgrounded: (handler: () => void) => () => void
  onCloseRequested: (handler: (event: CloseRequestedEvent) => void) => () => void
  onMenuCommand: (handler: (event: MenuCommandEvent) => void) => () => void
  onChatChunk: (handler: (event: { requestId: string; text: string }) => void) => () => void
  onChatComplete: (
    handler: (event: { requestId: string; result: ChatCompletionResult }) => void,
  ) => () => void
  onSyncStatus: (handler: (status: SyncStatus) => void) => () => void
}
