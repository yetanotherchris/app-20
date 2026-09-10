# Tasks: Desktop App Shell

**Input**: Design documents from `/specs/100-electron-desktop-shell/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ipc-and-file-api.md

**Tests**: The constitution requires tests for path containment, atomic writes and save failure, dirty/close/quit confirmation, and IPC contract shape. Unit tests and one e2e suite are included.

**Organization**: Tasks are grouped by user story. Setup and Foundational phases block all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- Electron app: `apps/electron/src/{main,preload,renderer,shared}`
- Unit tests: `apps/electron/src/**/*.test.ts`
- E2E: `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align the build and typing so the new modules compile and the existing component harness keeps working.

- [x] T001 Add the surface selector to `apps/electron/src/renderer/src/main.tsx` (render `ChatDemo` when `?surface=demo`, else `App`) and set the default surface to the shell.
- [x] T002 Update `apps/electron/src/main/window.ts` (new) to append `?surface=demo` when `process.env['APP20_RENDERER_SURFACE'] === 'demo'`.
- [x] T003 Add the build-time CSP `transformIndexHtml` plugin in `apps/electron/electron.vite.config.ts` (production build only).
- [x] T004 [P] Declare the `window.appBridge` renderer type in `apps/electron/src/renderer/src/global.d.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The typed contract, path safety, atomic write, and app lifecycle that every story depends on.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T005 Define the shared error code union in `apps/electron/src/shared/error-codes.ts`.
- [x] T006 Define the full typed IPC contract (invoke channels, event channels, result types, menu commands) in `apps/electron/src/shared/ipc-contract.ts`.
- [x] T007 [P] Implement `apps/electron/src/main/errors.ts` (`ok`, `err`, `sanitizeErrorCode`, path-free messages).
- [x] T008 [P] Implement `apps/electron/src/main/atomicWrite.ts` (temp file in same directory, `fsync`, rename, cleanup on failure).
- [x] T009 [P] Implement `apps/electron/src/main/paths.ts` (`resolveRealRoot`, `assertSafeFileName`, `assertPathWithinWorkspace`, `listWorkspaceFiles`).
- [x] T010 Implement `apps/electron/src/main/settings.ts` (read/write `userData/settings.json` via atomic write).
- [x] T011 Implement `apps/electron/src/main/workspace.ts` (choose/create/get/clear, persist and resolve the root).
- [x] T012 Implement `apps/electron/src/main/secrets.ts` (file chooser, validation, `safeStorage`, `userData/secrets.json`, status).
- [x] T013 Implement `apps/electron/src/main/security.ts` (deny window-open, guard navigation, `openExternal` for http/https only).
- [x] T014 Implement `apps/electron/src/main/window.ts` (BrowserWindow options, surface query, security wiring, close gate hook).
- [x] T015 Implement `apps/electron/src/main/ipc.ts` (register all `ipcMain.handle` channels; return typed results; send events).
- [x] T016 Implement `apps/electron/src/main/menu.ts` (application menu, accelerators, main-owned and renderer-owned commands).
- [x] T017 Implement `apps/electron/src/main/index.ts` (single-instance lock, `whenReady`, `before-quit` and `window-all-closed`, activate).
- [x] T018 Replace `apps/electron/src/preload/index.ts` with the fixed `appBridge` object of named methods plus event subscriptions.
- [x] T019 [P] Add unit tests for path containment (adversarial `..`, absolute, separator, symlinked root) in `apps/electron/src/main/paths.test.ts`.
- [x] T020 [P] Add unit tests for atomic write success and failure (target intact, temp cleaned, throws) in `apps/electron/src/main/atomicWrite.test.ts`.
- [x] T021 [P] Add a contract-shape unit test (every channel has request/response types, no generic invoke, error codes closed) in `apps/electron/src/main/ipc-contract.test.ts`.

**Checkpoint**: Contract, path safety, atomic writes, and lifecycle compile and unit tests pass.

---

## Phase 3: User Story 1 - Open the app and chat (Priority: P1) 🎯 MVP

**Goal**: Launch lands on a usable chat screen; a second launch focuses the existing window; quits cleanly.

**Independent Test**: Launch the built app; confirm the chat screen and composer render; launch again and confirm one window.

- [x] T022 [US1] Implement `apps/electron/src/renderer/src/App.tsx` composition root mounting the chat screen (top bar + `LLMChat.Root` + composer).
- [x] T023 [P] [US1] Implement `apps/electron/src/renderer/src/components/ShellTopBar.tsx` (workspace display name, app version, New Conversation, Save).
- [x] T024 [US1] Wire `onLinkPress` in the shell to `appBridge.openExternal` so links open in the system browser (spec 100 FR-011).
- [x] T025 [US1] Implement `tests/e2e/launch-shell.ts` (launch the shell surface, helpers to read/seed `settings.json`).
- [x] T026 [US1] Add e2e for launch, chat screen visibility, and single-instance focus in `tests/e2e/shell.spec.ts`.
- [x] T027 [US1] Verify CSP is applied in the built app and that `window.require`/`window.process` are undefined (assert in `tests/e2e/shell.spec.ts`).

**Checkpoint**: US1 works and is independently testable.

---

## Phase 4: User Story 2 - Quit without losing work (Priority: P1)

**Goal**: Closing or quitting with unsaved changes prompts; a failed save keeps the window open and the document dirty.

**Independent Test**: Edit, close and quit; confirm the prompt appears and nothing is lost.

- [x] T028 [US2] Implement the document dirty model in `apps/electron/src/renderer/src/hooks/useShellSession.ts` (messages, title, dirty, save, stop-on-close).
- [x] T029 [US2] Implement close-request handling in `apps/electron/src/renderer/src/hooks/useCloseGuard.ts` (stop stream, clean -> close, dirty -> dialog).
- [x] T030 [P] [US2] Implement `apps/electron/src/renderer/src/components/CloseConfirmDialog.tsx` (Save / Discard / Cancel; inline error on failed save).
- [x] T031 [US2] Gate `BrowserWindow` `close` and `app` `before-quit` in main (`apps/electron/src/main/index.ts` + `window.ts`), sending `app:close-requested` and honouring `app:close-decision`.
- [x] T032 [US2] Ensure `file:write` failure leaves the document dirty and the prior file intact (`apps/electron/src/main/ipc.ts`, `atomicWrite.ts`).
- [x] T033 [US2] Add e2e for close-with-unsaved-changes prompt, Cancel, Discard, Save, and failed save in `tests/e2e/shell.spec.ts`.

**Checkpoint**: US2 works; no unsaved change is discarded without confirmation.

---

## Phase 5: User Story 3 - Work from a folder (Priority: P2)

**Goal**: On first run the user creates or chooses a workspace; saved conversations are JSON files in it.

**Independent Test**: Open a folder, create a conversation, confirm the JSON file exists.

- [x] T034 [US3] Implement `apps/electron/src/renderer/src/hooks/useWorkspace.ts` (load on startup, choose/create actions, error mapping).
- [x] T035 [P] [US3] Implement `apps/electron/src/renderer/src/components/WorkspaceOnboarding.tsx` (Choose / Create, first-run copy).
- [x] T036 [US3] Implement `file:read`/`file:write`/`workspace:list` handlers with path validation in `apps/electron/src/main/ipc.ts`.
- [x] T037 [US3] Persist the active document to `<id>.json` via `file:write` and load it on startup (provisional envelope per research R10) in `useShellSession.ts`.
- [x] T038 [US3] Map error codes to path-free copy in `apps/electron/src/renderer/src/errorMessages.ts` and render them without absolute paths.
- [x] T039 [US3] Add e2e for onboarding, workspace persistence across restart, and a saved JSON file in the workspace in `tests/e2e/shell.spec.ts`.

**Checkpoint**: US3 works; the renderer never receives an absolute path.

---

## Phase 6: User Story 4 - Use the menu bar (Priority: P3)

**Goal**: Menu entries open the workspace, import the provider key, import S3 credentials, and quit.

**Independent Test**: Open each menu entry and confirm it performs its action.

- [x] T040 [US4] Implement the import commands' file chooser and store in `apps/electron/src/main/secrets.ts` and `apps/electron/src/main/menu.ts`.
- [x] T041 [US4] Send `app:notification` for main-owned menu outcomes and render them in `apps/electron/src/renderer/src/components/Notifications.tsx`.
- [x] T042 [US4] Wire `menu:command` for New Conversation and Save in `App.tsx`.
- [x] T043 [US4] Add e2e that stubs the file chooser via `electronApp.evaluate`, triggers each menu command, and asserts success and a malformed-file rejection in `tests/e2e/shell.spec.ts`.

**Checkpoint**: US4 works; malformed input is rejected and stores nothing.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T044 [P] Add a unit test for the renderer error-code mapping in `apps/electron/src/renderer/src/errorMessages.test.ts`.
- [x] T045 Verify no `any` at the IPC boundary and no generic invoke; adjust if needed.
- [x] T046 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e`; fix all failures.
- [x] T047 Format changed files with Prettier (local `format:check` misreports CRLF on Windows; confirm on CI).
- [x] T048 Archive the spec (`git mv specs/100-electron-desktop-shell specs/archive/100-electron-desktop-shell`, set `**Status**` to `Archived`).
- [ ] T049 Commit on `spec-100-electron-desktop-shell` with a `feat(spec-100)` message (pending explicit request).

---

## Dependencies & Execution Order

- Setup (Phase 1) -> Foundational (Phase 2) -> User Stories.
- US1 depends only on Foundational.
- US2 depends on US1's shell mounting and the Foundational IPC.
- US3 depends on US1 and Foundational workspace/file API.
- US4 depends on Foundational; its import actions are independent of US2/US3.
- Polish depends on all stories.

### Parallel Opportunities

- T007, T008, T009 (main helpers) are independent files.
- T019, T020, T021 (unit tests) are independent files.
- T023, T030, T035 (renderer components) are independent files.
- T044 can run alongside other polish after renderer copy exists.

## Implementation Strategy

MVP is US1 (launch to chat). US2 (no data loss) and US3 (workspace) follow, then US4 (menu). Each story leaves the app usable. Given the constitution, US2 is treated as P1 and not deferred.
