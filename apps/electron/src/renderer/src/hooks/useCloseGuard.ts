import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppErrorCode } from '../../../shared/error-codes'
import type { CloseReason } from '../../../shared/ipc-contract'
import { messageForCode } from '../errorMessages'

export type ClosePhase = 'prompt' | 'saving' | 'error'

export interface CloseGuard {
  request: CloseReason | null
  phase: ClosePhase
  error: string | null
  chooseSave: () => Promise<void>
  chooseDiscard: () => void
  chooseCancel: () => void
}

export interface CloseGuardOptions {
  dirty: boolean
  stop: () => void
  save: () => Promise<AppErrorCode | null>
}

/**
 * Main blocks the window close and sends `app:close-requested`. This hook stops
 * any stream, reports clean immediately, or raises the Save / Discard / Cancel
 * dialog. A failed save keeps the dialog open so nothing is discarded (spec 100
 * FR-003, US2-A3).
 */
export function useCloseGuard({ dirty, stop, save }: CloseGuardOptions): CloseGuard {
  const [request, setRequest] = useState<CloseReason | null>(null)
  const [phase, setPhase] = useState<ClosePhase>('prompt')
  const [error, setError] = useState<string | null>(null)

  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  useEffect(() => {
    return window.appBridge.onCloseRequested((event) => {
      stop()
      if (!dirtyRef.current) {
        void window.appBridge.reportCloseDecision('close')
        return
      }
      setRequest(event.reason)
      setPhase('prompt')
      setError(null)
    })
  }, [stop])

  const chooseSave = useCallback(async () => {
    setPhase('saving')
    const code = await save()
    if (code === null) {
      setRequest(null)
      await window.appBridge.reportCloseDecision('close')
      return
    }
    setPhase('error')
    setError(messageForCode(code))
  }, [save])

  const chooseDiscard = useCallback(() => {
    setRequest(null)
    void window.appBridge.reportCloseDecision('close')
  }, [])

  const chooseCancel = useCallback(() => {
    setRequest(null)
    void window.appBridge.reportCloseDecision('cancel')
  }, [])

  return { request, phase, error, chooseSave, chooseDiscard, chooseCancel }
}
