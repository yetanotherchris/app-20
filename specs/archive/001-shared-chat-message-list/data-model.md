# Data Model: Shared Chat Message List

**Date**: 2026-09-07 | **Spec**: 001-shared-chat-message-list

## Entities

### Message

The unit of conversation content, owned by the host application (per `docs/react-component-overview.md`). The message list renders it as an opaque, memoized row; this spec establishes the identity and content-shape types that later specs (002 rendering, 006 streaming) build on.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable identity, used as list key (FR-007). Never regenerated across streaming updates. |
| `role` | `'user' \| 'assistant' \| 'system'` | Canonical roles from the overview; `tool` reserved for future. |
| `contentParts` | `readonly ContentPart[]` | Typed content parts; text only in this spec's rendering. |
| `status` | `MessageStatus` | `queued \| sending \| streaming \| complete \| stopped \| error`. |
| `createdAt` | `string` (ISO) | Creation time. |
| `updatedAt` | `string` (ISO) | Optional; updates when streaming appends content. |

Validation: `id` is non-empty and unique within a conversation. `role` is one of the closed union. `contentParts` is non-empty. A streaming message keeps the same `id` and `createdAt` across updates.

### ContentPart

| Field | Type | Notes |
|---|---|---|
| `kind` | `'text'` | Initial content type; future kinds (attachments, images, tool calls) render through the fallback renderer. |
| `format` | `'plain' \| 'markdown'` | User prompts are `plain` (spec 002 FR-003); assistant text is `markdown`. |
| `text` | `string` | The content. |

### Conversation

An ordered collection of messages rendered by the list.

| Field | Type | Notes |
|---|---|---|
| `messages` | `readonly Message[]` | Immutable array; the host replaces it on every update. Order is chronological. |
| `hasEarlierMessages` | `boolean` | True when more history exists above the first rendered message (FR-005). |
| `isLoadingEarlier` | `boolean` | True while an earlier-message load is in flight. |

## List state (internal, not persisted)

Derived inside the component; reported to the host through callbacks.

| State | Derivation |
|---|---|
| `isAtBottom` | FR-003 predicate: `distanceFromBottom < oneMessageHeight`. |
| `unreadCount` | Number of messages appended while `!isAtBottom`; cleared on scroll-to-latest (FR-006). |
| `hasScrolledUp` | `!isAtBottom` with content below the viewport. |

## State transitions

- On scroll: `isAtBottom` toggles per the FR-003 predicate. Turning `isAtBottom` true clears the unread count (FR-006).
- On message append while `!isAtBottom`: `unreadCount += 1`.
- On message append while `isAtBottom`: the list follows (scrolls to keep the new content visible), `unreadCount` stays 0.
- On streaming update to a visible message: the message keeps identity; no unread increment (streaming chunks are not messages below the viewport).
- On scroll-to-latest activation: scroll to newest message, `unreadCount = 0`.
- On earlier-message load completing: messages prepend above the viewport; the visible anchor is preserved (FR-004).