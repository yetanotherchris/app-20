import { syncOnce, type SyncRemote } from '@app-20/sync'
import type { ConversationFilePort } from '@app-20/conversation-storage'
import type { AppErrorCode } from '../shared/error-codes'
import type { SyncStatus } from '../shared/ipc-contract'

/** Backoff between failed attempts; the length is the retry cap. */
const RETRY_DELAYS_MS = [1000, 4000, 10000]
const DEFAULT_RETRY_MS = 10000

export type SyncErrorCode = AppErrorCode

/**
 * A connectivity failure is reported as `network-error`; everything else
 * (rejected credentials, a missing bucket, a malformed response) as
 * `sync-failed`. Both are path-free and carry no secret.
 */
export function classifySyncError(error: unknown): SyncErrorCode {
  if (error !== null && typeof error === 'object') {
    const name = (error as { name?: unknown }).name
    if (name === 'NetworkingError' || name === 'TimeoutError') return 'network-error'
    const code = (error as { code?: unknown }).code
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
      return 'network-error'
    }
    if (code === 'EAI_AGAIN') return 'network-error'
  }
  return 'sync-failed'
}

export interface SyncServiceDeps {
  /** Null means no bucket or credentials are configured; sync stays disabled. */
  resolveRemote(): Promise<SyncRemote | null>
  resolveLocal(): ConversationFilePort
  push(status: SyncStatus): void
  wait?(ms: number): Promise<void>
}

export interface SyncService {
  getStatus(): SyncStatus
  /** Queue a background run; used after a completed save. */
  schedule(): void
  /** Run once and resolve when the first attempt settles; used before the window opens. */
  runStartup(): Promise<void>
}

function defaultWait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Owns the sync status and the run queue. Runs are serialized so two triggers
 * never overlap; a failed run retries with capped backoff and reports `error`
 * once the cap is reached. No local file is touched on failure.
 */
export function createSyncService(deps: SyncServiceDeps): SyncService {
  const wait = deps.wait ?? defaultWait
  let status: SyncStatus = { state: 'disabled', error: null }
  let retriesUsed = 0
  let retryToken = 0
  let chain: Promise<void> = Promise.resolve()

  function setStatus(next: SyncStatus): void {
    status = next
    deps.push(next)
  }

  async function runOnce(remote: SyncRemote): Promise<void> {
    setStatus({ state: 'syncing', error: null })
    try {
      await syncOnce(deps.resolveLocal(), remote)
      retriesUsed = 0
      setStatus({ state: 'idle', error: null })
    } catch (error) {
      const code = classifySyncError(error)
      if (retriesUsed < RETRY_DELAYS_MS.length) {
        const delayMs = RETRY_DELAYS_MS[retriesUsed] ?? DEFAULT_RETRY_MS
        retriesUsed += 1
        setStatus({ state: 'pending', error: null })
        void scheduleRetry(delayMs, remote)
      } else {
        retriesUsed = 0
        setStatus({ state: 'error', error: code })
      }
    }
  }

  function enqueue(remote: SyncRemote): Promise<void> {
    const next = chain.then(
      () => runOnce(remote),
      () => runOnce(remote),
    )
    chain = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  async function scheduleRetry(delayMs: number, remote: SyncRemote): Promise<void> {
    const token = ++retryToken
    await wait(delayMs)
    if (token !== retryToken) return
    await enqueue(remote)
  }

  async function begin(withPending: boolean): Promise<void> {
    const remote = await deps.resolveRemote()
    if (!remote) {
      retriesUsed = 0
      setStatus({ state: 'disabled', error: null })
      return
    }
    if (withPending) setStatus({ state: 'pending', error: null })
    await enqueue(remote)
  }

  return {
    getStatus() {
      return status
    },

    schedule() {
      retryToken += 1
      retriesUsed = 0
      void begin(true)
    },

    async runStartup() {
      retryToken += 1
      retriesUsed = 0
      await begin(false)
    },
  }
}
