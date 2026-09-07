# Tasks: Shared Chat Message Rendering

**Input**: Design documents from `/specs/002-shared-chat-message-rendering/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/message-rendering.md, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and the RNW validation gate for the markdown library.

- [x] T001 Add `react-native-marked` and `react-native-svg` to `packages/chat/package.json` and install
- [x] T002 Verify react-native-marked renders in the Electron + RNW harness early (research R1 risk gate); record evidence in research.md

**Checkpoint**: The library renders markdown in the harness; typecheck passes.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The renderer map and role treatment every user story needs.

- [x] T003 [P] Create `roleStyles` in `packages/chat/src/rendering/roleStyles.ts` (user/assistant/system treatments per data-model.md)
- [x] T004 Create `PlainText` in `packages/chat/src/rendering/PlainText.tsx` (literal text, FR-003)
- [x] T005 Create `ContentRenderer` in `packages/chat/src/rendering/ContentRenderer.tsx` (kind/format -> renderer map + fallback, FR-009)
- [x] T006 Export the new rendering surface from `packages/chat/src/index.ts`

**Checkpoint**: `ContentRenderer` routes `plain` parts and falls back for unknown kinds.

## Phase 3: User Story 1 - Read assistant responses as formatted Markdown (Priority: P1) 🎯 MVP

**Goal**: Assistant markdown renders formatted, with code blocks that copy and links delegated to the host.

**Independent Test**: A response with the full markdown element set renders correctly.

### Tests for User Story 1

- [x] T007 [P] [US1] Unit test `MarkdownText` in `packages/chat/src/rendering/MarkdownText.test.tsx` (elements render; raw HTML inert; images render nothing; `javascript:` links inert; link activation calls `onLinkPress`)
- [x] T008 [US1] Unit test `CodeBlock` in `packages/chat/src/rendering/CodeBlock.test.tsx` (copy fires `onCopyCode`; failure state visible on denied copy)

### Implementation for User Story 1

- [x] T009 [P] [US1] Create `CodeBlock` in `packages/chat/src/rendering/CodeBlock.tsx` (selectable, horizontal scroll, copy control, failure state)
- [x] T010 [US1] Create `MarkdownRenderer` in `packages/chat/src/rendering/MarkdownRenderer.ts` (react-native-marked Renderer subclass: code -> CodeBlock, images off, links -> onLinkPress)
- [x] T011 [US1] Create `MarkdownText` in `packages/chat/src/rendering/MarkdownText.tsx` (useMarkdown hook per row; memoized parse keyed by id+content)
- [x] T012 [US1] Add markdown fixtures to `packages/chat-demo/src/fixtures/markdown-suite.md` (all supported elements, SC-001)

**Checkpoint**: Full markdown element set renders; code blocks copy; links delegate.

## Phase 4: User Story 2 - Distinguish message roles visually (Priority: P1)

**Goal**: User, assistant, and system messages are visually distinct and aligned.

**Independent Test**: A conversation with user and assistant messages; each role has a distinct treatment.

### Tests for User Story 2

- [x] T013 [US2] Unit test `MessageBubble` in `packages/chat/src/components/MessageBubble.test.tsx` (user right, assistant left, system distinct)

### Implementation for User Story 2

- [x] T014 [US2] Create `MessageBubble` in `packages/chat/src/components/MessageBubble.tsx` (role alignment + treatment; composes `ContentRenderer`)

**Checkpoint**: Roles are visually distinct and aligned.

## Phase 5: User Story 3 - Safe by default (Priority: P1)

**Goal**: Raw HTML, remote images, and executable content are inert.

**Independent Test**: A response containing scripts, event handlers, and embeds renders as inert text.

### Tests for User Story 3

- [x] T015 [US3] Add unit coverage in `packages/chat/src/rendering/MarkdownText.test.tsx` for raw HTML, remote images, `javascript:` links, and event handlers rendering inert
- [x] T016 [US3] Add `unsafe-markdown.md` fixture to `packages/chat-demo/src/fixtures/`

### Implementation for User Story 3

- [x] T017 [US3] Verify `MarkdownRenderer` suppresses images and keeps HTML as text; confirm no execution path exists (structural, per research R1/R2)

**Checkpoint**: Unsafe content renders inert; no network fetch or execution.

## Phase 6: User Story 4 - Copy text without side effects (Priority: P3)

**Goal**: Selection triggers no actions; denied clipboard copy fails visibly.

### Tests for User Story 4

- [x] T018 [US4] Add unit coverage in `CodeBlock.test.tsx` for selection firing no action and denied copy showing the failure state

### Implementation for User Story 4

- [x] T019 [US4] Wire copy failure state from the host's `onCopyCode` result in `CodeBlock.tsx`

**Checkpoint**: Copy failure is visible; selection is side-effect free.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E acceptance coverage and validation.

- [x] T020 Write e2e suite `tests/e2e/message-rendering.spec.ts` covering spec 002 acceptance scenarios (markdown elements, code copy, role alignment, raw HTML inert, link delegation, table fallback, selection no-op, 6 KB render)
- [x] T021 Update `packages/chat-demo/src/ChatDemo.tsx` to render `MessageBubble` rows with markdown fixtures
- [x] T022 Run quickstart.md validation end-to-end; confirm `lint`, `typecheck`, `test`, `test:e2e` all green

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T002 (RNW validation) gates US1.
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational; run P1 → P1 → P1 → P3.
- **Polish (Phase 7)**: Depends on all user stories.

### Within Each User Story

- Tests written and FAIL before implementation.
- Renderer primitives before integration into `MessageBubble`/`MessageList`.
- Story complete before moving to next.

### Parallel Opportunities

- Setup tasks T001/T002
- Foundational tasks T003-T005
- Per-story test tasks (T007/T008, T013, T015/T016, T018)
- Polish tasks T020-T022

## Implementation Strategy

### MVP First

1. Phase 1 (Setup + RNW gate) + Phase 2 (Foundational)
2. Phase 3: US1 → STOP and VALIDATE markdown rendering
3. Phase 4: US2 → validate role alignment
4. Phase 5: US3 → validate safe-by-default
5. Phase 6: US4 → validate copy failure
6. Phase 7: e2e + quickstart validation

## Notes

- Commits: dependency/structural first, behaviour per user story after; never mix structural and behavioural changes in one commit.
- The `MarkdownRenderer` subclass is the deliberate complexity point (research R1, plan Complexity Tracking); keep it isolated so the fallback fork (RonRadtke) is a drop-in if RNW validation fails.
- Security invariants (FR-006/007/008) are structural; do not add a sanitizer or an HTML path.