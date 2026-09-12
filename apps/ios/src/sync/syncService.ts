import { syncOnce, type SyncState } from '@app-20/sync'
import type { ConversationFilePort } from '@app-20/conversation-storage'
import type { SecretService } from '../secrets/secretService'
import { createS3Remote } from './s3Remote'

export interface SyncService {
  state(): SyncState
  schedule(): void
  run(): Promise<void>
  clear(): Promise<void>
}

export function createSyncService(
  local: ConversationFilePort,
  secrets: SecretService,
  onState: (state: SyncState) => void,
): SyncService {
  let current: SyncState = 'disabled'
  let pending = false
  let activeRun: Promise<void> | null = null
  let clearing = false

  function setState(state: SyncState): void {
    current = state
    onState(state)
  }

  async function runOnce(): Promise<void> {
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

  function run(): Promise<void> {
    if (clearing) return Promise.resolve()
    if (!activeRun) activeRun = runOnce().finally(() => (activeRun = null))
    return activeRun
  }

  async function clear(): Promise<void> {
    clearing = true
    try {
      if (activeRun) await activeRun
      const config = await secrets.getS3Config()
      if (!config) return
      setState('syncing')
      const remote = createS3Remote(config)
      await Promise.all((await remote.listNames()).map((name) => remote.deleteText(name)))
      setState('idle')
    } catch (error) {
      setState('error')
      throw error
    } finally {
      clearing = false
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
    clear,
  }
}
