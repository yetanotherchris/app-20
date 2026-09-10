# Conversation Storage Contract

Two contracts are defined by spec 101: the platform-neutral package API (`@app-20/conversation-storage`) and the Electron IPC surface the renderer uses to reach the store. The package runs unchanged on iOS; the IPC surface is Electron-only.

## Package API (`packages/conversation-storage/src/index.ts`)

Nothing in this surface imports Node, Electron, or React.

### Schema

```ts
type MessageRole = 'system' | 'user' | 'assistant' | 'tool'
type PersistedMessageStatus = 'complete' | 'stopped' | 'error'

interface ConversationMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  status: PersistedMessageStatus
  updatedAt?: string
  parentId?: string
  error?: string
  metadata?: Record<string, unknown>
}

interface Conversation {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  draft?: string
  messages: ConversationMessage[]
}

function toPersistedStatus(value: string): PersistedMessageStatus
function parseConversation(value: unknown): Conversation | null
function parseConversationSafe(content: string): Conversation | null
function serializeConversation(conversation: Conversation): string
```

`parseConversation` returns `null` for anything that is not a valid conversation: a non-object, a missing required field, a bad role, or a message that fails validation. It normalises `status` with `toPersistedStatus` and preserves the four known optional message fields when present. `serializeConversation` emits the canonical fields and a present optional field only; it never emits an unknown key.

### Manifest

```ts
interface ManifestEntry {
  id: string
  fileName: string
  title: string
  model: string
  updatedAt: string
}

interface ConversationManifest {
  version: 1
  conversations: ManifestEntry[]
}

const CONVERSATION_FILE_EXTENSION = '.json'
const MANIFEST_FILE_NAME = 'manifest.json'
const MANIFEST_VERSION = 1

function isConversationFileName(name: string): boolean
function emptyManifest(): ConversationManifest
function parseManifest(value: unknown): ConversationManifest | null
function parseManifestSafe(content: string): ConversationManifest | null
function serializeManifest(manifest: ConversationManifest): string
function upsertManifestEntry(
  manifest: ConversationManifest,
  entry: ManifestEntry,
): ConversationManifest
function sortManifestEntries(entries: readonly ManifestEntry[]): ManifestEntry[]
```

`parseManifest` returns `null` when an entry is malformed, duplicated by `id` or `fileName`, or names a reserved or path-bearing file. A rejected manifest is treated as absent and rebuilt from the conversation files, so a synced or hand-edited manifest cannot redirect a read or overwrite the manifest.

### Filename

```ts
function conversationFileName(id: string): string
function uniqueConversationFileName(id: string, existingNames: readonly string[]): string
```

### Store

```ts
interface ConversationFilePort {
  listFileNames(): Promise<string[]>
  readText(fileName: string): Promise<string>
  writeText(fileName: string, content: string): Promise<void>
}

interface ReconcileReport {
  dropped: number
  repaired: number
  corrupt: number
}

type ConversationLoad =
  { kind: 'ok'; conversation: Conversation } | { kind: 'missing' } | { kind: 'corrupt' }

interface ConversationStore {
  list(): Promise<{ entries: ManifestEntry[]; report: ReconcileReport }>
  read(id: string): Promise<ConversationLoad>
  save(conversation: Conversation): Promise<{ fileName: string }>
}

function createConversationStore(port: ConversationFilePort): ConversationStore
```

`save` writes the conversation file atomically, then upserts the manifest and writes it atomically. `list` reconciles before returning (see `data-model.md`). `read` locates the file through the manifest.

## Electron IPC (`apps/electron/src/shared/ipc-contract.ts`)

Named operations only; no generic `invoke`. Request and response types are shared by the preload bridge and the `ipcMain` handlers.

### `conversations:list` -> `Result<{ entries: ManifestEntry[]; report: ReconcileReport }>`

Runs reconciliation, then returns the manifest entries (sorted by `updatedAt` descending) and the repair report. A missing manifest returns an empty list with a zero report.

### `conversations:read` `{ id: string }` -> `Result<{ conversation: Conversation }>`

`missing` returns `err('conversation-not-found')`; a file that fails to parse returns `err('conversation-corrupt')`. Neither leaks a path.

### `conversations:save` `{ conversation: Conversation }` -> `Result<{ savedAt: string }>`

Validates the payload, writes the conversation file and the manifest atomically, and returns the conversation's `updatedAt` as `savedAt`. A validation or write failure returns `err('write-failed')` or `err('invalid-conversation')`.

### Removed channels

`folder:list`, `file:read`, and `file:write` are removed. The renderer must not write conversation files directly, because a direct write would bypass the manifest. `folder:get`, `folder:reveal`, the secret channels, `shell:open-external`, `app:close-decision`, and the event channels are unchanged.

## New error codes

```ts
'conversation-not-found': 'That conversation could not be found.'
'conversation-corrupt': 'That conversation file could not be read.'
'invalid-conversation': 'That conversation could not be saved.'
```

Messages are fixed and path-free; the renderer maps each code to user copy.

## Isolation invariants

- Every file name reaching the port is validated in main with `assertPathWithinFolder` against the resolved real conversation folder before read or write.
- `manifest.json` is a fixed constant, never supplied by the renderer.
- Writes go through `atomicWriteFile`; a failed write leaves the prior file intact.
- The renderer receives no absolute path and no file-name construction responsibility.
