# Quickstart: Shared Chat Streaming and Operations

**Date**: 2026-09-08 | **Spec**: 006-shared-chat-streaming-operations

Validation guide for spec 006. Contract details in [contracts/session.md](./contracts/session.md); entities in [data-model.md](./data-model.md).

## Prerequisites

- Node 22.13+ and npm.
- First-time setup: `npm install` from the repository root.

## Commands

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint across workspaces. |
| `npm run typecheck` | `tsc --noEmit` across workspaces. |
| `npm test` | Vitest unit suites (source imports) plus the packaged-artifact vitest project. |
| `npm run test:e2e` | Build the Electron harness, launch it via Playwright, run e2e specs. |

## Unit validation (fast feedback)

Run `npm test`. The `useChatSession` suite covers:

- Submit appends the user message and a sending assistant placeholder, sets chat status submitting, and calls the transport once per operation.
- Chunks append incrementally and flip the response to streaming; a partial Markdown chunk renders without breaking layout (via the existing renderer).
- Complete marks the response complete and the chat idle.
- A message-level failure marks the response error with partial content retained and the chat idle (list stays visible, retry available).
- Stop before the first chunk, mid-stream, and after the final chunk retains partial content and marks stopped; a second stop is a no-op; the final-chunk race yields exactly one terminal status.
- Chunk/complete/fail from a superseded operation are ignored (FR-005); updates for a message removed from the conversation are dropped.
- Retry replaces the errored response in place; regenerate replaces the completed response in place; each runs the transport with the same prompt.
- Duplicate submits are no-ops while an operation is in flight (FR-008).
- Copy delegates the joined plain text to `copyMessageText`.
- Action availability: copy always, retry only for errored assistant messages, regenerate only for completed assistant messages.

## Packaged-artifact validation

The vitest project `vitest.package.config.ts` imports `packages/chat/dist/index.js`; `npm run test:e2e` builds the Electron app against the packaged `@app-20/chat` entry.

## E2E validation (acceptance scenarios)

Run `npm run test:e2e`. The demo drives `Chat` through `useChatSession` with a deterministic timer-based fake transport, and covers:

1. A response streams in incrementally, partial Markdown renders, and the status moves streaming to complete visibly (US1-A1/A2/A3); typing continues during the stream (US1-A4).
2. Stop before the first chunk, mid-stream, and after the final chunk retains partial content; a second Stop is a no-op (US2-A1/A3); the final-chunk race settles on exactly one status (US2-A2).
3. Retry a failed response and regenerate a completed response; each replaces the old response in place with a new streamed answer (US3-A1/A2); a late update from the superseded operation is ignored (US3-A3).
4. Copy a message and a code block puts the text on the clipboard (US4-A1/A2).
5. Duplicate Send and Stop events never fire (edge case); replacing the conversation during streaming leaks no updates (edge case); the draft survives a stream (edge case); a dropped connection leaves an errored message with partial content and retry available (edge case).

## Expected outcome

All commands green: `lint`, `typecheck`, `test`, `test:e2e`. No acceptance scenario in [spec.md](./spec.md) fails.