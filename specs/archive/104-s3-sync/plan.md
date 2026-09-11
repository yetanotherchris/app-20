# Implementation Plan: S3 Sync

**Branch**: `spec-104-s3-sync` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/104-s3-sync/spec.md`

## Summary

Implement beta cloud sync as a platform-neutral reconciliation engine in a new source-only package (`@app-20/sync`) plus an Electron S3 adapter. The engine takes a local `ConversationFilePort` (spec 101) and a `SyncRemote` port, and reconciles conversations and the manifest by last-write-wins on the conversation `updatedAt` (FR-004). The Electron main process implements `SyncRemote` with `@aws-sdk/client-s3`, reading the bucket, region, and optional endpoint from the extended S3 credential file stored under spec 103. A background job runs on startup and after each local save, retries with capped backoff, and publishes a status (`disabled`, `idle`, `pending`, `syncing`, `error`) that the shell shows in the top bar. The engine imports no Node, Electron, or React, so the iOS app (spec 106) reuses it with its own remote port.

## Technical Context

**Language/Version**: TypeScript 5.7 strict; Node (Electron main and preload); React 19 renderer via electron-vite

**Primary Dependencies**: One new runtime dependency, `@aws-sdk/client-s3` (auth, retries, pagination for the S3 protocol), in `apps/electron`. One new source-only workspace package `@app-20/sync` depending only on `@app-20/conversation-storage`. One new test-only dev dependency, `@20minutes/s3rver`, for the e2e S3-compatible server. The secret layer (spec 103) gains optional `bucket`/`region`/`endpoint` fields in the `s3` kind.

**Storage**: S3 objects under a fixed `conversations/` prefix, one object per conversation file plus `manifest.json`, mirrored from the local conversation folder (spec 101). No new local store.

**Testing**: Vitest for the sync engine (in-memory local port and fake remote) and the extended S3 validator; Playwright (`_electron.launch`) for the spec 104 acceptance scenarios against `@20minutes/s3rver` on a loopback port.

**Target Platform**: Windows desktop (beta). The engine and the `SyncRemote` port are Electron-free for iOS reuse.

**Project Type**: npm-workspaces monorepo: a new library package plus the existing Electron desktop app.

**Performance Goals**: A sync of a small conversation set completes in a handful of S3 requests. A completed save does not block on sync; startup waits for a bounded first sync so spec 105 can restore a session after sync settles.

**Constraints**: Renderer receives no credentials and no S3 types; it sees only the status snapshot and typed error codes (constitution I, IV). No conversation content is transformed on upload or download (FR-008). A failed sync leaves local files untouched (constitution III). Deletions do not propagate (FR-009). No `any` at the IPC boundary.

**Scale/Scope**: Single user, one bucket, tens to hundreds of conversation files, small JSON documents.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                       | How this plan satisfies it                                                                                                                                                                                                                                                                                                            | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Process Isolation            | The S3 client, credentials, and sync engine run in main. The renderer reaches them only through `sync:get-status` and a `sync:status` event carrying a fixed snapshot; it never sees a key, bucket, or endpoint. The engine package imports no Node, Electron, or React.                                                              | PASS   |
| II. Path Trust                  | Local file names continue to be validated in main against the resolved real conversation folder before any read or write, through the existing `ConversationFilePort`. S3 object names are derived from validated local names and a fixed prefix. Renderer-visible errors carry a code and a fixed message.                           | PASS   |
| III. No Data Loss               | Downloads write through the local port's atomic write. A failed or partial remote object fails the conversation parse and is never recorded as valid. When local content is newer it is uploaded, not clobbered; when local content is corrupt it is left in place. A failed sync reports and retries and never removes a local file. | PASS   |
| IV. Fixed and Typed Preload API | One named invoke (`sync:get-status`) and one named event (`sync:status`) are added with explicit request and response types. No generic `invoke` is exposed and no `any` crosses the boundary.                                                                                                                                        | PASS   |
| V. Non-Negotiable Test Coverage | Unit tests cover the conflict rule, corrupt/empty/missing remote handling, deletion non-propagation, manifest rebuild, and the extended credential validator. The e2e suite covers the spec 104 acceptance scenarios against a real S3-compatible server.                                                                             | PASS   |

No violations. Complexity Tracking is not required. Extending the `s3` secret shape is additive and keeps spec 103's keys-only import valid, so no migration runs.

## Project Structure

### Documentation (this feature)

```text
specs/104-s3-sync/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities, sync algorithm, status model
├── quickstart.md        # Phase 1 validation guide
├── contracts/           # Phase 1 sync port, S3 adapter, and IPC contracts
│   └── s3-sync.md
└── tasks.md             # Phase 2 task list
```

### Source Code (repository root)

```text
packages/sync/
├── package.json                    # @app-20/sync (source entry, depends on conversation-storage)
├── tsconfig.json
└── src/
    ├── index.ts                    # public re-exports
    ├── types.ts                    # SyncRemote, SyncReport, SyncState, SyncStatus
    ├── engine.ts                   # syncOnce(local, remote)
    ├── engine.test.ts
    └── testing.ts                  # in-memory SyncRemote for tests

apps/electron/src/
├── shared/
│   ├── ipc-contract.ts             # add sync:get-status, sync:status event, AppBridge methods, SyncStatus
│   └── error-codes.ts              # add sync-not-configured, sync-failed
├── main/
│   ├── secretKinds.ts              # extend s3 validator with bucket/region/endpoint
│   ├── secretKinds.test.ts
│   ├── secrets.ts                  # add getS3Config()
│   ├── s3Remote.ts                 # @aws-sdk/client-s3 SyncRemote implementation
│   ├── s3Remote.test.ts
│   ├── conversationStore.ts        # export the filesystem port for sync
│   ├── sync.ts                     # status, enqueue, startup sync, capped-backoff retry
│   ├── sync.test.ts
│   ├── ipc.ts                      # register sync:get-status; enqueue sync after conversations:save
│   ├── ipc-contract.test.ts        # expected channel list
│   └── index.ts                    # bounded startup sync before the window opens
├── preload/
│   └── index.ts                    # getSyncStatus, onSyncStatus
└── renderer/src/
    ├── App.tsx                     # subscribe to sync status
    ├── hooks/useSyncStatus.ts
    ├── hooks/useSyncStatus.test.tsx
    └── components/ShellTopBar.tsx  # sync status indicator

tests/e2e/
├── s3-sync.spec.ts                 # spec 104 acceptance scenarios
├── fake-s3.ts                      # @20minutes/s3rver harness
└── app-bridge.d.ts                 # getSyncStatus/onSyncStatus types
```

**Structure Decision**: The reconciliation rules live in `packages/sync` because spec 106 requires the same sync behavior on iOS, where Electron and the AWS SDK for Node are absent. The engine depends only on the spec 101 `ConversationFilePort` and a narrow `SyncRemote` port, so both the Electron S3 adapter and a future iOS adapter plug in (FR-007). The S3 protocol work, credential reading, status state machine, retry policy, and IPC stay in `apps/electron/src/main`, matching the existing shell split. Unit tests sit beside their modules as `*.test.ts`. The spec 104 e2e suite uses `tests/e2e/fake-s3.ts`, mirroring `fake-openrouter.ts`.

## Complexity Tracking

No constitution violations. Decisions recorded in `research.md`: the engine/port split (R1); `@aws-sdk/client-s3` with path-style and checksum options (R2); `@20minutes/s3rver` as the e2e server (R3); object layout and manifest rebuild (R4); conflict rule details (R5); startup sync bounded before the window opens (R6); status and retry model (R7); extending the `s3` credential shape (R8); structural extraction before behavioral commits (R9).
