# Quickstart: Shared Chat Message Rendering

**Date**: 2026-09-07 | **Spec**: 002-shared-chat-message-rendering

Validation guide for spec 002. Contract details in [contracts/message-rendering.md](./contracts/message-rendering.md); entities in [data-model.md](./data-model.md).

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

Run `npm test`. Spec 002 suites cover:

- `MarkdownText`: renders each supported element; raw HTML appears as literal text; remote images render nothing; `javascript:` links are inert; link activation calls `onLinkPress` and never navigates internally.
- `PlainText`: renders markdown-looking characters literally (FR-003).
- `CodeBlock`: copy control present, fires `onCopyCode`, and shows a visible failure state on denied clipboard (acceptance scenario for US4).
- `ContentRenderer`: routes `plain`/`markdown` parts correctly and renders unsupported kinds through the fallback (FR-009).
- `MessageBubble`: user right-aligned, assistant left-aligned, system distinct (FR-004).

## E2E validation (acceptance scenarios)

Run `npm run test:e2e`. The suite drives the Electron harness and covers spec 002's acceptance scenarios:

1. A response with every supported markdown element renders formatted (US1-A1, SC-001).
2. A fenced code block is selectable, horizontally scrollable, and has a copy control (US1-A2).
3. Activating a link calls the host handler; navigation never happens in the component (US1-A3).
4. A table renders formatted or as plain text, never broken (US1-A4).
5. User messages are visually distinct and right-aligned; assistant messages left-aligned; system messages distinct (US2).
6. Raw HTML, remote images, `javascript:` links, and event-handler attributes render inert (US3).
7. Dragging a selection across a message fires no action; denied clipboard copy shows a visible failure (US4).

## Expected outcome

All commands green: `lint`, `typecheck`, `test`, `test:e2e`. No acceptance scenario in [spec.md](./spec.md) fails.