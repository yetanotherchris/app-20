import { app } from 'electron'
import {
  AUTOMATIC_MODEL,
  createOpenRouterProvider,
  createProviderRegistry,
  OPENROUTER_PROVIDER_ID,
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

const MAX_MESSAGE_COUNT = 1000
const MAX_MESSAGE_CHARS = 1_000_000
const MAX_MODEL_CHARS = 256

const activeStreams = new Map<string, AbortController>()

/**
 * Tests and development runs may point the provider at a local server. A
 * packaged build ignores the override so the decrypted key cannot be redirected
 * by an environment variable.
 */
function endpointOverride(): string | undefined {
  if (app.isPackaged) return undefined
  const override = process.env['APP20_OPENROUTER_ENDPOINT']
  return override && override.length > 0 ? override : undefined
}

const providerRegistry = createProviderRegistry()
providerRegistry.register(
  createOpenRouterProvider({ apiKey: getProviderKey, endpoint: endpointOverride() }),
)

function selectProvider(): ChatProvider {
  const provider = providerRegistry.get(OPENROUTER_PROVIDER_ID)
  if (!provider) throw new AppError('provider-error')
  return provider
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isProviderMessage(value: unknown): value is ProviderMessage {
  if (value === null || typeof value !== 'object') return false
  const { role, content } = value as { role?: unknown; content?: unknown }
  if (role !== 'system' && role !== 'user' && role !== 'assistant') return false
  return typeof content === 'string' && content.length <= MAX_MESSAGE_CHARS
}

function isProviderMessages(value: unknown): value is ProviderMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_MESSAGE_COUNT &&
    value.every(isProviderMessage)
  )
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
  if (request.model !== undefined && !isValidModel(request.model)) {
    throw new AppError('invalid-chat-request')
  }
  if (activeStreams.has(request.requestId)) throw new AppError('provider-error')

  const model = isNonEmptyString(request.model) ? request.model : AUTOMATIC_MODEL
  const apiKey = await getProviderKey()
  if (!apiKey) return err('missing-key')
  // The key read is async, so a same-id start can arrive while it is in flight.
  if (activeStreams.has(request.requestId)) throw new AppError('provider-error')

  const controller = new AbortController()
  activeStreams.set(request.requestId, controller)
  void runStream(
    request.requestId,
    { messages: request.messages, model },
    selectProvider(),
    controller,
  )
  return ok({ model })
}

function isValidModel(value: unknown): boolean {
  return typeof value === 'string' && value.length <= MAX_MODEL_CHARS
}

export function stopChat(requestId: string): void {
  if (!isNonEmptyString(requestId)) throw new AppError('invalid-chat-request')
  activeStreams.get(requestId)?.abort()
}
