# Tasks: S3 Sync

**Input**: Design documents from `/specs/104-s3-sync/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/s3-sync.md

**Tests**: The constitution requires unit tests for new pure logic and the IPC contract shape, and the workflow requires one Playwright suite for user-visible behaviour. Tests are included below.

**Organization**: Tasks are grouped by user story. Setup and Foundational phases block all stories. The Foundational phase creates the platform-neutral engine and the shared status types with no network behaviour; the story phases add the S3 adapter and the background job.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Sync package: `packages/sync/src`
- Electron app: `apps/electron/src/{main,preload,renderer,shared}`
- Unit tests: `**/*.test.ts` beside the module
- E2E: `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the dependencies and confirm the baseline.

- [x] T001 Add `@aws-sdk/client-s3` to `apps/electron/package.json` dependencies and `@20minutes/s3rver` to the root `package.json` devDependencies; run `npm ci` and confirm `npm run test` is green before changes.
- [x] T002 [P] Add the new source package scaffold `packages/sync/package.json` (`@app-20/sync`, `main`/`types` at `src/index.ts`, dependency `@app-20/conversation-storage`) and `packages/sync/tsconfig.json` extending `tsconfig.base.json`, matching `packages/conversation-storage`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The engine, its ports, and the status contract. This is a structural change with no network behaviour, landed as its own commit.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T003 [P] Create `packages/sync/src/types.ts`: `SyncRemote`, `SyncReport`, `SyncState`, `SyncStatus` per `contracts/s3-sync.md`.
- [x] T004 Create `packages/sync/src/engine.ts`: `syncOnce(local, remote)` implementing the algorithm and conflict rule in `data-model.md`, reusing `parseConversationSafe`, `serializeManifest`, `sortManifestEntries`, `entryFromConversation`, `MANIFEST_FILE_NAME`, and `isConversationFileName` from `@app-20/conversation-storage`.
- [x] T005 Create `packages/sync/src/testing.ts`: an in-memory `SyncRemote` seeded from a `Record<string, string>` plus a `files` map, mirroring `conversation-storage/src/testing.ts`.
- [x] T006 Create `packages/sync/src/engine.test.ts` covering: local-only uploads; remote-only downloads (deletion non-propagation); remote-newer wins and overwrites local; local-newer wins and is uploaded; equal timestamps write nothing; missing/empty/corrupt remote skipped; corrupt remote repaired from valid local; corrupt local left untouched; remote manifest entries included as names; manifest rebuilt from files and uploaded; uploaded and downloaded bytes are exact (no conversion).
- [x] T007 Create `packages/sync/src/index.ts` re-exporting `syncOnce`, the types, and the testing helper.
- [x] T008 Export the filesystem port from `apps/electron/src/main/conversationStore.ts` as `getConversationFilePort()` (returns `createFolderPort()`), with no behaviour change; run existing tests.
- [x] T009 Add `sync:get-status` to `IpcContract`, `IPC_CHANNELS`, and `AppBridge`, and `sync:status` to `IpcEvents` and `IPC_EVENT_CHANNELS`, with `SyncState` and `SyncStatus` in `apps/electron/src/shared/ipc-contract.ts`; update `apps/electron/src/main/ipc-contract.test.ts` and `tests/e2e/app-bridge.d.ts`.
- [x] T010 Run `npm run lint`, `npm run typecheck`, and `npm run test`; commit the structural change before any behaviour change.

**Checkpoint**: The engine is unit-tested without Node, Electron, or a network, and the app behaves exactly as before.

---

## Phase 3: User Story 1 - Sync conversations to the cloud (Priority: P1)

**Goal**: A saved conversation is uploaded to the configured bucket in the background, with a visible status; offline or unconfigured does not block or crash the app.

**Independent Test**: Save a conversation and confirm it appears under `conversations/` in the test bucket with no further action. With no credentials, confirm the status is disabled and the app works.

- [x] T011 [P] [US1] Extend `validateS3Credentials` in `apps/electron/src/main/secretKinds.ts` to preserve and validate optional `bucket`/`region`/`endpoint` per `contracts/s3-sync.md`, and cover valid, invalid, and absent optional fields in `apps/electron/src/main/secretKinds.test.ts`.
- [x] T012 [US1] Add `S3Config` and `getS3Config()` to `apps/electron/src/main/secrets.ts`: parse the stored `s3` plaintext, return `null` when absent or bucket-less, and never expose it over IPC.
- [x] T013 [P] [US1] Add `sync-not-configured` and `sync-failed` to `APP_ERROR_CODES` and `ERROR_MESSAGES` in `apps/electron/src/shared/error-codes.ts`.
- [x] T014 [US1] Create `apps/electron/src/main/s3Remote.ts`: `S3_PREFIX`, `createS3Remote(config)` implementing `SyncRemote` with `ListObjectsV2Command` pagination, `GetObjectCommand` + `transformToString`, and `PutObjectCommand`, with the checksum and path-style options from `contracts/s3-sync.md`.
- [x] T015 [US1] Create `apps/electron/src/main/s3Remote.test.ts`: name/prefix mapping, `listNames` pagination join and prefix strip, missing-key propagation, and the client options applied for endpoint versus AWS.
- [x] T016 [US1] Create `apps/electron/src/main/sync.ts`: the serial queue, `getSyncStatus`, `enqueueSync`, `scheduleSync` (set `pending`, run, retry with capped backoff, set `error`), error classification to `network-error`/`sync-failed`, and a `sendToRenderer('sync:status', ...)` push on every transition.
- [x] T017 [US1] Create `apps/electron/src/main/sync.test.ts` with an injected remote factory: disabled when unconfigured; pending-to-idle on success; error after the retry cap; retry resets on a later save; runs are serialized so two triggers do not overlap.
- [x] T018 [US1] Register `sync:get-status` in `apps/electron/src/main/ipc.ts` and call `scheduleSync()` after `getConversationStore().save(...)` in the `conversations:save` handler.
- [x] T019 [US1] Add `getSyncStatus` and `onSyncStatus` to `apps/electron/src/preload/index.ts`.
- [x] T020 [P] [US1] Create `apps/electron/src/renderer/src/hooks/useSyncStatus.ts`: read the status once on mount and subscribe to `sync:status`; add `useSyncStatus.test.tsx`.
- [x] T021 [US1] Add a sync status indicator to `apps/electron/src/renderer/src/components/ShellTopBar.tsx` (testID `shell.sync-status`) with labels `Sync off`, `Synced`, `Sync pending`, `Syncing...`, `Sync failed`, and pass the status from `apps/electron/src/renderer/src/App.tsx`.
- [x] T022 [US1] Create `tests/e2e/fake-s3.ts`: start `@20minutes/s3rver` on a loopback port with `configureBuckets` and `allowMismatchedSignatures`, expose `endpoint`, `bucket`, `directory`, `listKeys`, `getText`, `putText`, and `close`, and add a local ambient type for the module.
- [x] T023 [US1] Create `tests/e2e/s3-sync.spec.ts` US1 cases: import S3 credentials pointing at the fake server, save, and assert the object appears in `conversations/`; assert the top-bar status settles to `Synced`; assert an unconfigured profile shows `Sync off` and still saves locally.
- [x] T024 [US1] Add `syncNotConfigured`/`syncFailed` handling (or a status-driven label) to `apps/electron/src/renderer/src/errorMessages.ts` if the label mapping does not already cover the states.

**Checkpoint**: US1 works end to end; a save reaches the bucket and the status is visible, and an unconfigured app is fully usable.

---

## Phase 4: User Story 2 - Restore newer remote content on startup (Priority: P2)

**Goal**: On startup, newer remote conversations and the manifest are downloaded; a locally newer conversation is uploaded instead of clobbered; conflicts resolve by `updatedAt` last-write-wins.

**Independent Test**: Seed the bucket with a newer conversation, start a fresh profile, and confirm the content is downloaded and shown. Seed an older remote copy and confirm the local newer copy is uploaded.

- [x] T025 [US2] Wire the startup path in `apps/electron/src/main/index.ts`: after `loadConversationFolder()` and `reconcileConversations()`, enqueue a sync and await it with a cap before `openWindow()`, so session restore (spec 105) starts after sync settles.
- [x] T026 [US2] Create `apps/electron/src/main/syncBootstrap.ts` (or export from `sync.ts`) that builds the remote from `getS3Config()` and the local port from `getConversationFilePort()`, and returns a `disabled` status when `getS3Config()` is `null`.
- [x] T027 [US2] Add the US2 e2e cases to `tests/e2e/s3-sync.spec.ts`: seed a newer remote conversation and manifest, launch a fresh profile, and assert the conversation is downloaded and visible; seed an older remote copy of a local conversation and assert the local newer content is uploaded and not overwritten; assert a conflict resolves by `updatedAt`.
- [x] T028 [US2] Add the corrupt/missing/empty remote e2e case: put an invalid JSON object under `conversations/`, launch, and assert startup completes, the file is skipped, and other conversations still sync (FR-006).
- [x] T029 [US2] Add the failure e2e case: import credentials with an unreachable endpoint (or an unknown access key), save, and assert the status reaches `Sync failed` after capped retries while the local conversation is intact (SC-004).

**Checkpoint**: US2 works end to end; startup pulls newer remote content and never clobbers locally newer content.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Align the existing suites, run the gates, and archive the spec.

- [x] T030 [P] Update `BRIDGE_METHODS` in `tests/e2e/shell.spec.ts` for `getSyncStatus`.
- [x] T031 Review `apps/electron/src/main/s3Remote.ts`, `sync.ts`, and `syncBootstrap.ts` against constitution I/II/IV: no credential, bucket, or endpoint reaches a log, error, or the renderer; no `any` at the boundary; local writes go through the atomic port.
- [x] T032 Confirm `apps/electron/electron.vite.config.ts` bundles `@app-20/sync` (add it to `externalizeDeps.exclude` beside `@app-20/conversation-storage`) and that `@aws-sdk/client-s3` is a runtime dependency of `apps/electron`.
- [x] T033 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build:electron`; fix all failures.
- [x] T034 Run `npm run test:e2e`; fix all failures.
- [x] T035 Format changed files with Prettier (the local `format:check` misreports CRLF on Windows; confirm on CI).
- [x] T036 Move the spec to `specs/archive/104-s3-sync` with `git mv` and set `**Status**` to `Archived`.

---

## Dependencies & Execution Order

- Setup (Phase 1) → Foundational (Phase 2) → user stories.
- US1 depends on the engine, the status contract, the exported local port, and the extended credentials; it adds the S3 adapter, the background job, and the status UI.
- US2 depends on US1's adapter and job, and adds startup wiring plus the download/conflict e2e cases.
- Polish depends on both stories.

### Parallel Opportunities

- T002 is independent of T001.
- T003, T005, and T007 are separate files; T004 depends on T003.
- T006 depends on T004 and T005.
- T011, T013, and T020 are independent of the S3 adapter work.
- T015 depends on T014; T017 depends on T016.
- T022 is independent of the main-process work and unblocks T023/T027.

## Implementation Strategy

The Foundational engine lands first as a structural commit with all tests green, so the conflict rule is reviewed on its own. US1 then adds the S3 adapter, the save-triggered background job, and the visible status. US2 adds the startup sync and proves download and conflict behavior. The e2e suite runs the real built app against an in-process S3-compatible server, so upload, download, conflict, and failure behavior are checked on the wire.

## Notes

- The renderer never receives a key, bucket, endpoint, or path; it sees only the status snapshot and typed codes.
- A failed sync never removes or overwrites local content; it reports and retries (constitution III).
- Deletions do not propagate in beta; a locally deleted conversation returns from the bucket (FR-009).
- The `s3` credential extension is additive, so a keys-only file still imports and spec 103 remains valid; sync reports `not configured` until a bucket is present.
