# Research: Shared Chat Accessibility

**Date**: 2026-09-08 | **Spec**: 005-shared-chat-accessibility

## R1: System accessibility detection

**Decision**: A single `useSystemAccessibility` hook resolves `reducedMotion` and `highContrast` from the platform, with explicit `reducedMotion` / `highContrast` props on `Chat` and `ThemeProvider` that override detection.

**Rationale**: FR-006 and FR-007 require honoring system settings. On web, reduced motion is `matchMedia('(prefers-reduced-motion: reduce)')` (also exposed through react-native-web's `AccessibilityInfo.isReduceMotionEnabled()` + `reduceMotionChanged` listener, verified in `node_modules/react-native-web/dist/exports/AccessibilityInfo/index.js`); high contrast is `matchMedia('(forced-colors: active)')` or `(prefers-contrast: more)`. On native, `AccessibilityInfo.isReduceMotionEnabled()` and iOS's `AccessibilityInfo.isHighContrastEnabled()` apply; RNW implements only reduced motion, so the hook must guard a missing `isHighContrastEnabled`. Explicit props make the states deterministic for hosts and testable in jsdom (which lacks `matchMedia` by default).

**Alternatives considered**: Reading `matchMedia` inline at each call site (duplicated, no override channel, untestable); a dependency on a media-query hook library (new runtime dependency, no existing usage).

## R2: Focus ring for visible focus (FR-003, US1)

**Decision**: A `useFocusRing` hook returns `{ focused, onFocus, onBlur, focusRingStyle }`; each chat control applies the ring style when focused. On web the ring is an outline (`outlineWidth: 2`, `outlineStyle: 'solid'`, `outlineColor: theme.colors.focus`, `outlineOffset: 2`); on native the hook returns no ring (iOS has no keyboard focus). The ring renders whenever the control is focused, matching the "visible focus at every step" scenario without a pointer/keyboard modality heuristic.

**Rationale**: Verified that react-native-web 0.21.2's `StyleSheet` does not compile CSS pseudo-classes such as `:focus-visible` (the compiler handles only value transforms; `validate.js` permits long-form `outline*` props), and RNW's `Pressable` accepts `style` as a function receiving `{ focused, hovered, pressed }` (`node_modules/react-native-web/dist/exports/Pressable/index.js`), giving us the focused state without extra focus tracking. The outline approach is the standard non-destructive focus indicator (it does not shift layout), works on both themes, and is directly assertable in e2e via the focused element's computed `outline` style. WCAG 2.2 Focus Appearance does not require distinguishing pointer focus; showing the ring on every focus is compliant and simpler.

**Alternatives considered**: A CSS `:focus-visible` rule injected by the renderer (breaks the shared package boundary and native/web parity); a pointer-vs-keyboard modality tracker (more moving parts, no requirement to justify it); a border-based ring (shifts layout and is not supported uniformly).

## R3: Status without color (FR-008, US3)

**Decision**: Two small components render non-color status. `MessageStatusBadge` (inside `MessageBubble`) shows an icon glyph plus a text label for a message's non-complete status: queued "Queued", sending "Sending", streaming "Streaming", stopped "Stopped", error "Error". `ChatStatusText` (rendered by `Chat` above the composer) shows the chat status when it is not idle: "Submitting…", "Streaming…", "Stopping…", "Error". Both reuse the existing `MessageStatus` and `ChatStatus` vocabularies; the icons are the existing text-glyph system so they render on both hosts.

**Rationale**: FR-008 requires status to be perceivable without color. A glyph plus adjacent text label is perceivable with color removed, without sound or animation (spec edge case). The default themes' `textSecondary` and `danger` tokens already pass 4.5:1 on their surfaces, and the high-contrast variants keep them near-maximal, so the captions are readable in every mode. Screen-reader announcements are explicitly out of scope for beta; the live-region work already present (`UnreadBadge`) stays as is.

**Alternatives considered**: Status conveyed only by shape/icon (ambiguous for stopped vs error); a color-blind simulation palette (over-engineering; WCAG contrast + non-color redundancy covers it); deferring status display to spec 006 (spec 005's US3 acceptance scenarios would be untestable).

## R4: Contrast ratios and the dark-theme corrections

**Decision**: Add a pure `contrast.ts` module (`relativeLuminance`, `contrastRatio`, `assertContrast`) and a unit test that asserts the required pairs for every theme: 4.5:1 for normal text on its background, 3:1 for UI components. The test drives two corrections to the default dark theme: `onPrimary` changes from `#ffffff` to `#0f172a` (white on the dark primary `#3b82f6` measures 3.68:1, below 4.5:1; dark navy text on it measures 4.85:1), and `danger` changes from `#ef4444` to `#f87171` (red on the dark surface `#1e293b` measures 3.89:1 as text; `#f87171` measures 5.29:1). The code-block copy control's "Copy failed" state switches its label to `onPrimary` because `codeText` on the danger background fails 4.5:1. High-contrast light and dark theme variants are added (near-black-on-white and white-on-black surfaces with maximal borders) and are also asserted by the same test.

**Rationale**: SC-004 and FR-007 name specific ratios. Computing them once in a pure module and asserting them in a unit test converts a manual audit into a regression gate; the corrections are small token edits plus one conditional label color. The full set of measured pairs is recorded below.

**Alternatives considered**: Shipping only high-contrast variants and leaving the default themes' sub-4.5 pairs (the default themes are what most users see; FR-001 binds them); a lint rule over colors (does not compute ratios); an external contrast library (one more dependency for a ~20-line pure function).

Measured pairs (default themes, after correction):

| Pair                                      | Light | Dark  |
| ----------------------------------------- | ----- | ----- |
| text / surface                            | 17.85 | 13.35 |
| textSecondary / surface                   | 7.58  | 5.71  |
| onPrimary / primary (button, user bubble) | 5.17  | 4.85  |
| link (primary) / background               | 5.17  | 4.85  |
| danger text / surface                     | 4.83  | 5.29  |
| unreadBadge / background                  | 4.62  | 4.74  |
| codeText / codeBackground                 | 14.48 | 16.36 |

## R5: Keyboard operation (FR-003, US1)

**Decision**: Message rows become focusable on web (`focusable` on the row container), so Tab reaches the list, and when a row is focused the standard scroll keys (ArrowDown/Up, PageDown/Up, Home, End) scroll the list's scroll container, the browser's default behavior for a focused element inside a scrollable ancestor. `Chat` exposes `messageListLabel` (default "Message list") used as the row group's accessible description; every control keeps `accessibilityLabel` equal to its visible label (FR-002), and the composer input gains an explicit `accessibilityLabel` equal to its placeholder. Keyboard activation already works because react-native-web's `Pressable` fires `onPress` on Enter/Space.

**Rationale**: US1-A3 requires that once focus reaches the message list, the standard scroll keys operate it. Making the virtualized scroll container itself focusable is unreliable through `@legendapp/list` (it does not expose a forwarded focusable prop), while a focusable row inside the scroll container gives the same scroll behavior deterministically and also gives the focus-preservation registry (R6) a per-message anchor. Tab order follows DOM order: rows, load-earlier, scroll-to-latest, composer input, send/stop, which is the logical flow.

**Alternatives considered**: Making the LegendList scroll container focusable via a prop (unverified through the third-party component's prop surface); leaving rows unfocusable and relying on the composer for all interaction (fails US1-A3's "messages can be scrolled, read").

Axe's `scrollable-region-focusable` rule flags the list's scroll container because it is not itself a tab stop. That is a false positive for this design: scrolling is keyboard-operable from any focused message row (proven by the US1-A3 e2e), so the axe scan excludes that one rule with the rationale recorded here.

## R6: Focus preservation when a message is removed (edge case)

**Decision**: `useMessageFocusPreservation` keeps a ref of the last focused message id (a `focusin` listener on the list container reads `data-testid` on the active element), and when the message list changes so that id is gone, focuses the nearest remaining row (the previous id, else the next, clamped to the new range) by id lookup, falling back to the composer when the list is empty. Web-only.

**Rationale**: The spec requires focus to move to a nearby message or control when a message is removed. The browser would otherwise drop focus to `<body>`. A `focusin` listener plus an effect keyed on the message id list gives O(1) bookkeeping; the registry is a Map from message id to the row's DOM node so restoration is a direct lookup. Row testIDs already exist (`chat.message.<id>`), so no new attribute plumbing is needed.

**Alternatives considered**: A React context of ref callbacks threaded through every row (more moving parts than a container-level listener); doing nothing (browser drops focus, violating the edge case); always focusing the composer on any removal (loses the user's place in a long list).

## R7: Touch targets (FR-004)

**Decision**: A `minTouchTarget()` helper returns 24 on web and 44 on native. Every chat control (Send, Stop, scroll-to-latest, load-earlier, action-menu trigger and items, code-block copy) applies it as `minHeight` (and `minWidth` where the control is icon-only). The `UnreadBadge`'s fixed 24px height becomes a `minHeight` with padding so it grows with large text.

**Rationale**: FR-004 names the two platform minimums. Applying `minHeight`/`minWidth` (not `height`/`width`) preserves the existing padding-based sizing for larger labels while guaranteeing the floor; buttons that already exceed the minimum are unchanged. 44 on native covers the iOS HIG requirement; 24 CSS pixels is the WCAG 2.2 target size (SC 2.5.8) minimum.

**Alternatives considered**: A single 44 everywhere (over-sizes web controls against the spec's explicit 24px web value); wrapping controls in a hit-slop layer (adds layout complexity, no requirement to exceed the stated minima).

## R8: Reflow at large text and 200% zoom (FR-005, US2)

**Decision**: No fixed-height containers that would clip text: the composer input already autogrows with an internal scroll cap (spec 003), bubbles and captions size to content, and the two remaining fixed-height surfaces (unread badge, action menu trigger) become `minHeight`-driven. e2e asserts reflow at 200% zoom (Chromium `zoom: 2`) and at the largest jsdom text scale by checking the root's `scrollWidth <= clientWidth` (no horizontal clipping) and that message content is visible.

**Rationale**: FR-005/SC-003 forbid clipping, overlap, or loss at 200% zoom and the largest text size. The component is flex-based, so the audit target is fixed heights and `overflow: hidden` surfaces. The code-block horizontal `ScrollView` is intentional scrolling, not clipping; bubbles wrap text with `maxWidth` only.

**Alternatives considered**: Rebuilding the layout with percentage-based fixed grids (unnecessary churn; the flex layout already reflows); adding a `minFontScale` clamp (reduces text, which fights dynamic type).

## R9: Reduced motion (FR-006, US4)

**Decision**: When `reducedMotion` is true, the action menu's `Modal` renders with `animationType="none"` instead of `"fade"`, and the `LoadingState` spinner is replaced by a static status glyph + label. All other component-triggered animation is already absent (scroll-to-latest uses `animated: false`; the list follow behavior is content flow, not decoration). e2e uses `page.emulateMedia({ reducedMotion: 'reduce' })` and asserts no running CSS animation on the loading surface.

**Rationale**: FR-006 requires that no unnecessary animation plays under reduced motion. The two animated surfaces in the component are the modal fade and the `ActivityIndicator` spinner (RNW renders it as a CSS `@keyframes` animation). Both are decorative progress/transitions, not essential motion, so they are disabled rather than preserved.

**Alternatives considered**: Keeping the spinner (it is a progress indicator, but WCAG reduced-motion prefers static presentation for decorative motion); a CSS `animation: none` injection (breaks the package boundary).

## R10: High contrast (FR-007, US4)

**Decision**: Theme resolution gains a `contrast: 'normal' | 'high'` dimension with `highContrastThemes` for light and dark (near-black-on-white and white-on-black surfaces, maximal borders, primary=background color with the opposite text color). `ThemeProvider` selects it when the `highContrast` prop or system detection is active and exposes the resolved `contrast` in the context value. All surfaces read the same tokens, so no component branches on contrast.

**Rationale**: FR-007 requires honoring high-contrast settings. The existing token architecture makes a full surface treatment a palette swap with zero component changes; forced-colors on web and `AccessibilityInfo.isHighContrastEnabled()` on iOS drive the switch. The palette is tuned so every text pair exceeds 4.5:1 and every UI component exceeds 3:1 (asserted by the R4 contrast test), including the dark + high-contrast combination the spec's edge case calls out.

**Alternatives considered**: CSS `forced-color-adjust` on web only (native parity breaks); per-component contrast branches (defeats the token system and doubles the surface count); only boosting borders (fails the "no unreadable surfaces" edge case for text pairs).

## R11: Automated WCAG 2.2 AA scan (SC-001)

**Decision**: Add `@axe-core/playwright` as a dev dependency. A dedicated e2e test runs `AxeBuilder` against the built app with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` and asserts zero violations, with a documented allowlist only if a real false positive is proven.

**Rationale**: SC-001 names "the project's automated WCAG 2.2 AA suite." axe-core is the standard engine, tags map directly onto WCAG 2.2 AA, and the Electron harness already launches under Playwright so the scan runs against the real built component. This is the automated half; focus order, target size, and reflow remain e2e assertions because axe cannot evaluate them.

**Alternatives considered**: Writing a hand-rolled rule checker (reimplements axe, low value); treating the contrast unit test as the whole suite (covers only color, not structure, names, or semantics).
