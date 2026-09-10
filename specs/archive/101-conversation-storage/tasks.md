# Tasks: Conversation Storage

**Input**: Design documents from `/specs/101-conversation-storage/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/conversation-storage.md

**Tests**: The constitution requires tests for path containment, atomic writes, and IPC contract shape. New pure logic (schema, manifest, filename, store) gets unit tests, and the spec's acceptance scenarios get one Playwright suite. Tests are included below.

**Organization**: Tasks are grouped by user story. Setup and Foundational phases block all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- Shared package: `packages/conversation-storage/src/`
- Electron app: `apps/electron/src/{main,preload,renderer,shared}`
- Unit tests: `**/*.test.ts` beside the module
- E2E: `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the workspace package and link it into the Electron app.

- [x] T001 Create `packages/conversation-storage/package.json` (name `@app-20/conversation-storage`, `main`/`types` at `src/index.ts`, `typecheck` script) and `packages/conversation-storage/tsconfig.json` extending `tsconfig.base.json`.
- [x] T002 Add `"@app-20/conversation-storage": "^0.1.0"` to the dependencies in `apps/electron/package.json` and run `npm install` so npm links the workspace.
- [x] T003 [P] Confirm `vitest.config.ts` already includes `packages/**/*.test.{ts,tsx}` and add `packages/conversation-storage` to the root `tsconfig.json` references if the package needs a standalone typecheck.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The platform-neutral schema, manifest, filename, and store that both stories depend on.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T004 Implement `packages/conversation-storage/src/schema.ts`: `MessageRole`, `PersistedMessageStatus`, `ConversationMessage`, `Conversation`; `toPersistedStatus`; `parseConversation`, `parseConversationSafe`, `serializeConversation` (canonical fields only, tolerant of the four future optional message fields).
- [x] T005 [P] Implement `packages/conversation-storage/src/filename.ts`: `MANIFEST_FILE_NAME`, `conversationFileName`, `uniqueConversationFileName`.
- [x] T006 [P] Implement `packages/conversation-storage/src/manifest.ts`: `ManifestEntry`, `ConversationManifest`, `emptyManifest`, `parseManifest(Safe)`, `serializeManifest`, `upsertManifestEntry`, `sortManifestEntries`.
- [x] T007 Implement `packages/conversation-storage/src/store.ts`: `ConversationFilePort`, `ReconcileReport`, `ConversationLoad`, `ConversationStore`, `createConversationStore` (save writes file then manifest atomically via the port; list reconciles; read locates through the manifest).
- [x] T008 [P] Implement `packages/conversation-storage/src/testing.ts`: an in-memory `ConversationFilePort` for tests.
- [x] T009 Implement `packages/conversation-storage/src/index.ts` re-exporting the schema, manifest, filename, store, and testing surface.
- [x] T010 [P] Add `packages/conversation-storage/src/schema.test.ts`: round-trip, tolerant read of the four optional fields and an unknown key, transient-status normalisation at save and restore, invalid message makes the file corrupt, provider fields are stripped on serialize.
- [x] T011 [P] Add `packages/conversation-storage/src/filename.test.ts`: base name, collision suffixes, orphan left untouched.
- [x] T012 [P] Add `packages/conversation-storage/src/manifest.test.ts`: missing and corrupt manifest parse to empty, upsert, sort by `updatedAt` descending.
- [x] T013 [P] Add `packages/conversation-storage/src/store.test.ts`: save writes file and manifest, read returns ok/missing/corrupt, list repairs an orphan and drops a missing entry, and reports a corrupt file without deleting it.

**Checkpoint**: The package compiles, its unit tests pass, and it imports no Node, Electron, or React.

---

## Phase 3: User Story 1 - A conversation survives a restart (Priority: P1) 🎯 MVP

**Goal**: Save a conversation as one JSON file plus a manifest entry, and restore it after a restart with the app-owned schema.

**Independent Test**: Save a conversation, restart against the same conversation folder, and confirm the messages and draft are present.

- [x] T014 [US1] Implement the Electron filesystem port and store in `apps/electron/src/main/conversationStore.ts` (`listFileNames` via `listFolderFileNames`, `readText`/`writeText` via `assertPathWithinFolder` + `atomicWriteFile` with an 8 MB read cap, `removeFile`; `getConversationStore()`; `reconcileConversations()`).
- [x] T015 [P] [US1] Add `apps/electron/src/main/conversationStore.test.ts` covering the port against a temp directory (save writes a schema-valid file and manifest; a missing manifest becomes an empty list; an orphan is repaired; a corrupt file is reported and retained).
- [x] T016 [US1] Add `conversations:list`, `conversations:read`, and `conversations:save` to `apps/electron/src/shared/ipc-contract.ts` with typed requests/responses and bridge methods; remove `folder:list`, `file:read`, and `file:write`.
- [x] T017 [US1] Add `conversation-not-found`, `conversation-corrupt`, and `invalid-conversation` to `apps/electron/src/shared/error-codes.ts` with fixed path-free messages.
- [x] T018 [US1] Register the `conversations:*` handlers in `apps/electron/src/main/ipc.ts` and remove the `file:*` and `folder:list` handlers.
- [x] T019 [US1] Replace the `file:*` and `folder:list` bridge methods with the `conversations:*` methods in `apps/electron/src/preload/index.ts`.
- [x] T020 [US1] Implement `apps/electron/src/renderer/src/conversation/conversationAdapter.ts` mapping `app-20-llmchat` `Message` to and from `Conversation` (title from the first user prompt, model string, draft); delete `apps/electron/src/renderer/src/conversation/storedConversation.ts`.
- [x] T021 [US1] Rewrite the persistence in `apps/electron/src/renderer/src/hooks/useShellSession.ts` to save via `saveConversation` and restore the newest `listConversations` entry via `readConversation`, reporting a corrupt-file count.
- [x] T022 [US1] Call reconciliation after `loadConversationFolder()` in `apps/electron/src/main/index.ts` so a repair happens at startup, before the window opens.
- [x] T023 [US1] Add `tests/e2e/conversation-storage.spec.ts` covering US1: a saved file matches the app-owned schema, the manifest lists it, and the conversation and draft survive a relaunch against the same folder.
- [x] T024 [US1] Update `tests/e2e/app-bridge.d.ts` to the `conversations:*` bridge surface.

**Checkpoint**: US1 works; no provider field reaches disk and no absolute path reaches the renderer.

---

## Phase 4: User Story 2 - Conversations are listed from a manifest (Priority: P2)

**Goal**: The manifest is the index; it lists every conversation with metadata and survives the recovery edge cases.

**Independent Test**: Create two conversations; confirm the manifest and `conversations:list` report both with metadata, and that the recovery edge cases do not crash the app.

- [x] T025 [US2] Add the US2 e2e case in `tests/e2e/conversation-storage.spec.ts`: save two conversations and assert `manifest.json` and `conversations:list` list both with `id`, `fileName`, `title`, `model`, and `updatedAt`, newest first.
- [x] T026 [US2] Surface the reconcile report in the renderer: show a notification when `conversations:list` reports a corrupt file, in `apps/electron/src/renderer/src/hooks/useShellSession.ts`.
- [x] T027 [P] [US2] Add recovery e2e cases in `tests/e2e/conversation-storage.spec.ts`: a seeded corrupt file is reported and retained, a manifest entry with a missing file is dropped, and a valid file missing from the manifest is repaired.

**Checkpoint**: US2 works; a missing manifest is an empty history and damage is reported, not fatal.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Remove the superseded shell path, align existing tests, and run the gates.

- [x] T028 Update `tests/e2e/shell.spec.ts` to exclude `manifest.json` from conversation-file counts and to expect the new `appBridge` methods; keep every existing assertion meaningful.
- [x] T029 Update the expected channel list in `apps/electron/src/main/ipc-contract.test.ts` for the `conversations:*` channels and the removed `file:*`/`folder:list` channels.
- [x] T030 [P] Delete the now-dead file-operation helpers if nothing else uses them; keep `assertSafeFileName`, `resolveRealRoot`, `isWithin`, `assertPathWithinFolder`, and `listFolderFileNames` that the port uses.
- [x] T031 [P] Update the renderer error copy in `apps/electron/src/renderer/src/errorMessages.ts` for the new codes.
- [x] T032 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build:electron`; fix all failures.
- [x] T033 Run `npm run test:e2e`; fix all failures.
- [x] T034 Format changed files with Prettier (local `format:check` misreports CRLF on Windows; confirm on CI).
- [x] T035 Archive the spec (`git mv specs/101-conversation-storage specs/archive/101-conversation-storage`, set `**Status**` to `Archived`).

---

## Dependencies & Execution Order

- Setup (Phase 1) → Foundational (Phase 2) → user stories.
- US1 depends on the package (Foundational) and the Electron wiring it adds.
- US2 depends on US1's `conversations:list` and the store's reconcile report.
- Polish depends on both stories.

### Parallel Opportunities

- T005 and T006 are independent pure modules.
- T008 and T010–T013 are independent files.
- T015 and T024 are independent of the package's files.
- T027 and T031 are independent.
- Within the package, the four test files can be written in parallel after their modules exist.

## Implementation Strategy

MVP is US1: schema, store, Electron port, IPC, and renderer wiring deliver persistence. US2 adds the manifest as an index and the recovery edge cases. The package is built and unit-tested first so both stories share one verified schema.

## Notes

- The package must not import Node, Electron, or React; a violation of FR-012 is caught in review.
- Removing `file:*` is intentional (research R9); the shell e2e is updated, not weakened.
- Reconcile is idempotent; running it at startup and on `list` is safe.
