# Tasks: OpenRouter AI Provider

**Input**: Design documents from `/specs/102-openrouter-provider/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ai-provider.md, contracts/chat-ipc.md

**Tests**: The constitution requires unit tests for new pure logic and one Playwright suite for the spec's acceptance scenarios. Provider parsing, classification, request shape, and the registry get unit tests; the chat loop gets an e2e suite against the fake server. Tests are included below.

**Organization**: Tasks are grouped by user story. Setup and Foundational phases block all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Provider package: `packages/ai-provider/src/`
- Electron app: `apps/electron/src/{main,preload,renderer,shared}`
- Unit tests: `**/*.test.ts` beside the module
- E2E: `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the provider workspace package and link it into the Electron app.

- [x] T001 Create `packages/ai-provider/package.json` (name `@app-20/ai-provider`, `main`/`types` at `src/index.ts`, `typecheck` script) and `packages/ai-provider/tsconfig.json` extending `tsconfig.base.json`, matching `packages/conversation-storage`.
- [x] T002 Add `"@app-20/ai-provider": "^0.1.0"` to the dependencies in `apps/electron/package.json` and run `npm install` so npm links the workspace.
- [x] T003 Add `@app-20/ai-provider` to the `externalizeDeps.exclude` list in `apps/electron/electron.vite.config.ts` so the source-only package is bundled into main like `@app-20/conversation-storage`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The provider interface, OpenRouter implementation, SSE parser, error classification, and registry that all stories depend on.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [x] T004 Implement `packages/ai-provider/src/provider.ts`: `ChatRole`, `ProviderMessage`, `ChatRequest`, and the `ChatProvider` interface with `id` and `streamChat`, per contracts/ai-provider.md.
- [x] T005 [P] Implement `packages/ai-provider/src/errors.ts`: `ProviderErrorClass`, `ProviderError`, and `classifyHttpStatus` (401/403 invalid-key, 429 rate-limit, other unknown).
- [x] T006 [P] Implement `packages/ai-provider/src/stream.ts`: `ByteStream`, `ByteStreamReader`, and `parseOpenRouterStream` that decodes UTF-8 lines, yields non-empty `choices[0].delta.content`, skips blank/comment/unparseable lines and `[DONE]`, and throws `ProviderError('network')` when the stream ends before `[DONE]`.
- [x] T007 Implement `packages/ai-provider/src/openrouter.ts`: `OPENROUTER_ENDPOINT`, `AUTOMATIC_MODEL`, `OPENROUTER_PROVIDER_ID`, `HttpFetch*` types, and `createOpenRouterProvider` (POST with `stream: true`, checks `response.ok`, delegates to `parseOpenRouterStream`, throws `network` on fetch failure or early end, returns quietly on abort).
- [x] T008 [P] Implement `packages/ai-provider/src/registry.ts`: `ProviderRegistry` and `createProviderRegistry`.
- [x] T009 [P] Implement `packages/ai-provider/src/testing.ts`: `streamFromStrings`, `fetchReturning`, and `createScriptedProvider`.
- [x] T010 Implement `packages/ai-provider/src/index.ts` re-exporting the provider, errors, stream, registry, and testing surface.
- [x] T011 [P] Add `packages/ai-provider/src/stream.test.ts`: ordered deltas, malformed-line skipping, `[DONE]` termination, and the missing-`[DONE]` network error.
- [x] T012 [P] Add `packages/ai-provider/src/errors.test.ts`: `classifyHttpStatus` for 401, 403, 429, and 500.
- [x] T013 [P] Add `packages/ai-provider/src/openrouter.test.ts`: request URL, `Authorization` header, JSON body, delta order, 429 classification, and abort-without-throw using the testing doubles.
- [x] T014 [P] Add `packages/ai-provider/src/registry.test.ts`: register a second provider and resolve it by id (US3).

**Checkpoint**: The package compiles, its unit tests pass, and it imports no Node, Electron, or React.

---

## Phase 3: User Story 1 - Send a message and get a response (Priority: P1) 🎯 MVP

**Goal**: Send a prompt through the app and receive a streamed assistant response using automatic model selection, with the requested model recorded.

**Independent Test**: With a key imported, send a prompt against the fake server; confirm the streamed reply renders and the conversation records `model: openrouter/auto`.

- [x] T015 [US1] Add `missing-key`, `invalid-key`, `rate-limited`, `network-error`, `provider-error`, and `invalid-chat-request` to `apps/electron/src/shared/error-codes.ts` with fixed, path-free messages (see contracts/chat-ipc.md).
- [x] T016 [US1] Add `chat:start` and `chat:stop` to `IpcContract`, `chat:chunk` and `chat:complete` to `IpcEvents`, the channel arrays, and the `AppBridge` methods in `apps/electron/src/shared/ipc-contract.ts`.
- [x] T017 [US1] Add `getProviderKey()` to `apps/electron/src/main/secrets.ts`: read the stored provider key and decrypt with `safeStorage`, returning null on absence or failure and never logging the key.
- [x] T018 [US1] Create `apps/electron/src/main/providerErrors.ts` mapping `ProviderErrorClass` to `AppErrorCode` (`invalid-key`, `rate-limited`, `network-error`, `provider-error`) and add `apps/electron/src/main/providerErrors.test.ts`.
- [x] T019 [US1] Create `apps/electron/src/main/chatStream.ts`: validate the request, default the model to `AUTOMATIC_MODEL`, read the key, track an `AbortController` per request id, forward deltas as `chat:chunk`, emit `chat:complete` with `complete`/`stopped`/`error`, and implement `stopChat`.
- [x] T020 [US1] Register the `chat:start` and `chat:stop` handlers in `apps/electron/src/main/ipc.ts`.
- [x] T021 [US1] Add `startChat`, `stopChat`, `onChatChunk`, and `onChatComplete` to the preload bridge in `apps/electron/src/preload/index.ts`.
- [x] T022 [P] [US1] Create `apps/electron/src/renderer/src/conversation/providerMessages.ts` mapping `app-20-llmchat` `Message[]` to `ProviderMessage[]`, excluding a given message id and dropping empty content, and add `providerMessages.test.ts`.
- [x] T023 [US1] Rewrite `apps/electron/src/renderer/src/hooks/useShellSession.ts` to use `useChatSession` with a `request` callback that calls `startChat`, routes `chat:chunk`/`chat:complete` to the operation controls, records the error code, and keeps the existing persistence and restore logic with `model: AUTOMATIC_MODEL`.
- [x] T024 [US1] Pass `messageActions` and `onMessageAction` from the session to `LLMChat.Root` in `apps/electron/src/renderer/src/App.tsx`.
- [x] T025 [US1] Create `tests/e2e/fake-openrouter.ts`: a local `node:http` server that records requests and emits scripted SSE, with modes for echo reply, HTTP error status, delayed chunks, held stream, and mid-stream drop.
- [x] T026 [US1] Add an `openRouterEndpoint` option to `tests/e2e/launch-shell.ts` (env `APP20_OPENROUTER_ENDPOINT`) and create `tests/e2e/ai-provider.spec.ts` covering the US1 response, the recorded `openrouter/auto` model, and the invalid-key error that retains the prompt.
- [x] T027 [P] [US1] Add the `chat:*` methods to `tests/e2e/app-bridge.d.ts`.

**Checkpoint**: US1 works end to end; the key never reaches the renderer and no provider field reaches disk.

---

## Phase 4: User Story 2 - See the response stream (Priority: P2)

**Goal**: Responses arrive incrementally, and stopping a request retains the partial content.

**Independent Test**: Send against a delayed fake server and confirm the first delta renders before the second; stop a held stream and confirm the partial text remains.

- [x] T028 [US2] Add the US2 e2e cases to `tests/e2e/ai-provider.spec.ts`: delayed deltas render incrementally, Stop keeps the partial text and marks the message stopped, a dropped connection marks the message error, and an empty completion stores an empty complete message.
- [x] T029 [US2] Remove the provisional echo and delay plumbing: the `APP20_STREAM_DELAY_MS` path in `apps/electron/src/main/window.ts`, `streamDelayFromLocation` in `apps/electron/src/renderer/src/App.tsx`, and the `streamDelayMs` option in `tests/e2e/launch-shell.ts`.
- [x] T030 [P] [US2] Add a unit test in `apps/electron/src/renderer/src/conversation/providerMessages.test.ts` asserting the in-flight assistant placeholder is excluded so a retry resends history up to the user turn.

**Checkpoint**: US2 works; stopping keeps content and nothing is lost on error.

---

## Phase 5: User Story 3 - Switch providers later (Priority: P3)

**Goal**: A second provider implements the same interface and the app can select it without UI change.

**Independent Test**: Register a second provider in the registry and resolve it by id.

- [x] T031 [US3] Ensure the registry test in `packages/ai-provider/src/registry.test.ts` asserts a second provider resolves by id and an unknown id returns undefined, and document in `research.md` R3 that the chat UI depends only on the `ChatProvider` interface.

**Checkpoint**: US3 works; the renderer talks to the interface, not to OpenRouter.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Align existing suites, confirm the contract, run the gates, and archive the spec.

- [x] T032 Update the expected channel and event lists in `apps/electron/src/main/ipc-contract.test.ts` for `chat:*`.
- [x] T033 Update `tests/e2e/shell.spec.ts`: add the `chat:*` methods to `BRIDGE_METHODS`, start the fake server, launch with its endpoint, and replace the `Local echo:` expectations with the fake server's reply; convert the quit-while-streaming case to a held fake response.
- [x] T034 Update `tests/e2e/conversation-storage.spec.ts` to start the fake server, launch with its endpoint, and replace the `Local echo:` expectations.
- [x] T035 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build:electron`; fix all failures.
- [x] T036 Run `npm run test:e2e`; fix all failures.
- [x] T037 Format changed files with Prettier (the local `format:check` misreports CRLF on Windows; confirm on CI).
- [x] T038 Archive the spec: `git mv specs/102-openrouter-provider specs/archive/102-openrouter-provider` and set `**Status**` to `Archived` in the moved `spec.md`.

---

## Dependencies & Execution Order

- Setup (Phase 1) → Foundational (Phase 2) → user stories.
- US1 depends on the provider package and adds the main, preload, and renderer wiring.
- US2 depends on US1's `chat:chunk`/`chat:complete` and adds stop/cancel coverage and removes the echo.
- US3 is satisfied by the Foundational registry plus its test.
- Polish depends on all stories.

### Parallel Opportunities

- T005, T006, T008, and T009 are independent pure modules.
- T011–T014 are independent test files.
- T022 is independent of the main-process wiring.
- T027 and T030 are independent of their surrounding tasks.
- T032, T033, and T034 touch separate files.

## Implementation Strategy

MVP is US1: the provider package plus the main, preload, and renderer wiring deliver a streamed answer and the recorded model. US2 adds stop and the edge cases and removes the echo. US3 confirms the interface with a registry test. The package is built and unit-tested first so the app wiring and the tests share one verified parser.

## Notes

- The provider package must not import Node, Electron, or React; a violation of FR-004/FR-005 is caught in review.
- The API key is read in main only; the renderer receives deltas and typed codes, never the key or a raw upstream message.
- The fake server is a test double; no production code branches on an env var other than the endpoint override.
