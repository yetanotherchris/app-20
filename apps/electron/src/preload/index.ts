import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AppBridge,
  IpcChannel,
  IpcEventChannel,
  IpcEventPayload,
  IpcRequest,
  IpcResponse,
} from '../shared/ipc-contract'

function invoke<C extends IpcChannel>(
  channel: C,
  request?: IpcRequest<C>,
): Promise<IpcResponse<C>> {
  return ipcRenderer.invoke(channel, request)
}

function subscribe<C extends IpcEventChannel>(
  channel: C,
  handler: (payload: IpcEventPayload<C>) => void,
): () => void {
  const listener = (_event: IpcRendererEvent, payload: IpcEventPayload<C>) => handler(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const appBridge: AppBridge = {
  getAppVersion: () => invoke('app:get-version'),
  getConversationFolder: () => invoke('folder:get'),
  revealConversationFolder: () => invoke('folder:reveal'),
  listConversations: () => invoke('conversations:list'),
  readConversation: (id) => invoke('conversations:read', { id }),
  saveConversation: (conversation) => invoke('conversations:save', { conversation }),
  importProviderKey: () => invoke('secrets:import-provider-key'),
  importS3Credentials: () => invoke('secrets:import-s3'),
  getSecretsStatus: () => invoke('secrets:status'),
  openExternal: (url) => invoke('shell:open-external', { url }),
  reportCloseDecision: (decision) => invoke('app:close-decision', { decision }),
  onCloseRequested: (handler) => subscribe('app:close-requested', handler),
  onMenuCommand: (handler) => subscribe('menu:command', handler),
}

contextBridge.exposeInMainWorld('appBridge', appBridge)
