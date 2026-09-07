# Tasks: Shared Chat Themes and Customization

**Input**: Design documents from `/specs/004-shared-chat-themes-customization/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/chat.md, contracts/theme.md, quickstart.md

**Tests**: Included. The constitution mandates e2e suites for user-visible behavior, each user story has an Independent Test, and FR-015 requires a packaged-artifact test.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the stack supports the theme and customization surface before building on it.

- [x] T001 Verify RNW `style` override behavior (array merge, later wins) on View/Text in the Electron harness early (research R10 risk gate); confirm a `className` prop is dropped so the plan does not rely on it; record evidence in research.md

**Checkpoint**: The harness confirms the web class-override channel the theme contract depends on.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The theme system, customization plumbing, and error isolation every user story needs.

- [x] T002 [P] Create `ChatTheme`, `ThemeInput`, `ThemeName`, `SurfaceName`, `IconName`, and `MessageAction` types in `packages/chat/src/theme/types.ts`
- [x] T003 [P] Create default light and dark themes in `packages/chat/src/theme/themes.ts`
- [x] T004 [P] Create `ThemeProvider` + `useTheme` in `packages/chat/src/theme/ThemeContext.tsx` (theme name, resolved theme, class/style override maps)
- [x] T005 [P] Create `resolveTheme` in `packages/chat/src/theme/resolveTheme.ts` (base light/dark by name, shallow merge of a partial override over the base, fallback on absent keys)
- [x] T006 [P] Create `icons.ts` with default text-glyph icons keyed by `IconName` in `packages/chat/src/icons.ts`
- [x] T007 [P] Create `MessageRendererBoundary` in `packages/chat/src/components/MessageRendererBoundary.tsx` (per-message error boundary; falls back to default renderer on throw, research R4)
- [x] T008 [P] Create default state views `EmptyState`, `LoadingState`, `TypingState`, `ErrorState` in `packages/chat/src/components/` (token-driven, stable testIDs)
- [x] T009 Convert hardcoded colors to theme tokens across `SendButton`, `StopButton`, `ScrollToLatestControl`, `LoadEarlierControl`, `UnreadBadge`, `CodeBlock`, `roleStyles.ts`, `MarkdownRenderer` link color, `Composer`, `MessageList`, and `MessageBubble` (SC-001: no surface hardcodes a color)
- [x] T010 Export the new surface from `packages/chat/src/index.ts` (theme system, Chat, states, icons, types)

**Checkpoint**: Every surface is token-driven; theme resolution merges partial overrides with fallback; icons and state defaults exist.

## Phase 3: User Story 1 - Light, dark, and custom themes (Priority: P1) 🎯 MVP

**Goal**: The user chooses light/dark/system appearance, or the host applies a custom theme, with no loss of readability or state.

**Independent Test**: Render in light and dark; apply a one-token custom theme; confirm every surface follows.

### Tests for User Story 1

- [x] T011 [P] [US1] Unit test `resolveTheme` in `packages/chat/src/theme/resolveTheme.test.ts` (light/dark bases, partial override replaces only provided keys, absent keys fall back, unknown groups cannot break)
- [x] T012 [P] [US1] Unit test `ThemeContext`/`Chat` theme wiring in `packages/chat/src/components/Chat.test.tsx` (theme prop drives surfaces; `themeOverride` merges; style overrides apply; theme switch does not remount the message list)

### Implementation for User Story 1

- [x] T013 [P] [US1] Implement `Chat` scaffold in `packages/chat/src/components/Chat.tsx` (ThemeProvider wrapper, composes MessageList + Composer, threads status/draft/messages callbacks)
- [x] T014 [US1] Wire `theme`, `themeOverride`, and `styleOverrides` through `Chat` to `ThemeProvider` and themed surfaces (FR-003)
- [x] T015 [US1] Apply `styleOverrides[surface]` after the token-derived base style on every themed surface (array merge, later wins, research R10)

**Checkpoint**: Light/dark/system and custom themes apply across every surface; override maps win on conflict.

## Phase 4: User Story 2 - Replace renderers, controls, and actions (Priority: P2)

**Goal**: The host replaces renderers and controls and adds actions and composer controls without modifying the component.

**Independent Test**: Provide custom renderers, controls, actions, and icons; confirm each is used in place of the default.

### Tests for User Story 2

- [x] T016 [P] [US2] Unit test `ContentRenderer` override map in `packages/chat/src/rendering/ContentRenderer.test.tsx` (custom renderer for one content type used, defaults elsewhere, fallback for unknown)
- [x] T017 [P] [US2] Unit test `MarkdownRenderer` element delegation in `packages/chat/src/rendering/MarkdownRenderer.test.tsx` (custom element renderer used for that element, defaults elsewhere, custom full renderer accepted)
- [x] T018 [P] [US2] Unit test `MessageRendererBoundary` in `packages/chat/src/components/MessageRendererBoundary.test.tsx` (throwing renderer falls back to default for that message; other messages render)
- [x] T019 [P] [US2] Unit test control replacement in `packages/chat/src/components/Chat.test.tsx` (custom Send/Stop/scroll-to-latest render in place with stable testIDs; custom Send keeps Stop during busy; composer controls render and function)
- [x] T020 [P] [US2] Unit test `ActionMenu` in `packages/chat/src/components/ActionMenu.test.tsx` (actions group, fire with message context, no actions means no affordance)

### Implementation for User Story 2

- [x] T021 [P] [US2] Add `contentRenderers` override map to `ContentRenderer` (FR-005)
- [x] T022 [P] [US2] Add `markdownElementRenderers` + full `markdownRenderer` support to `MarkdownRenderer` and `MarkdownText` (FR-006)
- [x] T023 [US2] Wrap message rows in `MessageRendererBoundary` in `MessageBubble`/`Chat` (FR-011)
- [x] T024 [US2] Add `renderSend`, `renderStop`, `renderScrollToLatest`, `renderComposerControls` to `Chat` and thread through `Composer`/`MessageList` (FR-007, FR-013)
- [x] T025 [US2] Implement `ActionMenu` and `messageActions` in `MessageBubble` (grouping, availability, message context, no-actions-no-affordance) (FR-009)
- [x] T026 [US2] Wire `icons` map into Send/Stop/scroll-to-latest/action-menu/copy slots; defaults render only when the host supplies no icon for a slot (FR-010)

**Checkpoint**: Renderers, controls, actions, composer controls, and icons are all replaceable; a throwing renderer isolates per message.

## Phase 5: User Story 3 - Replace status states (Priority: P3)

**Goal**: The empty, loading, typing, and error states are replaceable and appear in the right conditions.

**Independent Test**: Provide custom state views; confirm they appear in the right conditions.

### Tests for User Story 3

- [x] T027 [US3] Unit test state-view selection in `packages/chat/src/components/Chat.test.tsx` (empty when no messages and idle, loading while submitting, typing while streaming, error on error status; custom views used, defaults otherwise)

### Implementation for User Story 3

- [x] T028 [US3] Drive state-view rendering from `status` + message count in `Chat`; render `renderEmptyState`/`renderLoadingState`/`renderTypingState`/`renderErrorState` or defaults (FR-008, research R6)

**Checkpoint**: Each status condition shows its configured state view.

## Phase 6: User Story 4 - Constrain and disable (Priority: P3)

**Goal**: Disabled, read-only, and capability-limited states are reflected in the composer and actions.

**Independent Test**: Set each state in turn; confirm the composer and actions respond.

### Tests for User Story 4

- [x] T029 [US4] Unit test constraint modes in `packages/chat/src/components/Chat.test.tsx` (disabled blocks input + actions; readOnly blocks editing, content readable; capability-disabled action hidden or inert)

### Implementation for User Story 4

- [x] T030 [US4] Add `disabled`, `readOnly`, `capabilities` props to `Chat`; thread to composer (editable/blocked) and actions (hidden/inert per capability) (FR-014)

**Checkpoint**: Each constraint mode is reflected in the composer and actions.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Packaging per FR-015, e2e acceptance coverage, and validation.

- [x] T031 [P] Add `tsconfig.build.json` + `build` script to `packages/chat` (tsc emits ESM + declarations to `dist/`); set `main`/`types`/`exports`, `peerDependencies`, `files`, version, and add `CHANGELOG.md` (FR-015, research R9)
- [x] T032 [P] Add `vitest.package.config.ts` importing `packages/chat/dist/index.js` (packaged artifact, not source) with a smoke suite over the documented public surface (FR-015)
- [x] T033 Update `packages/chat-demo/src/ChatDemo.tsx` to mount `Chat` with toggle controls for theme, custom renderers/controls/actions/icons/states, and constraint modes
- [x] T034 Write e2e suite `tests/e2e/themes-customization.spec.ts` covering spec 004 acceptance scenarios (US1-A1/A2/A3, US2-A1..A8, US3-A1/A2/A3, US4-A1/A2/A3, edge cases: no-actions affordance, custom-Send-keeps-Stop)
- [x] T035 Run quickstart.md validation end-to-end; confirm `lint`, `typecheck`, `test`, `test:e2e` all green

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001 (RNW class-override gate) blocks US1.
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational; run P1 → P2 → P3 → P3.
- **Polish (Phase 7)**: Depends on all user stories.

### Within Each User Story

- Tests written and FAIL before implementation.
- Theme system and plumbing before component integration.
- Story complete before moving to next.

### Parallel Opportunities

- Foundational tasks T002-T008 (distinct files).
- Per-story test tasks (T011-T012, T016-T020, T027, T029).
- Polish tasks T031-T033.

## Implementation Strategy

### MVP First

1. Phase 1 (Setup + RNW class-override gate) + Phase 2 (Foundational)
2. Phase 3: US1 → STOP and VALIDATE themes
3. Phase 4: US2 → validate renderers/controls/actions/icons
4. Phase 5: US3 → validate state views
5. Phase 6: US4 → validate constraints
6. Phase 7: packaging + e2e + quickstart validation

## Notes

- Commits: structural first, behaviour per user story after; never mix structural and behavioural changes in one commit.
- The per-message error boundary (research R4) is the deliberate complexity point; keep it isolated in `MessageRendererBoundary`.
- The theme context is the single source of tokens; no component may reintroduce a hardcoded color (SC-001).
- The packaged artifact (`dist/`) is what e2e and the package vitest project exercise; do not let source-only imports bypass FR-015.