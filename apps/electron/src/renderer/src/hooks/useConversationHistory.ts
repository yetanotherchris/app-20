import { useCallback, useRef, useState } from 'react'
import type { ManifestEntry } from '@app-20/conversation-storage'
import type { AppErrorCode } from '../../../shared/error-codes'
import { recentEntries } from '../history/historyEntries'

export interface ConversationHistory {
  entries: readonly ManifestEntry[]
  loading: boolean
  refresh: () => Promise<void>
}

/**
 * Loads the recent-conversation list for the drawer. The list is fetched when
 * the drawer opens rather than on mount, so the shell controls the timing and
 * an open drawer always shows current data. A corrupt file in the manifest is
 * reported but never blocks the list (spec 105 FR-006, FR-007).
 */
export function useConversationHistory(onError: (code: AppErrorCode) => void): ConversationHistory {
  const [entries, setEntries] = useState<readonly ManifestEntry[]>([])
  const [loading, setLoading] = useState(false)
  const requestIdRef = useRef(0)

  const refresh = useCallback(async () => {
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    setLoading(true)
    try {
      const result = await window.appBridge.listConversations()
      if (requestId !== requestIdRef.current) return
      if (result.ok) {
        setEntries(recentEntries(result.value.entries))
        if (result.value.report.corrupt > 0) onError('conversation-corrupt')
      } else {
        onError(result.code)
      }
    } catch {
      if (requestId === requestIdRef.current) onError('unknown')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [onError])

  return { entries, loading, refresh }
}
