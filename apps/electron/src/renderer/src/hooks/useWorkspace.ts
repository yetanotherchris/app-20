import { useCallback, useEffect, useState } from 'react'
import type { WorkspaceInfo } from '../../../shared/ipc-contract'
import { messageForCode } from '../errorMessages'

export interface WorkspaceController {
  info: WorkspaceInfo | null
  key: string | null
  loading: boolean
  error: string | null
  choose: () => Promise<void>
  create: () => Promise<void>
}

export function useWorkspace(): WorkspaceController {
  const [info, setInfo] = useState<WorkspaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await window.appBridge.getWorkspace()
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

  const choose = useCallback(async () => {
    const result = await window.appBridge.chooseWorkspace()
    if (result.ok) {
      setInfo(result.value)
      setError(null)
    } else if (result.code !== 'chooser-cancelled') {
      setError(messageForCode(result.code))
    }
  }, [])

  const create = useCallback(async () => {
    const result = await window.appBridge.createWorkspace()
    if (result.ok) {
      setInfo(result.value)
      setError(null)
    } else if (result.code !== 'chooser-cancelled') {
      setError(messageForCode(result.code))
    }
  }, [])

  return { info, key: info?.id ?? null, loading, error, choose, create }
}
