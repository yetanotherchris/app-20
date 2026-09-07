# Tasks: Shared Chat Composer

**Input**: Design documents from `/specs/003-shared-chat-composer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/composer.md, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new dependencies; verify the existing stack supports the composer's needs.

- [x] T001 Verify RNW TextInput `onContentSizeChange` + `onKeyPress` behaviour in the Electron harness early (research R1/R2 risk gate); record evidence in research.md

**Checkpoint**: The harness confirms the RNW input events the composer depends on.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The height-measurement hook and the two controls every user story needs.

- [x] T002 [P] Create `useAutogrowHeight` in `packages/chat/src/hooks/useAutogrowHeight.ts` (clamp content height to [minHeight, maxHeight]; onContentSizeChange + onLayout + onChangeText fallbacks, research R1)
- [x] T003 [P] Create `SendButton` in `packages/chat/src/components/SendButton.tsx` (disabled state, stable test id)
- [x] T004 [P] Create `StopButton` in `packages/chat/src/components/StopButton.tsx` (stable test id)
- [x] T005 Export the new surface from `packages/chat/src/index.ts`

**Checkpoint**: Hook clamps heights; both controls render with stable ids.

## Phase 3: User Story 1 - Send a message (Priority: P1) 🎯 MVP

**Goal**: Send via button or desktop Enter; empty draft disables Send.

**Independent Test**: Type text, send with button and keyboard, confirm submit and draft clear.

### Tests for User Story 1

- [x] T006 [P] [US1] Unit test `Composer` send paths in `packages/chat/src/components/Composer.test.tsx` (button send, Enter send, empty/whitespace disabled, no submit while busy, draft preserved on re-render)

### Implementation for User Story 1

- [x] T007 [US1] Implement `Composer` in `packages/chat/src/components/Composer.tsx` (controlled input, Send control, `onSubmit` once per send, no duplicate while busy)

**Checkpoint**: Button and Enter both send; empty draft disables Send.

## Phase 4: User Story 2 - Compose a multiline message (Priority: P1)

**Goal**: Composer grows with content, then scrolls internally past max height.

**Independent Test**: Type past max height; confirm grow then internal scroll.

### Tests for User Story 2

- [x] T008 [US2] Unit test `useAutogrowHeight` in `packages/chat/src/hooks/useAutogrowHeight.test.ts` (growth, clamp at max, internal-scroll height, text-change fallback)

### Implementation for User Story 2

- [x] T009 [US2] Wire `useAutogrowHeight` into `Composer`; Shift+Enter inserts a newline on desktop (FR-005)

**Checkpoint**: Composer grows then scrolls; Shift+Enter adds a newline without sending.

## Phase 5: User Story 3 - Stop a response (Priority: P2)

**Goal**: Stop control shows while busy, hidden when idle.

**Independent Test**: Submit then stop during streaming; Stop disappears when nothing is cancellable.

### Tests for User Story 3

- [x] T010 [US3] Unit test Stop visibility in `Composer.test.tsx` (busy shows Stop + disables Send; idle hides Stop)

### Implementation for User Story 3

- [x] T011 [US3] Wire `isBusy` to StopButton visibility and SendButton disable in `Composer`

**Checkpoint**: Busy shows Stop and disables Send; idle hides Stop.

## Phase 6: User Story 4 - Compose with an input-method editor (Priority: P2)

**Goal**: IME composition never sends prematurely; pasted multiline keeps newlines.

**Independent Test**: Compose with an IME; no send fires during composition.

### Tests for User Story 4

- [x] T012 [US4] Unit test IME + paste behaviour in `Composer.test.tsx` (composition does not send; confirmed text sends; pasted newlines kept)

### Implementation for User Story 4

- [x] T013 [US4] Implement web `onKeyPress` IME guard (`!nativeEvent.isComposing`, FR-009) and native `onSubmitEditing` path; ensure paste keeps newlines (FR-010)

**Checkpoint**: IME never sends prematurely; pasted multiline keeps newlines.

## Phase 7: User Story 5 - Configure blur and dismissal behavior (Priority: P3)

**Goal**: Host configures blur-to-send/keep and keyboard dismissal.

**Independent Test**: Configure blur-to-send and blur-to-keep; each behaves as configured.

### Tests for User Story 5

- [x] T014 [US5] Unit test blur + dismissal in `Composer.test.tsx` (blurBehavior send/keep; dismissKeyboardOnSend on touch)

### Implementation for User Story 5

- [x] T015 [US5] Implement `blurBehavior` onBlur handler and `dismissKeyboardOnSend` (Keyboard.dismiss on touch) in `Composer`

**Checkpoint**: Blur behaviour matches config in every case; keyboard dismisses per config on touch.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E acceptance coverage and validation.

- [x] T016 Update `packages/chat-demo/src/ChatDemo.tsx` to mount `Composer` with a simulated chat status and Send/Stop wiring
- [x] T017 Write e2e suite `tests/e2e/composer.spec.ts` covering spec 003 acceptance scenarios (send button/Enter, Shift+Enter newline, empty disabled, grow+scroll, busy Stop, IME, paste newlines, blur config, draft survival)
- [x] T018 Run quickstart.md validation end-to-end; confirm `lint`, `typecheck`, `test`, `test:e2e` all green

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001 (RNW input events) gates US1/US2.
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational; run P1 → P1 → P2 → P2 → P3.
- **Polish (Phase 8)**: Depends on all user stories.

### Within Each User Story

- Tests written and FAIL before implementation.
- Hook/controls before `Composer` integration.
- Story complete before moving to next.

### Parallel Opportunities

- Foundational tasks T002-T004
- Per-story test tasks (T006, T008, T010, T012, T014)
- Polish tasks T016-T018

## Implementation Strategy

### MVP First

1. Phase 1 (Setup + RNW input gate) + Phase 2 (Foundational)
2. Phase 3: US1 → STOP and VALIDATE send
3. Phase 4: US2 → validate grow/scroll
4. Phase 5: US3 → validate Stop
5. Phase 6: US4 → validate IME
6. Phase 7: US5 → validate blur config
7. Phase 8: e2e + quickstart validation

## Notes

- Commits: structural first, behaviour per user story after; never mix structural and behavioural changes in one commit.
- The platform branching in `Composer` keyboard handling (research R2) is the deliberate complexity point; keep the web and native paths clearly separated.
- The draft is host-controlled; the component must never own or discard it (FR-008).