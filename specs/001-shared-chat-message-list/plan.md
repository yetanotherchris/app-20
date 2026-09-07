# Implementation Plan: Shared Chat Message List

**Branch**: `spec-001-shared-chat-message-list` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-shared-chat-message-list/spec.md`

## Summary

Build the message list for the shared chat component: a virtualized, variable-height list that auto-follows new and streaming content while the user is at the bottom, pins the viewport while the user reads earlier content (showing an unread count and a scroll-to-latest control), and loads earlier messages without moving the visible anchor. Rendered with FlashList v2 on React Native and React Native Web, consumed as TypeScript source from `packages/chat/`, with unit tests under Vitest and e2e under Playwright against an Electron harness.

## Technical Context

**Language/Version**: TypeScript strict mode (mandatory per constitution), React 19.2, React Native 0.86 (Expo SDK 57), react-native-web 0.21.

**Primary Dependencies**: `@shopify/flash-list` v2 (list engine), `react-native`, `react-native-web` (peer deps of the component), Vitest 5, `@testing-library/react-native` 14 (native tests), `@testing-library/react` 16 (web tests), Playwright 1.63, Electron (e2e harness). No Markdown library in this spec; spec 002 selects it.

**Storage**: N/A. The component is purely presentational; conversation persistence is spec 101.

**Testing**: Vitest unit suites (native via RNTL, web via jsdom + RNW alias), Playwright `_electron` e2e against the built Electron harness.

**Target Platform**: iOS (Expo SDK 57), Windows desktop (Electron with RNW renderer).

**Project Type**: Library (shared component package) plus test applications (`apps/web`, `apps/electron`).

**Performance Goals**: 1,000-message conversation renders in under 2 seconds; continuous scrolling shows no stall longer than 100 ms (spec SC-001). Completed messages do not re-render per streaming update; content outside the rendered window is not parsed or measured eagerly (FR-011).

**Constraints**: Component must not depend on Node, `fs`, or Electron modules in the renderer (constitution I). React, React Native, React Native Web are peer dependencies. Consumed as TS source by Metro and Vite. E2e must run against the built app (Electron harness) with native dialogs stubbed via `electronApp.evaluate`.

**Scale/Scope**: Single-user component, one conversation rendered at a time, 1,000+ message conversations, streaming updates arriving frequently.

## Constitution Check

Gates from `.specify/memory/constitution.md`:

- **Process Isolation (I)**: The component is a pure renderer with no Node, `fs`, or Electron access. The Electron harness keeps all privileged operations behind the fixed preload API; the chat component never touches it. PASS.
- **Path Trust (II)**: No filesystem access in this spec. N/A.
- **No Data Loss (III)**: No saves in this spec. N/A.
- **Fixed and Typed Preload API (IV)**: The Electron harness preload exposes a minimal fixed list for e2e (e.g. session control). No generic `invoke`. No `any` at the IPC boundary. PASS.
- **Non-Negotiable Test Coverage (V)**: This spec adds user-visible behaviour; it gets a Playwright e2e suite plus Vitest unit tests. Path/save/IPC-shape tests are not applicable to this feature but the existing gate set must stay green. PASS.
- **Technology constraints**: React Native primitives shared across iOS and desktop; React Native Web for Electron rendering; NativeWind for styling; TypeScript strict. PASS.

Re-checked after Phase 1 design: no gate violations introduced. FlashList v2 web support is beta; the plan mitigates with an early web verification task and a documented fallback (LegendList), not by weakening a requirement.

## Project Structure

### Documentation (this feature)

```text
specs/001-shared-chat-message-list/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/chat/                      # Shared chat component (this spec: message list)
├── src/
│   ├── index.ts                    # Public exports
│   ├── types.ts                    # Message, content part, status types
│   ├── components/
│   │   ├── MessageList.tsx         # The list component
│   │   ├── ScrollToLatestControl.tsx
│   │   ├── LoadEarlierControl.tsx
│   │   └── UnreadBadge.tsx
│   └── hooks/
│       ├── useAtBottom.ts          # R2 follow predicate
│       ├── usePrependAnchor.ts     # R3 web anchor correction
│       └── useUnreadCount.ts       # R4 derived unread state
├── package.json                    # Peer deps react/rn/rnw; deps flash-list
└── tsconfig.json

apps/web/                           # RNW test app (Vite) for browser e2e
├── index.html
├── vite.config.ts
└── src/
    ├── main.tsx
    └── App.tsx

apps/electron/                      # Electron harness for Playwright e2e
├── main.ts                         # Main process, dialog stubs for e2e
├── preload.ts                      # Fixed preload API
└── renderer/
    ├── index.html
    └── src/
        └── main.tsx                # RNW bootstrap of the chat component

tests/
├── e2e/
│   ├── launch.ts                   # Shared Playwright launch helper
│   └── message-list.spec.ts        # Spec 001 acceptance scenarios
└── (Vitest suites live beside components in packages/chat)

Root config: package.json (workspaces), tsconfig.base.json, tsconfig.json,
eslint.config.mjs, .prettierrc, vitest.config.ts (workspace projects),
playwright.config.ts, electron.vite.config.ts, .gitignore
```

**Structure Decision**: npm workspaces monorepo (research R7). The chat component is a standalone package under `packages/chat/` so it can move to its own repository later per `docs/react-component-overview.md`. Test applications live under `apps/`; `apps/electron` is the e2e target until spec 100 ships the product shell. Component unit tests sit beside their source as `*.test.ts(x)`; the Vitest workspace config maps native vs web projects.

## Complexity Tracking

No constitution violations. The only deliberate complexity is the manual web anchor-correction in `usePrependAnchor` (research R3): FlashList v2's `maintainVisibleContentPosition` is not reliable on react-native-web, so the web path captures content height before a prepend and adds the delta to the scroll offset in `useLayoutEffect`. The simpler alternative (trusting FlashList MVCP on web) is rejected because it violates FR-004 (loading earlier messages does not move the visible anchor) on the Electron target, which is a required acceptance scenario.