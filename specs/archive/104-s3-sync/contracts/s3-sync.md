# Contract: S3 Sync

The package port, the S3 adapter, the credential shape, and the IPC surface for spec 104.

## `@app-20/sync`

```ts
import type { ConversationFilePort } from '@app-20/conversation-storage'

export interface SyncRemote {
  listNames(): Promise<string[]>
  readText(name: string): Promise<string>
  writeText(name: string, content: string): Promise<void>
}

export interface SyncReport {
  uploaded: number
  downloaded: number
  skipped: number
  manifestUploaded: boolean
}

export function syncOnce(local: ConversationFilePort, remote: SyncRemote): Promise<SyncReport>
```

Rules:

- `syncOnce` reads and writes names only. It never sees a filesystem path or a URL.
- It imports `@app-20/conversation-storage` for `parseConversationSafe`, the manifest helpers, and `isConversationFileName`. It imports no Node, Electron, or React module.
- A throw from either port aborts the run and is left for the caller to classify; no local file is removed on failure.

## S3 adapter (`apps/electron/src/main/s3Remote.ts`)

```ts
import type { S3Config } from './secrets'
import type { SyncRemote } from '@app-20/sync'

export const S3_PREFIX = 'conversations/'

export function createS3Remote(config: S3Config): SyncRemote
```

Rules:

- `S3Client` options: `region` from config, static `credentials` from config, and when `endpoint` is present `endpoint` plus `forcePathStyle: true`. Always set `requestChecksumCalculation: 'WHEN_REQUIRED'` and `responseChecksumValidation: 'WHEN_REQUIRED'`.
- `listNames` pages `ListObjectsV2Command` on `ContinuationToken` and strips `S3_PREFIX`; keys outside the prefix are ignored.
- `readText` uses `GetObjectCommand` and `Body.transformToString()`.
- `writeText` uses `PutObjectCommand` with `ContentType: 'application/json'`.
- Every request is bounded by an abort timeout so an unresponsive endpoint cannot wedge the sync queue.
- Object names are appended to `S3_PREFIX`; a name is only ever one of the validated local file names, so it contains no path separator.

## Credential shape (`s3` secret kind)

Canonical stored JSON, preserving fields that are present:

```jsonc
{
  "accessKeyId": "AKIA...",
  "secretAccessKey": "...",
  "bucket": "my-bucket",
  "region": "us-east-1",
  "endpoint": "http://127.0.0.1:9000",
}
```

Validation:

- `accessKeyId` and `secretAccessKey` are required non-empty strings (spec 103).
- `bucket`, when present, is a non-empty string matching `^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$`.
- `region`, when present, is a non-empty string matching `^[a-z0-9-]+$`.
- `endpoint`, when present, is a non-empty `http` or `https` URL.
- A present-but-invalid optional field fails the import with `invalid-secret`; nothing is stored.

`getS3Config()` returns `null` when no `s3` secret is stored or the stored JSON lacks a bucket. It never returns secret material to the renderer.

## IPC

| Channel           | Request | Response             |
| ----------------- | ------- | -------------------- |
| `sync:get-status` | `void`  | `Result<SyncStatus>` |

| Event         | Payload      |
| ------------- | ------------ |
| `sync:status` | `SyncStatus` |

```ts
export type SyncStatus =
  { state: 'disabled' | 'idle' | 'pending' | 'syncing' } | { state: 'error'; error: AppErrorCode }
```

`AppBridge` gains `getSyncStatus(): Promise<Result<SyncStatus>>` and `onSyncStatus(handler: (status: SyncStatus) => void): () => void`. No key, bucket, or endpoint is part of the snapshot. There is no generic `invoke` escape hatch.

## Trigger points

- Startup: after the conversation folder loads and reconciles, enqueue one sync; await it with a cap before opening the window.
- Save: after `conversations:save` persists, enqueue a sync. The save response does not wait for the sync.
