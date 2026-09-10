import type { ChatOperation, Message } from 'app-20-llmchat'
import type { ProviderMessage } from '@app-20/ai-provider'

export type ProviderTurn = Pick<ChatOperation, 'kind' | 'prompt' | 'messageId'>

function messageText(message: Message): string {
  return message.contentParts.map((part) => part.text).join('')
}

/**
 * Maps live messages to the provider request. `excludeId` drops the assistant
 * message being (re)generated and empty content is dropped, so the streaming
 * placeholder is never transmitted.
 */
export function toProviderMessages(
  messages: readonly Message[],
  excludeId?: string,
): ProviderMessage[] {
  const result: ProviderMessage[] = []
  for (const message of messages) {
    if (message.id === excludeId) continue
    const content = messageText(message)
    if (content.length === 0) continue
    result.push({ role: message.role, content })
  }
  return result
}

/**
 * Builds the request for one chat operation. The live message list is a render
 * behind the operation's own messages, so a `submit` appends the new prompt and
 * a retry or regeneration uses history up to the preceding user turn.
 */
export function toProviderRequestMessages(
  messages: readonly Message[],
  operation: ProviderTurn,
): ProviderMessage[] {
  const history = toProviderMessages(messages, operation.messageId)
  if (operation.kind === 'submit') history.push({ role: 'user', content: operation.prompt })
  return history
}
