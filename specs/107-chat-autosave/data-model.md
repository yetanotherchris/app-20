# Data Model: Chat Autosave

Spec 107 does not alter the spec 101 conversation schema or storage layout. It adds in-memory persistence state to the renderer session.

## Session Snapshot

| Field | Source | Purpose |
| --- | --- | --- |
| `id` | active conversation ref | Stable conversation identity. |
| `createdAt` | active conversation ref | Preserves original creation time. |
| `model` | fixed automatic model | Existing stored model value. |
| `messages` | live chat messages ref | Includes the latest terminal or partial response. |
| `draft` | live composer ref | Includes unsent text. |
| `baseConversation` | active base ref | Preserves storage fields not represented by the chat UI. |

The snapshot is converted with the existing conversation adapter immediately before each serialized save.

## Autosave Queue State

| Field | Type | Rule |
| --- | --- | --- |
| `requestedRevision` | number | Incremented by every autosave trigger. |
| `savedRevision` | number | Updated only when a write for its snapshot succeeds. |
| `isWriting` | boolean | At most one write runs at a time. |
| `draftTimer` | timeout or null | Reset by a draft edit; fires at 2,000 ms. |
| `reportedFailure` | boolean | Limits a continuous failure period to one visible notification; cleared by a successful write. |

Rules:

- A write runs only while `requestedRevision > savedRevision`.
- A later request received during a write is saved by a subsequent write with a fresh snapshot.
- A failed write does not advance `savedRevision`, so the next trigger retries the latest state.
- A flush cancels the draft timer, requests the current revision, and resolves after the queue has either saved it or attempted it and failed.

## Lifecycle Events

| Event | Queue action | User-visible result |
| --- | --- | --- |
| Draft edit | Reset two-second timer | None unless save fails. |
| Terminal exchange | Request flush | Conversation persists without a control. |
| Window blur | Request flush | Partial response persists. |
| New or switch | Flush before replacing session | Current conversation remains if the flush fails. |
| Close or quit | Stop stream, flush, authorize close | No prompt; close proceeds after a failed final attempt. |

## Persisted Conversation

The saved `Conversation` remains the schema defined by spec 101: one JSON conversation file plus a JSON manifest. Atomic write behavior remains in the main-process storage port. An empty conversation is valid, so a new conversation can be persisted without messages or a draft.
