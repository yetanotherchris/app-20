import { contextBridge, ipcRenderer } from 'electron'
import type { IpcContract } from '../shared/ipc-contract'

const api = {
  getAppVersion: (): Promise<IpcContract['app:get-version']['response']> =>
    ipcRenderer.invoke('app:get-version'),
}

contextBridge.exposeInMainWorld('appBridge', api)

export type AppBridge = typeof api
