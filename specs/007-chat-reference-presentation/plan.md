# Implementation Plan: Shared Chat Reference Presentation

**Branch**: `spec-007-chat-reference-presentation` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-chat-reference-presentation/spec.md`

## Summary

Give the shared chat component the reference light-theme ChatGPT presentation as its default: a white canvas with a centered, width-constrained reading column; right-aligned light-gray user bubbles with no tail; unboxed left-aligned assistant text; token-driven body and control typography with real paragraph and turn spacing; a centered bottom composer pill wider than the reading column holding a circular up-arrow Send and a same-area Stop; and message actions as a compact left-aligned row beneath assistant content. The change is presentation-only: message ordering, identity, scrolling, Markdown, draft, keyboard, composition, cancellation, and message-operation behavior from specs 001 through 006 are untouched (FR-010), and all customization channels (themes, renderers, controls, icons, labels, actions, states) keep precedence over the new defaults (FR-012/013).

## Technical Context

**Language/Version**: TypeScript strict mode (mandatory per constitution), React 19.2, React Native 0.86 (Expo SDK 57), react-native-web 0.21.

**Primary Dependencies**: Existing stack only: `@legendapp/list`, `react-native-marked`, `react-native-svg` (web stub), Vitest 5, `@testing-library/react` 16 (web tests), Playwright 1.63, Electron (e2e harness). No new runtime dependency. Layout, colors, radii, spacing, and typography all flow through the existing semantic-token theme (research R1/R2/R10); no styling library is introduced.

**Storage**: N/A. The component remains presentational; hosts own messages, draft, status, and callbacks.

**Testing**: Vitest unit suites (web/jsdom via RNW alias) for the new theme tokens, role treatments, composer pill, circular Send, inline message actions, Markdown paragraph/hierarchy styles, and the extended contrast pairs. A packaged-artifact vitest project imports `dist/` and exercises the public surface. Playwright `_electron` e2e for the acceptance scenarios: a new `reference-presentation.spec.ts` covers the four user stories at 390, 974, and 1440 viewport widths, plus updates to `themes-customization.spec.ts`, `streaming-operations.spec.ts`, and `accessibility.spec.ts` where the new default presentation changes prior selectors (research R11).

**Target Platform**: iOS (Expo SDK 57), Windows desktop (Electron with RNW renderer). One implementation serves both (FR-016); host differences enter only through documented props.

**Project Type**: Library (shared component package) plus the existing test applications (`apps/web`, `apps/electron`) and the demo host (`packages/chat-demo`).

**Performance Goals**: The presentation change must not degrade the message list: centering wraps the existing `LegendList` without remounting rows or resetting scroll on theme switch (FR-010, spec 004 SC-003); no per-keystroke O(n) work introduced; the composer pill keeps the existing autogrow behavior.

**Constraints**: No Node, `fs`, or Electron in the renderer (constitution I). React, React Native, React Native Web stay peer dependencies. The component must render on web without react-native-svg (web stub, FR-007). Accessibility takes precedence over the reference's faint text, low-contrast outlines, and small icon appearance (FR-011); touch targets and visible focus are never reduced to match the screenshot (FR-006/011). Safe-area and keyboard avoidance remain host-owned (research R12).

**Scale/Scope**: Single-user personal chat; one response in flight (beta). The change is the default presentation of the existing shared component; no new controls, capabilities, or conversation features are introduced (FR-013).

## Constitution Check

Gates from `.specify/memory/constitution.md`:

- **Process Isolation (I)**: Pure renderer change. No Node, `fs`, or Electron access anywhere in the touched surfaces. PASS.
- **Path Trust (II)**: No filesystem access in this spec. N/A.
- **No Data Loss (III)**: No saves. Presentation changes never discard messages, draft, or stream state; Send/Stop swaps in place without losing the draft (US2-A4), and theme/size changes preserve draft, operation state, and scroll position (US4-A6). PASS.
- **Fixed and Typed Preload API (IV)**: No IPC changes. The theme token additions are typed (`ChatTheme` sections), never a generic escape hatch. PASS.
- **Non-Negotiable Test Coverage (V)**: This spec adds user-visible behavior; it gets a Playwright e2e suite, Vitest unit suites, and updated contrast assertions (FR-015). PASS.
- **Technology constraints**: Accessibility output stays WCAG 2.2 AA (spec 005 requirements remain in force, FR-011); the contrast regression extends to the new bubble, send, and canvas surfaces (research R10). Semantic tokens plus style overrides remain the only styling channels (spec 004 FR-003). PASS.

Re-checked after Phase 1 design: no gate violations. The one deliberate presentation change is the replacement of the assistant bubble and the overflow action menu with the reference look (research R5/R9), which the spec explicitly authorizes; behavior and data semantics are unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/007-chat-reference-presentation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/chat/
├── src/
│   ├── index.ts                      # Edit: export new MessageActions + layout/typography types
│   ├── theme/
│   │   ├── types.ts                  # Edit: layout group; userBubbleText + sendBackground colors;
│   │   │                             #   paragraphGap; typography lineHeight/weight tokens
│   │   ├── themes.ts                 # Edit: reference light/dark/high-contrast defaults
│   │   ├── resolveTheme.ts           # Edit: merge the new layout section
│   │   └── contrast.test.ts          # Edit: assert userBubbleText/userBubble, onPrimary/sendBackground
│   ├── components/
│   │   ├── Chat.tsx                  # Edit: no layout change (composes existing parts); pass-through
│   │   ├── MessageList.tsx           # Edit: centered reading column + side padding
│   │   ├── MessageBubble.tsx         # Edit: default actions render via MessageActions
│   │   ├── MessageActions.tsx        # NEW: inline left-aligned action row (research R9)
│   │   ├── Composer.tsx              # Edit: centered pill holding input + controls
│   │   ├── SendButton.tsx            # Edit: circular icon-only up-arrow control
│   │   ├── StopButton.tsx            # Edit: same-area circular stop control
│   │   ├── ScrollToLatestControl.tsx # Edit: typography tokens only
│   │   ├── LoadEarlierControl.tsx    # Edit: typography tokens only
│   │   ├── UnreadBadge.tsx           # Edit: caption typography tokens
│   │   └── StatusIndicator.tsx       # Edit: caption line-height token
│   ├── rendering/
│   │   ├── roleStyles.ts             # Edit: user gray bubble / assistant unboxed / system stretch
│   │   ├── MarkdownText.tsx          # Edit: paragraph, heading, strong, em, codespan styles
│   │   └── MarkdownRenderer.tsx      # Edit: heading size/weight scale if needed
│   └── (existing tests updated beside each source)
│
tests/e2e/
├── launch.ts                         # Edit: add a window-resize helper for the reference viewport
├── reference-presentation.spec.ts    # NEW: spec 007 acceptance scenarios
├── themes-customization.spec.ts      # Edit: white canvas + inline action row
├── streaming-operations.spec.ts      # Edit: inline action row
└── accessibility.spec.ts             # Edit: inline action row + reduced-motion assertion
```

**Structure Decision**: Extends the existing `packages/chat` package in place. The theme gains a `layout` token group plus color, spacing, and typography tokens so the reference values are theme defaults, not hardcoded styles (research R1/R2/R10). Components change only where the presentation requires it: `MessageList` centers a reading column, `Composer` becomes a centered pill, `SendButton`/`StopButton` become circular controls, a new `MessageActions` renders the inline action row, and `roleStyles`/`MarkdownText` carry the reference typography and surfaces. `Chat` and the demo host are unchanged in structure; the demo already mounts `Chat` with defaults and therefore shows the new presentation without a duplicate layout (FR-012). Unit tests sit beside their source; the packaged-artifact test covers the new public surface.

## Complexity Tracking

No constitution violations. The deliberate presentation replacements (assistant bubble, overflow action menu, rectangular Send) each have a simpler alternative rejected in research.md (R5, R9, R8). The only structural complexity is the reading-column wrapper and composer pill, both plain flex layout with no new machinery.