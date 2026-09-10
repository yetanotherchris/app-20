import type { Message } from 'app-20-llmchat'

export type StoredStatus = 'complete' | 'stopped' | 'error'

export interface StoredMessage {
  id: string
  role: Message['role']
  content: string
  createdAt: string
  status: StoredStatus
}

export interface StoredConversation {
  id: string
  title: string
  updatedAt: string
  draft: string
  messages: StoredMessage[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseStoredMessage(value: unknown): StoredMessage | null {
  if (!isRecord(value)) return null
  const { id, role, content, createdAt, status } = value
  if (typeof id !== 'string' || typeof content !== 'string' || typeof createdAt !== 'string') {
    return null
  }
  if (role !== 'user' && role !== 'assistant' && role !== 'system') return null
  if (status !== 'complete' && status !== 'stopped' && status !== 'error') return null
  return { id, role, content, createdAt, status }
}

/**
 * Persisted JSON is an external boundary, so the shape is validated field by
 * field rather than asserted (coding standards section 3).
 */
export function parseStoredConversation(value: unknown): StoredConversation | null {
  if (!isRecord(value)) return null
  const { id, title, updatedAt, draft, messages } = value
  if (typeof id !== 'string' || typeof title !== 'string' || typeof updatedAt !== 'string') {
    return null
  }
  if (draft !== undefined && typeof draft !== 'string') return null
  if (!Array.isArray(messages)) return null

  const parsedMessages = messages
    .map(parseStoredMessage)
    .filter((message): message is StoredMessage => message !== null)
  if (parsedMessages.length !== messages.length) return null

  return { id, title, updatedAt, draft: draft ?? '', messages: parsedMessages }
}

export function parseStoredConversationSafe(content: string): StoredConversation | null {
  try {
    return parseStoredConversation(JSON.parse(content))
  } catch {
    return null
  }
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createMessage(
  role: Message['role'],
  text: string,
  status: Message['status'],
): Message {
  return {
    id: createId(role),
    role,
    contentParts: [{ kind: 'text', format: role === 'user' ? 'plain' : 'markdown', text }],
    status,
    createdAt: new Date().toISOString(),
  }
}

export function withStatus(message: Message, status: Message['status']): Message {
  return { ...message, status }
}

function messageText(message: Message): string {
  return message.contentParts.map((part) => part.text).join('')
}

function toStoredStatus(status: Message['status']): StoredStatus {
  if (status === 'stopped' || status === 'error') return status
  return 'complete'
}

export function toStored(
  id: string,
  messages: readonly Message[],
  draft: string,
): StoredConversation {
  const firstUser = messages.find((message) => message.role === 'user')
  return {
    id,
    title: firstUser ? messageText(firstUser).slice(0, 80) : '',
    updatedAt: new Date().toISOString(),
    draft,
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: messageText(message),
      createdAt: message.createdAt,
      status: toStoredStatus(message.status),
    })),
  }
}

export function fromStored(conversation: StoredConversation): Message[] {
  return conversation.messages.map((stored) => ({
    id: stored.id,
    role: stored.role,
    contentParts: [
      {
        kind: 'text',
        format: stored.role === 'user' ? 'plain' : 'markdown',
        text: stored.content,
      },
    ],
    status: stored.status,
    createdAt: stored.createdAt,
  }))
}
