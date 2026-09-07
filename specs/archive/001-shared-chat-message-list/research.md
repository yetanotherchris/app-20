# Research: Shared Chat Message List

**Date**: 2026-09-07 | **Spec**: 001-shared-chat-message-list

## R1: Virtualization engine

**Decision**: `@legendapp/list` v3 (LegendList) as the list engine on native and web.

**Rationale**: FlashList v2 was the initial choice, but its web path proved broken in the Electron harness (task T026 evidence): all 1,000 rows render in the DOM yet the scroll content container stays 0-height, so the list cannot scroll or virtualize. This matches FlashList v2's documented beta web support (GitHub issues #870, #1697, #2334). LegendList is 100% JS, works on react-native-web and Expo iOS, and ships the chat primitives this spec needs: `maintainScrollAtEnd` with a threshold, `maintainVisibleContentPosition` data anchoring, `initialScrollAtEnd`, and an `onScroll`-based distance predicate. It exposes `scrollToOffset`, `scrollToEnd`, and a stable `LegendListRef`.

**Alternatives considered**: FlashList v2 (web layout broken, evidence above); RN `FlatList` (insufficient at 1,000 rows, no web MVCP).

**Source**: shopify.github.io/flash-list; npmjs.com/package/@legendapp/list; Electron harness diagnostics (task T026).

## R2: Auto-follow at the bottom

**Decision**: LegendList's `maintainScrollAtEnd` keeps the list pinned to the newest content when the user is at the bottom; an `onScroll`-derived distance predicate (`distanceFromBottom = contentHeight - (offsetY + viewportHeight)`) tracks the FR-003 "within one message height" boundary for the unread and scroll-to-latest state.

**Rationale**: `maintainScrollAtEnd` is the engine's tested JS implementation of follow-on-append, which works on web where RN's pixel-based `maintainVisibleContentPosition` does not. The spec's follow threshold stays explicit: the list follows while inside the threshold and pins (showing unread state) beyond it.

## R3: Preserving the visible anchor when prepending (load earlier) and when rows above resize

**Decision**: LegendList's `maintainVisibleContentPosition` data anchoring on native and web.

**Rationale**: LegendList anchors the visible content across data changes in JS, so a prepend (load earlier) keeps the viewport fixed on both targets without a manual correction. This replaced the originally planned manual offset-correction hook (`usePrependAnchor`): that hook corrected only the web path and duplicated what the engine already does; keeping both caused double offset adjustment. The hook was removed in implementation.

**Alternatives considered**: Manual offset-correction hook on web (rejected: double-adjusts against LegendList's own anchoring); RN `maintainVisibleContentPosition` (not on web).

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