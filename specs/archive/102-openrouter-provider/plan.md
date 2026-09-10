# Implementation Plan: OpenRouter AI Provider

**Branch**: `spec-102-openrouter-provider` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/102-openrouter-provider/spec.md`

## Summary

Add a platform-neutral provider package (`@app-20/ai-provider`) that defines a chat provider interface and implements OpenRouter chat completions with streaming and automatic model selection (`openrouter/auto`). The provider runs in the Electron main process so the stored API key (spec 103) never reaches the renderer. Main exposes named, typed IPC operations that start and stop a stream and an event pair that delivers text chunks and the terminal result. The renderer wires the provider into the shared chat component's `useChatSession` transport callback, replacing the provisional local echo. Provider response fields stay out of the canonical conversation schema (spec 101); only the requested model is recorded.

## Technical Context

**Language/Version**: TypeScript 5.7 strict; Node (Electron main and preload); React 19 renderer via electron-vite

**Primary Dependencies**: No new runtime dependency. `@app-20/ai-provider` is source-only TypeScript with no Node, Electron, or React import; it uses the platform `fetch` through an injected `HttpFetch` so the iOS app (spec 106) can supply its own. The renderer uses `useChatSession` from `app-20-llmchat` (already a dependency) as the transport seam. The main process reuses `safeStorage` decryption in `apps/electron/src/main/secrets.ts` and the existing IPC envelope.

**Storage**: No new storage. The provider reads the provider key from the spec 103 secret store in `userData/secrets.json`.

**Testing**: Vitest for the provider package (fake `HttpFetch`) and the pure error mapping; Playwright (`_electron.launch`) against the built app with a local fake OpenRouter SSE server.

**Target Platform**: Windows desktop (beta); the provider package is platform-neutral for iOS reuse.

**Project Type**: npm-workspaces monorepo: a new library package plus the existing Electron desktop app.

**Performance Goals**: First streamed chunk visible as soon as the first SSE delta arrives; chunks are forwarded as they are decoded, not buffered to completion. A multi-megabyte completion is processed one line at a time with bounded memory.

**Constraints**: The provider package imports no Node, Electron, or React. The renderer receives no API key and performs no network call. Provider-specific response fields never enter the conversation schema. Streams are cancellable and retain partial content.

**Scale/Scope**: Single user. One in-flight request per window is sufficient for beta; the host tracks streams by request id and supports more than one without contract changes.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                       | How this plan satisfies it                                                                                                                                                                                                                                                                                                                  | Status |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Process Isolation            | The network call and the API key live in the main process. The renderer reaches them only through named `chat:*` operations and events; it still imports no Node, Electron, or `fs`. The provider package is pure TypeScript and runs wherever the host supplies `HttpFetch`.                                                               | PASS   |
| II. Path Trust                  | No filesystem path is involved. The only untrusted input is the chat request shape and the provider's HTTP response; both are validated in main. Renderer-visible errors carry a typed code and never the key or a raw upstream message.                                                                                                    | PASS   |
| III. No Data Loss               | Partial content is appended to the assistant message as chunks arrive. A dropped connection or HTTP failure marks the message `error` and keeps the partial content; the user prompt is already a stored message. Nothing is discarded, and `chat:stop` keeps the partial text.                                                             | PASS   |
| IV. Fixed and Typed Preload API | `chat:start` and `chat:stop` are added to the shared contract with explicit request and response types, and `chat:chunk` / `chat:complete` are added to the event map. No generic `invoke(channel, ...args)` is exposed and no `any` crosses the boundary.                                                                                  | PASS   |
| V. Non-Negotiable Test Coverage | The SSE parser, error classification, OpenRouter request shape, and registry get unit tests. The IPC channel contract test is updated. The spec 102 acceptance scenarios get a Playwright suite against a fake OpenRouter server, and the hash of the key never appears in requests recorded by the fake server beyond the expected header. | PASS   |

No violations. Complexity Tracking is not required.

## Project Structure

### Documentation (this feature)

```text
specs/102-openrouter-provider/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities and stream states
├── quickstart.md        # Phase 1 validation guide
├── contracts/           # Phase 1 provider and IPC contracts
│   ├── ai-provider.md
│   └── chat-ipc.md
└── tasks.md             # Phase 2 task list
```

### Source Code (repository root)

```text
packages/ai-provider/
├── package.json                    # @app-20/ai-provider (source entry, no build)
├── tsconfig.json
└── src/
    ├── index.ts                    # public re-exports
    ├── provider.ts                 # ChatProvider, ChatRequest, ProviderMessage, ChatRole
    ├── errors.ts                   # ProviderError, ProviderErrorClass, classifyHttpStatus
    ├── stream.ts                   # ByteStream + parseOpenRouterStream (SSE deltas)
    ├── openrouter.ts               # createOpenRouterProvider, endpoint, automatic model
    ├── registry.ts                 # createProviderRegistry
    ├── testing.ts                  # fake HttpFetch and scripted provider for tests
    ├── errors.test.ts
    ├── stream.test.ts
    ├── openrouter.test.ts
    └── registry.test.ts

apps/electron/src/
├── shared/
│   ├── ipc-contract.ts             # add chat:start / chat:stop / chat:chunk / chat:complete
│   └── error-codes.ts              # add missing-key, invalid-key, rate-limited, network-error, provider-error, invalid-chat-request
├── main/
│   ├── secrets.ts                  # add getProviderKey (decrypt, never logged)
│   ├── providerErrors.ts           # ProviderErrorClass -> AppErrorCode (pure)
│   ├── providerErrors.test.ts
│   ├── chatStream.ts               # key lookup, AbortControllers, stream forwarding
│   ├── ipc.ts                      # register chat:start / chat:stop
│   └── ipc-contract.test.ts        # expected channel list
├── preload/
│   └── index.ts                    # startChat / stopChat / onChatChunk / onChatComplete
└── renderer/src/
    ├── App.tsx                     # pass messageActions / onMessageAction to the chat
    ├── conversation/providerMessages.ts       # Message[] -> ProviderMessage[]
    ├── conversation/providerMessages.test.ts
    └── hooks/useShellSession.ts    # useChatSession transport wired to chat:*, persistence kept

tests/e2e/
├── fake-openrouter.ts              # local SSE server double
├── ai-provider.spec.ts             # spec 102 acceptance scenarios
├── launch-shell.ts                 # openRouterEndpoint option; drop streamDelay
├── app-bridge.d.ts                 # chat:* bridge surface
├── shell.spec.ts                   # provider-backed send; bridge method list
└── conversation-storage.spec.ts    # provider-backed send
```

**Structure Decision**: The provider interface and the OpenRouter implementation live in `packages/ai-provider` because spec 102 FR-004 and the overview require a provider abstraction the iOS app can reuse, and because a pure module is testable without Electron. The Electron integration stays in `apps/electron/src/main` (key lookup, stream host, IPC) and `apps/electron/src/renderer` (transport wiring), matching the existing main/preload/renderer split. The provider is bundled into main rather than externalized, like `@app-20/conversation-storage`, because it has no build step.

## Complexity Tracking

No constitution violations. Decisions recorded in `research.md`: the provider runs in main (R1); a neutral package with an injected `HttpFetch` (R2); a narrow async-iterable interface (R3); the shell adopts the component's `useChatSession` (R4); streaming uses IPC events with a request id (R5); errors are classed into typed codes (R6); e2e uses a local fake server with an endpoint override (R7); the provisional echo and its delay plumbing are removed (R8).
