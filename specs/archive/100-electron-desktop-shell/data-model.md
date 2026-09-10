# Data Model: Desktop App Shell

Entities in focus for spec 100. Types that cross the process boundary are declared in `apps/electron/src/shared/ipc-contract.ts` and are the shape both main and renderer agree on.

## Workspace

The root folder that contains the user's conversations.

| Field         | Type     | Notes                                                                  |
| ------------- | -------- | ---------------------------------------------------------------------- |
| `rootPath`    | `string` | Absolute path. Main-process only. Never sent to the renderer.          |
| `displayName` | `string` | `path.basename(rootPath)`. The only workspace field the renderer sees. |

**Persistence**: `rootPath` is stored as `workspacePath` in `userData/settings.json`.

**Rules**:

- A missing `settings.json` or missing key means no workspace. Startup does not fail.
- The root is resolved with `fs.realpath` before any file operation.
- A workspace path that no longer exists or is unreadable produces a clear error mapped to a code, never an absolute path in the message (spec 100 edge cases).

**Transitions**:

```text
none --choose/pick existing dir--> workspace(root realpath)
none --create/pick new dir path--> workspace(mkdir recursive, realpath)
workspace --open different dir--> workspace(new root realpath)
workspace --root missing at startup--> none (reported, no crash)
```

## Document

A single conversation opened in the app, tracked as clean or dirty. The shell owns the dirty flag; the content is held in renderer state.

| Field       | Type                | Notes                                                     |
| ----------- | ------------------- | --------------------------------------------------------- |
| `id`        | `string`            | Conversation identifier; also the base file name.         |
| `title`     | `string`            | Derived from the first user prompt; empty means untitled. |
| `updatedAt` | `string` (ISO 8601) | Last modification time.                                   |
| `messages`  | `StoredMessage[]`   | See below.                                                |
| `dirty`     | `boolean`           | Renderer-only. Not persisted.                             |

**Persisted envelope** (provisional; spec 101 owns the final schema):

```json
{
  "id": "conversation-1a2b",
  "title": "How do I export a CSV",
  "updatedAt": "2026-09-10T12:00:00.000Z",
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

- `dirty` becomes `true` on any content or title change and on a failed save.
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
| `status`    | `'complete' \| 'stopped' \| 'error'` | Persisted terminal status only (spec 101 FR-011).             |

## Preload API (`appBridge`)

The fixed, typed set of operations the renderer may call. One named method per channel; no generic `invoke`.

| Method                              | Channel                       | Request                             | Response                |
| ----------------------------------- | ----------------------------- | ----------------------------------- | ----------------------- |
| `getAppVersion()`                   | `app:get-version`             | none                                | `{ version: string }`   |
| `getWorkspace()`                    | `workspace:get`               | none                                | `WorkspaceInfo \| null` |
| `chooseWorkspace()`                 | `workspace:choose`            | none                                | `WorkspaceResult`       |
| `createWorkspace()`                 | `workspace:create`            | none                                | `WorkspaceResult`       |
| `listWorkspaceFiles()`              | `workspace:list`              | none                                | `{ names: string[] }`   |
| `readWorkspaceFile(name)`           | `file:read`                   | `{ name: string }`                  | `ReadResult`            |
| `writeWorkspaceFile(name, content)` | `file:write`                  | `{ name: string; content: string }` | `WriteResult`           |
| `importProviderKey()`               | `secrets:import-provider-key` | none                                | `ImportResult`          |
| `importS3Credentials()`             | `secrets:import-s3`           | none                                | `ImportResult`          |
| `getSecretsStatus()`                | `secrets:status`              | none                                | `SecretsStatus`         |
| `openExternal(url)`                 | `shell:open-external`         | `{ url: string }`                   | `void`                  |
| `reportCloseDecision(d)`            | `app:close-decision`          | `{ decision: 'close' \| 'cancel' }` | `void`                  |

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
  | 'no-workspace'
  | 'invalid-name'
  | 'outside-workspace'
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

type WorkspaceInfo = { displayName: string; id: string }
type WorkspaceResult = Result<WorkspaceInfo>
type ReadResult = Result<{ content: string }>
type WriteResult = Result<{ savedAt: string }>
type ImportResult = Result<{ kind: 'provider-key' | 's3' }>
type SecretsStatus = { providerKey: boolean; s3: boolean }
```

`id` is a sha256 prefix of the real workspace root, used by the renderer as a stable session key without exposing the path.

## Menu commands

| Command                 | Label                      | Accelerator         | Action                                                         |
| ----------------------- | -------------------------- | ------------------- | -------------------------------------------------------------- |
| `open-workspace`        | Open Workspace Folder...   | `CmdOrCtrl+O`       | `menu:command` -> renderer calls `workspace:choose`            |
| `create-workspace`      | Create Workspace Folder... | `CmdOrCtrl+Shift+O` | `menu:command` -> renderer calls `workspace:create`            |
| `import-provider-key`   | Import Provider API Key... | `CmdOrCtrl+K`       | `menu:command` -> renderer calls `secrets:import-provider-key` |
| `import-s3-credentials` | Import S3 Credentials...   | `CmdOrCtrl+Shift+K` | `menu:command` -> renderer calls `secrets:import-s3`           |
| `new-conversation`      | New Conversation           | `CmdOrCtrl+N`       | `menu:command` -> renderer saves then starts fresh             |
| `save-document`         | Save                       | `CmdOrCtrl+S`       | `menu:command` -> renderer saves                               |
| (no command)            | Quit                       | `CmdOrCtrl+Q`       | Calls `app.quit()` in main; the close gate then runs           |

Every menu item except Quit sends `menu:command`; the renderer runs the operation so all outcomes surface in one place. The close gate owns Quit.
