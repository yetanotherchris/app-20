# Data Model: Desktop App Shell

Entities in focus for spec 100. Types that cross the process boundary are declared in `apps/electron/src/shared/ipc-contract.ts` and are the shape both main and renderer agree on.

## Conversation Folder

The app-owned root folder that contains the user's conversation files. The user does not choose it.

| Field         | Type     | Notes                                                           |
| ------------- | -------- | --------------------------------------------------------------- |
| `rootPath`    | `string` | Absolute path. Main-process only. Never sent to the renderer.   |
| `displayName` | `string` | `path.basename(rootPath)`.                                      |
| `id`          | `string` | sha256 prefix of `rootPath`. The renderer's stable session key. |

**Location**: `<userData>/conversations`, the app config directory (`~/.config/app-20/conversations` on Linux, `%APPDATA%\app-20\conversations` on Windows), created on startup with `mkdir(recursive: true)` and resolved with `fs.realpath`. `APP20_CONVERSATION_DIR` overrides it for tests.

**Rules**:

- If creation or resolution fails, the shell reports `read-failed` and disables the composer; it does not crash.
- Missing or unreadable files are reported, not silently skipped.
- The absolute path is never sent to the renderer.

## Document

A single conversation opened in the app, tracked as clean or dirty.

| Field       | Type                | Notes                                                                  |
| ----------- | ------------------- | ---------------------------------------------------------------------- |
| `id`        | `string`            | Conversation identifier; also the base file name.                      |
| `title`     | `string`            | Derived from the first user prompt; empty means untitled.              |
| `updatedAt` | `string` (ISO 8601) | Last modification time.                                                |
| `draft`     | `string`            | Unsent composer text; persisted so a draft survives close and restart. |
| `messages`  | `StoredMessage[]`   | See below.                                                             |
| `dirty`     | `boolean`           | Renderer-only. Not persisted.                                          |

**Persisted envelope** (provisional; spec 101 owns the final schema):

```json
{
  "id": "conversation-1a2b",
  "title": "How do I export a CSV",
  "updatedAt": "2026-09-10T12:00:00.000Z",
  "draft": "",
  "messages": [
    {
      "id": "m1",
      "role": "user",
      "content": "How do I export a CSV?",
      "createdAt": "2026-09-10T12:00:00.000Z",
      "status": "complete"
    }
  ]
}
```

**Rules**:

- `dirty` becomes `true` on any content, draft, or title change and on a failed save.
- `dirty` becomes `false` only after `atomicWriteFile` reports success.
- A save that throws leaves `dirty` `true` and the prior file intact (spec 100 FR-004).
- An empty message list is valid and savable.

## StoredMessage

| Field       | Type                                 | Notes                                                         |
| ----------- | ------------------------------------ | ------------------------------------------------------------- |
| `id`        | `string`                             | Stable per message.                                           |
| `role`      | `'system' \| 'user' \| 'assistant'`  | `tool` reserved for future work (spec 101).                   |
| `content`   | `string`                             | Plain text for the shell; spec 105 maps it to `contentParts`. |
| `createdAt` | `string` (ISO 8601)                  |                                                               |
| `status`    | `'complete' \| 'stopped' \| 'error'` | Persisted terminal status only.                               |

## Preload API (`appBridge`)

The fixed, typed set of operations the renderer may call. One named method per channel; no generic `invoke`.

| Method                                 | Channel                       | Request                             | Response                         |
| -------------------------------------- | ----------------------------- | ----------------------------------- | -------------------------------- |
| `getAppVersion()`                      | `app:get-version`             | none                                | `Result<{ version: string }>`    |
| `getConversationFolder()`              | `folder:get`                  | none                                | `Result<ConversationFolderInfo>` |
| `listConversationFiles()`              | `folder:list`                 | none                                | `Result<{ names: string[] }>`    |
| `revealConversationFolder()`           | `folder:reveal`               | none                                | `Result<{}>`                     |
| `readConversationFile(name)`           | `file:read`                   | `{ name: string }`                  | `Result<{ content: string }>`    |
| `writeConversationFile(name, content)` | `file:write`                  | `{ name: string; content: string }` | `Result<{ savedAt: string }>`    |
| `importProviderKey()`                  | `secrets:import-provider-key` | none                                | `Result<{ kind }>`               |
| `importS3Credentials()`                | `secrets:import-s3`           | none                                | `Result<{ kind }>`               |
| `getSecretsStatus()`                   | `secrets:status`              | none                                | `Result<SecretsStatus>`          |
| `openExternal(url)`                    | `shell:open-external`         | `{ url: string }`                   | `Result<{}>`                     |
| `reportCloseDecision(d)`               | `app:close-decision`          | `{ decision }`                      | `void`                           |

Main-to-renderer events (subscribed via `on*` methods, each returning an unsubscribe function):

| Event              | Channel               | Payload                         |
| ------------------ | --------------------- | ------------------------------- |
| `onCloseRequested` | `app:close-requested` | `{ reason: 'close' \| 'quit' }` |
| `onMenuCommand`    | `menu:command`        | `{ command: MenuCommand }`      |

Notifications are renderer-local; main does not emit them.

## Result types

All handlers return a discriminated union. Error messages are fixed, path-free strings.

```ts
type AppErrorCode =
  | 'no-folder'
  | 'invalid-name'
  | 'outside-folder'
  | 'read-failed'
  | 'write-failed'
  | 'chooser-cancelled'
  | 'invalid-secret'
  | 'secret-store-unavailable'
  | 'not-permitted'
  | 'unknown'

type Ok<T> = { ok: true; value: T }
type Err = { ok: false; code: AppErrorCode; message: string }
type Result<T> = Ok<T> | Err

type ConversationFolderInfo = { displayName: string; id: string }
type SecretsStatus = { providerKey: boolean; s3: boolean }
```

## Menu commands

| Command                 | Label                      | Accelerator         | Action                                                         |
| ----------------------- | -------------------------- | ------------------- | -------------------------------------------------------------- |
| `reveal-workspace`      | Show Conversations Folder  | `CmdOrCtrl+Shift+F` | `menu:command` -> renderer calls `folder:reveal`               |
| `import-provider-key`   | Import Provider API Key... | `CmdOrCtrl+K`       | `menu:command` -> renderer calls `secrets:import-provider-key` |
| `import-s3-credentials` | Import S3 Credentials...   | `CmdOrCtrl+Shift+K` | `menu:command` -> renderer calls `secrets:import-s3`           |
| `new-conversation`      | New Conversation           | `CmdOrCtrl+N`       | `menu:command` -> renderer saves then starts fresh             |
| `save-document`         | Save                       | `CmdOrCtrl+S`       | `menu:command` -> renderer saves                               |
| (no command)            | Quit                       | `CmdOrCtrl+Q`       | Calls `app.quit()` in main; the close gate then runs           |

Every menu item except Quit sends `menu:command`; the renderer runs the operation so all outcomes surface in one place. The close gate owns Quit.
