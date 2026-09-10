# Contract: Chat IPC

The named operations and events that carry a chat completion from the renderer to the OpenRouter provider in main and back. All types live in `apps/electron/src/shared/ipc-contract.ts`; error codes live in `apps/electron/src/shared/error-codes.ts`.

## Invoke channels

### `chat:start`

Starts one streaming completion. Returns after the stored key has been read and the stream launched, or with an error result that emits no events.

```ts
'chat:start': {
  request: {
    requestId: string
    messages: ProviderMessage[]
    model?: string
  }
  response: Result<{ model: string }>
}
```

- `requestId` must be a non-empty string. A duplicate id while a stream is active is rejected with `provider-error`.
- `messages` must be a non-empty array of `{ role, content }` with `role` in `system | user | assistant` and `content` a string. A malformed request returns `invalid-chat-request`.
- `model` defaults to `openrouter/auto` when absent or empty. The response repeats the model used.
- A missing or undecryptable stored key returns `missing-key` and starts nothing.

### `chat:stop`

Aborts the stream for a request id and keeps whatever content has been emitted.

```ts
'chat:stop': { request: { requestId: string }; response: Result<Record<string, never>> }
```

An unknown or already-finished id is a no-op that returns ok.

## Event channels

### `chat:chunk`

One assistant text delta.

```ts
'chat:chunk': { requestId: string; text: string }
```

`text` is never empty. The renderer appends it to the assistant message for `requestId` and ignores an id that is not its active request.

### `chat:complete`

The terminal result for a request id. Emitted exactly once per started stream.

```ts
type ChatCompletionResult =
  | { kind: 'complete' }
  | { kind: 'stopped' }
  | { kind: 'error'; code: AppErrorCode }

'chat:complete': { requestId: string; result: ChatCompletionResult }
```

- `complete`: the provider reached `[DONE]`.
- `stopped`: `chat:stop` aborted the stream.
- `error`: the provider failed; `code` is one of the provider codes below.

## Error codes

| Code                   | Meaning                                             | Renderer copy                                              |
| ---------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `missing-key`          | No provider key is stored, or it could not be read. | No provider API key is stored. Import one to continue.     |
| `invalid-key`          | The provider rejected the key (401/403).            | The provider API key was rejected.                         |
| `rate-limited`         | The provider is rate limiting (429).                | The provider is rate limiting requests. Try again shortly. |
| `network-error`        | The connection failed or dropped mid-stream.        | The provider could not be reached.                         |
| `provider-error`       | Any other provider failure.                         | The provider returned an error.                            |
| `invalid-chat-request` | The request shape was rejected in main.             | The chat request was invalid.                              |

No upstream message, HTTP body, or API key is returned to the renderer. The renderer renders copy from the code.

## Bridge surface

`window.appBridge` gains:

```ts
startChat: (request: ChatStartRequest) => Promise<Result<{ model: string }>>
stopChat: (requestId: string) => Promise<Result<Record<string, never>>>
onChatChunk: (handler: (payload: ChatChunkEvent) => void) => () => void
onChatComplete: (handler: (payload: ChatCompleteEvent) => void) => () => void
```

`onChatChunk` and `onChatComplete` return an unsubscribe function, matching `onMenuCommand` and `onCloseRequested`. No generic `invoke` is exposed.
