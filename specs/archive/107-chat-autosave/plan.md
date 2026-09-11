# Implementation Plan: Chat Autosave

**Branch**: `spec-107-chat-autosave` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/107-chat-autosave/spec.md`

## Summary

Replace the Electron shell's editor-derived manual-save and close-confirmation flow with automatic conversation persistence. A renderer-side serialized queue saves the latest snapshot after terminal exchanges, two seconds of draft inactivity, window blur, and session departure. Close and quit retain the existing typed handshake only to await a final save attempt, then exit without a user choice. The existing conversation schema, main-process atomic writes, and `conversations:save` IPC operation remain unchanged.

## Technical Context

**Language/Version**: TypeScript 5.7 strict; React 19 renderer via electron-vite; Electron main and preload.

**Primary Dependencies**: Existing `app-20-llmchat`, `@app-20/conversation-storage`, React, Electron, Vitest, and Playwright. No new dependency.

**Storage**: Existing one-JSON-file-per-conversation and JSON manifest in the spec 101 storage layer. No schema or layout change.

**Testing**: Vitest covers the autosave queue and session lifecycle. Playwright adds a `chat-autosave` suite and updates existing manual-save assumptions in shell, storage, provider, and history suites.

**Target Platform**: Windows desktop (beta).

**Project Type**: npm-workspaces monorepo. The work crosses Electron main, preload, renderer, and e2e tests.

**Performance Goals**: Drafts persist within 2,000 ms of the final keystroke. At most one conversation save is active per renderer session. A save requested during another write persists the latest snapshot after that write.

**Constraints**: Renderer has no Node, `fs`, or Electron module. Preload additions are fixed typed named methods. Existing main-process atomic saves remain the only disk write path. Failed saves retain session content and report a path-free error while the app remains open. Close never prompts or waits indefinitely for retry.

**Scale/Scope**: Single active conversation and a single Electron instance. Cloud sync, schema changes, and iOS implementation are out of scope.

## Constitution Check

| Principle | How this plan satisfies it | Status |
| --- | --- | --- |
| I. Process Isolation | The renderer uses `window.appBridge` only. Window lifecycle notification originates in main and crosses the fixed preload bridge. | PASS |
| II. Path Trust | No renderer path input or new filesystem operation is added. Existing conversation-store validation remains responsible for every write. | PASS |
| III. No Data Loss | Existing atomic storage persists serialized latest snapshots. Failure leaves the session intact, reports it, and retries on the next trigger. Close flushes once without a prompt. | PASS |
| IV. Fixed and Typed Preload API | The only added event is named `app:backgrounded` with an explicit empty payload and a dedicated bridge subscription. No generic IPC is added. | PASS |
| V. Non-Negotiable Test Coverage | Unit and e2e tests cover terminal and idle autosave, failure and retry, close and quit with no prompt, partial streams, atomic store behavior, and IPC shape. | PASS |

No violations. Complexity Tracking is not required.

## Project Structure

```text
apps/electron/src/
├── main/
│   ├── closeGate.ts                         # retain asynchronous close authorization
│   ├── menu.ts                              # remove Save command and accelerator
│   └── window.ts                            # emit typed blur event
├── preload/index.ts                         # expose onAppBackgrounded
├── renderer/src/
│   ├── App.tsx                              # remove editor controls and prompt wiring
│   ├── conversation/
│   │   ├── autosaveQueue.ts                 # serialized latest-snapshot queue
│   │   └── autosaveQueue.test.ts
│   ├── hooks/
│   │   ├── useShellSession.ts               # own triggers, transitions, close and blur flushes
│   │   └── useShellSession.test.tsx
│   └── components/ShellTopBar.tsx           # remove Save and dirty UI
└── shared/ipc-contract.ts                   # typed background event and menu command removal

tests/e2e/
├── chat-autosave.spec.ts                    # spec 107 acceptance scenarios
├── shell.spec.ts                            # remove editor-close assertions
├── conversation-storage.spec.ts             # replace manual-save steps
├── ai-provider.spec.ts                      # assert terminal autosave
└── chat-history.spec.ts                     # assert autosaved switch/new behavior
```

**Structure Decision**: Queue rules are isolated in a pure renderer module because they coordinate ordering and retries independently of React. The session hook owns live refs and lifecycle triggers because it owns the session snapshot and can flush before transitions. The main process only publishes the blur lifecycle signal and retains close authorization; it does not reconstruct renderer state.

## Complexity Tracking

No constitution violations. The queue, lifecycle trigger, and close decisions are recorded in [research.md](./research.md).
