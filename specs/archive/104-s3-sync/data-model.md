# Data Model: S3 Sync

Entities, the remote layout, the reconciliation algorithm, and the status model for spec 104. The engine types live in `packages/sync/src`; the S3 adapter and status live in `apps/electron/src/main`.

## SyncRemote (port)

The backend surface the engine needs. Platform-neutral; the host provides the implementation.

| Operation                  | Input             | Output     | Notes                                                                      |
| -------------------------- | ----------------- | ---------- | -------------------------------------------------------------------------- |
| `listNames()`              | none              | `string[]` | Bare object names (no prefix), one per conversation file and the manifest. |
| `readText(name)`           | object name       | `string`   | Throws when the object is absent.                                          |
| `writeText(name, content)` | name, exact bytes | void       | Creates or replaces the object.                                            |

The Electron adapter maps a bare name to the S3 key `conversations/<name>`, so the prefix appears in exactly one place.

## S3Config

The parsed contents of the stored `s3` secret plus the bucket coordinates.

| Field             | Type                | Notes                                                           |
| ----------------- | ------------------- | --------------------------------------------------------------- |
| `accessKeyId`     | `string`            | Required.                                                       |
| `secretAccessKey` | `string`            | Required.                                                       |
| `bucket`          | `string`            | Required for sync; a keys-only secret reports "not configured". |
| `region`          | `string`            | Defaults to `us-east-1` when absent.                            |
| `endpoint`        | `string` (optional) | S3-compatible base URL; enables path-style addressing.          |

## Remote layout

```text
conversations/<conversation fileName>   # exact local bytes
conversations/manifest.json             # rebuilt from local files, then uploaded
```

Object names equal the local file names. `manifest.json` is reserved by `isConversationFileName`, so it is never treated as a conversation.

## Sync algorithm (`syncOnce`)

Inputs: the local port, the remote port, and the set of local file names.

1. Read `localNames` (conversation files only) and `remoteNames` (filtered the same way).
2. Read the remote manifest with `parseManifestSafe`; add its `fileName` values to the name set (best effort; a corrupt remote manifest is ignored).
3. For each name, read and parse both sides (`parseConversationSafe`). Decide:

| Local   | Remote                   | Action                                                                | Report                               |
| ------- | ------------------------ | --------------------------------------------------------------------- | ------------------------------------ |
| valid   | missing                  | `remote.writeText(name, localRaw)`                                    | `uploaded`                           |
| valid   | corrupt/empty            | `remote.writeText(name, localRaw)` (repair)                           | `uploaded`, `skipped`                |
| missing | valid                    | `local.writeText(name, remoteRaw)`                                    | `downloaded`                         |
| corrupt | valid                    | leave local untouched                                                 | `skipped`                            |
| valid   | valid, remote newer      | re-read local, then `local.writeText(name, remoteRaw)` if still older | `downloaded`                         |
| valid   | valid, local newer       | `remote.writeText(name, localRaw)`                                    | `uploaded`                           |
| valid   | valid, equal `updatedAt` | none                                                                  | none                                 |
| missing | missing/corrupt          | none                                                                  | `skipped` when either side had bytes |

Before overwriting local content, the engine re-reads the local file and keeps it when a save landed after the initial listing and made it at least as new as the remote. This holds last-write-wins across a concurrent save and sync.

4. Re-list local conversation files, parse the valid ones, build `ManifestEntry` values with `entryFromConversation`, sort with `sortManifestEntries`, and serialize with `serializeManifest`.
5. Write the manifest locally, then upload it to the remote (only when its bytes changed). This guarantees no manifest entry references a file that is not on disk.

A remote read that throws `NoSuchKey` is "missing". Any other error propagates to the sync service, which sets `error` and retries.

## Conflict rule

- Field: the conversation `updatedAt` (ISO 8601). Comparison is lexicographic, which orders UTC ISO strings chronologically.
- Winner overwrites the loser with the winner's exact bytes; the losing content is not preserved (FR-004).
- No merge. Deletions are not propagated: a conversation absent locally but present remotely is downloaded again (FR-009).

## SyncStatus

```ts
type SyncStatus =
  { state: 'disabled' | 'idle' | 'pending' | 'syncing' } | { state: 'error'; error: AppErrorCode }
```

`disabled` means no credentials or no bucket. `error` carries the typed code.

Transitions:

- Startup or `sync:get-status` with no config: `disabled`.
- A completed local save: `pending`.
- A run starts: `syncing`.
- A run succeeds: `idle`.
- A run fails with attempts remaining: `pending` until the backoff fires, then `syncing`.
- A run fails with the attempt cap reached: `error` with `sync-failed` or `network-error`.
- A failed remote resolution (for example the store cannot be read) reports `error` instead of leaving the prior status.

## Errors

| Code            | Message                                           | Where                                      |
| --------------- | ------------------------------------------------- | ------------------------------------------ |
| `sync-failed`   | S3 sync failed. Check the bucket and credentials. | non-network failures at the retry cap      |
| `network-error` | The provider could not be reached.                | connectivity failures and request timeouts |

Errors carry a code and a fixed message; no key, bucket, endpoint, or path is included (spec 103 FR-005, constitution II).
