import type { ChatStatus, MessageAction } from '../theme/types'
import type { Message } from '../types'

export type OperationKind = 'submit' | 'retry' | 'regenerate'

/** A submit, retry, or regeneration with a unique id (FR-004). */
export interface ChatOperation {
  id: string
  kind: OperationKind
  prompt: string
  messageId: string
  stopped: boolean
}

/** The transport-facing surface the hook passes to the host's request callback. */
export interface ChatSessionControls {
  appendChunk: (text: string) => void
  complete: () => void
  fail: () => void
  stopRequested: () => boolean
}

export interface ChatSessionOptions {
  /** Host network transport, invoked once per operation. */
  request: (op: ChatOperation, controls: ChatSessionControls) => void | Promise<void>
  /** Delegated message-text copy (FR-007); without it the copy action is inert. */
  copyMessageText?: (message: Message, text: string) => void | Promise<void>
  /** Seed conversation. */
  initialMessages?: readonly Message[]
}

export interface ChatSession {
  messages: readonly Message[]
  status: ChatStatus
  submit: (prompt: string) => void
  retry: (messageId: string) => void
  regenerate: (messageId: string) => void
  stop: () => void
  appendChunk: (opId: string, text: string) => void
  complete: (opId: string) => void
  fail: (opId: string) => void
  copyMessage: (message: Message) => void
  replaceMessages: (messages: readonly Message[]) => void
  messageActions: readonly MessageAction[]
  onMessageAction: (action: MessageAction, message: Message) => void
}
