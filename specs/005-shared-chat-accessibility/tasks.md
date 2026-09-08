# Tasks: Shared Chat Accessibility

**Input**: Design documents from `/specs/005-shared-chat-accessibility/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/accessibility.md, quickstart.md

**Tests**: Included. The constitution mandates e2e suites for user-visible behavior, and spec 005 SC-001 requires an automated WCAG 2.2 AA suite.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the RNW focus/accessibility primitives the design depends on, and add the WCAG scan dependency.

- [x] T001 Install `@axe-core/playwright` as a root devDependency (`npm install -D @axe-core/playwright`) for the SC-001 WCAG scan

**Checkpoint**: The dependency is installed and resolvable in the e2e project.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The detection hooks, focus ring, focus preservation, contrast module, theme changes, and status vocabulary every user story needs.

- [x] T002 [P] Create `useSystemAccessibility` in `packages/chat/src/accessibility/useSystemAccessibility.ts` (reducedMotion + highContrast from matchMedia/AccessibilityInfo with prop overrides; research R1)
- [x] T003 [P] Create `useFocusRing` in `packages/chat/src/accessibility/useFocusRing.ts` (focused state via onFocus/onBlur; ring style from theme.colors.focus on web, none on native; research R2)
- [x] T004 [P] Create `minTouchTarget` in `packages/chat/src/accessibility/minTouchTarget.ts` (24 web / 44 native; research R7)
- [x] T005 [P] Create pure contrast helpers in `packages/chat/src/theme/contrast.ts` (`relativeLuminance`, `contrastRatio`; research R4)
- [x] T006 [P] Add `focus` token to `ChatThemeColors` and extend `ThemeContextValue` with `contrast: 'normal' | 'high'` and `reducedMotion: boolean` in `packages/chat/src/theme/types.ts`
- [x] T007 [P] Add high-contrast light/dark themes and fix dark-theme contrast (`onPrimary` `#0f172a`, `danger` `#f87171`) in `packages/chat/src/theme/themes.ts` (research R4)
- [x] T008 [P] Add the `contrast` dimension to `resolveTheme` in `packages/chat/src/theme/resolveTheme.ts` (high-contrast base selection)
- [x] T009 [P] Wire `highContrast` + `reducedMotion` into `ThemeProvider`/`useTheme` in `packages/chat/src/theme/ThemeContext.tsx` (context value, system detection + prop override)
- [x] T010 [P] Add status glyphs to the icon map in `packages/chat/src/icons.tsx` (streaming, stopped, error, chat-state glyphs; data-model status table)
- [x] T011 [P] Create `MessageStatusBadge` in `packages/chat/src/components/MessageStatusBadge.tsx` (glyph + label per message status; nothing for complete; research R3)
- [x] T012 [P] Create `ChatStatusText` in `packages/chat/src/components/ChatStatusText.tsx` (glyph + label per chat status; nothing for idle; research R3)
- [x] T013 Export the new surface from `packages/chat/src/index.ts` (accessibility hooks, contrast helpers, status components, new theme types)

**Checkpoint**: Detection, focus ring, contrast math, high-contrast themes, and status components exist and are exported.

## Phase 3: User Story 1 - Keyboard-only operation with visible focus (Priority: P1) 🎯 MVP

**Goal**: The user navigates the composer, send, stop, message actions, and scroll-to-latest using only the keyboard, with visible focus at every step and focus preserved when a message is removed.

**Independent Test**: Tab through the entire chat with a keyboard; every control shows a focus ring and activates with Enter/Space; scroll keys operate the message list.

### Tests for User Story 1

- [x] T014 [P] [US1] Unit test `useFocusRing` in `packages/chat/src/accessibility/useFocusRing.test.ts` (ring style only while focused; clears on blur; disabled controls unaffected)
- [x] T015 [P] [US1] Unit test `useMessageFocusPreservation` in `packages/chat/src/accessibility/useMessageFocusPreservation.test.ts` (removed focused message restores to nearest row; empty list falls back to composer; no-op when focused id still present)
- [x] T016 [P] [US1] Unit test focus rings + touch targets on controls in `packages/chat/src/components/Composer.test.tsx` and `packages/chat/src/components/Chat.test.tsx` (Send/Stop/scroll-to-latest show ring while focused; min target sizes applied; input label matches placeholder)

### Implementation for User Story 1

- [x] T017 [P] [US1] Apply `useFocusRing` + `minTouchTarget` to `SendButton` in `packages/chat/src/components/SendButton.tsx`
- [x] T018 [P] [US1] Apply `useFocusRing` + `minTouchTarget` to `StopButton` in `packages/chat/src/components/StopButton.tsx`
- [x] T019 [P] [US1] Apply `useFocusRing` + `minTouchTarget` to `ScrollToLatestControl` in `packages/chat/src/components/ScrollToLatestControl.tsx`
- [x] T020 [P] [US1] Apply `useFocusRing` + `minTouchTarget` to `LoadEarlierControl` in `packages/chat/src/components/LoadEarlierControl.tsx`
- [x] T021 [P] [US1] Apply `useFocusRing` + `minTouchTarget` to the action trigger and items in `packages/chat/src/components/ActionMenu.tsx`
- [x] T022 [P] [US1] Apply `useFocusRing` + `minTouchTarget` to the copy control in `packages/chat/src/rendering/CodeBlock.tsx`
- [x] T023 [US1] Add a focus ring to the composer input (border + outline on focus) and set `accessibilityLabel` to the placeholder in `packages/chat/src/components/Composer.tsx`
- [x] T024 [US1] Make message rows focusable on web and apply `useMessageFocusPreservation` in `packages/chat/src/components/MessageBubble.tsx` and `packages/chat/src/components/MessageList.tsx`; add `messageListLabel` to `Chat` in `packages/chat/src/components/Chat.tsx` (research R5/R6)

**Checkpoint**: The entire chat is keyboard-operable with visible focus; focus survives message removal.

## Phase 4: User Story 2 - Read with increased text and zoom (Priority: P1)

**Goal**: The layout adapts to the largest supported OS text size and 200% browser zoom without clipping or overlap.

**Independent Test**: Set the largest text size and 200% zoom; no content is clipped or overlapped.

### Tests for User Story 2

- [x] T025 [P] [US2] Unit test the unread badge grows with text in `packages/chat/src/components/UnreadBadge.test.tsx` (minHeight + padding, no fixed height; research R8)

### Implementation for User Story 2

- [x] T026 [P] [US2] Convert the `UnreadBadge` fixed height to `minHeight` + padding in `packages/chat/src/components/UnreadBadge.tsx`
- [x] T027 [US2] Audit default surfaces for fixed heights/overflow that would clip at 200% zoom; adjust any remaining fixed heights to min-height sizing (composer input, action menu, code block) (research R8)

**Checkpoint**: No default surface clips at the largest text size or 200% zoom.

## Phase 5: User Story 3 - Perceive status without color (Priority: P2)

**Goal**: Message and chat statuses are conveyed by more than color alone.

**Independent Test**: Identify streaming, stopped, and error states with color removed.

### Tests for User Story 3

- [x] T028 [P] [US3] Unit test `MessageStatusBadge` in `packages/chat/src/components/MessageStatusBadge.test.tsx` (label + glyph per status; nothing for complete; error/stopped/streaming identifiable)
- [x] T029 [P] [US3] Unit test `ChatStatusText` in `packages/chat/src/components/ChatStatusText.test.tsx` (label + glyph per chat status; nothing for idle)
- [x] T030 [P] [US3] Unit test `contrast` in `packages/chat/src/theme/contrast.test.ts` (every theme's text/background and UI pairs meet 4.5:1 / 3:1; research R4)

### Implementation for User Story 3

- [x] T031 [US3] Render `MessageStatusBadge` inside `MessageBubble` for non-complete messages in `packages/chat/src/components/MessageBubble.tsx`
- [x] T032 [US3] Render `ChatStatusText` above the composer when the chat status is not idle in `packages/chat/src/components/Chat.tsx`

**Checkpoint**: Streaming, stopped, and error states are identifiable without color; contrast ratios are asserted.

## Phase 6: User Story 4 - Reduced motion and high contrast (Priority: P2)

**Goal**: The component honors reduced-motion and high-contrast system settings.

**Independent Test**: Enable reduced motion and high contrast; no unnecessary animation plays and all text/controls remain readable.

### Tests for User Story 4

- [x] T033 [P] [US4] Unit test `LoadingState` reduced-motion fallback in `packages/chat/src/components/LoadingState.test.tsx` (static glyph, no spinner)
- [x] T034 [P] [US4] Unit test `ActionMenu` reduced-motion + focus-into-menu in `packages/chat/src/components/ActionMenu.test.tsx` (no fade when reduced motion; first item focused on open)

### Implementation for User Story 4

- [x] T035 [P] [US4] Gate the loading spinner with reduced motion in `packages/chat/src/components/LoadingState.tsx` (research R9)
- [x] T036 [P] [US4] Gate the action-menu modal fade with reduced motion and focus the first menu item on open in `packages/chat/src/components/ActionMenu.tsx` (research R9)
- [x] T037 [US4] Add `reducedMotion` and `highContrast` props to `Chat` and thread them into `ThemeProvider` + status rendering in `packages/chat/src/components/Chat.tsx`

**Checkpoint**: Reduced motion disables decorative animation; high contrast swaps the palette; dark + high-contrast stays readable.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Demo toggles, e2e acceptance coverage including the axe scan, and validation.

- [x] T038 [P] Update `packages/chat-demo/src/ChatDemo.tsx` with toggles for high contrast and reduced motion, a streaming-to-error simulation, and a remove-message action (focus preservation demo)
- [x] T039 [P] Extend the packaged-artifact smoke suite in `tests/package/chat-package.test.tsx` to cover the new public surface (accessibility hooks, contrast helpers, status components)
- [x] T040 Write e2e suite `tests/e2e/accessibility.spec.ts` covering spec 005 acceptance scenarios (US1-A1/A2/A3 keyboard + focus rings, US2-A1/A2 zoom/reflow, US3-A1/A2 status without color, US4-A1 reduced motion, US4-A2 high contrast, edge cases: focus preservation on removal, touch targets, axe WCAG 2.2 AA scan)
- [x] T041 Run quickstart.md validation end-to-end; confirm `lint`, `typecheck`, `test`, `test:e2e` all green

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational; run P1 → P1 → P2 → P2.
- **Polish (Phase 7)**: Depends on all user stories.

### Within Each User Story

- Tests written and FAIL before implementation.
- Detection/theme plumbing before component integration.
- Story complete before moving to next.

### Parallel Opportunities

- Foundational tasks T002-T013 (distinct files).
- Per-story test tasks (T014-T016, T025, T028-T030, T033-T034).
- Control edits T017-T022 and Polish tasks T038-T039.

## Implementation Strategy

### MVP First

1. Phase 1 (Setup) + Phase 2 (Foundational)
2. Phase 3: US1 → STOP and VALIDATE keyboard + focus
3. Phase 4: US2 → validate reflow
4. Phase 5: US3 → validate status + contrast
5. Phase 6: US4 → validate reduced motion + high contrast
6. Phase 7: demo + e2e + axe scan + quickstart validation

## Notes

- Commits: structural first, behaviour per user story after; never mix structural and behavioural changes in one commit.
- The focus-preservation registry (research R6) and the contrast test driving theme corrections (research R4) are the deliberate complexity points.
- FR-009: the a11y surface binds the default renderers/controls; host-supplied replacements are the host's responsibility, so no custom-renderer code is touched for accessibility.
- Screen-reader announcements stay out of scope for beta; the status work is visual and structural only.
- The axe scan runs only in the e2e suite; the packaged `dist/` build must stay clean of axe imports.
