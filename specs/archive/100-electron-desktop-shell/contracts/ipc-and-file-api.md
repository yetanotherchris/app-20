# IPC and File API Contract

Spec 100 exposes one fixed, typed surface between the renderer and the main process. Every operation is a named method; there is no generic `invoke`. Request and response types are declared in `apps/electron/src/shared/ipc-contract.ts` and used by both the preload bridge and the `ipcMain` handlers, so a change to a channel is a compile error on both sides until both agree.

## Isolation invariants

- `BrowserWindow` options: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- The renderer has no `fs`, no `path`, no `electron` import. The only privileged surface is `window.appBridge`.
- Every path is built in main from the app-managed conversation folder resolved with `fs.realpath`. A renderer request supplies a bare file name.
- A file name that is empty, absolute, `.`, `..`, contains `/`, `\`, a null byte, `:`, or a Windows reserved device name (`NUL`, `CON`, ...) is rejected with `invalid-name`.
- A resolved target outside the real conversation folder is rejected with `outside-folder`.
- Renderer-visible errors are a code plus a fixed, path-free message.
- Requests are refused unless they come from the main window's `webContents`.

## Channels

### `app:get-version` -> `Result<{ version: string }>`

Returns the packaged application version.

### `folder:get` -> `Result<ConversationFolderInfo>`

Returns `{ displayName, id }` for the app-managed folder. On startup main creates `<userData>/conversations` (the app config directory, overridable with `APP20_CONVERSATION_DIR`) and resolves it; if creation or resolution fails, returns `err('read-failed')` so the shell can report it without an absolute path. `id` is a sha256 prefix of the real path, not the path.

### `folder:list` -> `Result<{ names: string[] }>`

Lists regular files directly inside the conversation folder, returning bare names (no directories, no absolute paths).

### `folder:reveal` -> `Result<{}>`

Opens the conversation folder in the OS file manager with `shell.openPath`.

### `file:read` `{ name: string }` -> `Result<{ content: string }>`

Validates the name, resolves it within the conversation folder, reads UTF-8 (capped at 8 MB). Missing or oversized files return `{ ok: false, code: 'read-failed' }` with a path-free message.

### `file:write` `{ name: string; content: string }` -> `Result<{ savedAt: string }>`

Validates the name and resolves it within the conversation folder, then writes atomically (temp file in the same directory, `fsync`, rename). On success returns `{ ok: true, value: { savedAt } }`. On failure returns `{ ok: false, code: 'write-failed' }`; the caller keeps the document dirty.

### `secrets:import-provider-key` -> `Result<{ kind }>`

Opens a file chooser, reads the file (capped), trims it, rejects empty or multi-line content with `invalid-secret`, encrypts with `safeStorage`, and writes `userData/secrets.json`. `secret-store-unavailable` when `safeStorage.isEncryptionAvailable()` is false.

### `secrets:import-s3` -> `Result<{ kind }>`

Opens a file chooser, parses JSON, requires `accessKeyId` and `secretAccessKey` strings, encrypts, and stores. Rejects malformed input with `invalid-secret`.

### `secrets:status` -> `Result<SecretsStatus>`

Returns `{ providerKey: boolean, s3: boolean }`. Never returns the stored values.

### `shell:open-external` `{ url: string }` -> `Result<{}>`

Opens `http:`/`https:` URLs in the system browser. Any other scheme returns `{ ok: false, code: 'not-permitted' }`. The renderer calls this from the chat component's `onLinkPress`.

### `app:close-decision` `{ decision: 'close' | 'cancel' }` -> `void`

The renderer's answer to `app:close-requested`: `close` authorises the pending window close or quit; `cancel` clears the pending request. Only `close` and `cancel` are accepted.

## Main-to-renderer events

### `app:close-requested` `{ reason: 'close' | 'quit' }`

Sent after `preventDefault()` on the window `close` event or the app `before-quit` event. The renderer must resolve it with `app:close-decision`.

### `menu:command` `{ command: MenuCommand }`

Sent for every menu item except Quit (`reveal-workspace`, `import-provider-key`, `import-s3-credentials`, `new-conversation`, `save-document`). The renderer runs the operation so outcomes surface in one place; Quit calls `app.quit()` in main and goes through the close gate. Main does not emit notifications.

## Error codes

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
```

The renderer maps each code to a fixed, path-free user string. Unknown errors are `unknown`. No handler returns a raw `Error.message` to the renderer.
