# Data Model: Shared Chat Streaming and Operations

**Date**: 2026-09-08 | **Spec**: 006-shared-chat-streaming-operations

## Entity: ChatOperation

A submit, retry, or regeneration with a unique id. One operation is current at a time (beta scale: one response in flight).

| Field       | Type                                  | Notes                                                             |
| ----------- | ------------------------------------- | ----------------------------------------------------------------- |
| `id`        | `string`                              | Unique per operation (FR-004).                                    |
| `kind`      | `'submit' \| 'retry' \| 'regenerate'` | What started the operation.                                       |
| `prompt`    | `string`                              | The prompt text the response answers.                             |
| `messageId` | `string`                              | The assistant response message this operation produces.           |
| `stopped`   | `boolean`                             | True once `stop()` has been accepted for this operation (FR-006). |

A completed or superseded operation is discarded; only the current operation accepts `appendChunk`/`complete`/`fail` (FR-005).

## Entity: ChatSessionControls

The transport-facing surface the hook passes to the host's `request` callback.

| Method              | Effect                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appendChunk(text)` | Appends to the current response, status becomes `streaming` (FR-001).                                                                              |
| `complete()`        | Marks the current response `complete`, chat status `idle`.                                                                                         |
| `fail()`            | Marks the current response `error`, chat status `idle` (message-level failure; the list stays visible with partial content, retry available) (R6). |
| `stopRequested()`   | True when `stop()` has been accepted for this operation, so the transport can abort cooperatively.                                                 |

## Entity: ChatSession

The hook's return value, shaped to feed `Chat` props directly.

| Field                       | Type                           | Notes                                                                                                                                                |
| --------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `messages`                  | `readonly Message[]`           | Owned by the hook.                                                                                                                                   |
| `status`                    | `ChatStatus`                   | `idle \| submitting \| streaming \| stopping \| error` (FR-010).                                                                                     |
| `submit(prompt)`            | `() => ChatOperation \| null`  | Appends the user message and a `sending` assistant placeholder, opens the operation, calls `request`. No-op when an operation is in flight (FR-008). |
| `retry(messageId)`          | `(id) => void`                 | Replaces the errored assistant message in place, reopens the operation with the same prompt.                                                         |
| `regenerate(messageId)`     | `(id) => void`                 | Replaces the completed assistant message in place, reopens the operation with the same prompt.                                                       |
| `stop()`                    | `() => void`                   | Accepts once per current operation; retains partial content, marks `stopped` (FR-006).                                                               |
| `appendChunk(opId, text)`   | `(id, text) => void`           | Rejects stale operations (FR-005).                                                                                                                   |
| `complete(opId)`            | `(id) => void`                 | Rejects stale operations.                                                                                                                            |
| `fail(opId)`                | `(id) => void`                 | Rejects stale operations; message-level error.                                                                                                       |
| `copyMessage(message)`      | `(m) => void`                  | Delegates the joined plain text to `options.copyMessageText` (FR-007).                                                                               |
| `messageActions`            | `readonly MessageAction[]`     | Copy (always), retry (assistant + error), regenerate (assistant + complete).                                                                         |
| `onMessageAction`           | `(action, message) => void`    | Wires the actions to the operations above.                                                                                                           |
| `replaceMessages(messages)` | `(readonly Message[]) => void` | Host conversation replacement; invalidates the current operation so no updates leak in (edge case).                                                  |

## Entity: Message status transitions (runtime vocabulary, FR-003)

Owned by the hook for the response message it produces:

```text
sending → streaming → complete
       ↘ streaming → stopped (stop, partial retained)
       ↘ (fail at any point) → error (partial retained)
```

The user message is `complete` once submitted. Transient statuses (`sending`, `streaming`) are runtime-only and never persisted (FR-012); spec 101 owns the persisted vocabulary.

## Entity: Chat status transitions (FR-010)

```text
idle → submitting (operation opened)
     → streaming (first chunk)
     → idle (complete, stopped, or message-level fail)
```

`stopping` is a host-set chat status (spec 005); the hook's `stop()` moves the message to `stopped` and the chat to `idle`. The chat status `error` is the conversation-level error that spec 005's ErrorState replaces the list with; a message failure does not set it (R6).

## Derived state: action availability

| Action     | Available when                    |
| ---------- | --------------------------------- |
| Copy       | any message                       |
| Retry      | role assistant, status `error`    |
| Regenerate | role assistant, status `complete` |
