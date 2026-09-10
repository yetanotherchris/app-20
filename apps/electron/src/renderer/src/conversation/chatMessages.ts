import type { Message, MessageRole } from 'app-20-llmchat'

/** RFC-4122 id when the platform provides it, otherwise a bounded fallback. */
export function createId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return `${prefix}-${uuid}`
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function createMessage(role: MessageRole, text: string, status: Message['status']): Message {
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
