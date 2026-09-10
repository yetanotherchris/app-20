import type { Message, MessageRole } from 'app-20-llmchat'
import {
  toPersistedStatus,
  type Conversation,
  type ConversationMessage,
} from '@app-20/conversation-storage'

export interface ConversationDraft {
  id: string
  createdAt: string
  model: string
  messages: readonly Message[]
  draft: string
}

function messageText(message: Message): string {
  return message.contentParts.map((part) => part.text).join('')
}

function toStoredMessage(message: Message, previous?: ConversationMessage): ConversationMessage {
  const stored: ConversationMessage = {
    id: message.id,
    role: message.role,
    content: messageText(message),
    createdAt: message.createdAt,
    status: toPersistedStatus(message.status),
  }
  if (previous?.updatedAt !== undefined) stored.updatedAt = previous.updatedAt
  if (previous?.parentId !== undefined) stored.parentId = previous.parentId
  if (previous?.error !== undefined) stored.error = previous.error
  if (previous?.metadata !== undefined) stored.metadata = previous.metadata
  return stored
}

function isRenderable(
  message: ConversationMessage,
): message is ConversationMessage & { role: MessageRole } {
  return message.role !== 'tool'
}

/**
 * Builds the persisted conversation from the live chat state. When a base
 * conversation is supplied, messages the chat UI cannot represent (the reserved
 * `tool` role) and the optional message fields are carried through, so a beta
 * reader does not strip data a newer writer added (FR-010).
 */
export function toConversation(value: ConversationDraft, base?: Conversation | null): Conversation {
  const unconsumed = new Map(value.messages.map((message) => [message.id, message]))
  const messages: ConversationMessage[] = []

  if (base) {
    for (const stored of base.messages) {
      const live = unconsumed.get(stored.id)
      if (live) {
        messages.push(toStoredMessage(live, stored))
        unconsumed.delete(stored.id)
      } else {
        messages.push(stored)
      }
    }
  }

  for (const live of value.messages) {
    const remaining = unconsumed.get(live.id)
    if (remaining) messages.push(toStoredMessage(remaining))
  }

  const firstUser = value.messages.find((message) => message.role === 'user')
  return {
    id: value.id,
    title: firstUser ? messageText(firstUser).slice(0, 80) : '',
    model: value.model,
    createdAt: base?.createdAt ?? value.createdAt,
    updatedAt: new Date().toISOString(),
    draft: value.draft,
    messages,
  }
}

export function fromConversation(conversation: Conversation): Message[] {
  return conversation.messages.filter(isRenderable).map((stored) => ({
    id: stored.id,
    role: stored.role,
    contentParts: [
      { kind: 'text', format: stored.role === 'user' ? 'plain' : 'markdown', text: stored.content },
    ],
    status: stored.status,
    createdAt: stored.createdAt,
  }))
}
