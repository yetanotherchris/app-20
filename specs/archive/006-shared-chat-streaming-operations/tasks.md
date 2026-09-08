# Tasks: Shared Chat Streaming and Operations

**Input**: Design documents from `/specs/archive/006-shared-chat-streaming-operations/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/session.md, quickstart.md

**Tests**: Included. The constitution mandates e2e suites for user-visible behavior, and each user story has an Independent Test.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new dependencies or tooling; the session module builds on the existing package. Verify the package build is green before extending the public surface.

- [x] T001 Verify `npm run build:chat` is green on the branch base (spec 005 state) before extending `packages/chat`

**Checkpoint**: The package builds from the 005 baseline.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The operation state machine every user story needs.

- [x] T002 Create session types in `packages/chat/src/session/types.ts` (`ChatOperation`, `ChatSessionControls`, `ChatSessionOptions`, `ChatSession`, `OperationKind`; research R1/R2)
- [x] T003 Implement `useChatSession` in `packages/chat/src/session/useChatSession.ts` (owns messages + chat status + current operation; submit/retry/regenerate/stop/appendChunk/complete/fail/copy/replaceMessages/messageActions; research R1-R9)
- [x] T004 Export the session surface from `packages/chat/src/index.ts`

**Checkpoint**: The hook implements the full operation state machine and is exported.

## Phase 3: User Story 1 - Watch a response stream in (Priority: P1) 🎯 MVP

**Goal**: The assistant response appears incrementally as chunks arrive, partial Markdown renders, and the message status transitions streaming to complete are visible, without interrupting typing.

**Independent Test**: Feed deterministic chunks and confirm they appear incrementally with visible status transitions.

### Tests for User Story 1

- [x] T005 [P] [US1] Unit test submit in `packages/chat/src/session/useChatSession.test.ts` (appends user message + sending assistant placeholder; chat status submitting; transport called once per operation)
- [x] T006 [P] [US1] Unit test streaming in `packages/chat/src/session/useChatSession.test.ts` (appendChunk accumulates content incrementally, flips status to streaming; complete flips to complete and chat idle; a partial Markdown chunk is preserved verbatim for the renderer)

### Implementation for User Story 1

- [x] T007 [US1] Wire submit/appendChunk/complete in `useChatSession` (research R2/R9) - covered by T002/T003

**Checkpoint**: A submit streams chunks into a visible response that completes.

## Phase 4: User Story 2 - Stop a response mid-stream (Priority: P1)

**Goal**: Stop retains partial content in every case and a second Stop is a no-op.

**Independent Test**: Stop before the first chunk, mid-stream, and after the final chunk; partial content is retained and a second Stop is a no-op.

### Tests for User Story 2

- [x] T008 [P] [US2] Unit test stop-before-first-chunk in `useChatSession.test.ts` (message stopped, empty content retained, no stream appended after)
- [x] T009 [P] [US2] Unit test stop-mid-stream in `useChatSession.test.ts` (partial content retained, status stopped, second stop is a no-op)
- [x] T010 [P] [US2] Unit test final-chunk race in `useChatSession.test.ts` (complete vs stop on the same operation yields exactly one terminal status; no partial content loss)

### Implementation for User Story 2

- [x] T011 [US2] Implement `stop()` and `controls.stopRequested()` in `useChatSession` (research R3) - covered by T002/T003

**Checkpoint**: Stop retains content and dedupes in all three phases.

## Phase 5: User Story 3 - Retry and regenerate (Priority: P1)

**Goal**: Retry a failed response and regenerate a completed one; each replaces the old response in place, and stale updates from superseded operations are ignored.

**Independent Test**: Retry an errored response and regenerate a completed one; confirm new streamed answers replace the old ones in place and stale updates are ignored.

### Tests for User Story 3

- [x] T012 [P] [US3] Unit test retry in `useChatSession.test.ts` (replaces the errored response in place, reuses the prompt, new operation supersedes the old)
- [x] T013 [P] [US3] Unit test regenerate in `useChatSession.test.ts` (replaces the completed response in place, reuses the prompt)
- [x] T014 [P] [US3] Unit test stale-update rejection in `useChatSession.test.ts` (chunk/complete/fail from a superseded operation never change the newer response; FR-005)

### Implementation for User Story 3

- [x] T015 [US3] Implement `retry(messageId)` and `regenerate(messageId)` in `useChatSession` (research R4) - covered by T002/T003

**Checkpoint**: Retry and regenerate replace in place; stale updates are ignored.

## Phase 6: User Story 4 - Copy a message (Priority: P2)

**Goal**: The user copies a message's text or a code block.

**Independent Test**: Copy a message and a code block; confirm the clipboard content.

### Tests for User Story 4

- [x] T016 [P] [US4] Unit test copy in `useChatSession.test.ts` (copyMessage delegates the joined plain text to `copyMessageText`; no host callback means the action is inert)
- [x] T017 [P] [US4] Unit test action availability in `useChatSession.test.ts` (copy always, retry only for errored assistant messages, regenerate only for completed assistant messages)

### Implementation for User Story 4

- [x] T018 [US4] Implement `copyMessage` and the built-in `messageActions` in `useChatSession` (research R5) - covered by T002/T003

**Checkpoint**: Copy, retry, and regenerate actions are available per message with correct availability.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, conversation replacement, demo integration, e2e acceptance coverage, and validation.

- [x] T019 [P] Unit test edge cases in `useChatSession.test.ts` (duplicate submit no-op while in flight, conversation replacement invalidates the operation with no leak, fail leaves partial content and idle chat status)
- [x] T020 Update `packages/chat-demo/src/ChatDemo.tsx` to drive `Chat` through `useChatSession` with a deterministic timer-based fake transport (streams chunk by chunk, supports stop, fail, retry, regenerate, copy)
- [x] T021 Extend the packaged-artifact smoke suite in `tests/package/chat-package.test.tsx` to cover the session surface
- [x] T022 Write e2e suite `tests/e2e/streaming-operations.spec.ts` covering spec 006 acceptance scenarios (US1-A1..A4, US2-A1..A3, US3-A1..A3, US4-A1/A2, edge cases: duplicate send/stop, conversation replacement isolation, draft survival, dropped connection)
- [x] T023 Run quickstart.md validation end-to-end; confirm `lint`, `typecheck`, `test`, `test:e2e` all green

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational; run P1 → P1 → P1 → P2.
- **Polish (Phase 7)**: Depends on all user stories.

### Within Each User Story

- Tests written and FAIL before implementation.
- The state machine is the single implementation surface (T002/T003); story tasks verify the corresponding branches.
- Story complete before moving to next.

### Parallel Opportunities

- Unit test tasks across stories (distinct cases in the same hook test file).
- Polish tasks T020-T022.

## Implementation Strategy

### MVP First

1. Phase 1 (Setup) + Phase 2 (Foundational): the full `useChatSession` state machine.
2. Phase 3: US1 → STOP and VALIDATE streaming.
3. Phase 4: US2 → validate stop semantics.
4. Phase 5: US3 → validate retry/regenerate + stale rejection.
5. Phase 6: US4 → validate copy and action availability.
6. Phase 7: edge cases + demo + e2e + quickstart validation.

## Notes

- Commits: structural first, behaviour per user story after; never mix structural and behavioural changes in one commit.
- `Chat` and its components are NOT modified by this spec; the session module is additive. A change to `Chat.tsx` in this branch is a defect.
- The operation state machine (research R1/R2) is the deliberate complexity point; keep it inside `useChatSession` and its test.
- The draft stays host-controlled (spec 003); the hook must never read or write it (FR-009, FR-011).
- Transient statuses (sending, streaming) are runtime-only and never persisted (FR-012).
