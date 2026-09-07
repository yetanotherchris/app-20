# Quickstart: Shared Chat Message List

**Date**: 2026-09-07 | **Spec**: 001-shared-chat-message-list

Validation guide for spec 001. Contract details live in [contracts/message-list.md](./contracts/message-list.md); entities in [data-model.md](./data-model.md).

## Prerequisites

- Node 22.13+ and npm.
- First-time setup: `npm install` from the repository root (installs workspace dependencies).

## Commands

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint across workspaces. |
| `npm run typecheck` | `tsc --noEmit` across workspaces. |
| `npm test` | Vitest unit suites (native via RNTL, web via jsdom + RNW alias). |
| `npm run test:e2e` | Build the Electron harness, launch it via Playwright, run e2e specs. |

## Unit validation (fast feedback)

Run `npm test`. Spec 001 suites cover:

- `useAtBottom`: the FR-003 predicate flips correctly at the one-message-height boundary.
- `useUnreadCount`: appends while not at bottom increment the count; return to bottom clears it.
- `MessageList`: renders rows with stable keys, no remount on streaming updates; load-earlier and scroll-to-latest controls fire their callbacks and toggle per `hasEarlierMessages` / `isLoadingEarlier`; controls expose the stable `testID`s in [contracts/message-list.md](./contracts/message-list.md).

## E2E validation (acceptance scenarios)

Run `npm run test:e2e`. The suite drives the Electron harness with the RNW-rendered component and covers spec 001's acceptance scenarios:

1. At the bottom, a new message is visible without scrolling (US1-A1).
2. A streaming message keeps identity and position across many updates (US1-A4).
3. Scrolled up, new messages do not move the viewport; an unread count appears and equals the messages below the viewport (US2-A1, US2-A2).
4. Activating scroll-to-latest returns to the newest message and clears the unread count (US2-A3).
5. Loading earlier messages appends above the viewport without moving it; the control disappears when no earlier messages remain (US3-A1, US3-A3).
6. A 1,000-message conversation renders and scrolls without degradation (SC-001).

## Expected outcome

All commands green: `lint`, `typecheck`, `test`, `test:e2e`. No acceptance scenario in [spec.md](./spec.md) fails.