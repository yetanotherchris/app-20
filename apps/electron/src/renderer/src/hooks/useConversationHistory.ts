import { useCallback, useState } from 'react'
import type { ManifestEntry } from '@app-20/conversation-storage'
import type { AppErrorCode } from '../../../shared/error-codes'

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

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.appBridge.listConversations()
      if (result.ok) {
        setEntries(result.value.entries)
        if (result.value.report.corrupt > 0) onError('conversation-corrupt')
      } else {
        onError(result.code)
      }
    } catch {
      onError('unknown')
    } finally {
      setLoading(false)
    }
  }, [onError])

  return { entries, loading, refresh }
}
