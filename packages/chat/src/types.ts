export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'queued' | 'sending' | 'streaming' | 'complete' | 'stopped' | 'error'

export interface ContentPart {
  kind: 'text'
  format: 'plain' | 'markdown'
  text: string
}

export interface Message {
  id: string
  role: MessageRole
  contentParts: readonly ContentPart[]
  status: MessageStatus
  createdAt: string
  updatedAt?: string
}

export interface VisibleRange {
  firstIndex: number
  lastIndex: number
}
