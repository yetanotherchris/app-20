# Quickstart: Shared Chat Themes and Customization

**Date**: 2026-09-07 | **Spec**: 004-shared-chat-themes-customization

Validation guide for spec 004. Contract details in [contracts/chat.md](./contracts/chat.md) and [contracts/theme.md](./contracts/theme.md); entities in [data-model.md](./data-model.md).

## Prerequisites

- Node 22.13+ and npm.
- First-time setup: `npm install` from the repository root.

## Commands

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint across workspaces. |
| `npm run typecheck` | `tsc --noEmit` across workspaces. |
| `npm test` | Vitest unit suites (source imports) plus the packaged-artifact vitest project. |
| `npm run test:e2e` | Build the Electron harness (consumes the packaged `@app-20/chat` build), launch it via Playwright, run e2e specs. |

## Unit validation (fast feedback)

Run `npm test`. Spec 004 suites cover:

- `resolveTheme`: light/dark bases; a partial override replaces only provided keys; absent keys fall back; unknown token groups cannot break rendering.
- `Chat`: theme switch re-renders surfaces without remounting the list; a custom renderer that throws falls back to the default for that message while others continue (FR-011).
- `ContentRenderer`: a custom renderer for one content type is used, defaults elsewhere (FR-005).
- `MarkdownRenderer`: a custom element renderer is used for that element, defaults elsewhere (FR-006).
- `Composer`/`MessageList`: custom Send/Stop/scroll-to-latest controls render in place with stable testIDs; custom Send keeps Stop during busy (FR-007).
- `MessageBubble`/`ActionMenu`: actions group and fire with message context; no actions means no affordance (FR-009).
- State views: empty/loading/typing/error render props appear in the right status conditions (FR-008).
- Constraints: disabled, read-only, and capability-limited states are reflected in the composer and actions (FR-014).

## Packaged-artifact validation (FR-015)

The vitest project `vitest.package.config.ts` imports `packages/chat/dist/index.js` (the built artifact, not `src`) and asserts the documented public surface exports render. `npm run test:e2e` builds the Electron app against the packaged `@app-20/chat` entry, so the acceptance scenarios run against the artifact.

## E2E validation (acceptance scenarios)

Run `npm run test:e2e`. The suite drives the Electron harness (desktop, fine pointer) with demo toggle controls and covers:

1. Switch light to dark: every surface updates consistently (US1-A1).
2. Apply a custom theme overriding one token: every surface using it reflects the override (US1-A2).
3. Theme switch while streaming: stream continues and scroll position is preserved (US1-A3).
4. Custom message renderer used for every message; custom content renderer for one content type with defaults elsewhere; custom Markdown element renderer with defaults elsewhere (US2-A1/A2/A3).
5. Custom Send, Stop, and scroll-to-latest controls appear and function (US2-A4).
6. Message actions render grouped and fire with the message as context; removing all actions leaves no affordance (US2-A5, edge case).
7. A composer control added by the host appears and functions (US2-A6).
8. Custom icons supplied: no default icon appears for those slots (US2-A7).
9. No custom renderer for a content type: the default is used (US2-A8).
10. Empty, loading, typing, and error states render per status and accept custom views (US3-A1/A2/A3).
11. Disabled, read-only, and capability-limited states block input and hide/inert related actions (US4-A1/A2/A3).

## Expected outcome

All commands green: `lint`, `typecheck`, `test`, `test:e2e`. No acceptance scenario in [spec.md](./spec.md) fails.