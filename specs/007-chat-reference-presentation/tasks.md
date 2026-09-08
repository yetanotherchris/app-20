# Tasks: Shared Chat Reference Presentation

**Input**: Design documents from `/specs/007-chat-reference-presentation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/presentation.md, quickstart.md

**Tests**: Included. The constitution mandates e2e suites for user-visible behavior, and the spec defines Independent Tests for each user story plus measurable success criteria.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new dependencies or tooling; the presentation change builds on the existing package. Verify the package build is green before touching `packages/chat`.

- [x] T001 Verify `npm run build:chat` is green on the branch base (spec 006 state) before extending `packages/chat`

**Checkpoint**: The package builds from the 006 baseline.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The theme token extensions every user story depends on (research R1/R2/R10). No user story work begins until these are in place.

- [x] T002 [P] Extend `ChatTheme` in `packages/chat/src/theme/types.ts` with the `layout` group (`readingColumnWidth`, `composerWidth`, `sidePadding`), color tokens `userBubbleText` and `sendBackground`, spacing token `paragraphGap`, and typography tokens `messageLineHeight`, `messageWeight`, `composerLineHeight`, `controlLineHeight`, `controlWeight`, `captionLineHeight`, `captionWeight`, `headingWeight`
- [x] T003 [P] Apply the reference defaults in `packages/chat/src/theme/themes.ts` for all four themes (light/dark/high-contrast light/dark) per data-model.md token table: white light canvas, `#ececec`/`#343536` user bubbles, `userBubbleText`, `sendBackground`, `composerBorder`, `readingColumnWidth` 540, `composerWidth` 650, `sidePadding` 16, `paragraphGap` 8, `bubbleMarginV` 12, `bubbleMarginH` 0, `bubbleRadius` 18, `composerRadius` 24, and the typography sizes/line heights/weights
- [x] T004 Extend `resolveTheme` in `packages/chat/src/theme/resolveTheme.ts` to merge the new `layout` section (same merge semantics as colors/radii/spacing/typography)
- [x] T005 [P] Extend the contrast regression in `packages/chat/src/theme/contrast.test.ts` with `userBubbleText`/`userBubble` and `onPrimary`/`sendBackground` at the 4.5:1 minimum for all four themes
- [x] T006 Extend `packages/chat/src/theme/resolveTheme.test.ts` with `layout` group overrides and fallback assertions

**Checkpoint**: Tokens resolved, defaults recorded, contrast and merge suites green.

## Phase 3: User Story 1 - Read a Conversation in the Reference Layout (Priority: P1) 🎯 MVP

**Goal**: A centered reading column on a white canvas: right-aligned gray user bubbles with no tail and unboxed left-aligned assistant text with real paragraph and turn spacing.

**Independent Test**: Display a fixed conversation of short and multiline user messages and a multi-paragraph assistant response; compare against the reference description (US1 acceptance scenarios).

### Tests for User Story 1

- [x] T007 [P] [US1] Update `packages/chat/src/components/MessageBubble.test.tsx` for the new role treatments (user: right-aligned gray bubble, no tail; assistant: unboxed; system: stretch retained)
- [x] T008 [P] [US1] Update `packages/chat/src/rendering/MarkdownText.test.tsx` and `packages/chat/src/rendering/MarkdownRenderer.test.tsx` for paragraph spacing, scaled headings, and distinct strong/em/inline-code styles

### Implementation for User Story 1

- [x] T009 [US1] Restructure `packages/chat/src/rendering/roleStyles.ts`: user treatment = `flex-end` gray bubble (`userBubble`) with `userBubbleText`, `bubbleRadius`, no tail, padding; assistant treatment = unboxed `flex-start` text directly on the canvas; system = stretch retained; base = `marginVertical: bubbleMarginV`, `marginHorizontal: bubbleMarginH`, `maxWidth: '100%'`
- [x] T010 [US1] Center the reading column in `packages/chat/src/components/MessageList.tsx`: outer surface + `sidePadding` wrapper + inner column (`width: '100%'`, `maxWidth: readingColumnWidth`, `alignSelf: 'center'`, `testID="chat.reading-column"`); keep the scroll-to-latest/unread overlay inside the surface above the composer
- [x] T011 [US1] Apply the reference typography in `packages/chat/src/rendering/MarkdownText.tsx`: `paragraph` style with `paragraphGap`, heading sizes scaled from `messageTextSize` at `headingWeight`, `strong` bold, `em` italic, inline code monospace chip on `systemBubble`; adjust `MarkdownRenderer.tsx` heading handling if the scale belongs there

**Checkpoint**: US1 renders the reference reading layout; its unit tests pass.

## Phase 4: User Story 2 - Write from the Bottom Composer (Priority: P1)

**Goal**: A centered pill composer wider than the reading column, holding a circular up-arrow Send and a same-area Stop, growing upward and keeping the draft.

**Independent Test**: Type, submit, grow a multiline draft, scroll history, and stop a deterministic stream while observing composer placement and draft preservation (US2 acceptance scenarios).

### Tests for User Story 2

- [x] T012 [P] [US2] Update `packages/chat/src/components/Composer.test.tsx` for the pill structure, circular icon-only Send with accessible name "Send", and the Stop swap without draft loss
- [x] T013 [P] [US2] Add `SendButton`/`StopButton` unit coverage for the circular shape, `sendBackground`, disabled state, and same-size area swap

### Implementation for User Story 2

- [x] T014 [US2] Rework `packages/chat/src/components/Composer.tsx` to the centered pill: transparent full-width container with `sidePadding`, centered pill (`width: '100%'`, `maxWidth: composerWidth`, `composerSurface`, `composerBorder`, `composerRadius`, subtle shadow, `testID="chat.composer.pill"`) wrapping the transparent `TextInput` and the right-end control area; focus ring stays on the input and the pill border uses the focus color while focused; no plus/microphone space by default
- [x] T015 [US2] Rework `packages/chat/src/components/SendButton.tsx`: circular icon-only up-arrow control sized `max(minTouchTarget, 34)`, `sendBackground` surface, `accessibilityLabel` from the label, disabled uses `sendDisabled`, keep `testID="chat.composer.send"`
- [x] T016 [US2] Rework `packages/chat/src/components/StopButton.tsx`: same-size circular control in the same area with the square glyph and existing accessible name, `sendBackground` surface, keep `testID="chat.composer.stop"`

**Checkpoint**: US2 renders the reference composer; its unit tests pass.

## Phase 5: User Story 3 - Use Existing Actions and States (Priority: P2)

**Goal**: Message actions appear as a compact left-aligned row beneath assistant content, and states keep their semantics without a boxed response wrapper.

**Independent Test**: Exercise copy, retry, regenerate, and empty/loading/streaming/stopped/error/disabled/read-only states with the new defaults (US3 acceptance scenarios).

### Tests for User Story 3

- [x] T017 [P] [US3] Add `packages/chat/src/components/MessageActions.test.tsx`: inline row renders available actions left-aligned with `chat.action.<id>` testIDs, availability filtering, and nothing when no action is available
- [x] T018 [P] [US3] Update `packages/chat/src/components/Chat.test.tsx` and `MessageBubble.test.tsx` action testIDs from `chat.action-menu` to the inline row (`chat.message-actions`, `chat.action.<id>`)

### Implementation for User Story 3

- [x] T019 [US3] Create `packages/chat/src/components/MessageActions.tsx` (inline left-aligned action row, per-action `Pressable` with focus ring and touch-target minimums) and wire it as the default in `packages/chat/src/components/MessageBubble.tsx`; keep `ActionMenu` exported unchanged; export `MessageActions` from `packages/chat/src/index.ts`
- [x] T020 [US3] Update `packages/chat/src/components/StatusIndicator.tsx` to use the `captionLineHeight`/`captionWeight` tokens so status text follows the theme typography

**Checkpoint**: US3 action row and state surfaces render; their unit tests pass.

## Phase 6: User Story 4 - Use the Layout at Different Sizes and Themes (Priority: P1)

**Goal**: The same hierarchy holds on narrow and wide panels, in dark and high-contrast themes, and with enlarged text; host overrides keep precedence.

**Independent Test**: Exercise 390/974/1440 viewports, 200% zoom, enlarged text, light/dark/high-contrast, and host overrides with a conversation and a draft present (US4 acceptance scenarios).

### Tests for User Story 4

- [x] T021 [P] [US4] Update `packages/chat/src/components/UnreadBadge.test.tsx` and any control tests for the new caption/control typography tokens

### Implementation for User Story 4

- [x] T022 [P] [US4] Apply the new typography tokens to `packages/chat/src/components/ScrollToLatestControl.tsx`, `packages/chat/src/components/LoadEarlierControl.tsx`, and `packages/chat/src/components/UnreadBadge.tsx` (control/caption sizes, line heights, weights)
- [x] T023 [US4] Extend the packaged-artifact smoke suite in `tests/package/chat-package.test.tsx` to cover the new public surface (`MessageActions`, layout/typography token types)

**Checkpoint**: US4 tokens and packaged surface are consistent; unit suites pass.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Demo verification, e2e updates for the changed default presentation, the new spec 007 e2e suite, and full validation.

- [x] T024 Verify `packages/chat-demo/src/ChatDemo.tsx` needs no duplicate layout: the demo mounts `Chat` with defaults, so the new presentation is the default in the demonstration surface (FR-012)
- [x] T025 Add a window-resize helper to `tests/e2e/launch.ts` so tests can set the reference 974x638 panel and the 390/1440 viewports
- [x] T026 Update `tests/e2e/themes-customization.spec.ts` for the new default presentation: light canvas `rgb(255, 255, 255)` and the inline action row replacing the `chat.action-menu` flow
- [x] T027 Update `tests/e2e/streaming-operations.spec.ts` to click the inline `chat.action.<id>` buttons directly (retry, regenerate, copy)
- [x] T028 Update `tests/e2e/accessibility.spec.ts` for the inline action row and its reduced-motion assertion (no modal fade to assert; assert the row renders statically)
- [x] T029 Write `tests/e2e/reference-presentation.spec.ts` covering the US1-US4 acceptance scenarios: centered reading column with no drawer gutter, gray right-aligned user bubbles, unboxed assistant text, markdown suite without an enclosing card, first turn near the top, composer pill wider than the reading column with circular Send/Stop, multiline growth and internal scroll, action row reachable by keyboard and touch, states readable without color, unread/return-to-latest above the composer, 390/974/1440 no horizontal overflow, 200% zoom reflow, light/dark/high-contrast/theme-override, draft and streaming preserved across size/theme changes
- [x] T030 Run quickstart.md validation end-to-end; confirm `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e` all green

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational; run P1 → P1 → P2 → P1.
- **Polish (Phase 7)**: Depends on all user stories.

### Within Each User Story

- Tests written and FAIL before implementation.
- Presentation tasks touch distinct files per story (roleStyles/MessageList/MarkdownText in US1; Composer/SendButton/StopButton in US2; MessageActions/StatusIndicator in US3; control typography in US4).
- Story complete before moving to next.

### Parallel Opportunities

- Foundational token tasks T002/T003/T005 are parallel (distinct files).
- Unit test tasks within a story are parallel.
- Polish tasks T025-T029 are parallel.

## Implementation Strategy

### MVP First

1. Phase 1 (Setup) + Phase 2 (Foundational): the full token surface.
2. Phase 3: US1 → STOP and VALIDATE the reading layout.
3. Phase 4: US2 → validate the composer pill and Send/Stop.
4. Phase 5: US3 → validate the action row and states.
5. Phase 6: US4 → validate sizes and themes.
6. Phase 7: demo verification + e2e updates + new e2e + quickstart validation.

## Notes

- Commits: structural first, behaviour per user story after; never mix structural and behavioural changes in one commit.
- The change is presentation-only; `useChatSession`, message types, and data flow are NOT modified by this spec. A change to `packages/chat/src/session/` in this branch is a defect.
- No new runtime dependency (research R12): safe-area and keyboard avoidance stay host-owned.
- The reference screenshot is not in the repository; FR-002 tolerances and the recorded reference palette are the durable source (research R1/R10).