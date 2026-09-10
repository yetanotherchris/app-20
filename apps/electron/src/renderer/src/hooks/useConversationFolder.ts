import { useCallback, useEffect, useState } from 'react'
import type { ConversationFolderInfo } from '../../../shared/ipc-contract'
import { messageForCode } from '../errorMessages'

export interface ConversationFolderController {
  info: ConversationFolderInfo | null
  key: string | null
  loading: boolean
  error: string | null
  reveal: () => Promise<void>
}

export function useConversationFolder(): ConversationFolderController {
  const [info, setInfo] = useState<ConversationFolderInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await window.appBridge.getConversationFolder()
      if (cancelled) return
      if (result.ok) {
        setInfo(result.value)
        setError(null)
      } else {
        setInfo(null)
        setError(messageForCode(result.code))
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const reveal = useCallback(async () => {
    const result = await window.appBridge.revealConversationFolder()
    if (!result.ok) setError(messageForCode(result.code))
  }, [])

  return { info, key: info?.id ?? null, loading, error, reveal }
}
