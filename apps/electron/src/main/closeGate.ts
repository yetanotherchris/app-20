import { app } from 'electron'
import type { CloseDecision, CloseReason } from '../shared/ipc-contract'
import { getMainWindow, sendToRenderer } from './window'

let pendingReason: CloseReason | null = null
let authorised = false

export function isCloseAuthorised(): boolean {
  return authorised
}

export function resetCloseAuthorisation(): void {
  pendingReason = null
  authorised = false
}

export function requestClose(reason: CloseReason): void {
  if (authorised || pendingReason !== null) return
  pendingReason = reason
  sendToRenderer('app:close-requested', { reason })
}

export function resolveClose(decision: CloseDecision): void {
  if (pendingReason === null) return
  if (decision === 'cancel') {
    pendingReason = null
    return
  }

  const reason = pendingReason
  pendingReason = null
  authorised = true
  if (reason === 'quit') app.quit()
  else getMainWindow()?.close()
}
