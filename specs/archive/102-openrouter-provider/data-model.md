# Data Model: OpenRouter AI Provider

Entities, message shapes, and stream states for spec 102. The provider types live in `packages/ai-provider/src/provider.ts`; the IPC shapes live in `apps/electron/src/shared/ipc-contract.ts`. Nothing here is written to a conversation file: the canonical schema is owned by spec 101 and admits no provider-specific field.

## Provider types

### ProviderMessage

| Field     | Type                                | Notes                                                           |
| --------- | ----------------------------------- | --------------------------------------------------------------- |
| `role`    | `'system' \| 'user' \| 'assistant'` | The `tool` role is not sent in beta; it is reserved (spec 101). |
| `content` | `string`                            | Plain text, joined from the message's text parts.               |

Messages with empty content are omitted before the request is sent, so the streaming assistant placeholder is never transmitted.

### ChatRequest

| Field      | Type                         | Notes                                             |
| ---------- | ---------------------------- | ------------------------------------------------- |
| `messages` | `readonly ProviderMessage[]` | History up to and including the latest user turn. |
| `model`    | `string`                     | Beta sends `openrouter/auto`.                     |

### ChatProvider

| Member                        | Type                                                  | Notes                                                                                                |
| ----------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`                          | `readonly string`                                     | Stable provider id, for example `openrouter`.                                                        |
| `streamChat(request, signal)` | `(ChatRequest, AbortSignal) => AsyncIterable<string>` | Yields assistant text deltas. Throws `ProviderError` on failure. Aborts quietly when `signal` fires. |

### ProviderError

| Field        | Type                                                      | Notes                                       |
| ------------ | --------------------------------------------------------- | ------------------------------------------- |
| `errorClass` | `'invalid-key' \| 'rate-limit' \| 'network' \| 'unknown'` | The failure class named by FR-006.          |
| `status`     | `number \| undefined`                                     | Upstream HTTP status when one was received. |

`classifyHttpStatus`: 401 and 403 return `invalid-key`; 429 returns `rate-limit`; any other non-ok status returns `unknown`.

## OpenRouter request and response

**Request**: `POST` to `https://openrouter.ai/api/v1/chat/completions` (overridable in main for tests).

| Header          | Value              |
| --------------- | ------------------ |
| `Authorization` | `Bearer <key>`     |
| `Content-Type`  | `application/json` |

Body: `{ "model": "<model>", "messages": [<ProviderMessage>...], "stream": true }`.

**Response stream**: server-sent events, one JSON object per `data:` line, terminated by `data: [DONE]`. Each object's `choices[0].delta.content`, when a non-empty string, is one yielded delta. Lines that are blank, comments, or unparseable JSON are skipped. A stream that ends before `[DONE]` is treated as a dropped connection (`network`). An upstream HTTP status that is not ok aborts before any delta with the classed error.

## Stream states

A stream is identified by a renderer-generated request id and moves through these states, driven by the host and observed by the renderer:

| State       | Entered when                         | Renderer effect                                                        |
| ----------- | ------------------------------------ | ---------------------------------------------------------------------- |
| `streaming` | `chat:start` returns ok              | Assistant message status `streaming`; chunks append text.              |
| `complete`  | The provider stream reaches `[DONE]` | Assistant message status `complete`.                                   |
| `stopped`   | The user calls `chat:stop`           | Assistant message status `stopped`; partial content kept.              |
| `error`     | The provider throws                  | Assistant message status `error`; partial content kept; retry offered. |

A `chat:start` that returns an error result (for example `missing-key`) never enters `streaming`: the host emits no events and the renderer marks the assistant message `error` immediately.

## Mapping to the canonical conversation

Spec 101 owns the persisted conversation. This feature only supplies two values to it:

| Canonical field     | Source in this feature                                          |
| ------------------- | --------------------------------------------------------------- |
| `model`             | The requested model, `openrouter/auto` (FR-008).                |
| assistant `content` | The concatenated streamed deltas.                               |
| assistant `status`  | `complete`, `stopped`, or `error` (transient values normalise). |

No other provider field is mapped. The routed model, usage counts, and finish reason are read only if a later spec decides to persist them.

## Registry

`createProviderRegistry(initial?: readonly ChatProvider[])` returns an object with `register(provider)`, `get(id)`, and `has(id)`. Beta registers one OpenRouter provider; a second provider can be registered and resolved with no UI change (US3).
