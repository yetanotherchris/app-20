# Research: Shared Chat Message List

**Date**: 2026-09-07 | **Spec**: 001-shared-chat-message-list

## R1: Virtualization engine

**Decision**: `@shopify/flash-list` v2 as the list engine on native and web.

**Rationale**: FlashList v2 is a JS-only rewrite for the React Native New Architecture, so it runs on `react-native-web` without native modules (Expo registry lists web as a supported platform; `inverted` prop docs explicitly cover web via CSS transforms). It is the only recycler with first-class chat primitives: built-in `maintainVisibleContentPosition` (enabled by default), `autoscrollToBottomThreshold`, `onStartReached` for earlier-message loading, `getItemType` for heterogeneous rows, and `keyExtractor` required for stable identity when layouts change. It markets 5x UI-thread FPS and 10x JS-thread FPS over FlatList, which matters for the 1,000-message success criterion. FlatList's practical ceiling is a few hundred rows, and RN's `maintainVisibleContentPosition` is not implemented on react-native-web.

**Alternatives considered**: FlatList (insufficient at 1,000 rows, no web MVCP); `@legendapp/list` (JS-only, cross-platform chat primitives; viable fallback if FlashList v2's beta web path proves unacceptable, but adds a second engine and its web import is a separate path).

**Risks**: FlashList v2 web support is described as beta. Web layout measurement is async and can layout-shift; known GitHub issues cover v1 height-0 on expo-web and a v2 web crash. Mitigation: verify the web path early in the Electron harness (Phase 3 of tasks.md), and keep the list-adapter seam (`useMessageList`) so the engine can be swapped without touching row code. Fallback is LegendList.

**Source**: shopify.github.io/flash-list; npmjs.com/package/@shopify/flash-list; docs.expo.dev/versions/latest/sdk/flash-list; GitHub issues #870, #1697.

## R2: Auto-follow at the bottom

**Decision**: Follow decision from an `onScroll` predicate: `distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height)`, auto-follow only when `distanceFromBottom < followThreshold`, where `followThreshold` is the FR-003 "within one message height" boundary.

**Rationale**: RN `ScrollView.maintainVisibleContentPosition.autoscrollToTopThreshold` is pixel-based and platform-inconsistent; FlashList's `autoscrollToBottomThreshold` is a ratio. The spec pins the boundary as "one message height", so an explicit pixel predicate derived from scroll metrics is the faithful implementation. New content is followed by `scrollToEnd`/`scrollToOffset` when inside the threshold; beyond it the list pins.

**Alternatives considered**: `maintainVisibleContentPosition` alone (does not cover the follow decision); `scrollToEnd` unconditionally (violates FR-002).

## R3: Preserving the visible anchor when prepending (load earlier) and when rows above resize

**Decision**: Manual offset-correction on web; FlashList v2 `maintainVisibleContentPosition` on native.

**Rationale**: Neither RN's MVCP nor FlashList's MVCP is reliable on react-native-web. The documented cross-platform workaround is to capture content height before the prepend, compare after, and add the delta to the scroll offset in `useLayoutEffect` (via `scrollToOffset` on native, `scrollTop += delta` on the DOM scrollable node). On native (Expo iOS) FlashList v2 MVCP handles resize-above-viewport and prepend anchoring.

**Alternatives considered**: RN `maintainVisibleContentPosition` (iOS-only historically, Android behavior inconsistent, not on web); `@stream-io/flat-list-mvcp` (a patch library around RN internals, adds a dependency for a problem the manual approach already solves).

**Note**: This is the highest-risk area for spec 001 on the web target. The anchor-correction logic lives in its own hook (`usePrependAnchor`) so it is unit-testable in isolation.

## R4: Unread count and scroll-to-latest

**Decision**: Derive unread state inside the list. Keep a boolean "is at bottom" from the R2 predicate; while not at bottom, count messages appended to the list; clear the count and scroll to the latest on activation of the scroll-to-latest control.

**Rationale**: No list engine exposes unread counts; it is a derived-state pattern. A floating "N new messages" pill with a scroll-to-latest action is the standard chat pattern (Sendbird UIKit unread banner, shadcn chat-new-message-banner). FR-006 requires the count represent messages below the viewport, not streaming chunks: counting appended messages while not at bottom satisfies this.

**Source**: LegendApp/legend-list issue #92; sendbird docs; shadcn blocks.

## R5: Stable message identity across streaming

**Decision**: Immutable message arrays from the host, `keyExtractor` by stable message id, memoized row components, and a streaming-tolerant render path. Completed messages do not re-parse or re-measure on each streaming update.

**Rationale**: FR-007 (stable identity) and the "no flicker or remount" acceptance scenario are met by stable keys plus `React.memo` rows. FlashList v2 requires `keyExtractor` to avoid glitches when item layouts change while scrolling. Rows must be memoized and their content parse cached (keyed by message id plus content hash) so off-window rows do no work and streamed updates reuse prior work.

**Note**: The parse cache is the mechanism for FR-011 (content outside the rendered window is not parsed or measured eagerly). Full row rendering (markdown etc.) belongs to spec 002; spec 001 renders a generic memoized row.

## R6: Test stack

**Decision**: Two unit suites plus one e2e suite. Native-component tests run under Vitest with `@testing-library/react-native` 14 (React 19 / RN 0.86, Expo SDK 57). Web-component tests run under Vitest with `@testing-library/react` 16 in jsdom, with `react-native` aliased to `react-native-web`. E2E runs Playwright `_electron` against the built Electron harness, driving the RNW-rendered component through normal locators (`testID` becomes `data-testid`); native dialogs are stubbed via `electronApp.evaluate`.

**Rationale**: RNTL does not render react-native-web output; RNW components are tested as React DOM components in jsdom, per the RNW maintainer's own guidance. Playwright removed its `_react` selector engine in v1.58, so e2e uses role/text/testid locators on the DOM.

**Source**: npm registry (RNTL 14.0.1, @testing-library/react 16.3.3, vitest 5.0.0, playwright 1.63.0, expo 57.0.20, react-native 0.87.1, react-native-web 0.21.2); callstack RNTL docs; necolas/react-native-web discussion #2341; playwright.dev electron docs.

## R7: Repo structure

**Decision**: npm workspaces monorepo in this repository. `packages/chat/` holds the shared component (consumed as TypeScript source). `apps/web/` is a Vite + RNW test application for browser-based Playwright. `apps/electron/` is a minimal Electron harness embedding the RNW-rendered component; it is the "real built app" e2e target until spec 100 provides the product shell. `tests/e2e/` holds the Playwright suites.

**Rationale**: The chat component must be shared across the Electron desktop app (spec 100) and the iOS app (spec 106). Consuming it as TS source lets Metro and Vite compile it directly; the `react-native` export condition keeps type annotations intact for codegen. The component declares React, React Native, and React Native Web as peer dependencies per `docs/react-component-overview.md`.

**Source**: docs.expo.dev/guides/monorepos; docs.expo.dev/guides/customizing-metro; docs/react-component-overview.md.