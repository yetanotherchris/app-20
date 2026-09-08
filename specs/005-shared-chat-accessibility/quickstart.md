# Quickstart: Shared Chat Accessibility

**Date**: 2026-09-08 | **Spec**: 005-shared-chat-accessibility

Validation guide for spec 005. Contract details in [contracts/accessibility.md](./contracts/accessibility.md); entities in [data-model.md](./data-model.md).

## Prerequisites

- Node 22.13+ and npm.
- First-time setup: `npm install` from the repository root.

## Commands

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint across workspaces. |
| `npm run typecheck` | `tsc --noEmit` across workspaces. |
| `npm test` | Vitest unit suites (source imports) plus the packaged-artifact vitest project. |
| `npm run test:e2e` | Build the Electron harness (consumes the packaged `@app-20/chat` build), launch it via Playwright, run e2e specs (including the axe WCAG 2.2 AA scan). |

## Unit validation (fast feedback)

Run `npm test`. Spec 005 suites cover:

- `useSystemAccessibility`: reduced-motion and high-contrast detection with prop overrides.
- `useFocusRing`: focused state flips on focus/blur; ring style is applied only while focused.
- `useMessageFocusPreservation`: a removed focused message restores focus to the nearest row; empty list falls back to the composer.
- `contrast` (pure): every theme's text/background and UI pairs meet 4.5:1 / 3:1 (FR-007, SC-004), including the high-contrast variants and the dark-theme corrections.
- `MessageStatusBadge` / `ChatStatusText`: correct label + glyph per status; nothing renders for complete/idle.
- `Composer` / controls: focus rings and touch targets present; input label matches placeholder.
- `ActionMenu`: reduced-motion modal opens without fade; focus moves into the menu on open.
- `LoadingState`: reduced-motion renders the static fallback instead of the spinner.

## Packaged-artifact validation

The vitest project `vitest.package.config.ts` imports `packages/chat/dist/index.js` (the built artifact, not `src`); `npm run test:e2e` builds the Electron app against the packaged `@app-20/chat` entry, so the acceptance scenarios and the axe scan run against the artifact.

## E2E validation (acceptance scenarios)

Run `npm run test:e2e`. The suite drives the Electron harness with demo toggle controls and `page.emulateMedia`, and covers:

1. Tab through the whole chat: focus order is logical and each control shows a visible focus ring (US1-A1/A2).
2. Focus a message row: standard scroll keys (PageDown/ArrowDown) scroll and read the list (US1-A3).
3. Drive the full chat flow with the keyboard alone (type, Enter to send, Stop) (US2 of spec 006 prerequisites, US1-A2).
4. 200% browser zoom: the root has no horizontal overflow and message content remains visible (US2-A1/A2).
5. Streaming, stopped, and error messages stay identifiable with color removed (US3-A1/A2); chat status text shows without color.
6. `emulateMedia({ reducedMotion: 'reduce' })`: no CSS animation runs on the loading surface; the action menu opens without a fade (US4-A1).
7. High contrast: surfaces use the high-contrast palette and text stays readable in the dark high-contrast combination (US4-A2).
8. Focus preservation: focus a message, remove it via the demo, focus moves to a nearby message (edge case).
9. Touch targets: focused controls measure at least 24 CSS px (web) (FR-004).
10. axe-core scan with WCAG 2.2 AA tags reports zero violations (SC-001).

## Expected outcome

All commands green: `lint`, `typecheck`, `test`, `test:e2e`. No acceptance scenario in [spec.md](./spec.md) fails.