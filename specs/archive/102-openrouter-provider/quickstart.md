# Quickstart: OpenRouter AI Provider

Validation guide for spec 102. It assumes the repository is checked out on `spec-102-openrouter-provider` and dependencies are installed (`npm install`).

## Prerequisites

- Node 20 or newer (the provider uses the platform `fetch` and its response body stream).
- No real OpenRouter key is needed for any automated check. The e2e suite starts a local fake SSE server and points the app at it with `APP20_OPENROUTER_ENDPOINT`.

## Unit tests

```powershell
npm run test
```

Provider package coverage (`packages/ai-provider/src/*.test.ts`):

- `stream.test.ts`: SSE deltas are yielded in order; blank, comment, `[DONE]`, and unparseable lines are skipped; a stream that ends without `[DONE]` throws `ProviderError('network')`.
- `openrouter.test.ts`: the request URL, authorization header, JSON body, delta parsing, HTTP error classification, and abort-without-throw.
- `errors.test.ts`: `classifyHttpStatus` for 401, 403, 429, and other statuses.
- `registry.test.ts`: a second provider registers and resolves by id (US3).

Application coverage:

- `providerErrors.test.ts`: provider error class to app code.
- `providerMessages.test.ts`: live messages map to provider messages, the placeholder is excluded, empty content is dropped.
- `ipc-contract.test.ts`: the channel and event lists match the declared contract.

## Build and lint gates

```powershell
npm run lint
npm run typecheck
npm run build:electron
```

## End-to-end suite

```powershell
npm run test:e2e
```

The suite builds the Electron app, launches it with a temporary user data and conversation folder, and points it at `tests/e2e/fake-openrouter.ts`. Cases in `tests/e2e/ai-provider.spec.ts`:

- **US1 response**: import a key, send a prompt, and see the streamed reply. The conversation and manifest record `model` as `openrouter/auto` (FR-002, FR-008).
- **US1 error**: point the fake server at HTTP 401, send, and see the key error copy; the user message is retained and a retry action is offered (FR-006).
- **US2 increments**: two deltas separated by a delay; the first is visible before the second arrives (FR-003).
- **US2 stop**: a held stream; Stop keeps the partial text and marks the message stopped.
- **Edge drop**: the fake server drops the socket after one delta; the partial text stays and the message is marked error.
- **Edge empty**: a `[DONE]` with no deltas stores an empty assistant message with complete status.

## Manual smoke test

1. `npm run dev:electron`.
2. Import a provider key from the File menu (a real OpenRouter key).
3. Send a prompt and confirm the answer streams in.
4. Press Stop mid-answer and confirm the partial answer remains.
5. Remove the stored key and send again; confirm the missing-key message and that the prompt is still on screen.

## Expected artifacts

- `specs/102-openrouter-provider/plan.md`, `research.md`, `data-model.md`, `contracts/`, `tasks.md`.
- `packages/ai-provider` with the interface, OpenRouter implementation, and tests.
- `chat:*` channels in the shared contract and the preload bridge.
- `tests/e2e/ai-provider.spec.ts` and `tests/e2e/fake-openrouter.ts`.
