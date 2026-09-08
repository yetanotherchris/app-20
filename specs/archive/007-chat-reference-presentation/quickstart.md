# Quickstart: Shared Chat Reference Presentation

**Date**: 2026-09-08 | **Spec**: 007-chat-reference-presentation

Validation guide for spec 007. Contract details in [contracts/presentation.md](./contracts/presentation.md); token defaults and entities in [data-model.md](./data-model.md).

## Prerequisites

- Node 22.13+ and npm.
- First-time setup: `npm install` from the repository root.

## Commands

| Command             | Purpose                                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| `npm run lint`      | ESLint across workspaces.                                                      |
| `npm run typecheck` | `tsc --noEmit` across workspaces.                                              |
| `npm test`          | Vitest unit suites (source imports) plus the packaged-artifact vitest project. |
| `npm run test:e2e`  | Build the Electron harness, launch it via Playwright, run e2e specs.           |

## Unit validation (fast feedback)

Run `npm test`. The updated and new suites cover:

- Theme tokens: `resolveTheme` merges the new `layout` group and tokens; the four themes carry the reference defaults (`themes.ts`, `resolveTheme.test.ts`).
- Contrast: `userBubbleText`/`userBubble` and `onPrimary`/`sendBackground` meet 4.5:1 in all four themes (`contrast.test.ts`).
- Role treatments: user messages render right-aligned gray bubbles with dark text and no tail; assistant messages render unboxed (`MessageBubble.test.tsx`, `roleStyles`).
- Composer: the pill renders centered and wider than the reading column; Send is a circular up-arrow control with accessible name Send; Stop swaps into the same area without losing the draft (`Composer.test.tsx`).
- Actions: the inline row renders available actions left-aligned beneath content and renders nothing when none are available (`MessageActions` test).
- Markdown: paragraphs get `paragraphGap` spacing, headings scale, and emphasis is distinguishable (`MarkdownText.test.tsx`, `MarkdownRenderer.test.tsx`).

## Packaged-artifact validation

`npm run test:e2e` builds the Electron app against the packaged `@app-20/chat` entry; `vitest.package.config.ts` imports `packages/chat/dist/index.js` and covers the public surface, including the new `MessageActions` export and token types.

## E2E validation (acceptance scenarios)

Run `npm run test:e2e`. `reference-presentation.spec.ts` drives the demo and covers:

1. US1 (read layout): centered reading column with whitespace on both sides and no drawer gutter; short and multiline user messages in right-aligned gray bubbles; unboxed multi-paragraph assistant text; headings, lists, links, quotations, and code render without an enclosing response card; a short conversation keeps its first turn near the top with the composer at the bottom.
2. US2 (composer): centered pill wider than the reading column; Send disabled/enabled by the existing rules with accessible name Send; multiline growth to the configured limit then internal scroll; Stop reachable in the same control area with the draft retained; only the history scrolls while the composer stays; no plus or microphone placeholder.
3. US3 (actions and states): compact left-aligned action row reachable by keyboard and touch; copy, retry, regenerate rules preserved; loading, streaming, stopped, and error states readable without color and without a boxed response wrapper; unread/return-to-latest visible above the composer; empty, disabled, and read-only chats intact; load-earlier reachable with reading position preserved.
4. US4 (sizes and themes): 390, 974, and 1440 viewports with no panel-wide horizontal overflow; 200% zoom reflow; light, dark, high-contrast, and a host theme override; draft and streaming state preserved across size and theme changes.

The prior suites (`composer`, `message-list`, `message-rendering`, `streaming-operations`, `themes-customization`, `accessibility`) still pass; selectors for the new default presentation were updated (research R11).

## Expected outcome

All commands green: `lint`, `typecheck`, `test`, `test:e2e`. SC-001's six visual checks and FR-002's width/centering tolerances hold at the reference viewport, and no acceptance scenario in [spec.md](./spec.md) fails.