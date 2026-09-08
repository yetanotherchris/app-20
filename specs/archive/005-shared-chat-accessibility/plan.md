# Implementation Plan: Shared Chat Accessibility

**Branch**: `spec-005-shared-chat-accessibility` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-shared-chat-accessibility/spec.md`

## Summary

Make the shared chat component's default controls, states, and renderers meet WCAG 2.2 AA: keyboard-only operation with visible focus, touch targets of at least 44 points on iOS and 24 CSS pixels on web, layout that survives the largest OS text size and 200% browser zoom, status that is perceivable without color, and system reduced-motion and high-contrast settings honored. Screen-reader announcements stay out of scope for beta. Per FR-009 the requirement binds the component's defaults only; host-supplied replacements (spec 004) are the host's responsibility.

## Technical Context

**Language/Version**: TypeScript strict mode (mandatory per constitution), React 19.2, React Native 0.86 (Expo SDK 57), react-native-web 0.21.2.

**Primary Dependencies**: Existing stack only: `@legendapp/list`, `react-native-marked`, `react-native-svg` (web stub), Vitest 5, `@testing-library/react` 16 (web tests), Playwright 1.63, Electron (e2e harness). One new dev dependency: `@axe-core/playwright` for the automated WCAG 2.2 AA scan (SC-001). No new runtime dependency. Focus rings, status badges, and accessibility hooks are plain React; no a11y library is introduced.

**Storage**: N/A. The component remains presentational.

**Testing**: Vitest unit suites (web/jsdom via RNW alias) for the accessibility hooks, focus-ring styling, status mapping, contrast ratios (a pure function asserting every theme's token pairs meet 4.5:1 / 3:1), reduced-motion gating, and focus preservation. Playwright `_electron` e2e for the acceptance scenarios, including an axe-core WCAG 2.2 AA scan, a keyboard-only drive, a 200% zoom reflow check, and `emulateMedia` reduced-motion / high-contrast checks.

**Target Platform**: iOS (Expo SDK 57) and Windows desktop (Electron with RNW renderer). One implementation serves both; platform differences (touch-target size, reduced-motion and high-contrast detection) enter through Platform and AccessibilityInfo, never through forked components.

**Project Type**: Library (shared component package) plus the existing test applications (`apps/web`, `apps/electron`) and the demo host (`packages/chat-demo`).

**Performance Goals**: Focus and reduced-motion detection must not cause per-keystroke re-renders of the message list (only the row that owns focus re-renders). Focus restoration on message removal must be O(1) per removal (id lookup), not a full-list scan in render. The axe scan runs only in the e2e suite, never at runtime.

**Constraints**: No Node, `fs`, or Electron in the renderer (constitution I). The component must render on web without react-native-svg. Accessibility work must not weaken any spec 001-004 behavior (scroll retention, renderer fallback, theme override, draft preservation). Screen-reader announcements are out of scope for beta; the status work is visual and structural, not spoken.

**Scale/Scope**: Single-user personal chat; one response in flight (beta). The a11y surface binds the default renderers and controls; custom renderers/controls remain the host's responsibility (FR-009).

## Constitution Check

Gates from `.specify/memory/constitution.md`:

- **Process Isolation (I)**: Pure renderer work. Accessibility detection reads `AccessibilityInfo` and `matchMedia` only; nothing touches Node, `fs`, or Electron. PASS.
- **Path Trust (II)**: No filesystem access in this spec. N/A.
- **No Data Loss (III)**: No saves. Focus restoration moves focus after a message is removed; it never alters message content. Reduced-motion and high-contrast changes are cosmetic. PASS.
- **Fixed and Typed Preload API (IV)**: No IPC changes; the harness preload stays fixed. The new public props are typed, never a generic escape hatch. PASS.
- **Non-Negotiable Test Coverage (V)**: This spec adds user-visible behavior; it gets a Playwright e2e suite, Vitest unit suites, and the packaged-artifact vitest project continues to cover the expanded public surface. PASS.
- **Technology constraints**: The constitution names WCAG 2.2 AA as the accessibility output target; this spec implements it. The default themes must already pass contrast for the component's own surfaces; the contrast unit test enforces the 4.5:1 / 3:1 pairs and drives two small token corrections in the dark theme (research R4). PASS.

Re-checked after Phase 1 design: no gate violations. The one deliberate complexity is the focus-preservation registry (research R6); the simpler alternative (letting the browser drop focus to `<body>` on message removal) violates the spec edge case.

## Project Structure

### Documentation (this feature)

```text
specs/005-shared-chat-accessibility/
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
│   ├── index.ts                    # Public exports (extended)
│   ├── accessibility/
│   │   ├── useSystemAccessibility.ts       # NEW: reduced-motion + high-contrast detection hook
│   │   ├── useFocusRing.ts                 # NEW: focus-visible ring state + style for controls
│   │   ├── useMessageFocusPreservation.ts  # NEW: restore focus when a focused message is removed
│   │   └── minTouchTarget.ts               # NEW: 44 native / 24 web target size helper
│   ├── theme/
│   │   ├── types.ts                # Edit: focus token, highContrast on context value
│   │   ├── themes.ts               # Edit: high-contrast light/dark variants; dark-token contrast fix (R4)
│   │   ├── resolveTheme.ts         # Edit: contrast dimension in resolution
│   │   ├── ThemeContext.tsx        # Edit: high-contrast + reduced-motion in context value
│   │   └── contrast.ts             # NEW: pure WCAG contrast helpers (relativeLuminance, contrastRatio)
│   ├── components/
│   │   ├── Chat.tsx                # Edit: a11y props, focus preservation, chat status text, reduced-motion gating
│   │   ├── ChatStatusText.tsx      # NEW: non-color chat-status indicator (submitting/streaming/stopping/error)
│   │   ├── MessageBubble.tsx       # Edit: focusable row, message status badge
│   │   ├── MessageStatusBadge.tsx  # NEW: non-color message-status indicator (queued/sending/streaming/stopped/error)
│   │   ├── Composer.tsx            # Edit: input focus ring, input label, min touch targets
│   │   ├── SendButton.tsx          # Edit: focus ring + min touch target
│   │   ├── StopButton.tsx          # Edit: focus ring + min touch target
│   │   ├── ScrollToLatestControl.tsx # Edit: focus ring + min touch target
│   │   ├── LoadEarlierControl.tsx  # Edit: focus ring + min touch target
│   │   ├── ActionMenu.tsx          # Edit: focus ring, focus-into-menu on open, reduced-motion modal, touch targets
│   │   ├── UnreadBadge.tsx         # Edit: grow with text (minHeight + padding, no fixed height)
│   │   └── LoadingState.tsx        # Edit: reduced-motion static fallback for the spinner
│   ├── rendering/
│   │   └── CodeBlock.tsx           # Edit: focus ring + min touch target on the copy control
│   ├── hooks/                      # (existing, unchanged)
│   └── icons.ts                    # Edit: status glyphs (streaming/stopped/error/chat states)
├── tsconfig.build.json             # (existing)
├── package.json                    # (existing)
└── CHANGELOG.md                    # Edit: version bump note

packages/chat-demo/
├── src/
│   ├── ChatDemo.tsx                # Edit: toggles for high contrast / reduced motion; remove-message action; stream-to-error
│   └── fixtures/                   # (existing)

tests/e2e/
├── launch.ts                       # Existing shared helper
└── accessibility.spec.ts           # NEW: spec 005 acceptance scenarios + axe WCAG 2.2 AA scan

tests/package/
└── chat-package.test.tsx           # Edit: cover the new public surface through dist/
```

**Structure Decision**: Extends the existing `packages/chat` package. A new `accessibility/` module owns detection hooks, the focus ring, focus preservation, and the touch-target constant. The theme module gains a `contrast` dimension (normal/high) and a pure contrast-checking module so the required ratios are asserted by test. The status-without-color work is two small components (`ChatStatusText`, `MessageStatusBadge`) rendered by `Chat` and `MessageBubble`; both reuse the existing status vocabulary from `types.ts` and spec 006's chat-status shape. All detection is system-level with explicit prop overrides (`reducedMotion`, `highContrast`) so hosts and tests can drive deterministic states.

## Complexity Tracking

No constitution violations. The deliberate complexities, each with the simpler alternative rejected, are recorded in research.md: the focus-preservation registry (R6), the keyboard-modality focus ring (R5), and the contrast test driving theme-token corrections (R4).
