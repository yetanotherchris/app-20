# Tasks: Chat History Drawer

**Input**: Design documents from `/specs/105-chat-history-drawer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/chat-history-drawer.md

**Tests**: The constitution requires unit tests for new pure logic and one Playwright suite for user-visible behavior. Tests are included below.

**Organization**: Tasks are grouped by user story. The Foundational phase adds the shared rules and the session capability; each story phase then adds the drawer UI and the e2e cases it needs.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Renderer: `apps/electron/src/renderer/src/{components,hooks,history}`
- Unit tests: `*.test.ts(x)` beside the module
- E2E: `tests/e2e/`

---

## Phase 1: Setup

**Purpose**: Confirm the baseline before changes.

- [x] T001 Confirm `npm run test` is green on the `spec-105-chat-history-drawer` branch before changes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The presentation rules and the session switching capability every story depends on.

**⚠️ CRITICAL**: No story work begins until this phase is complete.

- [x] T002 [P] Create `apps/electron/src/renderer/src/history/historyEntries.ts` with `HISTORY_LIMIT`, `UNTITLED_TITLE`, `UNKNOWN_MODEL`, `recentEntries`, `historyTitle`, `historyModel`, and `historyDate` per `contracts/chat-history-drawer.md` and `data-model.md`.
- [x] T003 [P] Create `apps/electron/src/renderer/src/history/historyEntries.test.ts` covering the ten-entry cap, blank and non-blank title, blank and non-blank model, a valid ISO date, and an unparseable date.
- [x] T004 Extend `apps/electron/src/renderer/src/hooks/useShellSession.ts` with a reactive `conversationId` and `openConversation(id)`: short-circuit the active id; otherwise save the current conversation when dirty, abort with the code on failure, then read and load messages and draft through `fromConversation` and update the base, id, and createdAt refs. Follow `contracts/chat-history-drawer.md`.

**Checkpoint**: The rules are unit-tested and the session can switch conversations without losing the current one.

---

## Phase 3: User Story 1 - Browse and resume a recent conversation (Priority: P1) 🎯 MVP

**Goal**: Open the drawer, see recent conversations newest first, and pick one to continue.

**Independent Test**: Seed two conversations, open the drawer, select the older one; its messages and draft are present and it can be continued.

- [x] T005 [P] [US1] Create `apps/electron/src/renderer/src/components/HistoryDrawer.tsx` per the contract: scrim, left panel, New conversation control, heading, empty state, entry rows using the helpers, `accessibilityViewIsModal`, and Escape-to-close.
- [x] T006 [P] [US1] Create `apps/electron/src/renderer/src/components/HistoryDrawer.test.tsx` covering the closed render, the empty state, a rendered row (title, model, date), row selection, New conversation, scrim close, and Escape close.
- [x] T007 [P] [US1] Create `apps/electron/src/renderer/src/hooks/useConversationHistory.ts` with `entries`, `loading`, and `refresh` per the contract, reporting list failures and `conversation-corrupt` through the injected callback. Add `useConversationHistory.test.tsx` for success, corrupt, and failure results.
- [x] T008 [US1] Add a History toggle (`testID="shell.history-toggle"`) to `apps/electron/src/renderer/src/components/ShellTopBar.tsx` and pass `onOpenHistory` from `App`.
- [x] T009 [US1] Wire the drawer in `apps/electron/src/renderer/src/App.tsx`: own the open state, refresh the list on open, call `session.openConversation` on select (reporting the code and closing only on success), and close on scrim or Escape.
- [x] T010 [US1] Create `tests/e2e/chat-history.spec.ts` US1 cases: seed two conversations with drafts, open the drawer, assert newest-first order and title/model/date, select the older one, assert its messages and draft, then send a follow-up to prove it continues; assert the drawer closes on selection and on the scrim.

**Checkpoint**: Browse and resume work end to end.

---

## Phase 4: User Story 2 - Start a new conversation from the drawer (Priority: P1)

**Goal**: Start a new conversation from the top of the drawer without losing the current one.

**Independent Test**: Open the drawer, activate New conversation; the composer is empty and the prior conversation is persisted.

- [x] T011 [US2] Wire `onNew` in `apps/electron/src/renderer/src/App.tsx` to reuse `createNewConversation`, then refresh the list and close the drawer.
- [x] T012 [US2] Add the US2 e2e case to `tests/e2e/chat-history.spec.ts`: with a dirty conversation, open the drawer and activate New conversation; assert the composer is empty, the previous conversation is on disk, and the new conversation is listed on reopen.

**Checkpoint**: New conversation from the drawer never loses the previous one.

---

## Phase 5: User Story 3 - Handle empty, untitled, and unreadable entries (Priority: P2)

**Goal**: The drawer stays usable with nothing to show or an unreadable entry.

**Independent Test**: Launch with no conversations for the empty state; corrupt one file and confirm the others still work.

- [x] T013 [US3] Add the US3 e2e cases to `tests/e2e/chat-history.spec.ts`: empty history shows the empty state with no error; a blank-title conversation renders `Untitled`; one corrupt file plus one valid file reports the corrupt entry and leaves the valid entry selectable.

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Gates, review, and archive.

- [x] T014 [P] Verify accessibility on the drawer: modal semantics, button roles and labels, and Escape close (`apps/electron/src/renderer/src/components/HistoryDrawer.tsx`).
- [x] T015 Run `npm run lint`, `npm run typecheck`, and `npm run test`; fix all failures.
- [x] T016 Run `npm run test:e2e`; fix all failures.
- [x] T017 Format changed files with Prettier (confirm on CI; local CRLF can misreport).
- [x] T018 Move the spec to `specs/archive/105-chat-history-drawer` with `git mv` and set `**Status**` to `Archived`.

---

## Dependencies & Execution Order

- Setup (Phase 1) → Foundational (Phase 2) → user stories.
- US1 depends on the helpers (T002) and `openConversation` (T004); it builds the drawer, the list hook, and the toggle.
- US2 depends on the drawer and the New control from US1; it wires `onNew` and proves no loss.
- US3 depends on the drawer from US1; it proves the empty, untitled, and corrupt cases.
- Polish depends on all stories.

### Parallel Opportunities

- T002 and T003 are one module and its test.
- T005, T006, and T007 are separate files.
- T010 and T012 both edit `tests/e2e/chat-history.spec.ts`; run them in order.

### Within Each User Story

- Helpers and the session capability before the component.
- Component and hook before the App wiring.
- App wiring before the e2e cases.

## Implementation Strategy

Deliver US1 first as the MVP: the drawer, the list hook, and resume. Then US2 adds the New conversation path. US3 adds the empty, untitled, and corrupt cases. All three share one component; the Foundational phase keeps the rules and the session switch separate so they can be reviewed without the UI.

## Notes

- No IPC channel is added; the drawer uses `conversations:list` and `conversations:read` and the switch reuses `conversations:save`.
- Switching saves first and aborts on failure, so no conversation is lost before spec 107 autosave lands.
- Opening or closing the drawer never calls the transport, so a stream is never interrupted.
