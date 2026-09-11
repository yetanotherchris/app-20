# Tasks: Chat Autosave

**Input**: Design documents from `/specs/107-chat-autosave/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/chat-autosave.md

**Tests**: The constitution requires unit coverage for autosave behavior and a Playwright suite against the built app. Tests are included below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies).
- **[Story]**: User story served by the task.

## Phase 1: Setup

- [ ] T001 Confirm the merged `main` baseline and run `npm run test` before feature changes.

## Phase 2: Foundational Persistence

- [ ] T002 Create `apps/electron/src/renderer/src/conversation/autosaveQueue.ts` with serialized revision-based saves, fresh snapshots, debounce cancellation, failure reporting, retry-on-next-trigger, and flush semantics from `data-model.md`.
- [ ] T003 Create `apps/electron/src/renderer/src/conversation/autosaveQueue.test.ts` covering latest-wins ordering, one active write, two-second draft timing, failure retention, one error report, retry, and flush.
- [ ] T004 Extend `apps/electron/src/shared/ipc-contract.ts`, `apps/electron/src/preload/index.ts`, `apps/electron/src/main/window.ts`, and `apps/electron/src/main/ipc-contract.test.ts` with the typed `app:backgrounded` event; remove `save-document` from the menu command union.
- [ ] T005 Update `apps/electron/src/main/menu.ts` to remove Save and `CmdOrCtrl+S`.

## Phase 3: User Story 1 - Automatic terminal persistence

- [ ] T006 [US1] Integrate the queue into `apps/electron/src/renderer/src/hooks/useShellSession.ts` so complete, stopped, and error exchanges persist without a manual control and startup restores the most recent conversation.
- [ ] T007 [US1] Add `useShellSession.test.tsx` coverage for terminal snapshots and startup restoration behavior.
- [ ] T008 [US1] Create `tests/e2e/chat-autosave.spec.ts` cases for terminal response persistence, restart restoration, and new conversation preserving the prior conversation.

## Phase 4: User Story 2 - Draft and partial-response persistence

- [ ] T009 [US2] Add draft debounce and window-blur flush triggers to `useShellSession.ts`, including a flush before replacing the active conversation.
- [ ] T010 [US2] Extend unit tests for unsent drafts, send clearing the draft, partial streams, and concurrent save snapshots.
- [ ] T011 [US2] Extend `tests/e2e/chat-autosave.spec.ts` with idle-draft restart, sent-draft clearing, backgrounded partial stream, and pending-debounce close cases.

## Phase 5: User Stories 3 and 4 - No save prompt or controls

- [ ] T012 [US3] Replace `useCloseGuard` and `CloseConfirmDialog` wiring in `App.tsx` with stop, final flush, and close authorization; delete the obsolete hook and component plus their tests.
- [ ] T013 [US3] Add close and quit e2e cases that assert no dialog, final draft flush, partial-response persistence, and exit after a final failed save attempt.
- [ ] T014 [US4] Remove dirty/saving and Save props, UI, styles, and test IDs from `ShellTopBar.tsx`; remove manual Save handling from `App.tsx`.
- [ ] T015 [US4] Add e2e assertions that the chat UI and application menu contain no Save entry, accelerator, or unsaved indicator.

## Phase 6: User Story 5 - Failure reporting and retry

- [ ] T016 [US5] Wire queue failures through the existing notification path; retain session state and clear the failure state after a later successful autosave.
- [ ] T017 [US5] Add unit and e2e forced-failure-and-retry coverage.

## Phase 7: Cross-Suite Migration and Verification

- [ ] T018 Update `tests/e2e/shell.spec.ts`, `conversation-storage.spec.ts`, `ai-provider.spec.ts`, and `chat-history.spec.ts` to remove manual-save and confirmation assumptions while preserving their original coverage.
- [ ] T019 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e`; fix failures.
- [ ] T020 Format changed files with Prettier and confirm the check in CI.
- [ ] T021 Move `specs/107-chat-autosave` to `specs/archive/107-chat-autosave` and set its status to Archived before opening the implementation PR.

## Dependencies

- T001 precedes all feature work.
- T002 and T003 establish the queue before session integration.
- T004 and T005 can proceed in parallel with T002 and T003.
- T006 through T011 depend on T002 and T003; blur behavior additionally depends on T004.
- T012 through T015 depend on the session flush integration.
- T016 and T017 depend on the queue and notification wiring.
- T018 through T021 follow all user stories.
