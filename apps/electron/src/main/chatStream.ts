import {
  AUTOMATIC_MODEL,
  createOpenRouterProvider,
  OPENROUTER_ENDPOINT,
  ProviderError,
  type ChatProvider,
  type ChatRequest,
  type ProviderMessage,
} from '@app-20/ai-provider'
import type { Result } from '../shared/error-codes'
import type { ChatCompletionResult, ChatStartRequest } from '../shared/ipc-contract'
import { AppError, err, ok } from './errors'
import { codeForProviderError } from './providerErrors'
import { getProviderKey } from './secrets'
import { sendToRenderer } from './window'

const activeStreams = new Map<string, AbortController>()

/** Tests and advanced runs point the provider at a local server. */
function endpointOverride(): string {
  const override = process.env['APP20_OPENROUTER_ENDPOINT']
  return override && override.length > 0 ? override : OPENROUTER_ENDPOINT
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isProviderMessage(value: unknown): value is ProviderMessage {
  if (value === null || typeof value !== 'object') return false
  const { role, content } = value as { role?: unknown; content?: unknown }
  return (
    (role === 'system' || role === 'user' || role === 'assistant') && typeof content === 'string'
  )
}

function isProviderMessages(value: unknown): value is ProviderMessage[] {
  return Array.isArray(value) && value.length > 0 && value.every(isProviderMessage)
}

function finish(requestId: string, result: ChatCompletionResult): void {
  sendToRenderer('chat:complete', { requestId, result })
}

async function runStream(
  requestId: string,
  request: ChatRequest,
  provider: ChatProvider,
  controller: AbortController,
): Promise<void> {
  try {
    for await (const text of provider.streamChat(request, controller.signal)) {
      if (controller.signal.aborted) break
      sendToRenderer('chat:chunk', { requestId, text })
    }
    finish(requestId, controller.signal.aborted ? { kind: 'stopped' } : { kind: 'complete' })
  } catch (error) {
    if (controller.signal.aborted) {
      finish(requestId, { kind: 'stopped' })
      return
    }
    const code =
      error instanceof ProviderError ? codeForProviderError(error.errorClass) : 'provider-error'
    finish(requestId, { kind: 'error', code })
  } finally {
    activeStreams.delete(requestId)
  }
}

/**
 * Validates the request, reads the stored key, and starts a stream. It returns
 * as soon as the stream has launched; deltas and the terminal result arrive on
 * `chat:chunk` and `chat:complete`. A missing key returns without starting, so
 * the renderer marks the response error immediately.
 */
export async function startChat(request: ChatStartRequest): Promise<Result<{ model: string }>> {
  if (!isNonEmptyString(request.requestId) || !isProviderMessages(request.messages)) {
    throw new AppError('invalid-chat-request')
  }
  if (activeStreams.has(request.requestId)) throw new AppError('provider-error')

  const model = isNonEmptyString(request.model) ? request.model : AUTOMATIC_MODEL
  const apiKey = await getProviderKey()
  if (!apiKey) return err('missing-key')

  const provider = createOpenRouterProvider({ apiKey, endpoint: endpointOverride() })
  const controller = new AbortController()
  activeStreams.set(request.requestId, controller)
  void runStream(request.requestId, { messages: request.messages, model }, provider, controller)
  return ok({ model })
}

export function stopChat(requestId: string): void {
  if (!isNonEmptyString(requestId)) throw new AppError('invalid-chat-request')
  activeStreams.get(requestId)?.abort()
}
