# Contract: `@app-20/ai-provider`

The public surface of the provider package. It is source-only TypeScript with no Node, Electron, or React import.

## Exports

```ts
export type ChatRole = 'system' | 'user' | 'assistant'

export interface ProviderMessage {
  role: ChatRole
  content: string
}

export interface ChatRequest {
  messages: readonly ProviderMessage[]
  model: string
}

export type ProviderErrorClass = 'invalid-key' | 'rate-limit' | 'network' | 'unknown'

export class ProviderError extends Error {
  readonly errorClass: ProviderErrorClass
  readonly status?: number
}

export interface ChatProvider {
  readonly id: string
  streamChat(request: ChatRequest, signal: AbortSignal): AsyncIterable<string>
}

export function classifyHttpStatus(status: number): ProviderErrorClass

export const AUTOMATIC_MODEL: 'openrouter/auto'
export const OPENROUTER_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions'
export const OPENROUTER_PROVIDER_ID: 'openrouter'

export interface HttpFetchInit {
  method: string
  headers: Record<string, string>
  body: string
  signal: AbortSignal
}

export interface ByteStreamReader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>
}

export interface ByteStream {
  getReader(): ByteStreamReader
}

export interface HttpFetchResponse {
  ok: boolean
  status: number
  body: ByteStream | null
}

export type HttpFetch = (url: string, init: HttpFetchInit) => Promise<HttpFetchResponse>

export interface OpenRouterOptions {
  apiKey: string
  endpoint?: string
  fetch?: HttpFetch
}

export function createOpenRouterProvider(options: OpenRouterOptions): ChatProvider

export interface ProviderRegistry {
  register(provider: ChatProvider): void
  get(id: string): ChatProvider | undefined
  has(id: string): boolean
}

export function createProviderRegistry(initial?: readonly ChatProvider[]): ProviderRegistry

export function parseOpenRouterStream(body: ByteStream): AsyncIterable<string>
```

## Behaviour

- `createOpenRouterProvider` returns a `ChatProvider` whose `id` is `OPENROUTER_PROVIDER_ID`. Its `streamChat` issues one `POST` with `stream: true` and yields each non-empty `choices[0].delta.content`.
- The default `fetch` is `globalThis.fetch`. A host supplies its own for tests or for a platform without a compatible `fetch`.
- On a non-ok response, `streamChat` throws `ProviderError` with `classifyHttpStatus(status)` before yielding any delta.
- On a thrown `fetch` or a stream that ends before `data: [DONE]`, `streamChat` throws `ProviderError('network')`.
- When `signal` aborts, `streamChat` returns without throwing, so a user stop is not reported as a failure.
- The API key appears only in the `Authorization` header. It is never included in an error, a thrown message, or a log.
- `parseOpenRouterStream` skips blank lines, comment lines, `[DONE]`, and lines whose JSON does not contain a string delta. It never yields an empty delta.

## Test doubles (`testing.ts`)

- `streamFromStrings(chunks: readonly string[]): ByteStream` yields the UTF-8 bytes of each chunk, then completes.
- `fetchReturning(response): HttpFetch` returns a fixed response.
- `createScriptedProvider(id, deltas): ChatProvider` yields fixed deltas, for registry tests.

## Out of scope

- Persisting the routed model, token usage, or finish reason.
- Retries, backoff, or request de-duplication inside the provider. The host owns cancellation; the user owns retry.
- Any non-chat completion endpoint.
