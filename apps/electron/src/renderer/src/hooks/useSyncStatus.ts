import { useEffect, useState } from 'react'
import type { SyncStatus } from '../../../shared/ipc-contract'

/** Reads the current status once, then follows `sync:status` pushes from main. */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({ state: 'disabled', error: null })

  useEffect(() => {
    let active = true
    void window.appBridge
      .getSyncStatus()
      .then((result) => {
        if (active && result.ok) setStatus(result.value)
      })
      .catch(() => undefined)

    const unsubscribe = window.appBridge.onSyncStatus((next) => setStatus(next))
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return status
}
