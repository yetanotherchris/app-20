# Chat Session Contract

**Date**: 2026-09-08 | **Spec**: 006-shared-chat-streaming-operations

The operation-aware controller for the shared chat component. `Chat` itself is unchanged; hosts wire the transport into `useChatSession` and feed its output to `Chat`.

## Hook

```ts
const session = useChatSession({
  request: async (op, controls) => {
    // Host network call. Deterministic example:
    const stream = await fetchStream(op.prompt)
    for await (const chunk of stream) {
      if (controls.stopRequested()) break
      controls.appendChunk(chunk)
    }
    // controls.complete() / controls.fail() as appropriate
  },
  copyMessageText: async (message, text) => navigator.clipboard.writeText(text),
})
```

## Options

| Option            | Type                                       | Required | Notes                                                                      |
| ----------------- | ------------------------------------------ | -------- | -------------------------------------------------------------------------- |
| `request`         | `(op, controls) => void \| Promise<void>`  | yes      | Host transport. The hook calls it once per operation.                      |
| `copyMessageText` | `(message, text) => void \| Promise<void>` | no       | Delegated message-text copy; without it the copy action is inert (FR-007). |
| `initialMessages` | `readonly Message[]`                       | no       | Seed conversation.                                                         |

## Session surface (feeds `Chat`)

| Field                       | Type                                     | Notes                                                                           |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| `messages`                  | `readonly Message[]`                     | Pass to `Chat.messages`.                                                        |
| `status`                    | `ChatStatus`                             | Pass to `Chat.status` (FR-010).                                                 |
| `messageActions`            | `readonly MessageAction[]`               | Copy / retry / regenerate with availability (FR-007).                           |
| `onMessageAction`           | `(action, message) => void`              | Pass to `Chat.onMessageAction`.                                                 |
| `submit(prompt)`            | `(prompt: string) => void`               | Use from the host's `onSubmit`. No-op while an operation is in flight (FR-008). |
| `stop()`                    | `() => void`                             | Use from the host's `onStop`. Idempotent (FR-006).                              |
| `retry(messageId)`          | `(id: string) => void`                   | Replaces the errored response in place.                                         |
| `regenerate(messageId)`     | `(id: string) => void`                   | Replaces the completed response in place.                                       |
| `replaceMessages(messages)` | `(messages: readonly Message[]) => void` | Conversation replacement; invalidates the current operation.                    |

## Transport controls

| Method              | Effect                                                                       | Stale-guarded by                  |
| ------------------- | ---------------------------------------------------------------------------- | --------------------------------- |
| `appendChunk(text)` | Current response gains content, status `streaming` (FR-001/002).             | op id + message presence (FR-005) |
| `complete()`        | Current response `complete`, chat `idle`.                                    | op id                             |
| `fail()`            | Current response `error`, chat `idle` (list stays visible, retry available). | op id                             |
| `stopRequested()`   | True once `stop()` accepted; transport aborts cooperatively.                 | -                                 |

## Guarantees

- **Stale updates ignored (FR-005)**: chunk/complete/fail from a superseded operation never change a newer response; updates for a message no longer in the conversation are dropped.
- **Stop retains partial content, second stop is a no-op (FR-006)**: applies before the first chunk, mid-stream, and after the final chunk; exactly one terminal status (stopped or complete) wins the final-chunk race.
- **No duplicate send/stop (FR-008)**: `submit` is a no-op while an operation is in flight; `stop` is accepted once per operation.
- **Draft and typing untouched (FR-009, FR-011)**: the hook never reads or writes the composer draft; typing is host-controlled and unaffected by message updates.
- **Transient statuses never persisted (FR-012)**: `sending` and `streaming` are runtime-only; the host maps them out of the persisted vocabulary (spec 101) before storage.
