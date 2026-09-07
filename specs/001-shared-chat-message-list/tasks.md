# Tasks: Shared Chat Message List

**Input**: Design documents from `/specs/001-shared-chat-message-list/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/message-list.md, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo scaffold that later specs (002, 003) build on.

- [ ] T001 Create root workspace config: `package.json` (npm workspaces: `packages/*`, `apps/*`), `tsconfig.base.json`, `tsconfig.json`, `.gitignore`
- [ ] T002 [P] Configure ESLint + Prettier: `eslint.config.mjs`, `.prettierrc`, `.prettierignore` per repo standards
- [ ] T003 [P] Configure Vitest workspace: `vitest.config.ts` with native (RNTL) and web (jsdom + RNW alias) projects
- [ ] T004 [P] Configure Playwright: `playwright.config.ts`, `tests/e2e/launch.ts` shared helper
- [ ] T005 [P] Configure electron-vite: `electron.vite.config.ts` for the harness in `apps/electron`

**Checkpoint**: Root toolchain installs and lints clean.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The chat package skeleton and test harness every user story needs.

- [ ] T006 [P] Create `packages/chat/package.json` (peer deps react, react-native, react-native-web; dep @shopify/flash-list) and `packages/chat/tsconfig.json`
- [ ] T007 Create shared types in `packages/chat/src/types.ts` per data-model.md (Message, ContentPart, MessageRole, MessageStatus, VisibleRange)
- [ ] T008 Create `packages/chat/src/index.ts` exporting the public API surface per contracts/message-list.md
- [ ] T009 [P] Create `apps/web` RNW test app (Vite + react-native-web) mounting the chat component
- [ ] T010 [P] Create `apps/electron` harness (main + preload + renderer) embedding the RNW app; preload is a fixed named API with typed channels
- [ ] T011 Add `scripts` to root `package.json`: `lint`, `typecheck`, `test`, `test:e2e` per quickstart.md

**Checkpoint**: Both harnesses build; the chat package resolves as TS source.

## Phase 3: User Story 1 - Follow the conversation from the bottom (Priority: P1) 🎯 MVP

**Goal**: New messages and streaming updates stay visible with no user action while the user is at the bottom.

**Independent Test**: At the bottom, new messages appear without scrolling and streaming keeps the growing content visible.

### Tests for User Story 1

- [ ] T012 [P] [US1] Unit test `useAtBottom` predicate (FR-003 one-message-height boundary) in `packages/chat/src/hooks/useAtBottom.test.ts`
- [ ] T013 [US1] Unit test `MessageList` follows at the bottom in `packages/chat/src/components/MessageList.test.tsx`

### Implementation for User Story 1

- [ ] T014 [P] [US1] Implement `useAtBottom` hook in `packages/chat/src/hooks/useAtBottom.ts` (scroll-metric predicate)
- [ ] T015 [P] [US1] Implement `ScrollToLatestControl` in `packages/chat/src/components/ScrollToLatestControl.tsx`
- [ ] T016 [US1] Implement `MessageList` in `packages/chat/src/components/MessageList.tsx` (FlashList, stable keys, follow-at-bottom, streaming-tolerant rows)

**Checkpoint**: A message appended while at the bottom is visible without scrolling; streaming updates keep identity.

## Phase 4: User Story 2 - Read earlier content without disruption (Priority: P1)

**Goal**: Scrolled-up reading is undisturbed; unread count and scroll-to-latest control appear.

**Independent Test**: Scroll up, receive new messages, confirm viewport does not move and unread count equals messages below the viewport.

### Tests for User Story 2

- [ ] T017 [P] [US2] Unit test `useUnreadCount` transitions in `packages/chat/src/hooks/useUnreadCount.test.ts`
- [ ] T018 [P] [US2] Unit test `UnreadBadge` render and count in `packages/chat/src/components/UnreadBadge.test.tsx`

### Implementation for User Story 2

- [ ] T019 [P] [US2] Implement `useUnreadCount` hook in `packages/chat/src/hooks/useUnreadCount.ts` (append-while-not-at-bottom increments; return clears)
- [ ] T020 [US2] Implement `UnreadBadge` in `packages/chat/src/components/UnreadBadge.tsx` and wire pin/unread behaviour into `MessageList`

**Checkpoint**: Scrolled up, new messages do not move the viewport; unread count appears and scroll-to-latest returns and clears.

## Phase 5: User Story 3 - Load earlier messages (Priority: P2)

**Goal**: Earlier messages load above the viewport without moving the visible anchor.

**Independent Test**: In a long conversation, load earlier messages and confirm the viewport does not jump.

### Tests for User Story 3

- [ ] T021 [US3] Unit test `usePrependAnchor` offset correction in `packages/chat/src/hooks/usePrependAnchor.test.ts`

### Implementation for User Story 3

- [ ] T022 [US3] Implement `usePrependAnchor` in `packages/chat/src/hooks/usePrependAnchor.ts` (web offset-correction per research R3)
- [ ] T023 [US3] Implement `LoadEarlierControl` in `packages/chat/src/components/LoadEarlierControl.tsx` and wire prepend anchoring into `MessageList`
- [ ] T024 [US3] Integrate load-earlier into `MessageList`: control visibility per `hasEarlierMessages`, disabled per `isLoadingEarlier`, removal when no history remains

**Checkpoint**: Loading earlier messages appends above the viewport without moving it; control disappears when no history remains.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E acceptance coverage, performance, and validation.

- [ ] T025 Write e2e suite `tests/e2e/message-list.spec.ts` covering spec 001 acceptance scenarios (follow-at-bottom, stream identity, pin-on-scroll-up, unread count, scroll-to-latest, load-earlier anchor, 1,000-message performance)
- [ ] T026 [P] Verify FlashList v2 web path in the Electron harness early; if broken, record evidence in research.md and evaluate the LegendList fallback
- [ ] T027 [P] Run quickstart.md validation end-to-end; confirm `lint`, `typecheck`, `test`, `test:e2e` all green

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational; run sequentially P1 → P1 → P2
- **Polish (Phase 6)**: Depends on all user stories

### Within Each User Story

- Tests written and FAIL before implementation
- Hooks and controls before integration into `MessageList`
- Story complete before moving to next

### Parallel Opportunities

- Setup tasks T002-T005
- Foundational tasks T006, T009, T010
- Per-story test tasks (T012/T013, T017/T018)
- Polish tasks T026/T027

## Implementation Strategy

### MVP First

1. Complete Phase 1 (Setup) + Phase 2 (Foundational)
2. Phase 3: User Story 1 → STOP and VALIDATE follow-at-bottom
3. Phase 4: User Story 2 → validate pin + unread
4. Phase 5: User Story 3 → validate prepend anchor
5. Phase 6: e2e + performance + quickstart validation

## Notes

- Commits: structural scaffold first (Phase 1-2) as one tidy-first commit; behaviour per user story thereafter. Never mix structural and behavioural changes in one commit.
- The shared types (T007) and harness (T009, T010) are reused verbatim by specs 002 and 003; keep them generic.