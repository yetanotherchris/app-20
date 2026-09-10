# Data Model: Conversation Storage

Entities, the persisted schema, and the reconciliation rules for spec 101. The schema types live in `packages/conversation-storage/src/schema.ts`; the manifest types in `manifest.ts`. They are the shapes both the Electron app and the iOS app agree on.

## Conversation

One JSON file per conversation. The file name is `<id>.json` unless an orphan collision forces a suffix (see Filename).

| Field       | Type                    | Notes                                                              |
| ----------- | ----------------------- | ------------------------------------------------------------------ |
| `id`        | `string`                | Conversation GUID, stable for the life of the conversation.        |
| `title`     | `string`                | Derived from the first user prompt; empty means untitled.          |
| `model`     | `string`                | Requested model. May be empty until spec 102 supplies one.         |
| `createdAt` | `string` (ISO 8601)     | Conversation creation time.                                        |
| `updatedAt` | `string` (ISO 8601)     | Last change time; the manifest date and spec 104's conflict field. |
| `draft`     | `string` (optional)     | Unsent composer text; opaque to storage.                           |
| `messages`  | `ConversationMessage[]` | Zero or more messages; an empty list is valid.                     |

**Rules**:

- An empty conversation is valid and savable.
- Save emits `title`, `model`, `createdAt`, and `updatedAt`. Parse tolerates an absent `draft`, `model`, or `createdAt`, defaulting `model` to `''` and `createdAt` to `updatedAt`, so an older or hand-written file still loads.
- Save emits only the app-owned fields plus a present `draft`; no provider-specific field is written.
- Serialization normalises every message `status` to a terminal value, so a transient value cannot reach disk even if a caller passes one.

## ConversationMessage

| Field       | Type                                          | Notes                                                           |
| ----------- | --------------------------------------------- | --------------------------------------------------------------- |
| `id`        | `string`                                      | Stable per message.                                             |
| `role`      | `'system' \| 'user' \| 'assistant' \| 'tool'` | `tool` is reserved for future tool calling.                     |
| `content`   | `string`                                      | Plain string content (OpenAI-compatible).                       |
| `createdAt` | `string` (ISO 8601)                           |                                                                 |
| `status`    | `'complete' \| 'stopped' \| 'error'`          | Terminal values only; transient values normalise to `complete`. |

Future optional fields, tolerated on parse and preserved when present:

| Field       | Type                      | Notes                            |
| ----------- | ------------------------- | -------------------------------- |
| `updatedAt` | `string` (ISO 8601)       | Future per-message update time.  |
| `parentId`  | `string`                  | Future parent message reference. |
| `error`     | `string`                  | Future error detail.             |
| `metadata`  | `Record<string, unknown>` | Future extension bag.            |

Messages missing `id`, `content`, or `createdAt`, or whose `role` is not one of the four, make the whole file corrupt. Any unknown key not listed above is ignored on read and not re-emitted.

## ConversationManifest

`manifest.json`, stored beside the conversation files. A missing or corrupt manifest is an empty history.

| Field           | Type              | Notes                            |
| --------------- | ----------------- | -------------------------------- |
| `version`       | `1`               | Schema version for the manifest. |
| `conversations` | `ManifestEntry[]` | One entry per conversation.      |

## ManifestEntry

| Field       | Type                | Notes                                                     |
| ----------- | ------------------- | --------------------------------------------------------- |
| `id`        | `string`            | Conversation GUID; the primary key.                       |
| `fileName`  | `string`            | The conversation file this entry describes.               |
| `title`     | `string`            | Denormalised from the conversation for the history list.  |
| `model`     | `string`            | Denormalised from the conversation.                       |
| `updatedAt` | `string` (ISO 8601) | Denormalised; the sort key and spec 104's conflict field. |

**Rules**:

- Entries are unique by `id` and by `fileName`.
- The history list sorts entries by `updatedAt` descending, `id` ascending as a tiebreak.

## Filename

| Function                                        | Behaviour                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `conversationFileName(id)`                      | `"<id>.json"`.                                                      |
| `uniqueConversationFileName(id, existingNames)` | `"<id>.json"` when free, else `"<id>-2.json"`, `"<id>-3.json"`, ... |

An orphan file whose name collides with a new conversation is left in place; the new conversation takes the suffixed name.

## Reconcile

Run at startup and on every `list`. Inputs: the file-name list, the parsed manifest, and each conversation file's parse result.

| Situation                                             | Action                                         | Report field |
| ----------------------------------------------------- | ---------------------------------------------- | ------------ |
| Manifest entry whose `fileName` is not on disk        | Drop the entry.                                | `dropped`    |
| Conversation file with no manifest entry, parses      | Add an entry from the conversation (repair).   | `repaired`   |
| Conversation file with no manifest entry, unparseable | Leave the file; count it; do not add an entry. | `corrupt`    |
| Entry and file both present                           | Keep.                                          | none         |

`manifest.json` itself is never treated as a conversation file. When `dropped` or `repaired` is non-zero the repaired manifest is written back atomically. A corrupt file is never deleted or overwritten.

## Store result types

```ts
type ReconcileReport = { dropped: number; repaired: number; corrupt: number }

type ConversationListResult = { entries: ManifestEntry[]; report: ReconcileReport }

type ConversationLoad =
  { kind: 'ok'; conversation: Conversation } | { kind: 'missing' } | { kind: 'corrupt' }

interface ConversationStore {
  list(): Promise<ConversationListResult>
  read(id: string): Promise<ConversationLoad>
  save(conversation: Conversation): Promise<{ fileName: string }>
}
```

## Storage port

Platform-neutral; the host provides the implementation and owns path safety.

```ts
interface ConversationFilePort {
  listFileNames(): Promise<string[]>
  readText(fileName: string): Promise<string>
  writeText(fileName: string, content: string): Promise<void>
  removeFile(fileName: string): Promise<void>
}
```
