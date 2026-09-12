import { syncOnce, type SyncState } from '@app-20/sync'
import type { ConversationFilePort } from '@app-20/conversation-storage'
import type { SecretService } from '../secrets/secretService'
import { createS3Remote } from './s3Remote'

export interface SyncService {
  state(): SyncState
  schedule(): void
  run(): Promise<void>
}

export function createSyncService(
  local: ConversationFilePort,
  secrets: SecretService,
  onState: (state: SyncState) => void,
): SyncService {
  let current: SyncState = 'disabled'
  let pending = false

  function setState(state: SyncState): void {
    current = state
    onState(state)
  }

  async function run(): Promise<void> {
    const config = await secrets.getS3Config()
    if (!config) {
      setState('disabled')
      return
    }
    setState('syncing')
    try {
      await syncOnce(local, createS3Remote(config))
      setState('idle')
    } catch {
      setState('error')
    }
  }

  return {
    state: () => current,
    schedule() {
      if (pending) return
      pending = true
      setState('pending')
      void run().finally(() => {
        pending = false
      })
    },
    run,
  }
}
