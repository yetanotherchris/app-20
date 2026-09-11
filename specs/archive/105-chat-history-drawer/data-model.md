# Data Model: Chat History Drawer

The drawer introduces no persisted state and no wire format. It renders spec 101 data and adds transient renderer state.

## Entities

### History Entry (read-only view of a manifest entry)

Source: `ManifestEntry` from `@app-20/conversation-storage` (spec 101), returned by `conversations:list`.

| Field       | Type     | Use in the drawer                                                 |
| ----------- | -------- | ----------------------------------------------------------------- |
| `id`        | `string` | Selection key; passed to `conversations:read` and to the session. |
| `fileName`  | `string` | Not shown; stays in storage.                                      |
| `title`     | `string` | Row title; blank renders the `Untitled` placeholder.              |
| `model`     | `string` | Row model line; blank renders the `Unknown model` fallback.       |
| `updatedAt` | `string` | Row date via `historyDate`; also the list order (newest first).   |

No entry is mutated. The list is sorted by the store (`sortManifestEntries`, descending `updatedAt`) and truncated to ten for display.

### Drawer State (transient, renderer)

Held by `App` and `useConversationHistory`; never persisted.

| State                | Type                       | Owner                    | Meaning                                           |
| -------------------- | -------------------------- | ------------------------ | ------------------------------------------------- |
| `open`               | `boolean`                  | `App`                    | Whether the overlay is shown.                     |
| `entries`            | `readonly ManifestEntry[]` | `useConversationHistory` | Last list result.                                 |
| `loading`            | `boolean`                  | `useConversationHistory` | A list request is in flight.                      |
| `activeConversation` | `conversationId: string`   | `useShellSession`        | The conversation currently loaded in the session. |

### Selection outcome

`openConversation(id)` resolves to a discriminated result:

| Outcome          | Condition                                   | Effect                                                    |
| ---------------- | ------------------------------------------- | --------------------------------------------------------- |
| active           | `id` equals the active conversation id      | No read, no reload, draft kept; caller closes the drawer. |
| saved-and-opened | Different id and the current save succeeded | Messages and draft replaced from the read conversation.   |
| save-blocked     | Different id and the current save failed    | Nothing switches; the error code is reported.             |
| read-failed      | Current save succeeded but the read failed  | Nothing switches; the error code is reported.             |

## Rules

- Cap: at most ten entries are rendered (`HISTORY_LIMIT = 10`). Storage is not capped (spec 101).
- Order: newest `updatedAt` first, as returned by the store; the drawer does not re-sort.
- Title: blank after trimming renders `Untitled` (FR-005).
- Model: blank after trimming renders `Unknown model`.
- Date: `historyDate` returns `YYYY-MM-DD` from the local date parts, or the empty string for an unparseable value; the row shows the empty string rather than throwing.
- Empty list: renders the empty state, not an error (FR-006).
- Corrupt list: `report.corrupt > 0` reports `conversation-corrupt`; entries still render (FR-007).

## State transitions

```text
closed --open--> open (refresh list)
open --select(active)--> closed
open --select(other)--> [save current] --ok--> [read] --ok--> open conversation, closed
open --select(other)--> [save current] --fail--> still open, error reported
open --new--> [save current] --ok--> new empty conversation, closed
open --scrim--> closed
```
