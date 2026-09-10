# Research: OpenRouter AI Provider

Phase 0 decisions for spec 102. Each entry states the decision, why it was chosen, and what was rejected.

## R1: The provider runs in the main process

**Decision**: The OpenRouter request is issued from the Electron main process. The renderer never sees the API key and never calls the network.

**Rationale**: The key is stored with `safeStorage` in main (spec 103). Moving it to the renderer to make the call there would place secret material in UI memory and in any renderer crash dump, and it would widen the preload surface to read a secret. Main already owns the privileged boundary (constitution I), so the network call belongs there.

**Alternatives considered**:

- Renderer fetch with the key returned by a preload method. Rejected: a secret read op on the preload bridge contradicts spec 103 FR-005 and constitution IV.
- Main proxies only the request and streams the raw upstream body to the renderer. Rejected: the renderer would parse provider SSE and would hold provider-specific fields, risking FR-005.

## R2: A platform-neutral package with an injected fetch

**Decision**: Add `@app-20/ai-provider` as a source-only TypeScript package. It imports no Node, Electron, or React. HTTP access goes through an injected `HttpFetch`, defaulting to the platform `fetch`.

**Rationale**: FR-004 requires a provider interface, and the overview expects an iOS app (spec 106) to reuse the provider. A pure package with an injected transport compiles for both Electron main and React Native and is testable with a fake transport. This mirrors `@app-20/conversation-storage`, which already establishes the source-only workspace package pattern.

**Alternatives considered**:

- Put the provider in `apps/electron/src/main` only. Rejected: not reusable on iOS, and harder to unit test without Electron.
- Depend on an OpenAI-compatible SDK. Rejected: a new runtime dependency for an endpoint that is one POST plus an SSE read, and it would obscure the streaming boundary the spec asks to control.

## R3: The provider interface is a narrow async iterable

**Decision**:

```ts
interface ChatProvider {
  readonly id: string
  streamChat(request: ChatRequest, signal: AbortSignal): AsyncIterable<string>
}
```

`streamChat` yields assistant text deltas and throws `ProviderError` on failure. A `createProviderRegistry` maps provider ids to instances so a second provider can be registered and selected without UI change.

**Rationale**: The host needs exactly two things from a provider: a stream of text and a classed failure. An async iterable expresses both with no callback state and no subscription lifecycle. The registry makes FR-004 and US3 testable: a test registers a second provider and resolves it by id.

**Alternatives considered**:

- Reuse `useChatSession`'s `request(op, controls)` callback as the only interface. Rejected: it is a renderer lifecycle contract, not a transport contract, so it cannot be shared with iOS and it mixes UI concerns into the provider.
- An event-emitter interface (`onDelta`/`onDone`). Rejected: more state to own and to cancel than an async iterable.

## R4: The shell adopts the component's `useChatSession`

**Decision**: `useShellSession` wires the provider into `useChatSession` from `app-20-llmchat`. The hook owns messages, status, streaming, stop, and the retry/regenerate actions; `useShellSession` keeps draft state, persistence, and conversation identity.

**Rationale**: US2 requires streaming and stop, and spec 102's edge cases require a retry affordance after an error and after an empty completion. The component already implements those semantics (append chunk, complete, fail, stop, retry, regenerate) behind the `request` callback it exposes. Re-implementing them by hand duplicates the component contract and drifts from it. The priority note in US2 says streaming "matches the component's streaming behavior", which this directly satisfies.

**Alternatives considered**:

- Keep the hand-rolled message state in `useShellSession` and add a transport call. Rejected: it would re-implement retry/regenerate and would not track the component's operation model.
- Move draft ownership into the component. Rejected: the component's documented contract is that the host drives the draft.

## R5: Streaming over typed IPC events with a renderer request id

**Decision**: Add `chat:start` (invoke) and `chat:stop` (invoke), plus `chat:chunk` and `chat:complete` (events). The renderer generates a request id, passes it to `chat:start`, and filters events by that id. `chat:start` reads the key, registers an `AbortController`, launches the stream, and resolves as soon as the stream has started; `chat:stop` aborts the controller.

**Rationale**: `ipcMain.handle` resolves once, so a single invoke cannot deliver incremental output. Events are the existing main-to-renderer mechanism (used by `menu:command` and `app:close-requested`). A renderer-generated id keeps correlation simple and avoids a second round trip.

**Alternatives considered**:

- One long invoke that resolves at the end with the full text. Rejected: it defeats FR-003 streaming.
- Main generates the id and returns it from `chat:start`. Rejected: the renderer must subscribe before the call to avoid a missed first chunk; a renderer-generated id lets it subscribe once at mount.

## R6: Failures are classed into typed app codes

**Decision**: `ProviderErrorClass` is `invalid-key | rate-limit | network | unknown`. HTTP 401 and 403 map to `invalid-key`, 429 to `rate-limit`, a thrown `fetch` or a stream that ends without `[DONE]` to `network`, everything else to `unknown`. Main maps those to the app codes `invalid-key`, `rate-limited`, `network-error`, and `provider-error`, and maps a missing stored key to `missing-key`.

**Rationale**: FR-006 names invalid key, rate limit, and network. A closed class set keeps the renderer copy fixed and path-free and keeps provider-specific text out of the UI. The terminal `chat:complete` event carries the code, so the renderer can mark the assistant message `error` and show the matching notification.

**Alternatives considered**:

- Forward the upstream error body. Rejected: it can echo request details and is not a fixed copy; the renderer renders copy from a code (spec 100 FR-007).
- A single `provider-error` for everything. Rejected: FR-006 requires the failure class to be named.

## R7: E2E uses a local fake OpenRouter SSE server

**Decision**: The e2e suite starts a local `node:http` server that emits scripted SSE (`data: {...}` deltas then `data: [DONE]`) and points the app at it with `APP20_OPENROUTER_ENDPOINT`. The server records the authorization header and request body, and can be scripted for HTTP errors, delayed chunks, held streams, and mid-stream socket drops.

**Rationale**: This exercises the real fetch, request shape, SSE decode, IPC, and component rendering without a network dependency or a real key. It also supplies deterministic timing for the streaming and stop tests.

**Alternatives considered**:

- Stub `globalThis.fetch` in main via `electronApp.evaluate`. Rejected: it replaces the transport under test and does not exercise the real response body path.
- Call the real OpenRouter API. Rejected: nondeterministic, requires a live key in CI, and cannot simulate dropped connections or rate limits reliably.

## R8: The provisional echo and its delay plumbing are removed

**Decision**: Delete the local echo in `useShellSession`, the `APP20_STREAM_DELAY_MS` env path in `window.ts`, the `streamDelay` renderer query, and the `streamDelayMs` launch option. Timing in e2e comes from the fake server.

**Rationale**: The echo existed only because the provider was unimplemented (comment in the current hook). Leaving it reachable would create two transports. The delay knob existed to make the echo observable and has no meaning once a real stream is present.

**Alternatives considered**:

- Keep the echo behind a flag for tests. Rejected: a test-only transport path in production code, and it contradicts SC-001.

## R9: The requested model is recorded; the resolved model is future work

**Decision**: The conversation's `model` field is set to `openrouter/auto` (the automatic model selection from `docs/overview.md`). The provider sends that model string unchanged.

**Rationale**: FR-008 and the spec 101 assumption allow the recorded model to be the requested one for beta. Recording the routed model per response is explicitly future work.

**Alternatives considered**:

- Record the model returned in the OpenRouter response. Rejected: FR-008 says beta records the requested model, and it would require carrying a provider field toward the canonical schema.

## R10: Empty completion is a complete empty message

**Decision**: A stream that ends with zero text yields an assistant message with empty content and `complete` status. The component's `regenerate` action, available on a complete assistant message, is the retry affordance.

**Rationale**: The spec requires an empty completion to be stored as an empty assistant message with complete status and a retry affordance. The component already offers regenerate for exactly that state, so no separate empty-state control is added.

**Alternatives considered**:

- Treat an empty completion as an error. Rejected: the spec says complete status with an empty message.
- Add a bespoke empty-response retry button. Rejected: duplicates the component's action.
