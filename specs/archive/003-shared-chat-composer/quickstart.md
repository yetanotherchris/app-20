# Quickstart: Shared Chat Composer

**Date**: 2026-09-07 | **Spec**: 003-shared-chat-composer

Validation guide for spec 003. Contract details in [contracts/composer.md](./contracts/composer.md); entities in [data-model.md](./data-model.md).

## Prerequisites

- Node 22.13+ and npm.
- First-time setup: `npm install` from the repository root.

## Commands

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint across workspaces. |
| `npm run typecheck` | `tsc --noEmit` across workspaces. |
| `npm test` | Vitest unit suites. |
| `npm run test:e2e` | Build the Electron harness, launch it via Playwright, run e2e specs. |

## Unit validation (fast feedback)

Run `npm test`. Spec 003 suites cover:

- `useAutogrowHeight`: clamps content height to `[minHeight, maxHeight]`; updates on content size change, layout, and text change (web-shrink and iOS-Fabric fallbacks, research R1).
- `Composer`: Send disabled for empty/whitespace draft and while busy; `onSubmit` fires exactly once per send and never while busy; `onChangeText` fires once per change; IME composition does not send; Enter vs Shift+Enter behaviour; blur sends or keeps per config; draft never discarded on re-render.
- `SendButton` / `StopButton`: labels, disabled states, stable test ids.

## E2E validation (acceptance scenarios)

Run `npm run test:e2e`. The suite drives the Electron harness (desktop, fine pointer) and covers:

1. Type text, click Send, confirm `onSubmit` fired and draft cleared (US1-A1).
2. Type text, press Enter, confirm submit; press Shift+Enter, confirm a newline, no submit (US1-A2, US2-A3).
3. Empty/whitespace draft: Send disabled, nothing submitted (US1-A3).
4. Long draft: composer grows, then scrolls internally past max height (US2-A1, US2-A2).
5. In-flight (busy) state: Send disabled, Stop shown; idle: no Stop (US3-A1, US3-A2).
6. IME: composition does not send; confirmed text sends (US4-A1).
7. Pasted multiline text keeps newlines (US4-A2).
8. Blur-to-send and blur-to-keep both behave as configured (US5-A1, US5-A2).
9. Draft survives unrelated message-list updates (SC-003).

## Expected outcome

All commands green: `lint`, `typecheck`, `test`, `test:e2e`. No acceptance scenario in [spec.md](./spec.md) fails.