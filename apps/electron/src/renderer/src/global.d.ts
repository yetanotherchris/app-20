import type { AppBridge } from '../../shared/ipc-contract'

declare global {
  interface Window {
    appBridge: AppBridge
  }
}

export {}
